// E-mails e consentimento (revisão de LGPD, 2026-11-18).
//
// Duas finalidades de e-mail, gravadas na tabela consents como qualquer
// outra (append-only — a linha mais recente de cada finalidade vence):
//   marketing_email — novidades e avisos da equipe (broadcast). OPT-IN:
//                     sem linha = não manda. Pedido no cadastro, desmarcado.
//   weekly_email    — o e-mail do resumo semanal. É um aviso sobre a
//                     própria conta (legítimo interesse), então sem linha =
//                     manda; desligar grava granted=false.
//
// Todo e-mail dessas finalidades leva link de descadastro e os cabeçalhos
// List-Unsubscribe (RFC 2369) e List-Unsubscribe-Post (RFC 8058, o botão
// "cancelar inscrição" do Gmail/Apple Mail). O link é assinado (HMAC) com o
// id da pessoa e a finalidade: só desliga aquela finalidade, daquela
// pessoa, sem precisar entrar no app. Ver api/unsubscribe.js.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const EMAIL_PURPOSES = {
  MARKETING: 'marketing_email',
  WEEKLY: 'weekly_email',
}
const DEFAULT_WHEN_MISSING = { marketing_email: false, weekly_email: true }

const APP_URL = 'https://app.jesuscorner.app'

function secret() {
  // UNSUBSCRIBE_SECRET quando existir; senão uma chave derivada da service
  // role (que nunca sai do servidor) — o link continua impossível de forjar.
  const base = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('unsubscribe_secret_missing')
  return process.env.UNSUBSCRIBE_SECRET ? base : `unsubscribe:${base}`
}

export function unsubscribeToken(userId, purpose) {
  return createHmac('sha256', secret()).update(`${userId}|${purpose}`).digest('base64url')
}

export function verifyUnsubscribeToken(userId, purpose, token) {
  if (!userId || !purpose || !token) return false
  if (!Object.values(EMAIL_PURPOSES).includes(purpose)) return false
  const expected = Buffer.from(unsubscribeToken(userId, purpose))
  const got = Buffer.from(String(token))
  return expected.length === got.length && timingSafeEqual(expected, got)
}

export function unsubscribeUrl(userId, purpose) {
  const q = new URLSearchParams({ u: userId, p: purpose, t: unsubscribeToken(userId, purpose) })
  return `${APP_URL}/api/unsubscribe?${q}`
}

export function unsubscribeHeaders(url) {
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}

// Estado de uma finalidade para várias pessoas: Map(user_id → boolean).
// Quem não tem linha recebe o padrão da finalidade (opt-in = false).
// Serve também para ai_processing (opt-in) no resumo semanal.
export async function consentMap(db, purpose, userIds) {
  const ids = [...new Set(userIds)].filter(Boolean)
  const state = new Map(ids.map(id => [id, DEFAULT_WHEN_MISSING[purpose] ?? false]))
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await db.from('consents')
      .select('user_id, granted, created_at')
      .eq('purpose', purpose)
      .in('user_id', ids.slice(i, i + CHUNK))
      .order('created_at', { ascending: false })
    // Sem conseguir ler, quem chama decide — e não deve mandar às cegas.
    if (error) throw error
    const seen = new Set()
    for (const row of data ?? []) {
      if (seen.has(row.user_id)) continue
      seen.add(row.user_id)
      state.set(row.user_id, row.granted)
    }
  }
  return state
}
