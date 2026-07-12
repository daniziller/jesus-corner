// Feed de atividade dos amigos — livro concluído, subiu de nível, entrou num
// grupo. Diferente dos outros stores (que leem/escrevem o estado ATUAL),
// esse só registra e lê EVENTOS já acontecidos — cada linha é permanente,
// nunca atualizada. A RLS decide quem pode ver o quê (só você mesmo, ou
// amigos aceitos cujo perfil está público — ver 0005_friend_activity.sql);
// esse arquivo não filtra nada além disso.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Registra um marco (fire-and-forget, chamado no exato momento em que o
// client já detectou o marco pra atualizar a própria UI — ver App.jsx e
// groupsStore.respondToGroupInvite). Nunca lança pro chamador: atividade é
// um "extra", uma falha aqui não pode quebrar o fluxo principal (marcar
// capítulo, entrar no grupo etc.).
export async function logActivity(type, payload = {}) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('friend_activity').insert({ user_id: userId, type, payload })
  if (error) console.error('[activityStore] logActivity failed:', error.message)
}

// Atividade dos amigos (nunca a própria) — mais recente primeiro. A RLS já
// só devolve linhas de amigos aceitos com perfil público (ou suas próprias,
// por isso o filtro .neq abaixo pra manter o feed só de "amigos").
export async function getFriendsActivity(limit = 20) {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('friend_activity')
    .select('id, user_id, type, payload, created_at, author:profiles!friend_activity_user_id_fkey(name, avatar_url)')
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[activityStore] getFriendsActivity failed:', error.message); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    payload: row.payload,
    createdAt: row.created_at,
    authorName: row.author?.name ?? '',
    authorAvatarUrl: row.author?.avatar_url ?? null,
  }))
}
