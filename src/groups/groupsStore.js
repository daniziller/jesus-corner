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
    .select('group_id, role, reading_groups(id, name, created_at, reading_mode)')
    .eq('user_id', userId)
    .eq('status', 'joined')
  if (error) { console.error('[groupsStore] getMyGroups failed:', error.message); return [] }
  return (data ?? [])
    .filter(row => row.reading_groups)
    .map(row => ({
      groupId: row.group_id,
      name: row.reading_groups.name,
      myRole: row.role,
      readingMode: row.reading_groups.reading_mode ?? 'individual',
    }))
}

// Quantas pessoas (status 'joined') tem cada grupo — uma consulta só pra
// todos os grupos de uma vez, usada pela lista de grupos de 24a (mockup
// mostra "6 pessoas", "128 pessoas"...). RLS já garante que só vê membros
// de grupos onde a própria pessoa está.
export async function getGroupMemberCounts(groupIds) {
  if (!groupIds.length) return {}
  const { data, error } = await supabase
    .from('reading_group_members')
    .select('group_id')
    .eq('status', 'joined')
    .in('group_id', groupIds)
  if (error) { console.error('[groupsStore] getGroupMemberCounts failed:', error.message); return {} }
  const counts = {}
  for (const row of data ?? []) counts[row.group_id] = (counts[row.group_id] ?? 0) + 1
  return counts
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
    .select('id, name, description, created_by, created_at, invite_code')
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
    description: group.description,
    createdBy: group.created_by,
    inviteCode: group.invite_code,
    members: (members ?? []).map(m => ({
      userId: m.user_id,
      name: m.member?.name ?? '',
      role: m.role,
      joinedAt: m.joined_at,
    })),
  }
}

// Pedidos de entrada por código, ainda sem decisão do moderador (status
// 'requested' — ver migration 0046_group_invite_codes.sql). Diferente de
// getPendingGroupInvites: aqui é o MODERADOR que consulta os pedidos de
// OUTRAS pessoas pro grupo dele, não a própria pessoa vendo seus convites.
export async function getPendingJoinRequests(groupId) {
  const { data, error } = await supabase
    .from('reading_group_members')
    .select('user_id, created_at, member:profiles!reading_group_members_user_id_fkey(name)')
    .eq('group_id', groupId)
    .eq('status', 'requested')
    .order('created_at', { ascending: true })
  if (error) { console.error('[groupsStore] getPendingJoinRequests failed:', error.message); return [] }
  return (data ?? []).map(r => ({
    userId: r.user_id,
    name: r.member?.name ?? '',
    requestedAt: r.created_at,
  }))
}

// Pede entrada num grupo digitando o código de convite (quadro 19c) — cria
// a própria linha 'requested', que um moderador aprova ou recusa depois
// (ver respondToJoinRequest). Devolve o grupo (nome) pra confirmar na hora
// pra quem pediu.
export async function redeemGroupInviteCode(code) {
  const { data, error } = await supabase.rpc('redeem_group_invite_code', { code })
  if (error) throw new Error(error.message)
  return { groupId: data?.id, name: data?.name }
}

// Aprova ou recusa um pedido de entrada por código — só quem já é
// moderador do grupo pode chamar (a RPC recusa se não for).
export async function respondToJoinRequest(groupId, userId, accept) {
  const { error } = await supabase.rpc('respond_to_group_join_request', {
    target_group_id: groupId,
    target_user_id: userId,
    accept,
  })
  if (error) throw new Error(error.message)
}

// Cria um grupo (e já entra como moderador) via RPC — ver
// create_reading_group() na migração pra saber por que isso é uma RPC e
// não dois inserts direto do client.
// `readingMode` — 'individual' (padrão, como sempre foi) ou 'shared'
// ("um plano só", quadro 24b). Limitação real, documentada na migration
// 0051: guarda a escolha, mas nenhuma tela ainda sincroniza de fato a
// leitura de um grupo 'shared' — GroupHomeView.jsx continua usando a
// sessão de hoje de cada pessoa.
export async function createGroup(name, readingMode = 'individual') {
  const { data, error } = await supabase.rpc('create_reading_group', { group_name: name.trim(), p_reading_mode: readingMode })
  if (error) throw new Error(error.message)
  return { groupId: data?.id, name: data?.name, readingMode: data?.reading_mode }
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

// Sai do grupo (pedido dela, 2026-09-10: "ao sair, todas as mensagens
// enviadas por ela se tornam anônimas") — antes era um DELETE direto na
// própria linha de membro; agora passa pela RPC leave_group_and_
// anonymize (migration 0062), que numa transação só torna anônimas as
// mensagens da pessoa NESSE grupo (sala de capítulo, discussão geral,
// pedidos de oração de escopo grupo — mesmo union de "mensagem" que a
// caixa unificada já usa, ver 0057_group_messages.sql) e só DEPOIS
// remove a participação. (Cancelar/recusar um CONVITE pendente é outra
// função — respondToGroupInvite(groupId, false) — não passa por aqui.)
export async function leaveGroup(groupId) {
  const { error } = await supabase.rpc('leave_group_and_anonymize', { target_group_id: groupId })
  if (error) throw new Error(error.message)
}

// Sair sendo a ÚNICA moderadora do grupo (pedido dela, 2026-09-09) —
// diferente de leaveGroup: promove `newModeratorUserId` a moderador ANTES
// de sair, tudo na mesma transação (migration 0063), pra nunca deixar o
// grupo sem moderador nenhum entre um passo e outro. Mesma anonimização
// de mensagens de leaveGroup por baixo dos panos.
export async function leaveGroupWithNewModerator(groupId, newModeratorUserId) {
  const { error } = await supabase.rpc('leave_group_with_new_moderator', {
    target_group_id: groupId,
    new_moderator_id: newModeratorUserId,
  })
  if (error) throw new Error(error.message)
}

// Apaga o grupo de vez (pedido dela, 2026-09-09: alternativa a escolher
// novo moderador, quando quem está saindo é a única moderadora) — só
// quem é moderador pode chamar (a RPC recusa se não for). Todo o resto
// (membros, posts, comentários, pedidos de oração do grupo, sala de
// capítulo...) cai numa cascata só de `on delete cascade` já configurada
// nas tabelas desde suas migrations originais — não precisa apagar cada
// uma na mão.
export async function deleteGroup(groupId) {
  const { error } = await supabase.rpc('delete_group', { target_group_id: groupId })
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

// Edita nome/descrição do grupo (quadro 19c) — só moderador.
export async function updateGroupInfo(groupId, name, description) {
  const { error } = await supabase.rpc('update_group_info', {
    target_group_id: groupId,
    new_name: name,
    new_description: description,
  })
  if (error) throw new Error(error.message)
}

// Remove um membro comum do grupo (quadro 19c, opção "remover" ao tocar
// num membro) — só moderador, e nunca sobre outro moderador ou a própria
// linha (ver migration 0047_group_remove_member.sql).
export async function removeGroupMember(groupId, userId) {
  const { error } = await supabase.rpc('remove_group_member', {
    target_group_id: groupId,
    target_user_id: userId,
  })
  if (error) throw new Error(error.message)
}
