import { supabase } from '../lib/supabaseClient'

// Mesmo helper de src/billing/subscriptionStore.js — Bearer do access_token
// da sessão atual, sem duplicar lógica de auth no client (o servidor
// re-checa tudo via requireAdmin, ver api/_lib/adminAuth.js).
async function authorizedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  return res.json()
}

// Usado só no bootstrap do app pra decidir se mostra a aba Admin — nunca
// deixa o erro subir (conta comum recebe 403, tratado aqui como
// isAdmin:false, não como falha).
export async function checkIsAdmin() {
  try {
    await authorizedPost('/api/admin/check')
    return true
  } catch {
    return false
  }
}

export async function getAdminMetrics({ days, language } = {}) {
  return authorizedPost('/api/admin/metrics', { days, language })
}

export async function listContactMessages({ filter = 'unanswered', limit = 50, offset = 0 } = {}) {
  const { messages } = await authorizedPost('/api/admin/contact-messages', { filter, limit, offset })
  return messages
}

export async function replyToContactMessage({ id, replyBody }) {
  return authorizedPost('/api/admin/reply-contact-message', { id, replyBody })
}

export async function deleteContactMessage({ id }) {
  return authorizedPost('/api/admin/delete-contact-message', { id })
}

export async function searchAdminUsers(query) {
  const { users } = await authorizedPost('/api/admin/search-users', { query })
  return users
}

export async function getAdminUserDetail(userId) {
  return authorizedPost('/api/admin/user-detail', { userId })
}

export async function listReadingGroupsForAdmin() {
  const { groups } = await authorizedPost('/api/admin/reading-groups')
  return groups
}

export async function sendBroadcast({ languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail, recipientMode, recipientUserId, segment, dryRun }) {
  return authorizedPost('/api/admin/broadcast', { languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail, recipientMode, recipientUserId, segment, dryRun })
}

export async function createInvite({ email, kind, discountPercent, discountDuration, languages }) {
  return authorizedPost('/api/admin/create-invite', { email, kind, discountPercent, discountDuration, languages })
}

export async function listAdminInvites() {
  const { invites } = await authorizedPost('/api/admin/list-invites')
  return invites
}

export async function revokeInvite({ id }) {
  return authorizedPost('/api/admin/revoke-invite', { id })
}

// Reportes de resposta da IA ("Reportar resposta", 10b) — ver
// api/admin/answer-reports.js.
export async function listAnswerReports({ filter = 'pending', limit = 50, offset = 0 } = {}) {
  const { reports } = await authorizedPost('/api/admin/answer-reports', { filter, limit, offset })
  return reports
}

export async function updateAnswerReport({ id, status }) {
  return authorizedPost('/api/admin/update-answer-report', { id, status })
}
