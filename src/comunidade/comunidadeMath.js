// comunidadeMath.js — as contas da aba Comunidade (redesenho de 2026-11:
// raiz com perfil, novidades, "esperando você", grupos e amigos). Pura, sem
// I/O — testes em scripts/test-comunidade.mjs. Quem busca os dados é
// GroupsScreen.jsx; quem desenha, src/components/comunidade/*.
//
// Os textos saem como { key, vars } (chaves de community.* em
// translations.js), pra tela traduzir — aqui só se decide QUAL frase.

// "1 pessoa" / "12 pessoas", "1 grupo" / "3 grupos"…: a chave certa pro
// número. `base` é o começo da chave (community.peopleOne/peopleMany).
export function plural(base, n) {
  return { key: `${base}${n === 1 ? 'One' : 'Many'}`, vars: { n } }
}

// ── Perfil ──────────────────────────────────────────────────────────────

// Mês (1–12) e ano do primeiro dia registrado na rotina — "Desde março".
// null se a pessoa ainda não tem nenhum dia.
export function sinceMonth(dailyRoutine) {
  const earliest = Object.keys(dailyRoutine ?? {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0]
  if (!earliest) return null
  const [year, month] = earliest.split('-').map(Number)
  return { year, month }
}

// Os quatro números do cartão de perfil, na ordem em que aparecem. O
// percentual da Bíblia vai com uma casa (4,2), como no resto do app.
export function profileStats({ groups, friends, weeksInGoal, biblePercent }) {
  return [
    { id: 'groups', value: groups, label: plural('community.statGroups', groups).key },
    { id: 'friends', value: friends, label: plural('community.statFriends', friends).key },
    { id: 'weeks', value: weeksInGoal ?? 0, label: plural('community.statWeeks', weeksInGoal ?? 0).key },
    { id: 'bible', value: Math.round((biblePercent ?? 0) * 10) / 10, percent: true, label: 'community.statBible' },
  ]
}

// ── Foto de perfil ──────────────────────────────────────────────────────

export const AVATAR_SIZE = 512
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// O recorte quadrado do meio da foto e o tamanho em que ela é guardada
// (nunca maior que a original — foto pequena não é esticada).
export function avatarCrop(width, height, max = AVATAR_SIZE) {
  const side = Math.min(width, height)
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side, size: Math.min(side, max) }
}

// ── Novidades ───────────────────────────────────────────────────────────

// O cartão de novidades: quantas mensagens novas, em quantos grupos, e um
// trecho da mais recente que dá pra mostrar (sala trancada e mensagem sem
// texto não entram no trecho). null sem nada novo.
// `summary`: [{ groupId, unreadCount }] · `messages`: da mais nova pra mais
// antiga, [{ isRead, locked, body, authorName, groupName, kind,
// contextBook, contextChapter }].
export function newsCard(summary, messages) {
  const withNew = (summary ?? []).filter(s => s.unreadCount > 0)
  const unread = withNew.reduce((sum, s) => sum + s.unreadCount, 0)
  if (unread === 0) return null
  const latest = (messages ?? []).find(m => !m.isRead && !m.locked && (m.body ?? '').trim())
  return {
    unread,
    groups: withNew.length,
    preview: latest ? { author: latest.authorName ?? null, group: latest.groupName, kind: latest.kind, book: latest.contextBook ?? null, chapter: latest.contextChapter ?? null, body: latest.body.trim() } : null,
  }
}

// ── Esperando você ──────────────────────────────────────────────────────

// Tudo o que pede uma resposta da pessoa, numa lista só: convites de plano
// do grupo, convites para entrar num grupo e pedidos de amizade — nessa
// ordem (o que mexe na leitura de hoje vem primeiro).
export function waitingItems({ planInvites, groupInvites, friendRequests }) {
  return [
    ...(planInvites ?? []).map(inv => ({ kind: 'plan', id: `plan:${inv.planId}`, ref: inv.planId, title: inv.book, titleEn: inv.bookEn ?? inv.book, sub: { key: 'community.waitingPlan', vars: { group: inv.groupName } } })),
    ...(groupInvites ?? []).map(inv => ({ kind: 'group', id: `group:${inv.groupId}`, ref: inv.groupId, title: inv.groupName, sub: { key: 'community.waitingGroup', vars: { name: inv.invitedByName } } })),
    ...(friendRequests ?? []).map(req => ({ kind: 'friend', id: `friend:${req.friendshipId}`, ref: req.friendshipId, title: req.name, avatarUrl: req.avatarUrl ?? null, sub: { key: 'community.waitingFriend', vars: {} } })),
  ]
}

