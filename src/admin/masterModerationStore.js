// Painel do Master (handoff-admin-42, Bloco 4) — 42f/42g/42h. Mesmo
// helper authorizedPost de src/admin/adminStore.js, um arquivo por tela
// pra não misturar os três domínios (moderação/grupos/acessos) num só.
import { supabase } from '../lib/supabaseClient'

async function authorizedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `request_failed_${res.status}`)
  return data
}

// 42f — Moderação
export function getModerationQueue() {
  return authorizedPost('/api/admin/moderation', { op: 'queue' })
}
export function getModerationCase(kind, id) {
  return authorizedPost('/api/admin/moderation', { op: 'case', kind, id })
}
export function decideModerationCase({ kind, id, decision, reason }) {
  return authorizedPost('/api/admin/moderation', { op: 'decide', kind, id, decision, reason })
}
export async function exportModerationLog() {
  const { rows } = await authorizedPost('/api/admin/moderation', { op: 'export' })
  return rows
}

// 42g — Grupos e igrejas
export function getAdminGroupsList() {
  return authorizedPost('/api/admin/groups', { op: 'list' })
}
export function getAdminGroupDetail(groupId) {
  return authorizedPost('/api/admin/groups', { op: 'detail', groupId })
}
export function adminGroupAction({ groupId, action, newAdminUserId, message }) {
  return authorizedPost('/api/admin/groups', { op: 'action', groupId, action, newAdminUserId, message })
}
export async function getGroupWall(groupId) {
  const { comments } = await authorizedPost('/api/admin/groups', { op: 'wall', groupId })
  return comments
}

// 42h — Acessos
export function getAccessGrants() {
  return authorizedPost('/api/admin/access', { op: 'list' })
}
// Um caso da fila tem alguém sobre quem agir? A denúncia de mensagem
// sempre tem; um problema reportado só quando o admin anexou uma pessoa.
// Sem ninguém, silenciar e bloquear não aparecem (antes fechavam o caso
// sem fazer nada).
export function casePerson(detail) {
  return detail?.kind === 'message_report' || !!detail?.attachedUserId
}

// Código de erro de /api/admin/access → chave de texto (admin.access.*).
export const GRANT_ERRORS = {
  person_not_found: 'personNotFoundError',
  ambiguous_name: 'ambiguousNameError',
  already_paying: 'alreadyPayingError',
  already_lifetime: 'alreadyLifetimeError',
}

export function grantAccess({ emailOrName, kind, reason }) {
  return authorizedPost('/api/admin/access', { op: 'grant', emailOrName, kind, reason })
}

// 42b — Alertas (Bloco 5, Master no celular)
export function getMasterAlerts() {
  return authorizedPost('/api/admin/alerts', { op: 'list' })
}
export function decideMasterAlert({ id, decision }) {
  return authorizedPost('/api/admin/alerts', { op: 'decide', id, decision })
}
export function markAllAlertsSeen() {
  return authorizedPost('/api/admin/alerts', { op: 'mark_all_seen' })
}

// 42d — Pessoa (Bloco 5)
export function getPersonDetail(userId) {
  return authorizedPost('/api/admin/person', { op: 'detail', userId })
}
export function extendPersonTrial({ userId, days }) {
  return authorizedPost('/api/admin/person', { op: 'extend_trial', userId, days })
}
export function enterAsPerson(userId) {
  return authorizedPost('/api/admin/person', { op: 'enter_as', userId })
}
export function blockPersonAccount({ userId, reason }) {
  return authorizedPost('/api/admin/person', { op: 'block_account', userId, reason })
}
// Exclusão a pedido por e-mail (LGPD art. 18, VI) — mesma exclusão do app.
export function deletePersonAccount({ userId, confirmEmail }) {
  return authorizedPost('/api/admin/person', { op: 'delete_account', userId, confirmEmail })
}
