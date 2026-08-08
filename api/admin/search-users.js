// Busca usuário por email (substring, case-insensitive) — usado pelo
// seletor de "usuário específico" no Aviso geral. listAllUsers já pagina
// certo (ver api/_lib/adminUsers.js); filtrar em JS é razoável na escala
// atual do app (dezenas de usuários), sem precisar de índice/RPC dedicado.
import { requireAdmin } from '../_lib/adminAuth.js'
import { listAllUsers } from '../_lib/adminUsers.js'

const MAX_RESULTS = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const query = (req.body?.query ?? '').trim().toLowerCase()
  if (!query) return res.status(200).json({ users: [] })

  let users
  try {
    users = await listAllUsers()
  } catch (err) {
    console.error('Failed to list users for search:', err.message)
    return res.status(500).json({ error: 'list_users_failed' })
  }

  const matches = users
    .filter(u => u.email?.toLowerCase().includes(query))
    .slice(0, MAX_RESULTS)
    .map(u => ({ id: u.id, email: u.email, name: u.user_metadata?.name ?? null }))

  return res.status(200).json({ users: matches })
}
