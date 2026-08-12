// Gera um plano de leitura por tema (IA) — a pessoa escolhe um título e
// descreve o escopo (ex: "textos sobre lidar com ansiedade e confiar em
// Deus"), mais o ritmo de leitura (Leve/Padrão/Intensivo/Livre, mesmo
// conjunto usado no resto do app); este endpoint pede pra IA uma lista de
// passagens relevantes ao escopo (só livro + faixa de capítulos, nunca o
// texto em si), valida cada uma contra o texto bíblico real, e divide em
// sessões do tamanho do ritmo escolhido (mesma heurística de palavras/
// minuto usada pra gerar SESSIONS_BY_PLAN e o plano cronológico — ver
// src/data/chronologicalPlan.js). Devolve o plano montado pro client
// salvar (ver src/themePlans/themePlansStore.js) — este endpoint não
// persiste nada, só gera.
import { createClient } from '@supabase/supabase-js'
import { findThemePassages } from './_lib/ai.js'
import { isAdminEmail } from './_lib/adminAuth.js'
import { BIBLE_BLOCKS, WORDS_PER_MINUTE, PLANS } from '../src/data/bibleBlocks.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { slugify } from '../src/utils/slugify.js'
import { mergeAdjacentPassages, chunkChaptersByWords } from '../src/utils/wordChunking.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

const ALLOWED_PACE_IDS = PLANS.map(p => p.id)
const MAX_TITLE_LENGTH = 60
const MAX_SCOPE_LENGTH = 200
// "4 por mês" tratado como janela rolante de 30 dias (não mês-calendário)
// — mais simples de calcular e evita o truque de gerar vários no fim de um
// mês e mais no início do seguinte.
const MAX_PLANS_PER_MONTH = 4
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

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

  // Limite de 4 planos por tema a cada 30 dias (não confia só na trava do
  // client — reconfere aqui, mesmo espírito da checagem de assinatura
  // acima, já que cada geração tem custo real de IA). Conta admin (ver
  // api/_lib/adminAuth.js) fica de fora do limite — usa a função pra testar
  // sem esperar a janela de 30 dias.
  if (!isAdminEmail(caller.email)) {
    const { data: userRow } = await supabase
      .from('user_data')
      .select('theme_plans')
      .eq('user_id', caller.id)
      .maybeSingle()
    const existingPlans = userRow?.theme_plans ?? []
    const recentCount = existingPlans.filter(p => {
      const created = p.createdAt ? new Date(p.createdAt).getTime() : NaN
      return !Number.isNaN(created) && Date.now() - created < THIRTY_DAYS_MS
    }).length
    if (recentCount >= MAX_PLANS_PER_MONTH) {
      return res.status(429).json({ error: 'plan_limit_reached' })
    }
  }

  const { title, scope, paceId, lang } = req.body ?? {}
  const cleanTitle = (title ?? '').trim()
  const cleanScope = (scope ?? '').trim()
  if (!cleanTitle || cleanTitle.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: 'invalid_title' })
  }
  if (!cleanScope || cleanScope.length > MAX_SCOPE_LENGTH) {
    return res.status(400).json({ error: 'invalid_scope' })
  }
  if (!ALLOWED_PACE_IDS.includes(paceId)) {
    return res.status(400).json({ error: 'invalid_pace' })
  }
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const folder = BIBLE_VERSIONS[cleanLang][0].folder
  const pace = PLANS.find(p => p.id === paceId)
  // Livre não tem meta de tempo — targetWords 0 faz o chunking abaixo nunca
  // juntar 2 capítulos numa sessão só (1ª condição do loop só passa depois
  // de já ter fechado o capítulo anterior), resultando em exatamente 1
  // sessão por capítulo — mesma lógica do cronológico (ver
  // src/data/chronologicalPlan.js).
  const targetWords = pace.readingMinutes == null ? 0 : pace.readingMinutes * WORDS_PER_MINUTE

  let passages, overview
  try {
    const aiResult = await findThemePassages(cleanScope, CANONICAL_BOOKS, cleanLang, targetWords)
    passages = aiResult.passages
    overview = (aiResult.overview ?? '').trim()
  } catch (err) {
    console.error('[generate-theme-plan] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Passagens validadas (livro + faixa de capítulos JÁ dentro do range
  // real, sem o texto em si) — guardadas à parte das sessões (não
  // fundidas ainda) pra permitir trocar o ritmo depois sem chamar a IA de
  // novo (ver src/themePlans/chunkThemePassages.js, usado por App.jsx
  // quando a pessoa muda o ritmo de um plano já salvo — refaz a mesma
  // fusão+divisão abaixo a partir daqui).
  const validatedPassages = []

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
    validatedPassages.push({ book: p.book, chStart, chEnd, reason: p.reason })
  }

  if (validatedPassages.length === 0) {
    return res.status(502).json({ error: 'no_valid_passages' })
  }

  // Funde passagens adjacentes/sobrepostas do MESMO livro antes de dividir
  // em sessões — sem isso, cada passagem da IA virava 1 sessão própria,
  // quase sempre bem mais curta que o ritmo escolhido (era o bug
  // reportado: sessões não respeitavam o número de palavras do ritmo).
  const mergedPassages = mergeAdjacentPassages(validatedPassages)

  const sessions = []
  let nextId = 1
  for (const p of mergedPassages) {
    const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[p.book] : p.book
    const bookData = await fetchBookChapters(folder, bookNameForFolder) // já em cache, não refaz o fetch
    const chapters = []
    for (let ch = p.chStart; ch <= p.chEnd; ch++) {
      chapters.push({ ch, words: chapterWordCount(bookData[String(ch)]) })
    }
    // Divide em sessões de ~targetWords cada (balanceado, não guloso — ver
    // src/utils/wordChunking.js), sem nunca combinar capítulos de livros
    // diferentes numa sessão só (mesma regra que SessionCard/
    // ReadingBlockView já assumem hoje pra toda sessão).
    for (const chunk of chunkChaptersByWords(chapters, targetWords)) {
      sessions.push(buildSession(nextId++, p.book, chunk.chStart, chunk.chEnd, p.reason))
    }
  }

  const plan = {
    id: `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    scope: cleanScope,
    overview,
    paceId,
    lang: cleanLang,
    createdAt: new Date().toISOString(),
    passages: validatedPassages,
    sessions,
  }

  return res.status(200).json({ ok: true, plan })
}