// ── Meus grupos ─────────────────────────────────────────────────────────

export const GROUPS_SHOWN = 4

// A segunda linha de um grupo: "12 pessoas · Um plano só" — e, se a pessoa
// modera, "Você modera" no lugar do tipo de leitura (cabe uma coisa só).
export function groupRowSub(group, memberCount) {
  const people = plural('community.people', memberCount ?? 0)
  const detail = group.myRole === 'moderator' ? 'community.youModerate'
    : group.readingMode === 'shared' ? 'community.readingShared' : 'community.readingIndividual'
  return [people, { key: detail, vars: {} }]
}

// Os grupos da lista: os com mensagem nova primeiro (mais novas em cima),
// o resto na ordem em que vieram; `shown` corta em GROUPS_SHOWN até a
// pessoa pedir "Ver todos".
export function groupRows(groups, summary, showAll = false) {
  const unreadOf = Object.fromEntries((summary ?? []).map(s => [s.groupId, s.unreadCount]))
  const rows = (groups ?? []).map((g, index) => ({ ...g, unread: unreadOf[g.groupId] ?? 0, index }))
  rows.sort((a, b) => (b.unread > 0) - (a.unread > 0) || b.unread - a.unread || a.index - b.index)
  return { rows: showAll ? rows : rows.slice(0, GROUPS_SHOWN), hidden: Math.max(0, rows.length - GROUPS_SHOWN) }
}

// ── Meus amigos ─────────────────────────────────────────────────────────

export const FRIENDS_SHOWN = 4

// Os amigos da fileira (primeiro nome embaixo de cada um) e quantos são no
// total — pro "Ver os 5".
export function friendTiles(friends) {
  const list = friends ?? []
  return {
    tiles: list.slice(0, FRIENDS_SHOWN).map(f => ({ id: f.friendshipId, name: (f.name ?? '').trim().split(/\s+/)[0] ?? '', fullName: f.name ?? '', avatarUrl: f.avatarUrl ?? null })),
    total: list.length,
  }
}

// ── O grupo ─────────────────────────────────────────────────────────────

// A leitura de hoje da pessoa, se for um trecho com capítulo (reflexão de
// fim de livro e "escolha os textos" não abrem sala). null sem leitura.
export function todayReading(todaySession) {
  if (!todaySession || todaySession.needsThemePick || todaySession.type === 'reflection' || !todaySession.book || todaySession.chStart == null) return null
  return { book: todaySession.book, bookEn: todaySession.bookEn ?? todaySession.book, chStart: todaySession.chStart, chEnd: todaySession.chEnd ?? todaySession.chStart }
}

// "5 de 12 já leram hoje" e o quanto isso enche a barra. null sem números.
export function readingProgress(stats) {
  if (!stats || !(stats.members > 0)) return null
  const done = Math.min(stats.completed ?? 0, stats.members)
  return { done, total: stats.members, percent: Math.round((done / stats.members) * 100) }
}

// Quanto de um desafio foi lido: capítulos feitos sobre o total dos livros
// do desafio (nunca passa de 100).
export function challengePercent(done, books, chapterCounts) {
  const total = (books ?? []).reduce((sum, book) => sum + (chapterCounts[book] ?? 0), 0)
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
}

// O placar de um desafio: quem leu mais primeiro (empate: quem entrou
// antes), cada um com a posição e o percentual; `mine` é a linha da
// própria pessoa, se ela participa.
export function challengeBoard(challenge, leaderboard, chapterCounts, myUserId) {
  const total = (challenge?.books ?? []).reduce((sum, book) => sum + (chapterCounts[book] ?? 0), 0)
  const rows = [...(leaderboard ?? [])]
    .sort((a, b) => b.completedKeys.length - a.completedKeys.length || String(a.joinedAt ?? '').localeCompare(String(b.joinedAt ?? '')))
    .map((p, i) => ({ userId: p.userId, name: p.name, done: Math.min(p.completedKeys.length, total), percent: challengePercent(p.completedKeys.length, challenge.books, chapterCounts), position: i + 1, isMe: p.userId === myUserId }))
  return { total, rows, mine: rows.find(r => r.isMe) ?? null }
}

