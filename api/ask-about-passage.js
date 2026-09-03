// "Perguntar" sobre um trecho selecionado — tela 10a/10b do redesign Bento
// (ver design_handoff_jesus_corner/ADENDO-identidade-e-IA.md). Diferente de
// api/chat-about-text.js (chat livre pela sessão inteira, com histórico
// salvo no servidor): aqui a pergunta nasce de SELECIONAR um trecho
// específico, sem histórico de conversa, e a resposta sai sempre
// estruturada — nunca texto livre solto (ver PassageAnswerSchema em
// api/_lib/ai.js). Regra inegociável do handoff: "quem não cita, não
// responde" — verifyCitation() abaixo confere a citação de sustentação
// contra o texto bíblico real ANTES de devolver; se não bater, a resposta
// inteira é descartada (502), nunca sai pro usuário meio-verificada.
//
// Persistência: a pessoa vê e guarda essas perguntas no aparelho
// (localStorage, ver src/aiChat/passageQuestionStore.js) — este endpoint só
// grava em text_ai_chats pra efeito de LIMITE DIÁRIO (mesmo teto e mesma
// tabela do chat livre; as duas features dividem o mesmo orçamento de IA
// por dia, de propósito — não tem sentido dar 40+40 perguntas separadas).
import { createClient } from '@supabase/supabase-js'
import { answerAboutPassage } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BOOK_INFO } from '../src/data/bookInfo.js'
import { BOOK_INFO_EN } from '../src/data/bookInfo.en.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

// Nome canônico (pt, chave de BOOK_INFO/BOOK_INFO_EN) -> nome em inglês, e
// o mapa inverso — o modelo pode citar em qualquer um dos dois (não
// instruímos explicitamente qual usar em citation.reference), e
// verifyCitation() precisa aceitar os dois pra não descartar uma citação
// válida só por causa do idioma do nome do livro (mesmo padrão de
// BOOK_EN_BY_PT em api/generate-theme-plan.js).
const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const CANONICAL_BY_ANY_NAME = Object.fromEntries([
  ...Object.keys(BOOK_EN_BY_PT).map(pt => [pt.toLowerCase(), pt]),
  ...Object.entries(BOOK_EN_BY_PT).map(([pt, en]) => [en.toLowerCase(), pt]),
])

const MAX_QUESTION_LENGTH = 300
const MAX_MESSAGES_PER_DAY = 40 // mesmo teto/mesma tabela de chat-about-text.js — orçamento diário de IA compartilhado

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

// Mesma técnica de api/generate-theme-plan.js (fetchBookChapters) — busca o
// JSON de capítulos direto dos assets estáticos do próprio app publicado,
// em vez de duplicar o texto bíblico no bundle da function.
const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[ask-about-passage] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

