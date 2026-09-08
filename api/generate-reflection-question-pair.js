// Perguntas 1 e 2 da Reflexão — tela 37a do pacote 36-37 (ver
// handoff-passos-36-37/HANDOFF-36-37-passos.md). Diferente de
// api/generate-chapter-context.js/generate-reading-summary.js (GET
// público, cacheado na borda, igual pra quem leu o mesmo trecho): aqui
// "Trocar perguntas" precisa devolver um par NOVO a cada toque, então é
// POST, autenticado, por usuário, SEM cache — mesmo padrão de
// api/ask-about-passage.js, inclusive o orçamento diário compartilhado
// (mesma tabela text_ai_chats, mesmo teto de 40/dia).
import { createClient } from '@supabase/supabase-js'
import { generateReflectionQuestionPair } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BOOK_INFO } from '../src/data/bookInfo.js'
import { BOOK_INFO_EN } from '../src/data/bookInfo.en.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const VALID_BOOKS = new Set(BIBLE_BLOCKS.flatMap(b => b.books))
const MAX_CHAPTER_SPAN = 10 // mesma trava de generate-reading-summary.js
const MAX_AVOID_QUESTIONS = 12 // limite frouxo — só evita um prompt gigante se "Trocar" for tocado muitas vezes seguidas
const MAX_MESSAGES_PER_DAY = 40 // mesmo teto/mesma tabela de ask-about-passage.js/chat-about-text.js

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function countTodayMessages(supabase, userId) {
  const { count, error } = await supabase
    .from('text_ai_chats')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', startOfTodayIso())
  if (error) throw error
  return count ?? 0
}

const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[generate-reflection-question-pair] failed to fetch book text:', bookName, err.message)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const caller = userData.user

  const ent = await fetchEntitlement(supabase, caller.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { book, bookEn, chStart, chEnd, lang, avoidQuestions } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const startNum = Number(chStart)
  const endNum = Number(chEnd ?? chStart)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(startNum) || !Number.isInteger(endNum) || startNum < 1 || endNum < startNum || endNum - startNum >= MAX_CHAPTER_SPAN) {
    return res.status(400).json({ error: 'invalid_passage' })
  }
  const cleanAvoid = Array.isArray(avoidQuestions) ? avoidQuestions.filter(q => typeof q === 'string').slice(0, MAX_AVOID_QUESTIONS) : []

  let todayCount
  try {
    todayCount = await countTodayMessages(supabase, caller.id)
  } catch (err) {
    console.error('[generate-reflection-question-pair] failed to count today messages:', err.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit_reached', used: todayCount, remaining: 0, max: MAX_MESSAGES_PER_DAY })
  }

  const bookNameForFolder = cleanLang === 'en' ? (bookEn || BOOK_EN_BY_PT[book] || book) : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  if (!chapters) return res.status(400).json({ error: 'invalid_passage' })
  const chapterText = Array.from({ length: endNum - startNum + 1 }, (_, i) => chapterFullText(chapters[String(startNum + i)]))
    .filter(Boolean).join(' ')
  if (!chapterText) return res.status(400).json({ error: 'invalid_passage' })

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null

  let result
  try {
    result = await generateReflectionQuestionPair({ book, chStart: startNum, chEnd: endNum, chapterText, bookInfo, lang: cleanLang, avoidQuestions: cleanAvoid })
  } catch (err) {
    console.error('[generate-reflection-question-pair] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Log só pra limite diário (mesma tabela/orçamento do chat livre) — o
  // conteúdo de verdade fica no aparelho da pessoa (ver
  // reflectionQuestionsStore.js).
  const passageKey = `reflect:${book}:${startNum}-${endNum}`
  const { error: insertErr } = await supabase
    .from('text_ai_chats')
    .insert([
      { user_id: caller.id, passage_key: passageKey, role: 'user', content: '[trocar perguntas]' },
      { user_id: caller.id, passage_key: passageKey, role: 'assistant', content: result.questions.join(' / ') },
    ])
  if (insertErr) console.error('[generate-reflection-question-pair] failed to log usage (non-fatal):', insertErr.message)

  const usedAfter = todayCount + 1
  return res.status(200).json({
    ok: true,
    questions: result.questions,
    used: usedAfter, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usedAfter), max: MAX_MESSAGES_PER_DAY,
  })
}
