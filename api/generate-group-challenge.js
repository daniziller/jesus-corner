// Gera a PROPOSTA de um desafio de leitura por IA pro admin de grupo
// (handoff-admin-42, 42m→42n) — texto livre do líder vira título + dias
// (referência, título do dia, pergunta) + explicação citando o que ele
// escreveu. Só gera; não publica nada (ver api/publish-group-challenge.js)
// — "você aprova antes de qualquer coisa ir ao ar" (42m, texto fixo).
// Mesmo padrão de validação de api/generate-theme-plan.js (a IA só cita
// livro+capítulos, o texto real de cada um é buscado e usado pra travar
// chStart/chEnd dentro da faixa que existe de verdade, e pra calcular o
// tempo de leitura — nunca confia na IA pra número de minutos).
import { createClient } from '@supabase/supabase-js'
import { generateGroupChallenge } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BIBLE_BLOCKS, WORDS_PER_MINUTE } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'
const MAX_TEXT_LENGTH = 500

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const CANONICAL_BOOKS = Object.keys(BOOK_EN_BY_PT)

const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const slug = slugify(bookName)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slug}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[generate-group-challenge] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function chapterWordCount(chapterData) {
  if (!chapterData?.verses) return 0
  return Object.values(chapterData.verses).reduce((sum, v) => sum + wordCount(v), 0)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const caller = userData.user

  // Custo real de IA por chamada — mesma trava de generate-theme-plan.js/
  // generate-study.js, reconferida no servidor.
  const ent = await fetchEntitlement(supabase, caller.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { groupId, text, lang } = req.body ?? {}
  const cleanText = (text ?? '').trim()
  if (!cleanText || cleanText.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'invalid_text' })
  if (!groupId) return res.status(400).json({ error: 'invalid_group' })

  // Só o moderador do grupo pode gerar um desafio pra ele — is_group_moderator
  // é security definer (bypassa RLS pra checar), então dá pra chamar via RPC
  // simples em vez de duplicar a query aqui.
  const { data: isModerator, error: modError } = await supabase.rpc('is_group_moderator', { target_group_id: groupId })
  if (modError || !isModerator) return res.status(403).json({ error: 'forbidden' })

  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const folder = BIBLE_VERSIONS[cleanLang][0].folder

  let aiResult
  try {
    aiResult = await generateGroupChallenge(cleanText, CANONICAL_BOOKS, cleanLang)
  } catch (err) {
    console.error('[generate-group-challenge] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const candidateDays = (aiResult.days ?? []).filter(d => CANONICAL_BOOKS.includes(d.book))
  const bookDataByDay = await Promise.all(
    candidateDays.map(d => {
      const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[d.book] : d.book
      return fetchBookChapters(folder, bookNameForFolder)
    })
  )

  const validDays = []
  candidateDays.forEach((d, i) => {
    const bookData = bookDataByDay[i]
    if (!bookData) return
    const availableChapters = Object.keys(bookData).map(Number).sort((a, b) => a - b)
    const maxChapter = availableChapters[availableChapters.length - 1]
    if (!maxChapter) return
    const chStart = Math.max(1, Math.min(Math.round(d.chStart) || 1, maxChapter))
    const chEnd = Math.max(chStart, Math.min(Math.round(d.chEnd) || chStart, maxChapter))
    let words = 0
    for (let ch = chStart; ch <= chEnd; ch++) words += chapterWordCount(bookData[String(ch)])
    validDays.push({
      book: d.book, bookEn: BOOK_EN_BY_PT[d.book], chStart, chEnd,
      dayTitle: (d.dayTitle ?? '').trim(), reflectionQuestion: (d.reflectionQuestion ?? '').trim(),
      minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    })
  })

  if (validDays.length < 3) return res.status(502).json({ error: 'not_enough_valid_days' })

  return res.status(200).json({
    ok: true,
    challenge: {
      title: (aiResult.title ?? '').trim().slice(0, 60),
      explanation: (aiResult.explanation ?? '').trim(),
      leaderText: cleanText,
      lang: cleanLang,
      days: validDays,
    },
  })
}
