// Sala do capítulo (quadro 17a) e camada do grupo na leitura (17c) — ver
// migration 0045. Uma sala por (grupo, livro, capítulo): pergunta da semana
// do moderador, respostas de quem já leu, reação única "Amém".
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// "7 de 12 concluíram" — só números, pra quem ainda não leu ver sem spoiler.
export async function getRoomStats(groupId, book, chapter) {
  const { data, error } = await supabase.rpc('group_chapter_room_stats', { target_group_id: groupId, target_book: book, target_chapter: chapter })
  if (error) { console.error('[chapterRoomStore] stats failed:', error.message); return { members: 0, completed: 0, posts: 0 } }
  const row = Array.isArray(data) ? data[0] : data
  return { members: row?.members ?? 0, completed: row?.completed ?? 0, posts: row?.posts ?? 0 }
}

export async function getRoomQuestion(groupId, book, chapter) {
  const { data, error } = await supabase
    .from('group_chapter_questions')
    .select('id, body, created_at, updated_at, author:profiles!group_chapter_questions_author_id_fkey(name)')
    .eq('group_id', groupId).eq('book', book).eq('chapter', chapter)
    .maybeSingle()
  if (error) { console.error('[chapterRoomStore] question failed:', error.message); return null }
  return data ? { id: data.id, body: data.body, authorName: data.author?.name ?? '', updatedAt: data.updated_at } : null
}

// Só moderador (policy). Cria ou substitui a pergunta da sala.
export async function setRoomQuestion(groupId, book, chapter, body) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const clean = body.trim()
  if (!clean) return
  const { error } = await supabase
    .from('group_chapter_questions')
    .upsert({ group_id: groupId, book, chapter, author_id: userId, body: clean, updated_at: new Date().toISOString() }, { onConflict: 'group_id,book,chapter' })
  if (error) throw new Error(error.message)
}

// Respostas da sala (a policy já devolve vazio pra quem não concluiu).
export async function getRoomPosts(groupId, book, chapter) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('group_chapter_posts')
    .select('id, user_id, body, quote_text, quote_ref, created_at, author:profiles!group_chapter_posts_user_id_fkey(name), group_post_amens(user_id)')
    .eq('group_id', groupId).eq('book', book).eq('chapter', chapter)
    .order('created_at', { ascending: false })
  if (error) { console.error('[chapterRoomStore] posts failed:', error.message); return [] }
  return (data ?? []).map(p => ({
    id: p.id,
    userId: p.user_id,
    authorName: p.author?.name ?? '',
    body: p.body,
    quoteText: p.quote_text,
    quoteRef: p.quote_ref,
    createdAt: p.created_at,
    amenCount: (p.group_post_amens ?? []).length,
    amenByMe: (p.group_post_amens ?? []).some(a => a.user_id === userId),
  }))
}

export async function postToRoom(groupId, book, chapter, body, quote = null) {
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const clean = body.trim()
  if (!clean) return
  const { error } = await supabase.from('group_chapter_posts').insert({
    group_id: groupId, book, chapter, user_id: userId, body: clean,
    quote_text: quote?.text ?? null, quote_ref: quote?.ref ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function deleteRoomPost(postId) {
  const { error } = await supabase.from('group_chapter_posts').delete().eq('id', postId)
  if (error) throw new Error(error.message)
}

// Reação única — liga/desliga o meu "Amém".
export async function toggleAmen(postId, currentlyMine) {
  const userId = await getUserId()
  if (!userId) return
  if (currentlyMine) {
    const { error } = await supabase.from('group_post_amens').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('group_post_amens').insert({ post_id: postId, user_id: userId })
    if (error) throw new Error(error.message)
  }
}

// 17c — versículos deste capítulo marcados por outros membros do grupo:
// { [verse]: { marks, sharers: [{ name, note }] } }.
export async function getGroupMarks(groupId, book, chapter) {
  const { data, error } = await supabase.rpc('group_chapter_marks', { target_group_id: groupId, target_book: book, target_chapter: chapter })
  if (error) { console.error('[chapterRoomStore] marks failed:', error.message); return {} }
  const out = {}
  for (const row of data ?? []) out[row.verse] = { marks: row.marks, sharers: Array.isArray(row.sharers) ? row.sharers : [] }
  return out
}

// Preferência local "Ver marcações do grupo" (rodapé do 17c) — ligada por
// padrão; só esconde a camada, nunca apaga nada.
const VISIBLE_KEY = 'jc_group_marks_visible'
export function getGroupMarksVisible() {
  try { return localStorage.getItem(VISIBLE_KEY) !== '0' } catch { return true }
}
export function setGroupMarksVisible(on) {
  try { localStorage.setItem(VISIBLE_KEY, on ? '1' : '0') } catch { /* ignora */ }
}
