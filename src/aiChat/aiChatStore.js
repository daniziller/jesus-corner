// Chat com IA sobre o texto bíblico em leitura (aba "Perguntar à IA" em
// ReadingBlockView.jsx) — guardado na tabela text_ai_chats (ver
// supabase/migrations/0033_ai_chat.sql), diferente de notes/highlights
// (que moram em user_data): aqui cada mensagem é sua própria linha.
// Leitura é direta via Supabase (RLS já restringe ao próprio usuário,
// mesmo padrão de outras leituras simples); o envio passa pelo endpoint
// (api/chat-about-text.js), que decide o conteúdo depois dos guardrails
// de escopo/assunto sensível — mesmo padrão de generateThemePlan em
// src/themePlans/themePlansStore.js.
import { supabase } from '../lib/supabaseClient'

export async function getMessages(passageKey) {
  const { data, error } = await supabase
    .from('text_ai_chats')
    .select('id, role, content, created_at')
    .eq('passage_key', passageKey)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function sendMessage({ book, chStart, chEnd, message, lang }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/chat-about-text', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chStart, chEnd, message, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return { userMessage: body.userMessage, assistantMessage: body.assistantMessage }
}
