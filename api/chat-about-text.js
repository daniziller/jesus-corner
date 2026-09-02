// Chat com IA sobre o texto bíblico em leitura — aba "Perguntar à IA" em
// ReadingBlockView.jsx (ver src/aiChat/aiChatStore.js pro lado client).
// Escopo deliberadamente estreito: contexto histórico/geográfico/cultural
// da passagem e o que o texto bíblico em si diz — nunca doutrina,
// interpretação teológica ou aconselhamento pessoal (ver
// answerTextQuestion em api/_lib/ai.js, que devolve inScope/sensitiveTopic
// estruturados em vez de confiar só no texto livre gerado).
import { createClient } from '@supabase/supabase-js'
import { answerTextQuestion } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'
import { BOOK_INFO } from '../src/data/bookInfo.js'
import { BOOK_INFO_EN } from '../src/data/bookInfo.en.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const MAX_MESSAGE_LENGTH = 500
const HISTORY_LIMIT = 10
// Uso natural de um chat é bem mais frequente que gerar planos por tema
// (MAX_PLANS_PER_MONTH em generate-theme-plan.js é mensal) — por isso um
// teto diário, generoso o bastante pra uma sessão de leitura de verdade,
// mas que barra abuso/custo descontrolado.
const MAX_MESSAGES_PER_DAY = 40

// Garantida pelo servidor, nunca só pelo texto que o modelo gerou sozinho
// (ver comentário em answerTextQuestion) — sempre que sensitiveTopic for
// 'self_harm', esta linha é anexada à resposta antes de salvar/devolver.
const CVV_LINE_PT = 'Se você está passando por um momento difícil, o CVV (Centro de Valorização da Vida) oferece apoio emocional gratuito, sigiloso, 24h por dia: ligue 188 ou acesse cvv.org.br.'
const CVV_LINE_EN = "If you're going through a hard time, please reach out to a crisis line in your country — free, confidential support is available 24/7."

function passageKeyFor(book, chStart, chEnd) {
  return `${book}:${chStart}-${chEnd}`
}

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

// Compartilhado entre GET (só consulta o limite, sem gastar nada — usado
// pelo painel do chat pra mostrar quantas perguntas restam ANTES da
// pessoa esbarrar no limite, não só depois) e POST (manda a pergunta de
// verdade).
async function authenticateAndCheckPremium(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader) { res.status(401).json({ error: 'unauthorized' }); return null }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) { res.status(401).json({ error: 'unauthorized' }); return null }
  const caller = userData.user

  // Reconfere no servidor — recurso de IA, custo real por chamada, não
  // confia só na trava do client. Exige o tier Premium + IA.
  const ent = await fetchEntitlement(supabase, caller.id)
  if (!ent.hasAI) { res.status(403).json({ error: 'subscription_required' }); return null }

  return { supabase, caller }
}

export default async function handler(req, res) {
  // GET — só devolve quantas perguntas já foram feitas hoje (usado`s pelo
  // painel do chat ao abrir, e depois de cada envio) — nunca escreve nada,
  // pra mostrar o limite de forma clara ANTES da pessoa esbarrar nele, não
  // só como erro de surpresa depois.
  if (req.method === 'GET') {
    const auth = await authenticateAndCheckPremium(req, res)
    if (!auth) return
    try {
      const used = await countTodayMessages(auth.supabase, auth.caller.id)
      return res.status(200).json({ used, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - used), max: MAX_MESSAGES_PER_DAY })
    } catch (err) {
      console.error('[chat-about-text] failed to count today messages (GET):', err.message)
      return res.status(500).json({ error: 'internal_error' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const auth = await authenticateAndCheckPremium(req, res)
  if (!auth) return
  const { supabase, caller } = auth

  const { book, chStart, chEnd, message, lang } = req.body ?? {}
  const cleanMessage = (message ?? '').trim()
  if (!book || !Number.isInteger(chStart) || !Number.isInteger(chEnd) || chStart > chEnd) {
    return res.status(400).json({ error: 'invalid_passage' })
  }
  if (!cleanMessage || cleanMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'invalid_message' })
  }
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const passageKey = passageKeyFor(book, chStart, chEnd)

  let todayCount
  try {
    todayCount = await countTodayMessages(supabase, caller.id)
  } catch (err) {
    console.error('[chat-about-text] failed to count today messages:', err.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit_reached', used: todayCount, remaining: 0, max: MAX_MESSAGES_PER_DAY })
  }

  const { data: historyRows, error: historyErr } = await supabase
    .from('text_ai_chats')
    .select('role, content, created_at')
    .eq('user_id', caller.id)
    .eq('passage_key', passageKey)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (historyErr) {
    console.error('[chat-about-text] failed to load history:', historyErr.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  const history = (historyRows ?? []).slice().reverse()

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null

  let answer
  try {
    answer = await answerTextQuestion({ book, chStart, chEnd, bookInfo, message: cleanMessage, history, lang: cleanLang })
  } catch (err) {
    console.error('[chat-about-text] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const replyText = answer.sensitiveTopic === 'self_harm'
    ? `${answer.reply}\n\n${cleanLang === 'en' ? CVV_LINE_EN : CVV_LINE_PT}`
    : answer.reply

  const { data: inserted, error: insertErr } = await supabase
    .from('text_ai_chats')
    .insert([
      { user_id: caller.id, passage_key: passageKey, role: 'user', content: cleanMessage },
      { user_id: caller.id, passage_key: passageKey, role: 'assistant', content: replyText },
    ])
    .select('id, role, content, created_at')
  if (insertErr) {
    console.error('[chat-about-text] failed to save messages:', insertErr.message)
    return res.status(500).json({ error: 'internal_error' })
  }

  const userMessage = inserted.find(m => m.role === 'user')
  const assistantMessage = inserted.find(m => m.role === 'assistant')

  // usedAfter conta esta mensagem que acabou de ser gravada — todayCount
  // (checado acima) ainda não incluía ela.
  const usedAfter = todayCount + 1
  return res.status(200).json({
    ok: true, userMessage, assistantMessage,
    used: usedAfter, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usedAfter), max: MAX_MESSAGES_PER_DAY,
  })
}
