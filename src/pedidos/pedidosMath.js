// pedidosMath.js — a parte pura dos pedidos de oração (handoff-passos-
// pedidos-53-54, S2 e O1–O3): juntar os pedidos numa lista só, o estado do
// "orei" (hoje × outro dia, no dia do APARELHO), o que cada linha diz e a
// lista da Súplica.
//
// Privacidade (HANDOFF §0, regra 1): um pedido aqui nunca carrega quem
// orou — só quantas pessoas (`prayCount`). O nome que pode aparecer é o de
// quem PEDIU, e só num pedido de amigo que não foi publicado sem nome.
import { relativeTimeSpan } from '../prayer/prayerRequestFormat.js'

// Os pedidos em que já orei hoje, pelas minhas próprias marcas (a única
// coisa que a conta deixa ler de group_prayer_intentions). `todayKey` é o
// dia do aparelho (utils/dateKey) — é ele que vira à meia-noite da pessoa,
// não o do servidor.
export function prayedTodayIds(intentions, todayKey) {
  const ids = new Set()
  for (const row of intentions ?? []) if (row?.prayed_date === todayKey) ids.add(row.prayer_request_id)
  return ids
}

// Junta numa lista só: os meus pedidos e os dos meus grupos (`mine`, de
// getMyPrayerRequests) e os dos meus amigos (`feed`, de
// getPrayerRequestsFeed — só entram os de escopo 'friends' de outra
// pessoa). Cada pedido ganha `origin`: 'mine' | 'group' | 'friend'.
// `intentions` nulo (não deu pra carregar) mantém o "orei hoje" que veio
// do servidor.
export function mergePedidos({ mine, feed, intentions, todayKey }) {
  const today = intentions ? prayedTodayIds(intentions, todayKey) : null
  const prayedToday = (id, fallback) => (today ? today.has(id) : !!fallback)
  const out = (mine ?? []).map(r => ({
    ...r,
    origin: r.isMine ? 'mine' : 'group',
    authorName: '',
    anonymous: false,
    prayedToday: prayedToday(r.id, r.prayedToday),
  }))
  const seen = new Set(out.map(r => r.id))
  for (const r of feed ?? []) {
    if (r.isMine || r.scope !== 'friends' || seen.has(r.id)) continue
    out.push({
      id: r.id, body: r.body, scope: r.scope, groupId: null, groupName: '', isMine: false,
      status: r.status ?? 'open', resposta: null, notaResposta: null,
      createdAt: r.createdAt, respondidoEm: null,
      prayCount: r.prayCount, diasOrados: 0, prayedEver: !!r.prayedEver, commentCount: 0,
      origin: 'friend', authorName: r.anonymous ? '' : (r.authorName ?? ''), anonymous: !!r.anonymous,
      prayedToday: prayedToday(r.id, r.prayingByMe),
    })
  }
  return out
}

// Os pedidos ativos, na ordem em que a lista veio.
export function activePedidos(list) {
  return (list ?? []).filter(r => r.status !== 'closed')
}

// A origem, em cima do pedido: "Meu" (laranja), o nome do grupo, ou — num
// pedido de amigo — o nome de quem pediu ("Anônimo" se foi publicado sem
// nome). Vira maiúscula por CSS.
export function originLabel(p) {
  if (p.origin === 'mine') return { kind: 'mine', text: 'Meu' }
  if (p.origin === 'group') return { kind: 'group', text: p.groupName || 'Grupo' }
  return { kind: 'friend', text: p.anonymous || !p.authorName ? 'Anônimo' : p.authorName }
}

// "5 pessoas já oraram" · "1 pessoa já orou" · "Ninguém orou ainda".
export function peopleLine(n) {
  if (!n) return 'Ninguém orou ainda'
  return n === 1 ? '1 pessoa já orou' : `${n} pessoas já oraram`
}

// A linha de apoio de um pedido. Meu: "Orando há 24 dias" — o tempo desde
// que o pedido foi feito — e, na lista (O1), " · orei hoje". De outra
// pessoa: quantas pessoas oraram; na lista, com "Há 2 dias · " na frente.
export function supportLine(p, { list = false, now = Date.now() } = {}) {
  const span = relativeTimeSpan(p.createdAt, 'pt', now)
  if (p.origin === 'mine') return `Orando há ${span}${list && p.prayedToday ? ' · orei hoje' : ''}`
  return list ? `Há ${span} · ${peopleLine(p.prayCount)}` : peopleLine(p.prayCount)
}

// ── O "orei" ────────────────────────────────────────────────────────────

// O pedido depois de um "orei": marcado hoje. Em pedido de outra pessoa,
// soma uma pessoa só na primeira vez que EU oro por ele (a contagem é de
// pessoas, não de dias); em pedido meu, soma uma vez (um dia a mais).
// Marcar duas vezes no mesmo dia não muda nada.
export function applyOrei(p) {
  if (p.prayedToday) return p
  return {
    ...p,
    prayedToday: true,
    prayedEver: true,
    prayCount: p.isMine || p.prayedEver ? p.prayCount : p.prayCount + 1,
    diasOrados: p.isMine ? p.diasOrados + 1 : p.diasOrados,
  }
}

// O pedido de volta ao que era antes de um "orei" desfeito (Súplica):
// `before` é o próprio pedido como estava antes da marca.
export function revertOrei(p, before) {
  return { ...p, prayedToday: false, prayedEver: !!before.prayedEver, prayCount: before.prayCount, diasOrados: before.diasOrados }
}

// O que o toque no check da Súplica faz: marca ('orar'); desmarca
// ('desfazer') só a marca feita NESTA oração (`sessionMarks`: os ids
// marcados desde que a tela abriu); um pedido orado antes, hoje, fica como
// está (null) — fora da Súplica nada desmarca.
export function suplicaToggle(p, sessionMarks) {
  if (!p.prayedToday) return 'orar'
  return sessionMarks?.has(p.id) ? 'desfazer' : null
}

// Conta na família "Oração pelos outros"? Só pedido de outra pessoa.
export function countsForOthers(p) {
  return !p.isMine
}

// ── A lista da Súplica (S2) ─────────────────────────────────────────────

export const SUPLICA_LIMIT = 5

// "1 de 3 orado" · "2 de 3 orados" · "1 de 1 orado".
export function prayedCounter(prayed, total) {
  return `${prayed} de ${total} ${prayed === 1 ? 'orado' : 'orados'}`
}

// O cartão "Pedidos de oração" da Súplica: os pedidos ativos, na ordem da
// lista (O1); cinco de cada vez — com mais, a linha "Ver os {n} pedidos"
// abre o resto no lugar. Sem pedido nenhum, `empty`.
export function suplicaView(list, { expanded = false } = {}) {
  const active = activePedidos(list)
  const total = active.length
  const rows = expanded ? active : active.slice(0, SUPLICA_LIMIT)
  return {
    rows,
    total,
    empty: total === 0,
    counter: total ? prayedCounter(active.filter(r => r.prayedToday).length, total) : null,
    more: !expanded && total > SUPLICA_LIMIT ? `Ver os ${total} pedidos` : null,
  }
}
