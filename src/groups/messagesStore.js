// Caixa de mensagens da Comunidade (quadros 33a/33b) — três origens já
// existentes (sala de capítulo, pedido de oração de grupo, discussão
// geral) unificadas por RPC (ver migration 0057_group_messages.sql), não
// uma tabela nova duplicando o texto. avatar_url já vem assinado pela
// mesma resolveAvatarUrl de sempre (friendsStore.js usa o mesmo padrão).
import { supabase } from '../lib/supabaseClient'
import { resolveAvatarUrl } from '../profile/profileStore'

// Resumo por grupo — badge de cada linha em "Seus grupos" (24a/33a) + soma
// pro sino do cabeçalho (junto com pedidos de amizade, contados à parte).
export async function getGroupMessagesSummary() {
  const { data, error } = await supabase.rpc('get_group_messages_summary')
  if (error) { console.error('[messagesStore] summary failed:', error.message); return [] }
  return (data ?? []).map(row => ({
    groupId: row.group_id,
    groupName: row.group_name,
    unreadCount: row.unread_count ?? 0,
    totalCount: row.total_count ?? 0,
  }))
}

// Lista unificada (33b) — já vem ordenada (não lidas primeiro, mais
// recente no topo; depois as lidas). `locked` é só pra sala de capítulo
// que a pessoa ainda não leu (body vem null de propósito, ver migration).
export async function getGroupMessages(maxN = 100) {
  const { data, error } = await supabase.rpc('get_group_messages', { max_n: maxN })
  if (error) { console.error('[messagesStore] list failed:', error.message); return [] }
  return Promise.all((data ?? []).map(async row => ({
    id: row.id,
    kind: row.kind, // 'sala_capitulo' | 'pedido_oracao' | 'geral'
    groupId: row.group_id,
    groupName: row.group_name,
    authorId: row.author_id,
    authorName: row.author_name, // null = anônimo
    authorAvatarUrl: row.author_avatar_url ? await resolveAvatarUrl(row.author_avatar_url) : null,
    body: row.body, // null quando locked (sala de capítulo ainda não lida)
    contextBook: row.context_book, // só pra sala de capítulo — nome canônico (pt), traduza com bookLabel()
    contextChapter: row.context_chapter,
    createdAt: row.created_at,
    isRead: !!row.is_read,
    locked: !!row.locked,
  })))
}

// "Marcar lidas" (33b) — zera o badge inteiro, sem abrir nada.
export async function markGroupMessagesRead() {
  const { error } = await supabase.rpc('mark_group_messages_read')
  if (error) { console.error('[messagesStore] mark read failed:', error.message); throw error }
}
