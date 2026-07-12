// Grupos de leitura e seus membros. Convite sempre parte de uma amizade já
// aceita (ver friendsStore.js) — toda a lógica de "só amigo convida" e
// "só moderador promove" mora nas RPCs do banco
// (supabase/migrations/0002_friends_groups_challenges.sql), não aqui.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Grupos dos quais já sou membro de verdade (status 'joined').
export async function getMyGroups() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('reading_group_members')
    .select('group_id, role, reading_groups(id, name, created_at)')
    .eq('user_id', userId)
    .eq('status', 'joined')
  if (error) { console.error('[groupsStore] getMyGroups failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.reading_groups)
    .map(row => ({
      groupId: row.group_id,
      name: row.reading_groups.name,
      myRole: row.role,
    }))
}

// Convites de grupo pendentes (ainda não aceitos/recusados).
export async function getPendingGroupInvites() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('reading_group_members')
    .select('group_id, created_at, reading_groups(name), inviter:profiles!reading_group_members_invited_by_fkey(name)')
    .eq('user_id', userId)
    .eq('status', 'invited')
    .order('created_at', { ascending: false })
  if (error) { console.error('[groupsStore] getPendingGroupInvites failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.reading_groups)
    .map(row => ({
      groupId: row.group_id,
      groupName: row.reading_groups.name,
      invitedByName: row.inviter?.name ?? '',
      createdAt: row.created_at,
    }))
}

// Só a contagem — usado pro sino de notificações e pelo indicador de
// pendência na navegação.
export async function getPendingGroupInvitesCount() {
  const userId = await getUserId()
  if (!userId) return 0
  const { count, error } = await supabase
    .from('reading_group_members')
    .select('group_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'invited')
  if (error) { console.error('[groupsStore] getPendingGroupInvitesCount failed:', error.message); return 0 }
  return count ?? 0
}

// Detalhe de um grupo: nome + lista de membros já ativos (status 'joined').
export async function getGroupDetail(groupId) {
  const { data: group, error: groupError } = await supabase
    .from('reading_groups')
    .select('id, name, created_by, created_at')
    .eq('id', groupId)
    .maybeSingle()
  if (groupError || !group) {
    if (groupError) console.error('[groupsStore] getGroupDetail failed:', groupError.message)
    return null
  }

  const { data: members, error: membersError } = await supabase
    .from('reading_group_members')
    .select('user_id, role, status, joined_at, member:profiles!reading_group_members_user_id_fkey(name)')
    .eq('group_id', groupId)
    .eq('status', 'joined')
    .order('joined_at', { ascending: true })
  if (membersError) console.error('[groupsStore] getGroupDetail members failed:', membersError.message)

  return {
    id: group.id,
    name: group.name,
    createdBy: group.created_by,
    members: (members ?? []).map(m => ({
      userId: m.user_id,
      name: m.member?.name ?? '',
      role: m.role,
      joinedAt: m.joined_at,
    })),
  }
}

// Cria um grupo (e já entra como moderador) via RPC — ver
// create_reading_group() na migração pra saber por que isso é uma RPC e
// não dois inserts direto do client.
export async function createGroup(name) {
  const { data, error } = await supabase.rpc('create_reading_group', { group_name: name.trim() })
  if (error) throw new Error(error.message)
  return { groupId: data?.id, name: data?.name }
}

// Convida um amigo já aceito pra um grupo do qual eu já sou membro.
export async function inviteFriendToGroup(groupId, friendUserId) {
  const { error } = await supabase.rpc('invite_friend_to_group', {
    target_group_id: groupId,
    friend_user_id: friendUserId,
  })
  if (error) throw new Error(error.message)
}

// Aceita ou recusa um convite de grupo pendente.
export async function respondToGroupInvite(groupId, accept) {
  const { error } = await supabase.rpc('respond_to_group_invite', {
    target_group_id: groupId,
    accept,
  })
  if (error) throw new Error(error.message)
}

// Sai do grupo (ou cancela/recusa um convite ainda pendente) apagando a
// própria linha de membro.
export async function leaveGroup(groupId) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase
    .from('reading_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// Promove ou rebaixa outro membro — só quem já é moderador do grupo pode
// chamar (a RPC recusa se quem chama não for moderador).
export async function setMemberRole(groupId, userId, role) {
  const { error } = await supabase.rpc('set_group_member_role', {
    target_group_id: groupId,
    target_user_id: userId,
    new_role: role,
  })
  if (error) throw new Error(error.message)
}
