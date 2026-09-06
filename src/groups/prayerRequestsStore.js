// Pedidos de oração na identidade nova (25a/25b, Bloco 11) — migration
// 0052_prayer_requests_scope.sql. Pedido tem ESCOPO ('group' — um grupo
// específico, 'friends' — todos os seus amigos aceitos, ou 'only_me' — só
// você), pode ser anônimo, e o contador de quem orou nunca expõe
// identidade (nem pro autor): as duas leituras abaixo passam por RPC
// security definer (get_supplication_requests/get_prayer_requests_feed)
// que já devolve a contagem pronta, nunca as linhas de
// group_prayer_intentions em si. Sem comentários — o design novo proíbe
// ("Ninguém pode comentar — só orar"); ver a migration pro porquê.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

function mapSupplicationRow(row) {
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
  }
}

// Súplica (25a) — até `maxN` pedidos esperando oração, já ordenados por
// quem tem menos oração recebida (ver a RPC pro critério exato de quem
// entra: nunca os seus próprios pedidos de grupo/amigos, mas os 'only_me'
// voltam pra você mesmo).
export async function getSupplicationRequests(maxN = 3) {
  const { data, error } = await supabase.rpc('get_supplication_requests', { max_n: maxN })
  if (error) { console.error('[prayerRequestsStore] getSupplicationRequests failed:', error.message); return [] }
  return (data ?? []).map(mapSupplicationRow)
}

// Lista completa — "Ver todos" (25a) quando groupId é null, ou a aba de
// oração de um grupo específico quando não. Inclui os SEUS pedidos de
// qualquer escopo (pra você gerenciar/encerrar), não só os de outras
// pessoas.
export async function getPrayerRequestsFeed(groupId = null, maxN = 50) {
  const { data, error } = await supabase.rpc('get_prayer_requests_feed', { target_group_id: groupId, max_n: maxN })
  if (error) { console.error('[prayerRequestsStore] getPrayerRequestsFeed failed:', error.message); return [] }
  return (data ?? []).map(row => ({ ...mapSupplicationRow(row), isMine: !!row.is_mine, status: row.status }))
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
// nesse caso, ver AddPrayerRequestSheet.jsx).
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

// "Orei" — checa o estado atual e alterna, igual a uma curtida. A RLS de
// group_prayer_intentions só deixa ver a PRÓPRIA linha (nunca a de outra
// pessoa), então este select nunca vaza identidade de ninguém.
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
