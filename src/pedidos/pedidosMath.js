// pedidosMath.js — a parte pura dos pedidos de oração (handoff-passos-
// pedidos-53-54, S2 e O1–O3): juntar os pedidos numa lista só, o estado do
// "orei" (hoje × outro dia, no dia do APARELHO), o que cada linha diz e a
// lista da Súplica.
//
// Privacidade (HANDOFF §0, regra 1): um pedido aqui nunca carrega quem
// orou — só quantas pessoas (`prayCount`). O nome que pode aparecer é o de
// quem PEDIU, e só num pedido de amigo que não foi publicado sem nome.
import { relativeTimeSpan } from '../prayer/prayerRequestFormat.js'
import { FAMILIES } from '../data/achievements.js'
import { familyState, oracaoStats } from '../gamification/familiesMath.js'
import { formatInt, plural } from '../gamification/format.js'

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

// "2 comentários" · "1 comentário" · "" — os comentários de um pedido
// continuam existindo (decisão dela, 2026-11); a lista só diz quantos há.
export function commentsLine(n) {
  return n > 0 ? `${formatInt(n)} ${plural(n, 'comentário', 'comentários')}` : ''
}

// A linha de apoio de um pedido. Meu: "Orando há 24 dias" — o tempo desde
// que o pedido foi feito — e, na lista (O1), " · orei hoje". De outra
// pessoa: quantas pessoas oraram; na lista, com "Há 2 dias · " na frente.
// Na lista, havendo comentários, a contagem vem no fim.
export function supportLine(p, { list = false, now = Date.now() } = {}) {
  const span = relativeTimeSpan(p.createdAt, 'pt', now)
  const base = p.origin === 'mine'
    ? `Orando há ${span}${list && p.prayedToday ? ' · orei hoje' : ''}`
    : list ? `Há ${span} · ${peopleLine(p.prayCount)}` : peopleLine(p.prayCount)
  const comments = list ? commentsLine(p.commentCount) : ''
  return comments ? `${base} · ${comments}` : base
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

// ── A lista de pedidos (O1) ─────────────────────────────────────────────

// Os respondidos (só os meus chegam aqui), do mais recente ao mais antigo.
export function answeredPedidos(list) {
  return (list ?? [])
    .filter(r => r.status === 'closed')
    .sort((a, b) => String(b.respondidoEm ?? '').localeCompare(String(a.respondidoEm ?? '')))
}

// O que cada aba mostra. "Do grupo" e "Amigos": só pedidos de outras
// pessoas, ainda ativos.
export function pedidosOfTab(list, tab) {
  if (tab === 'respondidos') return answeredPedidos(list)
  const active = activePedidos(list)
  if (tab === 'grupo') return active.filter(r => r.origin === 'group')
  if (tab === 'amigos') return active.filter(r => r.origin === 'friend')
  return active
}

// As abas, com a contagem: "Ativos · 3" | "Respondidos · 12" | "Do grupo ·
// 1" — e "Amigos · 2" quando há pedido de amigo (a aba dos amigos não está
// no quadro; entra só quando tem o que mostrar).
export function pedidosTabs(list) {
  const tab = (key, name) => ({ key, label: `${name} · ${formatInt(pedidosOfTab(list, key).length)}` })
  const tabs = [tab('ativos', 'Ativos'), tab('respondidos', 'Respondidos'), tab('grupo', 'Do grupo')]
  if (pedidosOfTab(list, 'amigos').length > 0) tabs.push(tab('amigos', 'Amigos'))
  return tabs
}

export const RESPONSE_LABEL = { sim: 'Sim', nao: 'Não', espere: 'Espere', aprenda: 'Aprenda', se_mova: 'Se mova' }

// Um pedido respondido: o selo da resposta (só "Sim" é cheio), "orado por
// {tempo}" — do dia do pedido até o da resposta —, o pedido e, se houver,
// a linha "o que eu vi", entre aspas.
export function answeredRow(p) {
  const note = String(p.notaResposta ?? '').trim()
  return {
    id: p.id,
    badge: RESPONSE_LABEL[p.resposta] ?? '',
    solid: p.resposta === 'sim',
    span: `orado por ${relativeTimeSpan(p.createdAt, 'pt', p.respondidoEm ? new Date(p.respondidoEm).getTime() : Date.now())}`,
    body: p.body,
    note: note ? `"${note}"` : null,
  }
}

// O bloco "RESPONDIDOS" da aba Ativos: os dois mais recentes e, havendo
// mais, "Ver os {n}" (leva à aba Respondidos). Sem respondidos, não há
// bloco.
export function answeredBlock(list) {
  const all = answeredPedidos(list)
  if (!all.length) return null
  return { total: all.length, more: all.length > 2 ? `Ver os ${formatInt(all.length)}` : null, rows: all.slice(0, 2).map(answeredRow) }
}

// O que o toque no cartão abre (fora do botão "orei"): um pedido meu,
// ativo, abre "Como Deus respondeu?" (O3); os outros — de outra pessoa, ou
// já respondidos — abrem o detalhe, onde ficam os comentários.
export function cardTap(p) {
  return p.isMine && p.status !== 'closed' ? 'responder' : 'detalhe'
}

// O cartão "orações pelos outros": quantas vezes orei por pedidos de
// outras pessoas, quanto falta para o próximo degrau da família "Oração
// pelos outros" e a barra entre o degrau atual e o próximo. No último
// degrau, a segunda linha vira o nome dele e a barra some.
export function othersCard(value) {
  const state = familyState(FAMILIES.find(f => f.id === 'oracao'), Math.max(0, value ?? 0), () => null)
  const top = !state.next
  return {
    value: formatInt(state.value),
    caption: `${plural(state.value, 'oração', 'orações')} pelos outros`,
    line: top
      ? state.degraus[state.degraus.length - 1].nome
      : `${state.remaining === 1 ? 'Falta 1' : `Faltam ${formatInt(state.remaining)}`} para "${state.next.nome}"`,
    progress: top ? null : state.progress,
    aria: top
      ? `${formatInt(state.value)} orações pelos outros. ${state.degraus[state.degraus.length - 1].nome}.`
      : `${formatInt(state.value)} ${plural(state.value, 'oração', 'orações')} pelos outros. ${state.remaining === 1 ? 'Falta 1' : `Faltam ${formatInt(state.remaining)}`} para ${state.next.nome}.`,
  }
}

// Quantas vezes orei por pedidos de outras pessoas — a mesma conta da
// família (as minhas marcas, menos as dos meus próprios pedidos).
export function othersPrayedCount(intentions, myRequestIds) {
  return intentions ? oracaoStats(intentions, myRequestIds).value : null
}

// ── Fazer um pedido (O2) ────────────────────────────────────────────────

export const MAX_PEDIDO = 240
// "Só eu" é o padrão de "Quem vê", SEMPRE: toda vez que a folha abre. A
// última escolha não é lembrada, e abrir a folha de dentro de um grupo
// não muda isso.
export const DEFAULT_WHO_SEES = 'only_me'

const peopleCount = n => `${formatInt(n ?? 0)} ${plural(n ?? 0, 'pessoa', 'pessoas')}`

// Os blocos de "Quem vê", na ordem: "Só eu" primeiro, depois os grupos da
// pessoa e "Meus amigos".
export function whoSeesOptions({ groups = [], memberCounts = {}, friendsCount = 0 } = {}) {
  return [
    { key: 'only_me', title: 'Só eu', sub: 'no seu diário' },
    ...groups.map(g => ({ key: `group:${g.groupId}`, title: g.name, sub: peopleCount(memberCounts[g.groupId]) })),
    { key: 'friends', title: 'Meus amigos', sub: peopleCount(friendsCount) },
  ]
}

// Os dois estados da folha, pelo que está escolhido em "Quem vê": com "Só
// eu", o pedido é guardado ("Guardar pedido"); com um grupo ou "Meus
// amigos", publicado ("Publicar pedido") — e aí aparecem o cartão
// "Publicar sem meu nome" e o aviso de que só o número de quem orou é
// mostrado. O botão fica desabilitado com o campo vazio (ou acima do
// limite).
export function requestFormState({ body = '', choice = DEFAULT_WHO_SEES } = {}) {
  const used = body.trim().length
  const publishing = choice !== 'only_me'
  return {
    publishing,
    showAnonymous: publishing,
    button: publishing ? 'Publicar pedido' : 'Guardar pedido',
    note: publishing
      ? 'Você recebe só o número de pessoas que oraram, nunca os nomes. Pode encerrar o pedido quando quiser.'
      : 'Fica só com você, no seu diário de oração. Para pedir oração a outras pessoas, escolha um grupo acima.',
    counter: `${formatInt(used)} / ${MAX_PEDIDO}`,
    over: used > MAX_PEDIDO,
    canSubmit: used > 0 && used <= MAX_PEDIDO,
  }
}

// O que vai para a gravação. Um pedido só é publicado se a pessoa escolheu
// um grupo (ou os amigos); "Só eu" nunca leva grupo nem anonimato.
export function requestPayload({ body, choice = DEFAULT_WHO_SEES, anonymous = false }) {
  const text = String(body ?? '').trim()
  if (choice.startsWith('group:')) return { body: text, scope: 'group', groupId: choice.slice('group:'.length), anonymous: !!anonymous }
  if (choice === 'friends') return { body: text, scope: 'friends', groupId: null, anonymous: !!anonymous }
  return { body: text, scope: 'only_me', groupId: null, anonymous: false }
}

// ── Como Deus respondeu? (O3) ───────────────────────────────────────────

// As cinco respostas, na ordem da grade (a quinta ocupa a linha inteira).
export const ANSWER_OPTIONS = [
  { key: 'sim', title: 'Sim', sub: 'Veio como eu pedi' },
  { key: 'nao', title: 'Não', sub: 'Ele fechou a porta' },
  { key: 'espere', title: 'Espere', sub: 'Ainda não é o tempo' },
  { key: 'aprenda', title: 'Aprenda', sub: 'A situação ficou; eu mudei' },
  { key: 'se_mova', title: 'Se mova', sub: 'A resposta pedia um passo meu' },
]

// "Orado por 24 dias · 9 vezes" — o tempo desde que o pedido foi feito e
// em quantos dias eu marquei "orei" nele. Sem marca nenhuma, só o tempo.
export function prayedSummary(p, now = Date.now()) {
  const span = `Orado por ${relativeTimeSpan(p.createdAt, 'pt', now)}`
  const n = p.diasOrados ?? 0
  return n > 0 ? `${span} · ${formatInt(n)} ${plural(n, 'vez', 'vezes')}` : span
}

// O botão da folha. Nenhuma resposta vem escolhida, e sem escolha ele
// fica desabilitado. "Espere" não responde o pedido: ele CONTINUA ativo
// (`keepsActive`) e o botão diz "Seguir orando"; as outras quatro guardam
// o pedido em Respondidos.
export function answerSheetState(selected) {
  const keepsActive = selected === 'espere'
  return {
    canSave: ANSWER_OPTIONS.some(o => o.key === selected),
    keepsActive,
    button: keepsActive ? 'Seguir orando' : 'Guardar o pedido',
  }
}
