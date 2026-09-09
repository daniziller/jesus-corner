// O dia do estudo, aberto (41d, turno 41, handoff-estudos-41/) — gera o
// ensino (2 parágrafos), o versículo-âncora e a pergunta do dia PARA UM
// TRECHO JÁ ESCOLHIDO (a passagem do dia N já existe desde a proposta,
// 41c) — este endpoint não escolhe passagem nenhuma, só gera o conteúdo
// em cima dela. Chamado uma vez por dia (quem chama guarda o resultado no
// próprio dia do estudo — ver src/studies/studyDayStore.js — e nunca
// chama de novo pro mesmo dia).
//
// Autenticado + POST (ao contrário de generate-reading-summary.js, GET
// público cacheado): o `scope` do estudo entra no prompt, então o MESMO
// trecho gera conteúdo DIFERENTE dependendo do estudo — não é cacheável
// por passagem só, então não faz sentido como GET público.
//
// "O que não bate não entra" (regra 4 §2): o versículo-âncora só chega ao
// client com o NÚMERO validado contra a faixa lida — o TEXTO de verdade é
// sempre lido do JSON real da versão do usuário aqui no servidor, nunca
// aceito da IA (mesma regra de ouro de generate-theme-plan.js).
import { createClient } from '@supabase/supabase-js'
import { generateStudyDayContent } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'
const MAX_SCOPE_LENGTH = 200
const MAX_CHAPTER_SPAN = 10

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const VALID_BOOKS = new Set(BIBLE_BLOCKS.flatMap(b => b.books))

async function fetchBookChapters(folder, bookName) {
  const res = await fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
  return res.ok ? res.json() : null
}

function chapterFullText(chapterData) {
  if (!chapterData?.verses) return null
  return Object.keys(chapterData.verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map(v => chapterData.verses[String(v)])
    .join(' ')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  // Continuar um dia do estudo não é "criar" (regra 4 §3) — sem checagem
  // de cota aqui, só de assinatura (mesmo recurso de IA de sempre).
  const ent = await fetchEntitlement(supabase, userData.user.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { book, bookEn, chStart, chEnd, scope, lang } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const startNum = Number(chStart)
  const endNum = Number(chEnd ?? chStart)
  const cleanScope = (scope ?? '').trim()
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(startNum) || !Number.isInteger(endNum) || startNum < 1 || endNum < startNum || endNum - startNum >= MAX_CHAPTER_SPAN) {
    return res.status(400).json({ error: 'invalid_passage' })
  }
  if (!cleanScope || cleanScope.length > MAX_SCOPE_LENGTH) return res.status(400).json({ error: 'invalid_scope' })

  const bookNameForFolder = cleanLang === 'en' ? (bookEn || BOOK_EN_BY_PT[book] || book) : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  if (!chapters) return res.status(400).json({ error: 'invalid_passage' })
  const chapterText = Array.from({ length: endNum - startNum + 1 }, (_, i) => chapterFullText(chapters[String(startNum + i)]))
    .filter(Boolean).join(' ')
  if (!chapterText) return res.status(400).json({ error: 'invalid_passage' })

  let raw
  try {
    raw = await generateStudyDayContent({ book, chStart: startNum, chEnd: endNum, chapterText, scope: cleanScope, lang: cleanLang })
  } catch (err) {
    console.error('[generate-study-day] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Regra de ouro: o versículo-âncora só entra se existir de verdade no
  // texto real — se a IA apontar um número fora da faixa ou sem texto no
  // JSON, a resposta INTEIRA é descartada (nunca sai meio-verificada).
  let anchorText = null
  let anchorChapterFound = null
  for (let ch = startNum; ch <= endNum; ch++) {
    const v = chapters[String(ch)]?.verses?.[String(raw.anchorVerse)]
    if (v) { anchorText = v; anchorChapterFound = ch; break }
  }
  if (!anchorText) {
    console.error('[generate-study-day] anchor verse failed verification, discarding response')
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const dayContent = {
    teaching: { body: [raw.teachingParagraph1, raw.teachingParagraph2].filter(Boolean).join('\n\n') },
    anchorVerse: { chapter: anchorChapterFound, verse: raw.anchorVerse, text: anchorText },
    question: raw.question,
  }

  return res.status(200).json({ ok: true, day: dayContent })
}