function normalizeForCompare(text) {
  return (text ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Referência tipo "Gênesis 41:26" ou "Genesis 41:26" (ou "41:26-27") ->
// { book (SEMPRE canônico em pt), chapter, verseStart, verseEnd } — aceita
// o nome do livro em pt OU en (ver CANONICAL_BY_ANY_NAME), já que não
// instruímos o modelo sobre em qual idioma escrever o nome do livro na
// citação.
function parseReference(reference) {
  const match = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/.exec((reference ?? '').trim())
  if (!match) return null
  const [, rawBook, ch, vStart, vEnd] = match
  const book = CANONICAL_BY_ANY_NAME[rawBook.trim().toLowerCase()]
  if (!book) return null
  return { book, chapter: Number(ch), verseStart: Number(vStart), verseEnd: vEnd ? Number(vEnd) : Number(vStart) }
}

// Confere se a citação que o modelo devolveu bate com um versículo de
// verdade — normaliza os dois lados (sem acento/pontuação) e aceita quando
// um contém o outro (o modelo pode citar só parte de um versículo longo, ou
// incluir uma palavra a mais de contexto). Não bater = citação inventada.
async function verifyCitation(citation, folder, cleanLang) {
  const ref = parseReference(citation?.reference)
  if (!ref) return false
  const bookNameForFolder = cleanLang === 'en' ? (BOOK_EN_BY_PT[ref.book] ?? ref.book) : ref.book
  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  if (!chapters) return false
  const chapterData = chapters[String(ref.chapter)]
  if (!chapterData?.verses) return false
  const realText = Array.from(
    { length: ref.verseEnd - ref.verseStart + 1 },
    (_, i) => chapterData.verses[String(ref.verseStart + i)]
  ).filter(Boolean).join(' ')
  if (!realText) return false
  const real = normalizeForCompare(realText)
  const claimed = normalizeForCompare(citation.quote)
  if (!claimed) return false
  return real.includes(claimed) || claimed.includes(real)
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

  const { book, bookEn, chapter, verseStart, verseEnd, question, lang } = req.body ?? {}
  const cleanQuestion = (question ?? '').trim()
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  // book (chave canônica em pt, mesma de session.book em todo o app) serve
  // pra achar o bookInfo (também sempre chaveado em pt, ver BOOK_INFO_EN) —
  // mas os arquivos de texto bíblico em public/bible-text/en-nlt/ são
  // nomeados pelo título EM INGLÊS (mesmo padrão de fetchBookChapters em
  // api/generate-theme-plan.js), por isso bookNameForFolder abaixo.
  const bookNameForFolder = cleanLang === 'en' ? (bookEn || book) : book
  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verseStart) || !Number.isInteger(verseEnd) || verseStart > verseEnd) {
    return res.status(400).json({ error: 'invalid_passage' })
  }
  if (!cleanQuestion || cleanQuestion.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({ error: 'invalid_question' })
  }

  let todayCount
  try {
    todayCount = await countTodayMessages(supabase, caller.id)
  } catch (err) {
    console.error('[ask-about-passage] failed to count today messages:', err.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit_reached', used: todayCount, remaining: 0, max: MAX_MESSAGES_PER_DAY })
  }

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  const chapterData = chapters?.[String(chapter)]
  if (!chapterData?.verses) return res.status(400).json({ error: 'invalid_passage' })
  const passageText = Array.from(
    { length: verseEnd - verseStart + 1 },
    (_, i) => chapterData.verses[String(verseStart + i)]
  ).filter(Boolean).join(' ')
  if (!passageText) return res.status(400).json({ error: 'invalid_passage' })

  let answer
  try {
    answer = await answerAboutPassage({ book, chapter, verseStart, verseEnd, passageText, bookInfo, question: cleanQuestion, lang: cleanLang })
  } catch (err) {
    console.error('[ask-about-passage] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // "Quem não cita, não responde": outcome=answer exige as duas citações E
  // que a de sustentação bata com o texto real — sem isso, a pessoa nunca
  // vê uma resposta meio-verificada, vê o mesmo erro de "não deu pra
  // responder agora" que uma falha de rede daria.
  if (answer.outcome === 'answer') {
    const supportOk = answer.supportCitation && await verifyCitation(answer.supportCitation, folder, cleanLang)
    if (!supportOk || !answer.expansionCitation) {
      console.error('[ask-about-passage] discarded answer with unverifiable/missing citation', { book, chapter, verseStart, verseEnd })
      return res.status(502).json({ error: 'citation_unverifiable' })
    }
  }
  if (answer.outcome === 'doctrine_divergent' && (!answer.doctrineSideA || !answer.doctrineSideB)) {
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  // Log só pra limite diário (mesma tabela/orçamento do chat livre) — o
  // conteúdo de verdade fica no aparelho da pessoa (ver comentário no topo).
  const passageKey = `ask:${book}:${chapter}:${verseStart}-${verseEnd}`
  const { error: insertErr } = await supabase
    .from('text_ai_chats')
    .insert([
      { user_id: caller.id, passage_key: passageKey, role: 'user', content: cleanQuestion },
      { user_id: caller.id, passage_key: passageKey, role: 'assistant', content: `[${answer.outcome}]` },
    ])
  if (insertErr) console.error('[ask-about-passage] failed to log usage (non-fatal):', insertErr.message)

  const usedAfter = todayCount + 1
  return res.status(200).json({
    ok: true,
    answer,
    used: usedAfter, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usedAfter), max: MAX_MESSAGES_PER_DAY,
  })
}