// Os quatro quadros da tela do grupo: Oração, Conversa, Desafio e Pessoas
// — o número grande e a linha de apoio de cada um. `value` nulo = sem
// número (nenhum desafio em andamento).
export function groupTiles({ prayers, comments, pinnedNotice, challenge, myPercent, members }) {
  const open = (prayers ?? []).filter(p => p.status !== 'closed').length
  const talk = (comments ?? []).length
  const moderators = (members ?? []).filter(m => m.role === 'moderator').length
  return [
    { id: 'prayer', value: open, sub: plural('community.tilePrayer', open) },
    { id: 'talk', value: talk, sub: (pinnedNotice ?? '').trim() ? { key: `community.tileTalkPinned${talk === 1 ? 'One' : 'Many'}`, vars: { n: talk } } : plural('community.tileTalk', talk) },
    challenge
      ? { id: 'challenge', value: myPercent ?? 0, percent: true, sub: { key: 'community.tileChallengeName', vars: { name: challenge.name || challenge.books.join(', ') } } }
      : { id: 'challenge', value: null, sub: { key: 'community.tileChallengeNone', vars: {} } },
    { id: 'people', value: (members ?? []).length, sub: plural('community.tilePeople', moderators) },
  ]
}

// Sair do grupo: quem não é a única moderadora só sai; a única moderadora
// escolhe quem assume — e, se não há mais ninguém no grupo, sair é apagar.
export function leavePlan(members, myUserId) {
  const me = (members ?? []).find(m => m.userId === myUserId)
  const others = (members ?? []).filter(m => m.userId !== myUserId)
  if (me?.role !== 'moderator' || others.some(m => m.role === 'moderator')) return 'leave'
  return others.length === 0 ? 'deleteGroup' : 'pickModerator'
}

// ── Desafio do grupo ────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

// Quantos dias faltam pro desafio acabar (0 = termina hoje).
export function daysLeft(endsAt, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS) - 1)
}

// O próximo capítulo a ler num desafio: o primeiro, na ordem dos livros do
// desafio, que a pessoa ainda não leu nele. null com tudo lido.
export function nextChallengeChapter(challenge, myKeys, chapterCounts) {
  const read = new Set(myKeys ?? [])
  for (const book of challenge.books) {
    for (let ch = 1; ch <= (chapterCounts[book] ?? 0); ch++) if (!read.has(`${book}:${ch}`)) return { book, chapter: ch }
  }
  return null
}

// Um desafio que já acabou, numa linha: quantos participaram e quantos
// leram tudo.
export function pastChallengeSummary(challenge, leaderboard, chapterCounts) {
  const board = challengeBoard(challenge, leaderboard, chapterCounts, null)
  return { participants: board.rows.length, finished: board.rows.filter(r => r.percent === 100).length }
}

export const CHALLENGE_DURATIONS = [{ id: '7d', days: 7 }, { id: '14d', days: 14 }, { id: '30d', days: 30 }]

// O que falta pra propor um desafio (a chave da frase), ou null se está
// tudo preenchido.
export function challengeFormError({ name, books, duration, customDate }) {
  if (!(name ?? '').trim()) return 'community.challengeNeedsName'
  if (!books || books.length === 0) return 'community.challengeNeedsBook'
  if (duration === 'custom' && !customDate) return 'community.challengeNeedsDate'
  return null
}

// Quando o desafio termina: daqui a N dias, ou no FIM do dia escolhido, no
// fuso de quem propõe (`new Date('AAAA-MM-DD')` é meia-noite UTC — um
// desafio "até 30/10" acabava às 21h de 29/10 no Brasil).
export function challengeEnd({ duration, customDate }, now = new Date()) {
  if (duration === 'custom') {
    const [y, m, d] = customDate.split('-').map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
  }
  const preset = CHALLENGE_DURATIONS.find(p => p.id === duration) ?? CHALLENGE_DURATIONS[0]
  return new Date(now.getTime() + preset.days * DAY_MS).toISOString()
}

// ── Pedidos de oração do grupo ──────────────────────────────────────────

// Os pedidos do grupo em duas listas: os abertos (como vieram, mais novos
// primeiro) e os encerrados.
export function prayerLists(requests) {
  const list = requests ?? []
  return { open: list.filter(r => r.status !== 'closed'), closed: list.filter(r => r.status === 'closed') }
}

// "Orei por isso" num pedido da lista: marca o dia e, só na primeira vez
// desta pessoa neste pedido, soma uma pessoa. `undo` desfaz exatamente
// isso (quando a gravação falha).
export function markPrayed(requests, id) {
  const target = requests.find(r => r.id === id)
  if (!target || target.isMine || target.prayingByMe) return { requests, undo: list => list }
  const first = !target.prayedEver
  return {
    requests: requests.map(r => (r.id === id ? { ...r, prayingByMe: true, prayedEver: true, prayCount: first ? r.prayCount + 1 : r.prayCount } : r)),
    undo: list => list.map(r => (r.id === id ? { ...r, prayingByMe: false, prayedEver: !first, prayCount: first ? Math.max(0, r.prayCount - 1) : r.prayCount } : r)),
  }
}

