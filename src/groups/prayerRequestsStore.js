// Pedidos de oração na identidade nova (25a/25b, Bloco 11) — migration
// 0052_prayer_requests_scope.sql. Pedido tem ESCOPO ('group' — um grupo
// específico, 'friends' — todos os seus amigos aceitos, ou 'only_me' — só
// você), pode ser anônimo, e o contador de quem orou nunca expõe
// identidade (nem pro autor): as leituras abaixo passam por RPC security
// definer (get_my_prayer_requests/get_prayer_requests_feed) que já
// devolve a contagem pronta, nunca as linhas de group_prayer_intentions
// de outras pessoas. Comentários voltaram na migration 0070 (ver o fim
// deste arquivo).
//
// Bloco 2 do pacote 36-37 (migration 0059_prayer_request_response.sql)
// acrescenta o ciclo de resposta ("Como Deus respondeu?", 36e) e vira
// "Orei por isso" de toggle em marca-por-dia — em TODO lugar que usa
// group_prayer_intentions, inclusive aqui (markPraying substitui o antigo
// togglePraying). Desmarcar só existe num lugar: a Súplica (S2, pacote
// 53-54), e só a marca de HOJE feita naquela mesma oração
// (unmarkPrayingToday) — as telas chamam pedidos/orei.js, nunca daqui
// direto.
//
// As funções de LEITURA (getMyPrayerRequests/getPrayerRequestsFeed)
// relançam o erro do RPC em vez de engolir e
// devolver lista vazia — bug real encontrado 2026-09-19: sem a migration
// 0059 rodada, get_my_prayer_requests não existia, a chamada falhava, e
// o catch de cada tela nunca disparava (a promise nunca rejeitava) — a
// tela só via "nenhum pedido ativo", indistinguível de estar vazia de
// verdade. Toda tela que chama essas funções já tinha um `.catch()`
// escrito esperando por isso; só nunca disparava.
import { supabase } from '../lib/supabaseClient'
import { dateKey } from '../utils/dateKey'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

function mapFeedRow(row) {
  return {
    id: row.id,
    userId: row.author_id,
    authorName: row.author_name ?? '',
    body: row.body,
    anonymous: row.anonymous,
    scope: row.scope,
    groupId: row.group_id,
    groupName: row.group_name ?? '',
    createdAt: row.created_at,
    prayCount: Number(row.pray_count ?? 0),
    prayingByMe: !!row.already_prayed,
    prayedEver: !!row.already_prayed_ever,
  }
}

// Lista completa — "Ver todos" (25a) quando groupId é null, ou a aba de
// oração de um grupo específico quando não. Inclui os SEUS pedidos de
// qualquer escopo (pra você gerenciar/encerrar), não só os de outras
// pessoas.
export async function getPrayerRequestsFeed(groupId = null, maxN = 50) {
  const { data, error } = await supabase.rpc('get_prayer_requests_feed', { target_group_id: groupId, max_n: maxN })
  if (error) { console.error('[prayerRequestsStore] getPrayerRequestsFeed failed:', error.message); throw new Error(error.message) }
  return (data ?? []).map(row => ({ ...mapFeedRow(row), isMine: !!row.is_mine, status: row.status }))
}

// `scope`: 'group' (precisa de groupId) | 'friends' | 'only_me'.
export async function createPrayerRequest({ body, scope, groupId = null, anonymous = false }) {
  const trimmed = body.trim()
  if (!trimmed) return
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { error } = await supabase
    .from('group_prayer_requests')
    .insert({
      user_id: userId,
      body: trimmed,
      scope,
      group_id: scope === 'group' ? groupId : null,
      anonymous,
    })
  if (error) throw new Error(error.message)
}

// Apaga um pedido (e, em cascata, suas intenções) — a RLS decide se você
// pode (autor, ou moderador quando o pedido é de um grupo).
export async function deletePrayerRequest(requestId) {
  const { error } = await supabase.from('group_prayer_requests').delete().eq('id', requestId)
  if (error) throw new Error(error.message)
}

// Encerra um pedido (status -> 'closed') — só o autor, via RPC (garante
// que só o status muda, ver migration).
export async function closePrayerRequest(requestId) {
  const { error } = await supabase.rpc('close_prayer_request', { target_request_id: requestId })
  if (error) throw new Error(error.message)
}

// "Escrever com ajuda" (25b) — a pessoa desabafa livre no campo, isto
// devolve um rascunho de pedido curto (até 240 caracteres) que ela ainda
// aprova/edita antes de publicar. Precisa de session.hasAI (403
// subscription_required se não tiver — quem chama já esconde o botão
// nesse caso, ver components/pedidos/FolhaFazerPedido.jsx).
export async function composePrayerRequestDraft({ text, lang }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/compose-prayer-request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error || `request_failed_${res.status}`)
    if (body?.remaining != null) Object.assign(err, { used: body.used, remaining: body.remaining, max: body.max })
    throw err
  }
  return body.request
}

