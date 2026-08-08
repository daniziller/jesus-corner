// Lista completa de auth.users, paginada de verdade — perPage default da
// Digital/GoTrue admin API é 50, sem paginação qualquer busca alcançaria só
// os 50 primeiros cadastros. Usado pelo broadcast (calcular destinatários)
// e pela busca de usuário por email (api/admin/search-users.js) — os dois
// endpoints precisam do objeto completo (email + user_metadata), não só do
// id, então não dá pra resolver via find_user_by_email() (RPC que só
// devolve id+name, ver 0002_friends_groups_challenges.sql).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function listAllUsers() {
  const users = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
    page++
  }
  return users
}
