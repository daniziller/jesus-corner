// Amizades — pedido/aceite entre usuários. Diferente dos stores de
// progresso pessoal (que só leem/escrevem a própria linha em user_data),
// este e os stores de grupos/desafios/comentários lidam com dados que
// ficam visíveis entre usuários diferentes — a segurança de verdade é a
// RLS definida em supabase/migrations/0002_friends_groups_challenges.sql,
// não o código aqui.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Amigos já aceitos — {friendshipId, userId, name, avatarUrl} pra cada
// amizade, já resolvendo qual lado do par (requester/addressee) é "o outro".
export async function getFriends() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(name, avatar_url)')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) { console.error('[friendsStore] getFriends failed:', error.message); return [] }
  return (data ?? []).map(row => {
    const isRequester = row.requester_id === userId
    const other = isRequester ? row.addressee : row.requester
    return {
      friendshipId: row.id,
      userId: isRequester ? row.addressee_id : row.requester_id,
      name: other?.name ?? '',
      avatarUrl: other?.avatar_url ?? null,
    }
  })
}

// Pedidos de amizade recebidos, ainda pendentes de resposta.
export async function getPendingRequests() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, requester:profiles!friendships_requester_id_fkey(name, avatar_url), created_at')
    .eq('status', 'pending')
    .eq('addressee_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[friendsStore] getPendingRequests failed:', error.message); return [] }
  return (data ?? []).map(row => ({
    friendshipId: row.id,
    userId: row.requester_id,
    name: row.requester?.name ?? '',
    avatarUrl: row.requester?.avatar_url ?? null,
    createdAt: row.created_at,
  }))
}

// Só a contagem — usado pro sino de notificações e pelo indicador de
// pendência na navegação, mais leve que buscar os dados inteiros.
export async function getPendingFriendRequestsCount() {
  const userId = await getUserId()
  if (!userId) return 0
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('addressee_id', userId)
  if (error) { console.error('[friendsStore] getPendingFriendRequestsCount failed:', error.message); return 0 }
  return count ?? 0
}

// Contagem de amigos do PRÓPRIO usuário logado — pro stat "N amigos" no
// Perfil. Pra ver a contagem/lista de amigos de outra pessoa, ver
// getFriendFriendsList (RPC, respeita amizade + perfil público).
export async function getFriendsCount() {
  const userId = await getUserId()
  if (!userId) return 0
  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) { console.error('[friendsStore] getFriendsCount failed:', error.message); return 0 }
  return count ?? 0
}

// Lista de amigos de UM AMIGO específico (não do usuário logado) — só
// devolve algo se o perfil dele for público (ver get_friend_friends_list
// em 0012_friend_friends_list.sql). Usada no painel de perfil expandido da
// Comunidade, pra mostrar "amigos em comum" e permitir adicionar direto.
export async function getFriendFriendsList(targetUserId) {
  const { data, error } = await supabase.rpc('get_friend_friends_list', { target_user_id: targetUserId })
  if (error) { console.error('[friendsStore] getFriendFriendsList failed:', error.message); return { isPublic: false, friends: [] } }
  return { isPublic: !!data?.isPublic, friends: data?.friends ?? [] }
}

// Envia um pedido de amizade por email — resolve o email pro user_id via
// a RPC find_user_by_email (não expõe busca livre de usuários) e insere
// o pedido. Se o email não pertence a ninguém cadastrado, manda um convite
// por email em vez de dar erro (ver api/invite-friend.js) — o retorno tem
// `invited: true` nesse caso, pra UI mostrar uma mensagem diferente de erro.
export async function sendFriendRequest(email) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')

  const { data: found, error: findError } = await supabase
    .rpc('find_user_by_email', { target_email: email.trim().toLowerCase() })
    .maybeSingle()
  if (findError) throw new Error(findError.message)
  if (found && found.user_id === userId) throw new Error('Você não pode adicionar a si mesmo.')

  if (!found) {
    return await inviteUnregisteredFriend(email)
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: found.user_id })
  if (error) {
    if (error.code === '23505') throw new Error('Vocês já são amigos ou já existe um pedido pendente.')
    throw new Error(error.message)
  }
  return { userId: found.user_id, name: found.name, invited: false }
}

// Envia um pedido de amizade direto por user_id (sem passar por
// find_user_by_email) — usada quando o alvo já é conhecido, como na lista
// de "amigos do meu amigo" (ver FriendProfilePanel em GroupsScreen.jsx).
export async function sendFriendRequestByUserId(targetUserId) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  if (targetUserId === userId) throw new Error('Você não pode adicionar a si mesmo.')

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: targetUserId })
  if (error) {
    if (error.code === '23505') throw new Error('Vocês já são amigos ou já existe um pedido pendente.')
    throw new Error(error.message)
  }
}

async function inviteUnregisteredFriend(email) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Você precisa estar logado.')

  const res = await fetch('/api/invite-friend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body.error === 'email_service_not_configured') {
      throw new Error('Não encontramos ninguém com esse email no Jesus\' Corner, e o envio de convites ainda não está configurado.')
    }
    throw new Error('Não encontramos ninguém com esse email no Jesus\' Corner, e não foi possível enviar um convite agora.')
  }
  return { invited: true }
}

// Aceita ou recusa um pedido recebido — recusar simplesmente apaga a
// linha (não existe estado "recusado", ver migração).
export async function respondToFriendRequest(friendshipId, accept) {
  if (accept) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    if (error) throw new Error(error.message)
  }
}

// Desfaz uma amizade já aceita (ou cancela um pedido que você mesmo enviou).
export async function removeFriend(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw new Error(error.message)
}
