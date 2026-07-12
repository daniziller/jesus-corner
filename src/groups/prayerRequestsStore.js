// Pedidos de oração dentro de um grupo — mesma "UI esconde, RLS decide"
// dos outros stores de grupo (ver commentsStore.js). Dois níveis: o pedido
// em si (com a reação "orando por isso") e os comentários daquele pedido
// (com curtida) — por isso duas seções de funções aqui, não uma lista só.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// ── Pedidos ──

export async function getPrayerRequests(groupId) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('group_prayer_requests')
    .select('id, user_id, body, created_at, author:profiles!group_prayer_requests_user_id_fkey(name, avatar_url), group_prayer_intentions(user_id), group_prayer_comments(id)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[prayerRequestsStore] getPrayerRequests failed:', error.message); return [] }
  return (data ?? []).map(row => {
    const intentions = row.group_prayer_intentions ?? []
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.author?.name ?? '',
      authorAvatarUrl: row.author?.avatar_url ?? null,
      body: row.body,
      createdAt: row.created_at,
      prayingCount: intentions.length,
      prayingByMe: intentions.some(i => i.user_id === userId),
      commentCount: (row.group_prayer_comments ?? []).length,
    }
  })
}

export async function postPrayerRequest(groupId, body) {
  const trimmed = body.trim()
  if (!trimmed) return
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { error } = await supabase
    .from('group_prayer_requests')
    .insert({ group_id: groupId, user_id: userId, body: trimmed })
  if (error) throw new Error(error.message)
}

// Apaga um pedido (e, em cascata, seus comentários/intenções) — a RLS
// decide se você pode (autor ou moderador).
export async function deletePrayerRequest(requestId) {
  const { error } = await supabase.from('group_prayer_requests').delete().eq('id', requestId)
  if (error) throw new Error(error.message)
}

// "Orando por isso" — checa o estado atual e alterna, igual a uma curtida.
export async function togglePraying(requestId) {
  const userId = await getUserId()
  if (!userId) return
  const { data: existing, error: fetchError } = await supabase
    .from('group_prayer_intentions')
    .select('prayer_request_id')
    .eq('prayer_request_id', requestId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) { console.error('[prayerRequestsStore] togglePraying fetch failed:', fetchError.message); return }

  if (existing) {
    const { error } = await supabase
      .from('group_prayer_intentions')
      .delete()
      .eq('prayer_request_id', requestId)
      .eq('user_id', userId)
    if (error) console.error('[prayerRequestsStore] unmark praying failed:', error.message)
  } else {
    const { error } = await supabase
      .from('group_prayer_intentions')
      .insert({ prayer_request_id: requestId, user_id: userId })
    if (error) console.error('[prayerRequestsStore] mark praying failed:', error.message)
  }
}

// ── Comentários de um pedido ──

export async function getPrayerComments(requestId) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('group_prayer_comments')
    .select('id, user_id, body, created_at, author:profiles!group_prayer_comments_user_id_fkey(name), group_prayer_comment_likes(user_id)')
    .eq('prayer_request_id', requestId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[prayerRequestsStore] getPrayerComments failed:', error.message); return [] }
  return (data ?? []).map(row => {
    const likes = row.group_prayer_comment_likes ?? []
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.author?.name ?? '',
      body: row.body,
      createdAt: row.created_at,
      likeCount: likes.length,
      likedByMe: likes.some(l => l.user_id === userId),
    }
  })
}

export async function postPrayerComment(requestId, body) {
  const trimmed = body.trim()
  if (!trimmed) return
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { error } = await supabase
    .from('group_prayer_comments')
    .insert({ prayer_request_id: requestId, user_id: userId, body: trimmed })
  if (error) throw new Error(error.message)
}

export async function deletePrayerComment(commentId) {
  const { error } = await supabase.from('group_prayer_comments').delete().eq('id', commentId)
  if (error) throw new Error(error.message)
}

export async function toggleCommentLike(commentId) {
  const userId = await getUserId()
  if (!userId) return
  const { data: existing, error: fetchError } = await supabase
    .from('group_prayer_comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) { console.error('[prayerRequestsStore] toggleCommentLike fetch failed:', fetchError.message); return }

  if (existing) {
    const { error } = await supabase
      .from('group_prayer_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)
    if (error) console.error('[prayerRequestsStore] unlike failed:', error.message)
  } else {
    const { error } = await supabase
      .from('group_prayer_comment_likes')
      .insert({ comment_id: commentId, user_id: userId })
    if (error) console.error('[prayerRequestsStore] like failed:', error.message)
  }
}
