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
