// Mural de discussão do grupo (tipo fórum) — postar, curtir e apagar. Sem
// edição nesta primeira versão. A permissão de apagar (autor ou moderador
// do grupo) é garantida pela RLS de group_comments, não por este arquivo —
// a UI só deve *esconder* o botão de apagar pra quem não pode, nunca
// confiar só nisso.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Comentários de um grupo, mais antigos primeiro — cada um já com nome do
// autor, contagem de curtidas, e se eu mesmo já curti.
export async function getComments(groupId) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('group_comments')
    .select('id, user_id, body, created_at, pinned, pinned_at, author:profiles!group_comments_user_id_fkey(name), group_comment_likes(user_id)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[commentsStore] getComments failed:', error.message); return [] }
  return (data ?? []).map(c => {
    const likes = c.group_comment_likes ?? []
    return {
      id: c.id,
      userId: c.user_id,
      authorName: c.author?.name ?? '',
      body: c.body,
      createdAt: c.created_at,
      pinned: c.pinned,
      pinnedAt: c.pinned_at,
      likeCount: likes.length,
      likedByMe: likes.some(l => l.user_id === userId),
    }
  })
}

// Fixa/desafixa um comentário — a RPC decide se você pode (moderador do
// grupo) e aplica o limite de 3 fixados; se não puder, lança um erro com
// a mensagem pra mostrar na UI.
export async function setCommentPinned(commentId, pinned) {
  const { error } = await supabase.rpc('set_comment_pinned', { target_comment_id: commentId, new_pinned: pinned })
  if (error) throw new Error(error.message)
}

export async function postComment(groupId, body) {
  const trimmed = body.trim()
  if (!trimmed) return
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { error } = await supabase
    .from('group_comments')
    .insert({ group_id: groupId, user_id: userId, body: trimmed })
  if (error) throw new Error(error.message)
}

// Apaga um comentário — a RLS decide se você pode (autor ou moderador);
// se não puder, o delete simplesmente não afeta nenhuma linha.
export async function deleteComment(commentId) {
  const { error } = await supabase.from('group_comments').delete().eq('id', commentId)
  if (error) throw new Error(error.message)
}

// Curte/descurte — checa o estado atual e alterna.
export async function toggleCommentLike(commentId) {
  const userId = await getUserId()
  if (!userId) return
  const { data: existing, error: fetchError } = await supabase
    .from('group_comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) { console.error('[commentsStore] toggleCommentLike fetch failed:', fetchError.message); return }

  if (existing) {
    const { error } = await supabase
      .from('group_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)
    if (error) console.error('[commentsStore] unlike failed:', error.message)
  } else {
    const { error } = await supabase
      .from('group_comment_likes')
      .insert({ comment_id: commentId, user_id: userId })
    if (error) console.error('[commentsStore] like failed:', error.message)
  }
}