// ── Conversa do grupo ───────────────────────────────────────────────────

export const MAX_PINNED = 3

// Os recados em duas listas: os fixados (na ordem em que foram fixados) e
// os demais, do mais novo pro mais antigo.
export function talkLists(comments) {
  const list = comments ?? []
  return {
    pinned: list.filter(c => c.pinned).sort((a, b) => String(a.pinnedAt ?? '').localeCompare(String(b.pinnedAt ?? ''))),
    regular: list.filter(c => !c.pinned).sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
  }
}

// O que a pessoa pode fazer com um recado, na ordem do menu: moderador
// fixa (até MAX_PINNED) e desafixa; autor e moderador apagam; os outros
// denunciam.
export function commentActions(comment, { myUserId, isModerator, pinnedCount }) {
  const mine = comment.userId === myUserId
  return [
    ...(isModerator && comment.pinned ? ['unpin'] : []),
    ...(isModerator && !comment.pinned && pinnedCount < MAX_PINNED ? ['pin'] : []),
    ...(mine || isModerator ? ['delete'] : []),
    ...(!mine ? ['report'] : []),
  ]
}

// Curtir ou descurtir um recado da lista (e o mesmo de volta, se a
// gravação falhar — é só alternar de novo).
export function toggleLike(comments, id) {
  return comments.map(c => (c.id === id ? { ...c, likedByMe: !c.likedByMe, likeCount: Math.max(0, c.likeCount + (c.likedByMe ? -1 : 1)) } : c))
}

// ── Pessoas do grupo ────────────────────────────────────────────────────

// Os amigos que ainda não estão no grupo (os que dá pra convidar).
export function invitableFriends(friends, members) {
  const inGroup = new Set((members ?? []).map(m => m.userId))
  return (friends ?? []).filter(f => !inGroup.has(f.userId))
}

// ── Amigos ──────────────────────────────────────────────────────────────

// "5 amigos · 1 pedido" — a linha de apoio do cabeçalho de Amigos.
export function friendsHeader(friends, pending) {
  return [plural('community.friendsCount', friends), ...(pending > 0 ? [plural('community.requestsCount', pending)] : [])]
}

// A linha de apoio de um amigo na lista: o bloco que ele está lendo e
// quanto da Bíblia já leu — ou "Perfil privado". `reading` vem pronto de
// quem lê o progresso ({ block, blockEn, percent }); null enquanto carrega.
export function friendLine(summary, reading) {
  if (!summary) return null
  if (!summary.isPublic || !reading) return { key: 'community.friendPrivate', vars: {} }
  return { key: 'community.friendReading', vars: { block: reading.block, blockEn: reading.blockEn, percent: reading.percent } }
}

// Quem sugerir como amigo: gente dos grupos da pessoa que ainda não é
// amiga nem tem pedido pendente — cada um uma vez só, com o primeiro
// grupo em comum, no máximo `max`.
const SUGGESTIONS_SHOWN = 6
export function friendSuggestions(groups, myUserId, friends, pending, max = SUGGESTIONS_SHOWN) {
  const skip = new Set([myUserId, ...(friends ?? []).map(f => f.userId), ...(pending ?? []).map(p => p.userId)])
  const seen = new Map()
  for (const group of groups ?? []) {
    for (const m of group.members ?? []) {
      if (!skip.has(m.userId) && !seen.has(m.userId)) seen.set(m.userId, { userId: m.userId, name: m.name, groupName: group.name })
    }
  }
  return [...seen.values()].slice(0, max)
}

// De qual grupo é quem pediu amizade (o primeiro em comum), pra linha
// "Do Grupo Semente"; null se não é de grupo nenhum da pessoa.
export function requestOrigin(request, groups) {
  return (groups ?? []).find(g => (g.members ?? []).some(m => m.userId === request.userId))?.name ?? null
}

// A busca de Amigos manda o pedido por e-mail quando o texto parece um
// e-mail; senão trata como @usuário (com ou sem o @).
export function friendSearch(text) {
  const clean = (text ?? '').trim()
  if (!clean) return null
  return clean.includes('@') && clean.includes('.') && !clean.startsWith('@') ? { by: 'email', value: clean } : { by: 'username', value: clean.replace(/^@/, '') }
}
