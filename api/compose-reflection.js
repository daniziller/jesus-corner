// Junta as 3 respostas da pessoa (tela 10d) num parágrafo de diário — ao
// contrário de generate-reflection-questions.js (público, cacheado, igual
// pra todo mundo), isto é POR USUÁRIO: depende do que a pessoa escreveu, e
// por isso passa pelas mesmas regras de acesso/orçamento de IA das outras
// chamadas por usuário (ask-about-passage.js, chat-about-text.js) — mesma
// tabela/teto diário, de propósito (não tem sentido dar orçamentos
// separados por feature). O usuário aprova o parágrafo antes de salvar
// (ver ReflectionScreen.jsx) — este endpoint só gera o rascunho, nunca
// salva nada sozinho.
import { createClient } from '@supabase/supabase-js'
import { composeReflection } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MAX_MESSAGES_PER_DAY = 40 // mesmo teto/mesma tabela de chat-about-text.js e ask-about-passage.js
const MAX_ANSWER_LENGTH = 600

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

  const { book, chapter, lang, qa } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  if (!book || !Number.isInteger(chapter) || !Array.isArray(qa) || qa.length !== 3) {
    return res.status(400).json({ error: 'invalid_request' })
  }
  const cleanQa = qa.map(pair => ({
    question: String(pair?.question ?? '').trim(),
    answer: String(pair?.answer ?? '').trim(),
  }))
  if (cleanQa.some(pair => !pair.question || !pair.answer || pair.answer.length > MAX_ANSWER_LENGTH)) {
    return res.status(400).json({ error: 'invalid_request' })
  }

  let todayCount
  try {
    todayCount = await countTodayMessages(supabase, caller.id)
  } catch (err) {
    console.error('[compose-reflection] failed to count today messages:', err.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit_reached', used: todayCount, remaining: 0, max: MAX_MESSAGES_PER_DAY })
  }

  let result
  try {
    result = await composeReflection({ book, chapter, qa: cleanQa, lang: cleanLang })
  } catch (err) {
    console.error('[compose-reflection] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const passageKey = `reflect:${book}:${chapter}`
  const { error: insertErr } = await supabase
    .from('text_ai_chats')
    .insert([
      { user_id: caller.id, passage_key: passageKey, role: 'user', content: cleanQa.map(p => p.answer).join(' / ') },
      { user_id: caller.id, passage_key: passageKey, role: 'assistant', content: result.paragraph },
    ])
  if (insertErr) console.error('[compose-reflection] failed to log usage (non-fatal):', insertErr.message)

  const usedAfter = todayCount + 1
  return res.status(200).json({
    ok: true,
    paragraph: result.paragraph,
    used: usedAfter, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usedAfter), max: MAX_MESSAGES_PER_DAY,
  })
}