// "Orei por isso" — marca O DIA, não o clique (migration 0059): insere a
// linha de hoje e pronto, repetir no mesmo dia não faz nada (conflito de
// chave ignorado). Sem "desmarcar" — uma vez orado, fica orado. A RLS de
// group_prayer_intentions só deixa ver a PRÓPRIA linha (nunca a de outra
// pessoa), então isto nunca vaza identidade de ninguém.
export async function markPraying(requestId) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase
    .from('group_prayer_intentions')
    .upsert(
      // Data LOCAL (dateKey), não UTC — "uma vez por dia" virava às 21h no
      // Brasil (varredura 2026-10-25).
      { prayer_request_id: requestId, user_id: userId, prayed_date: dateKey() },
      { onConflict: 'prayer_request_id,user_id,prayed_date', ignoreDuplicates: true },
    )
  // Lança (não só loga) — quem chama faz atualização otimista e reverte no
  // .catch; engolindo o erro aqui, a reversão nunca rodava e "orei" ficava
  // marcado na tela sem ter sido gravado (varredura 2026-10-25).
  if (error) throw new Error(`mark praying failed: ${error.message}`)
}

// Desfaz a marca de HOJE (dia do aparelho) num pedido — só a própria
// (policy "desmarcar e so meu"). Usado só pela Súplica, pra quem tocou no
// check errado; as marcas de outros dias nunca saem.
export async function unmarkPrayingToday(requestId) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase
    .from('group_prayer_intentions')
    .delete()
    .eq('prayer_request_id', requestId)
    .eq('user_id', userId)
    .eq('prayed_date', dateKey())
  if (error) throw new Error(`unmark praying failed: ${error.message}`)
}

// ── Gamificação (família "Oração pelos outros") ──────────────────────
// As PRÓPRIAS marcas de "Orei" (policy "so vejo minha propria intencao",
// migration 0052) e os ids dos próprios pedidos, abertos ou arquivados —
// a família conta só pedidos de OUTRAS pessoas, então quem calcula
// (gamification/familiesMath.js) subtrai um do outro. Convidado não tem
// comunidade: devolve vazio.
export async function getMyPrayerIntentions() {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('group_prayer_intentions')
    .select('prayer_request_id, prayed_date')
    .eq('user_id', userId)
  if (error) throw new Error(`load my prayer intentions failed: ${error.message}`)
  return data ?? []
}

export async function getMyPrayerRequestIds() {
  const userId = await getUserId()
  if (!userId) return new Set()
  const { data, error } = await supabase
    .from('group_prayer_requests')
    .select('id')
    .eq('user_id', userId)
  if (error) throw new Error(`load my prayer request ids failed: ${error.message}`)
  return new Set((data ?? []).map(r => r.id))
}

function mapMyRequestRow(row) {
  return {
    id: row.id,
    body: row.body,
    scope: row.scope,
    groupId: row.group_id,
    groupName: row.group_name ?? '',
    isMine: !!row.is_mine,
    status: row.status,
    resposta: row.resposta,
    notaResposta: row.nota_resposta,
    createdAt: row.created_at,
    respondidoEm: row.respondido_em,
    prayCount: Number(row.pray_count ?? 0),
    diasOrados: Number(row.days_prayed ?? 0),
    prayedToday: !!row.already_prayed_today,
    prayedEver: Number(row.days_prayed ?? 0) > 0,
    commentCount: Number(row.comment_count ?? 0),
  }
}

// Pedidos de oração da rotina (36d, pacote 36-37) — os seus, de qualquer
// status (Ativos e Respondidos), + os abertos de quem está num grupo seu
// (somem da lista assim que o autor arquiva; a resposta é dele, não sua).
export async function getMyPrayerRequests(maxN = 100) {
  const { data, error } = await supabase.rpc('get_my_prayer_requests', { max_n: maxN })
  if (error) { console.error('[prayerRequestsStore] getMyPrayerRequests failed:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapMyRequestRow)
}

// Arquivar com resposta (36e) — só o autor. "Espere" não arquiva nada
// (devolve pro Ativos sem zerar o contador de dias): não chama o
// servidor, só fecha a folha — ver components/pedidos/FolhaComoDeusRespondeu.jsx.
export async function archivePrayerRequest(requestId, response, note = '') {
  if (response === 'espere') return
  const { error } = await supabase.rpc('archive_prayer_request', {
    target_request_id: requestId,
    response,
    note: note.trim() || null,
  })
  if (error) throw new Error(error.message)
}

// Comentários (migration 0070, pedido dela 2026-09-19) — quem já pode
// VER o pedido pode comentar nele; o "Orei por isso" continua existindo
// do lado, não é substituído por comentário. Autor do comentário sempre
// aparece com nome, mesmo em pedido anônimo (a anonimidade é do pedido,
// não de quem comenta).
function mapCommentRow(row) {
  return {
    id: row.id,
    body: row.body,
    userId: row.user_id,
    authorName: row.author_name ?? '',
    createdAt: row.created_at,
    isMine: !!row.is_mine,
  }
}

export async function getPrayerRequestComments(requestId) {
  const { data, error } = await supabase.rpc('get_prayer_request_comments', { target_request_id: requestId })
  if (error) { console.error('[prayerRequestsStore] getPrayerRequestComments failed:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapCommentRow)
}

export async function addPrayerRequestComment(requestId, body) {
  const trimmed = body.trim()
  if (!trimmed) return
  const userId = await getUserId()
  if (!userId) throw new Error('Você precisa estar logado.')
  const { error } = await supabase
    .from('group_prayer_comments')
    .insert({ prayer_request_id: requestId, user_id: userId, body: trimmed })
  if (error) throw new Error(error.message)
}

// A RLS decide se pode (autor do comentário, ou moderador do grupo
// quando o pedido é de um grupo — ver migration 0070).
export async function deletePrayerRequestComment(commentId) {
  const { error } = await supabase.from('group_prayer_comments').delete().eq('id', commentId)
  if (error) throw new Error(error.message)
}
