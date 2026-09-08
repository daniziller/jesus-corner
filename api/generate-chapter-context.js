// Contexto antes do capítulo — tela 10c do redesign Bento (ver
// design_handoff_jesus_corner/ADENDO-identidade-e-IA.md) e o botão
// "Relembre onde a história parou" (turno 39, follow-up). Diferente de
// api/ask-about-passage.js (por usuário, autenticado, com limite diário):
// isto é GET, público e sem limite — o conteúdo é igual pra todo mundo que
// abre o mesmo capítulo (implicação técnica 6 do adendo: "podem ser
// gerados uma vez por capítulo e cacheados").
//
// Cache de verdade: chapter_contexts (migration 0060) — consulta ANTES de
// gerar; só chama a IA na primeira vez que alguém abre um capítulo+idioma,
// pra sempre (sem TTL). O Cache-Control abaixo continua além disso, como
// uma segunda camada (borda da Vercel) — mais rápido que a consulta ao
// banco pros capítulos mais lidos, mas quem garante "nunca gera duas
// vezes" é a tabela, não o CDN.
import { createClient } from '@supabase/supabase-js'
import { generateChapterContext } from './_lib/ai.js'
import { BOOK_INFO } from '../src/data/bookInfo.js'
import { BOOK_INFO_EN } from '../src/data/bookInfo.en.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const APP_URL = 'https://app.jesuscorner.app'

// Nome canônico (pt) -> inglês — só pra achar o arquivo certo em
// public/bible-text/en-nlt/ quando lang=en (mesmo padrão de
// api/ask-about-passage.js).
const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const VALID_BOOKS = new Set(BIBLE_BLOCKS.flatMap(b => b.books))

// Mesma técnica de api/ask-about-passage.js — busca o JSON de capítulos
// direto dos assets estáticos do próprio app publicado.
const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[generate-chapter-context] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

function chapterFullText(chapterData) {
  if (!chapterData?.verses) return null
  return Object.keys(chapterData.verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map(v => chapterData.verses[String(v)])
    .join(' ')
}

// Notas curadas dos capítulos ANTERIORES a este (não do capítulo atual —
// isso vai à parte como chapterText real, ver handler) — mesma fonte que a
// aba "Contexto" já mostra (bookInfo.contextSections).
function formatPriorSections(sections, beforeChapter) {
  return (sections ?? [])
    .filter(s => s.chStart < beforeChapter)
    .map(s => `- Cap. ${s.chStart}${s.chStart !== s.chEnd ? `–${s.chEnd}` : ''} (${s.title}): ${s.text}`)
    .join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const { book, bookEn, chapter, lang } = req.query
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const chapterNum = Number(chapter)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(chapterNum) || chapterNum < 1) {
    return res.status(400).json({ error: 'invalid_chapter' })
  }

  // Cache de verdade primeiro — a IMENSA maioria das chamadas cai aqui
  // depois da primeira pessoa a abrir este capítulo+idioma; nem toca no
  // texto bíblico nem na IA.
  const { data: cached, error: cacheErr } = await supabaseAdmin
    .from('chapter_contexts')
    .select('context')
    .eq('book', book).eq('chapter', chapterNum).eq('lang', cleanLang)
    .maybeSingle()
  if (cacheErr) console.error('[generate-chapter-context] cache lookup failed:', cacheErr.message)
  if (cached?.context) {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
    return res.status(200).json({ ok: true, context: cached.context })
  }

  const bookNameForFolder = cleanLang === 'en' ? (bookEn || BOOK_EN_BY_PT[book] || book) : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  const chapterText = chapterFullText(chapters?.[String(chapterNum)])
  if (!chapterText) return res.status(400).json({ error: 'invalid_chapter' })

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null
  const priorSectionsText = formatPriorSections(bookInfo?.contextSections, chapterNum)

  let context
  try {
    context = await generateChapterContext({ book, chapter: chapterNum, chapterText, bookInfo, priorSectionsText, lang: cleanLang })
  } catch (err) {
    console.error('[generate-chapter-context] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Grava pra nunca mais gerar este capítulo+idioma de novo — best-effort:
  // se a escrita falhar (ex: outra requisição simultânea já gravou a
  // mesma linha primeiro, esbarra no unique), a resposta desta chamada
  // sai normalmente do mesmo jeito; a próxima simplesmente acha no cache.
  supabaseAdmin.from('chapter_contexts').insert({ book, chapter: chapterNum, lang: cleanLang, context })
    .then(({ error }) => { if (error) console.error('[generate-chapter-context] cache write failed:', error.message) })

  // Segunda camada, na borda da Vercel — mais rápido que a consulta ao
  // banco pros capítulos mais lidos; quem garante "nunca gera duas vezes"
  // é a tabela acima, não isto (esse cache pode expirar/ser purgado sem
  // problema).
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, context })
}
