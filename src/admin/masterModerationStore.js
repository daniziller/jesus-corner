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
export function grantAccess({ emailOrName, kind, reason }) {
  return authorizedPost('/api/admin/access', { op: 'grant', emailOrName, kind, reason })
}
