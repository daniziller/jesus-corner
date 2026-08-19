// Gera um Estudo guiado por tema (IA) — mesmo espírito de
// generate-theme-plan.js, mas gerando o conteúdo denso de um Estudo
// (contexto histórico/geográfico/teológico + perguntas de reflexão por
// sessão, ver src/data/studies.js pro formato de referência) em vez de só
// uma lista de passagens pra ler. A IA só escreve o TEXTO das seções — o
// livro/faixa de capítulos de cada sessão ainda é validado contra o texto
// bíblico real (mesma lógica de fetchBookChapters/clamp de
// generate-theme-plan.js), garantindo que a REFERÊNCIA pelo menos exista
// de verdade, mesmo que o comentário em si não tenha como ser verificado
// automaticamente.
//
// Geração é feita numa língua só (a do app no momento, ver `lang`) — os
// campos "*En"/pt duplicados exigidos pelo formato de STUDIES (pra não
// precisar mexer no StudiesScreen.jsx) recebem o MESMO texto gerado nos
// dois lados; não existe tradução automática pro outro idioma (mesma
// simplificação já aceita em theme_plans, que também só guarda um
// "overview" só, sem tradução).
import { createClient } from '@supabase/supabase-js'
import { generateStudy } from './_lib/ai.js'
import { isAdminEmail } from './_lib/adminAuth.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

const MAX_TITLE_LENGTH = 60
const MAX_SCOPE_LENGTH = 200
// Mesma janela rolante de 30 dias de generate-theme-plan.js — geração de
// estudo é ainda mais cara (bem mais texto por chamada), então reaproveita
// o mesmo limite em vez de abrir um orçamento maior.
const MAX_STUDIES_PER_MONTH = 4
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

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
      console.error('[generate-study] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const caller = userData.user

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, access_type')
    .eq('user_id', caller.id)
    .maybeSingle()
  const isPremium = sub && (
    (sub.access_type === 'free' || sub.access_type === 'lifetime')
      ? sub.status === 'active'
      : sub.status === 'active' || sub.status === 'trialing'
  )
  if (!isPremium) return res.status(403).json({ error: 'subscription_required' })

  if (!isAdminEmail(caller.email)) {
    const { data: userRow } = await supabase
      .from('user_data')
      .select('ai_studies')
      .eq('user_id', caller.id)
      .maybeSingle()
    const existingStudies = userRow?.ai_studies ?? []
    const recentCount = existingStudies.filter(s => {
      const created = s.createdAt ? new Date(s.createdAt).getTime() : NaN
      return !Number.isNaN(created) && Date.now() - created < THIRTY_DAYS_MS
    }).length
    if (recentCount >= MAX_STUDIES_PER_MONTH) {
      return res.status(429).json({ error: 'study_limit_reached' })
    }
  }

  const { title, scope, lang } = req.body ?? {}
  const cleanTitle = (title ?? '').trim()
  const cleanScope = (scope ?? '').trim()
  if (!cleanTitle || cleanTitle.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: 'invalid_title' })
  }
  if (!cleanScope || cleanScope.length > MAX_SCOPE_LENGTH) {
    return res.status(400).json({ error: 'invalid_scope' })
  }
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const folder = BIBLE_VERSIONS[cleanLang][0].folder

  let draft
  try {
    draft = await generateStudy(cleanScope, CANONICAL_BOOKS, cleanLang)
  } catch (err) {
    console.error('[generate-study] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Valida book/chStart/chEnd de cada sessão contra o texto real (mesma
  // lógica de generate-theme-plan.js) — sessões com livro inválido ou fora
  // da lista canônica são descartadas em vez de travar a geração inteira.
  const candidateSessions = draft.sessions.filter(s => CANONICAL_BOOKS.includes(s.book))
  const bookDataBySession = await Promise.all(
    candidateSessions.map(s => {
      const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[s.book] : s.book
      return fetchBookChapters(folder, bookNameForFolder)
    })
  )

  const validSessions = []
  candidateSessions.forEach((s, i) => {
    const bookData = bookDataBySession[i]
    if (!bookData) return
    const availableChapters = Object.keys(bookData).map(Number).sort((a, b) => a - b)
    const maxChapter = availableChapters[availableChapters.length - 1]
    if (!maxChapter) return
    const chStart = Math.max(1, Math.min(Math.round(s.chStart) || 1, maxChapter))
    const chEnd = Math.max(chStart, Math.min(Math.round(s.chEnd) || chStart, maxChapter))
    const bookEn = BOOK_EN_BY_PT[s.book]
    const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
    validSessions.push({
      id: validSessions.length + 1,
      title: s.title,
      titleEn: s.title,
      passage: `${s.book} ${range}`,
      passageEn: `${bookEn} ${range}`,
      sections: [
        { key: 'historical', body: s.historical, bodyEn: s.historical },
        { key: 'geographical', body: s.geographical, bodyEn: s.geographical },
        { key: 'theological', body: s.theological, bodyEn: s.theological },
      ],
      reflectionQuestions: s.reflectionQuestions,
      reflectionQuestionsEn: s.reflectionQuestions,
    })
  })

  if (validSessions.length < 3) {
    return res.status(502).json({ error: 'not_enough_valid_sessions' })
  }

  const study = {
    id: `study-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    icon: 'Sparkles',
    title: cleanTitle,
    titleEn: cleanTitle,
    subtitle: draft.subtitle,
    subtitleEn: draft.subtitle,
    lang: cleanLang,
    createdAt: new Date().toISOString(),
    sessions: validSessions,
  }

  return res.status(200).json({ ok: true, study })
}
