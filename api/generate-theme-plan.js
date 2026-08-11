// Gera um plano de leitura por tema (IA) — a pessoa digita um tema (ex:
// "perdão") e quantos minutos quer ler por sessão; este endpoint pede pra
// IA uma lista de passagens relevantes (só livro + faixa de capítulos,
// nunca o texto em si), valida cada uma contra o texto bíblico real, e
// divide em sessões do tamanho escolhido (mesma heurística de palavras/
// minuto usada pra gerar SESSIONS_BY_PLAN). Devolve o plano montado pro
// client salvar (ver src/themePlans/themePlansStore.js) — este endpoint
// não persiste nada, só gera.
import { createClient } from '@supabase/supabase-js'
import { findThemePassages } from './_lib/ai.js'
import { BIBLE_BLOCKS, WORDS_PER_MINUTE } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

const ALLOWED_MINUTES = [5, 10, 15, 20, 30]
const MAX_THEME_LENGTH = 80

// Nome canônico (pt, o mesmo usado em session.book em todo o app) -> nome
// em inglês — monta bookEn nas sessões geradas sem precisar pedir os dois
// idiomas pra IA (menos superfície pra alucinar).
const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const CANONICAL_BOOKS = Object.keys(BOOK_EN_BY_PT)

// Cache em memória do processo (dura enquanto a function/lambda ficar
// "quente") — o mesmo livro pode aparecer em mais de uma passagem da
// mesma resposta da IA, evita refazer o mesmo fetch de ~100KB.
const bookTextCache = new Map()
async function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const slug = slugify(bookName)
  let data = null
  try {
    const res = await fetch(`${APP_URL}/bible-text/${folder}/${slug}.json`)
    if (res.ok) data = await res.json()
  } catch (err) {
    console.error('[generate-theme-plan] failed to fetch book text:', bookName, err.message)
  }
  bookTextCache.set(key, data)
  return data
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function chapterWordCount(chapterData) {
  if (!chapterData?.verses) return 0
  return Object.values(chapterData.verses).reduce((sum, v) => sum + wordCount(v), 0)
}

function buildSession(id, book, chStart, chEnd, reason) {
  const bookEn = BOOK_EN_BY_PT[book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  return {
    id,
    book,
    bookEn,
    chStart,
    chEnd,
    title: `${book} ${range}`,
    titleEn: `${bookEn} ${range}`,
    passage: `${book} ${range}`,
    passageEn: `${bookEn} ${range}`,
    reason,
    status: 'pending',
  }
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

  // Primeiro endpoint que gera custo de IA por chamada — reconfere
  // assinatura no servidor (mesma lógica de isPremiumActive, ver
  // src/billing/subscriptionStore.js) em vez de confiar só na trava
  // client-side, que qualquer um consegue contornar chamando a API direto.
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

  const { theme, minutesPerSession, lang } = req.body ?? {}
  const cleanTheme = (theme ?? '').trim()
  if (!cleanTheme || cleanTheme.length > MAX_THEME_LENGTH) {
    return res.status(400).json({ error: 'invalid_theme' })
  }
  if (!ALLOWED_MINUTES.includes(minutesPerSession)) {
    return res.status(400).json({ error: 'invalid_minutes' })
  }
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const folder = BIBLE_VERSIONS[cleanLang][0].folder
  const targetWords = minutesPerSession * WORDS_PER_MINUTE

  let passages
  try {
    passages = await findThemePassages(cleanTheme, CANONICAL_BOOKS, cleanLang)
  } catch (err) {
    console.error('[generate-theme-plan] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const sessions = []
  let nextId = 1

  for (const p of passages) {
    // Só aceita livro que está de fato na lista canônica — a IA foi
    // instruída a só usar esses nomes, mas nunca confiar sem checar.
    if (!CANONICAL_BOOKS.includes(p.book)) continue
    // O arquivo de texto de cada versão é nomeado no idioma DELA (ex:
    // pt-nvt/mateus.json, en-nlt/matthew.json) — não sempre pelo nome
    // canônico (pt) que a IA devolveu, senão a busca falha pra en-nlt.
    const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[p.book] : p.book
    const bookData = await fetchBookChapters(folder, bookNameForFolder)
    if (!bookData) continue

    // Prende chStart/chEnd dentro da faixa real de capítulos do livro —
    // a IA pode errar o número, o livro em si (já filtrado acima) não.
    const availableChapters = Object.keys(bookData).map(Number).sort((a, b) => a - b)
    const maxChapter = availableChapters[availableChapters.length - 1]
    if (!maxChapter) continue
    const chStart = Math.max(1, Math.min(Math.round(p.chStart) || 1, maxChapter))
    const chEnd = Math.max(chStart, Math.min(Math.round(p.chEnd) || chStart, maxChapter))

    // Divide a passagem em sessões de ~targetWords cada, sem nunca
    // combinar capítulos de livros diferentes numa sessão só (mesma regra
    // que SessionCard/ReadingBlockView já assumem hoje pra toda sessão).
    let chunkStart = chStart
    let chunkWords = 0
    for (let ch = chStart; ch <= chEnd; ch++) {
      const w = chapterWordCount(bookData[String(ch)])
      if (chunkWords > 0 && chunkWords + w > targetWords) {
        sessions.push(buildSession(nextId++, p.book, chunkStart, ch - 1, p.reason))
        chunkStart = ch
        chunkWords = 0
      }
      chunkWords += w
    }
    sessions.push(buildSession(nextId++, p.book, chunkStart, chEnd, p.reason))
  }

  if (sessions.length === 0) {
    return res.status(502).json({ error: 'no_valid_passages' })
  }

  const plan = {
    id: `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    theme: cleanTheme,
    minutesPerSession,
    lang: cleanLang,
    createdAt: new Date().toISOString(),
    sessions,
  }

  return res.status(200).json({ ok: true, plan })
}
