// "Trocar" um dia da proposta de plano por tema (35e) — pede à IA UMA
// passagem nova, evitando repetir as que já estão no plano (a que está
// sendo trocada inclusa), valida contra o texto real (mesma regra de ouro
// de generate-theme-plan.js: nenhuma referência não conferida é devolvida
// ao cliente) e devolve pronta pra entrar no lugar. Não persiste nada —
// quem chama decide se salva (ver src/themePlans/themePlansStore.js).
import { createClient } from '@supabase/supabase-js'
import { regenerateThemePassage } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BIBLE_BLOCKS, WORDS_PER_MINUTE, PLANS } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'
const ALLOWED_PACE_IDS = PLANS.map(p => p.id)
const MAX_SCOPE_LENGTH = 200
const MAX_OTHER_PASSAGES = 30

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const CANONICAL_BOOKS = Object.keys(BOOK_EN_BY_PT)

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}
function chapterWordCount(chapterData) {
  if (!chapterData?.verses) return 0
  return Object.values(chapterData.verses).reduce((sum, v) => sum + wordCount(v), 0)
}

async function fetchBookChapters(folder, bookName) {
  const slug = slugify(bookName)
  const res = await fetch(`${APP_URL}/bible-text/${folder}/${slug}.json`)
  return res.ok ? res.json() : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const ent = await fetchEntitlement(supabase, userData.user.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { scope, paceId, lang, otherPassages } = req.body ?? {}
  const cleanScope = (scope ?? '').trim()
  if (!cleanScope || cleanScope.length > MAX_SCOPE_LENGTH) return res.status(400).json({ error: 'invalid_scope' })
  if (!ALLOWED_PACE_IDS.includes(paceId)) return res.status(400).json({ error: 'invalid_pace' })
  if (!Array.isArray(otherPassages) || otherPassages.length === 0 || otherPassages.length > MAX_OTHER_PASSAGES) {
    return res.status(400).json({ error: 'invalid_other_passages' })
  }
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const folder = BIBLE_VERSIONS[cleanLang][0].folder
  const pace = PLANS.find(p => p.id === paceId)
  const targetWords = pace.readingMinutes == null ? 0 : pace.readingMinutes * WORDS_PER_MINUTE

  const cleanOthers = otherPassages
    .filter(p => CANONICAL_BOOKS.includes(p?.book) && Number.isInteger(p?.chStart) && Number.isInteger(p?.chEnd))
    .map(p => ({ book: p.book, chStart: p.chStart, chEnd: p.chEnd, reason: String(p.reason ?? '').slice(0, 200) }))
  if (cleanOthers.length === 0) return res.status(400).json({ error: 'invalid_other_passages' })

  let raw
  try {
    raw = await regenerateThemePassage(cleanScope, cleanOthers, cleanLang, targetWords, CANONICAL_BOOKS)
  } catch (err) {
    console.error('[regenerate-theme-passage] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  if (!CANONICAL_BOOKS.includes(raw.book)) return res.status(502).json({ error: 'no_valid_passage' })
  const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[raw.book] : raw.book
  const bookData = await fetchBookChapters(folder, bookNameForFolder).catch(() => null)
  if (!bookData) return res.status(502).json({ error: 'no_valid_passage' })

  const availableChapters = Object.keys(bookData).map(Number).sort((a, b) => a - b)
  const maxChapter = availableChapters[availableChapters.length - 1]
  if (!maxChapter) return res.status(502).json({ error: 'no_valid_passage' })
  const chStart = Math.max(1, Math.min(Math.round(raw.chStart) || 1, maxChapter))
  const chEnd = Math.max(chStart, Math.min(Math.round(raw.chEnd) || chStart, maxChapter))

  let words = 0
  for (let ch = chStart; ch <= chEnd; ch++) words += chapterWordCount(bookData[String(ch)])

  const bookEn = BOOK_EN_BY_PT[raw.book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const passage = {
    book: raw.book, bookEn, chStart, chEnd,
    title: `${raw.book} ${range}`, titleEn: `${bookEn} ${range}`,
    passage: `${raw.book} ${range}`, passageEn: `${bookEn} ${range}`,
    reason: raw.reason, words,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    status: 'pending',
  }

  return res.status(200).json({ ok: true, passage })
}
