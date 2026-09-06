// "Escrever com ajuda" (tela 25b) — a IA transforma um desabafo longo numa
// frase de pedido de oração, que a pessoa aprova (ou edita) antes de
// publicar. Mesmo padrão de compose-reflection.js: por usuário, não
// cacheado, mesma tabela/teto diário de IA que as outras chamadas por
// usuário (não faz sentido dar orçamento separado por feature) — este
// endpoint só gera o rascunho, nunca publica nada sozinho.
import { createClient } from '@supabase/supabase-js'
import { composePrayerRequest } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MAX_MESSAGES_PER_DAY = 40 // mesmo teto/mesma tabela de chat-about-text.js, ask-about-passage.js, compose-reflection.js
const MAX_INPUT_LENGTH = 1200

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

  const { text, lang } = req.body ?? {}
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const cleanText = String(text ?? '').trim()
  if (!cleanText || cleanText.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: 'invalid_request' })
  }

  let todayCount
  try {
    todayCount = await countTodayMessages(supabase, caller.id)
  } catch (err) {
    console.error('[compose-prayer-request] failed to count today messages:', err.message)
    return res.status(500).json({ error: 'internal_error' })
  }
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: 'daily_limit_reached', used: todayCount, remaining: 0, max: MAX_MESSAGES_PER_DAY })
  }

  let result
  try {
    result = await composePrayerRequest({ text: cleanText, lang: cleanLang })
  } catch (err) {
    console.error('[compose-prayer-request] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  const { error: insertErr } = await supabase
    .from('text_ai_chats')
    .insert([
      { user_id: caller.id, passage_key: 'prayer_request', role: 'user', content: cleanText },
      { user_id: caller.id, passage_key: 'prayer_request', role: 'assistant', content: result.request },
    ])
  if (insertErr) console.error('[compose-prayer-request] failed to log usage (non-fatal):', insertErr.message)

  const usedAfter = todayCount + 1
  return res.status(200).json({
    ok: true,
    request: result.request,
    used: usedAfter, remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usedAfter), max: MAX_MESSAGES_PER_DAY,
  })
}
