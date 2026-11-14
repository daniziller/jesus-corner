// Aba Comunidade — testa src/comunidade/comunidadeMath.js.
// Roda com: node scripts/test-comunidade.mjs
import {
  plural, sinceMonth, profileStats, avatarCrop, AVATAR_SIZE, newsCard, waitingItems, groupRowSub, groupRows, GROUPS_SHOWN, friendTiles, FRIENDS_SHOWN,
  todayReading, readingProgress, challengePercent, challengeBoard, groupTiles, leavePlan,
} from '../src/comunidade/comunidadeMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label}`)
  }
}

// Plurais.
check('plural: 1 é singular; 0 e 2 são plural', [plural('community.people', 1).key, plural('community.people', 0).key, plural('community.people', 2).key], ['community.peopleOne', 'community.peopleMany', 'community.peopleMany'])

// Perfil.
check('"desde": o mês do primeiro dia da rotina', sinceMonth({ '2026-05-03': {}, '2026-03-14': {}, '2026-11-01': {} }), { year: 2026, month: 3 })
check('…sem dia nenhum (ou só lixo), não inventa mês', [sinceMonth({}), sinceMonth(null), sinceMonth({ themePicks: {} })], [null, null, null])
const stats = profileStats({ groups: 1, friends: 5, weeksInGoal: 18, biblePercent: 4.23 })
check('os quatro números do perfil, na ordem', stats.map(s => `${s.id}:${s.value}`), ['groups:1', 'friends:5', 'weeks:18', 'bible:4.2'])
check('…cada um com o plural certo', stats.map(s => s.label), ['community.statGroupsOne', 'community.statFriendsMany', 'community.statWeeksMany', 'community.statBible'])
check('perfil novo: tudo zero, sem quebrar', profileStats({ groups: 0, friends: 0 }).map(s => s.value), [0, 0, 0, 0])

// Foto.
check('foto deitada: recorta o quadrado do meio e reduz para 512', avatarCrop(4000, 3000), { sx: 500, sy: 0, side: 3000, size: AVATAR_SIZE })
check('foto em pé: idem, na vertical', avatarCrop(1080, 1920), { sx: 0, sy: 420, side: 1080, size: 512 })
check('foto pequena não é esticada', avatarCrop(300, 200), { sx: 50, sy: 0, side: 200, size: 200 })

// Novidades.
const resumo = [{ groupId: 'g1', unreadCount: 3 }, { groupId: 'g2', unreadCount: 1 }, { groupId: 'g3', unreadCount: 0 }]
const mensagens = [
  { isRead: false, locked: true, body: null, authorName: 'Tiago', groupName: 'Grupo Semente', kind: 'sala_capitulo', contextBook: 'João', contextChapter: 4 },
  { isRead: false, locked: false, body: '  Nunca tinha reparado nisso. ', authorName: 'Marina', groupName: 'Grupo Semente', kind: 'sala_capitulo', contextBook: 'João', contextChapter: 3 },
  { isRead: true, locked: false, body: 'Antiga', authorName: 'Ana', groupName: 'Família Almeida', kind: 'geral' },
]
const novidades = newsCard(resumo, mensagens)
check('novidades: soma as mensagens novas e conta só os grupos que têm', [novidades.unread, novidades.groups], [4, 2])
check('…o trecho é da mais recente que dá pra ler (a da sala trancada fica de fora)', novidades.preview, { author: 'Marina', group: 'Grupo Semente', kind: 'sala_capitulo', book: 'João', chapter: 3, body: 'Nunca tinha reparado nisso.' })
check('sem nada novo: não tem cartão de novidades', [newsCard([{ groupId: 'g1', unreadCount: 0 }], mensagens), newsCard([], []), newsCard(null, null)], [null, null, null])
check('novas só em sala trancada: conta, mas sem trecho', newsCard([{ groupId: 'g1', unreadCount: 1 }], [mensagens[0]]), { unread: 1, groups: 1, preview: null })
check('mensagem anônima: autor nulo', newsCard(resumo, [{ isRead: false, locked: false, body: 'Peço oração.', authorName: null, groupName: 'G', kind: 'pedido_oracao' }]).preview.author, null)

// Esperando você.
const esperando = waitingItems({
  planInvites: [{ planId: 'p1', book: 'Marcos', bookEn: 'Mark', groupName: 'Grupo Semente' }],
  groupInvites: [{ groupId: 'g9', groupName: 'Batista Central', invitedByName: 'Rafael' }],
  friendRequests: [{ friendshipId: 'f1', name: 'Lucas Mendes', avatarUrl: 'u' }],
})
check('esperando você: plano do grupo, convite de grupo e pedido de amizade, nessa ordem', esperando.map(i => `${i.kind}:${i.ref}:${i.title}`), ['plan:p1:Marcos', 'group:g9:Batista Central', 'friend:f1:Lucas Mendes'])
check('…cada um diz de onde veio', esperando.map(i => [i.sub.key, i.sub.vars]), [['community.waitingPlan', { group: 'Grupo Semente' }], ['community.waitingGroup', { name: 'Rafael' }], ['community.waitingFriend', {}]])
check('…e os ids não se repetem entre tipos', new Set(esperando.map(i => i.id)).size, 3)
check('nada esperando: lista vazia', waitingItems({}), [])

// Meus grupos.
check('linha do grupo: pessoas e como o grupo lê', groupRowSub({ myRole: 'member', readingMode: 'shared' }, 12).map(p => p.key), ['community.peopleMany', 'community.readingShared'])
check('…cada um no seu plano', groupRowSub({ myRole: 'member', readingMode: 'individual' }, 1).map(p => p.key), ['community.peopleOne', 'community.readingIndividual'])
check('…quem modera vê "Você modera"', groupRowSub({ myRole: 'moderator', readingMode: 'shared' }, 6)[1].key, 'community.youModerate')
const grupos = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ groupId: id, name: id.toUpperCase() }))
const lista = groupRows(grupos, [{ groupId: 'e', unreadCount: 2 }, { groupId: 'c', unreadCount: 5 }])
check('grupos com mensagem nova sobem (mais novas em cima); o resto fica na ordem', lista.rows.map(g => `${g.groupId}:${g.unread}`), ['c:5', 'e:2', 'a:0', 'b:0'])
check(`mostra ${GROUPS_SHOWN} e diz quantos ficaram escondidos`, [lista.rows.length, lista.hidden], [GROUPS_SHOWN, 2])
check('"Ver todos" mostra todos', groupRows(grupos, [], true).rows.length, 6)
check('até 4 grupos: nada escondido', groupRows(grupos.slice(0, 4), []).hidden, 0)

// Meus amigos.
const amigos = ['Marina Costa', 'Rafael Souza', 'Ana', '  Tiago  Lima ', 'Júlia Almeida'].map((name, i) => ({ friendshipId: `f${i}`, name, avatarUrl: i === 0 ? 'foto' : null }))
const fileira = friendTiles(amigos)
check(`fileira de amigos: os ${FRIENDS_SHOWN} primeiros, pelo primeiro nome, e o total`, [fileira.tiles.map(f => f.name), fileira.total], [['Marina', 'Rafael', 'Ana', 'Tiago'], 5])
check('…com a foto de quem tem', fileira.tiles.map(f => f.avatarUrl), ['foto', null, null, null])
check('sem amigos: fileira vazia', friendTiles(null), { tiles: [], total: 0 })

// ── O grupo ──
check('leitura de hoje: o trecho com capítulo', todayReading({ book: 'João', bookEn: 'John', chStart: 3, chEnd: 4, type: 'reading' }), { book: 'João', bookEn: 'John', chStart: 3, chEnd: 4 })
check('…reflexão de fim de livro, "escolha os textos" e dia sem leitura não abrem sala', [todayReading({ book: 'João', type: 'reflection' }), todayReading({ needsThemePick: true }), todayReading(null), todayReading({ book: 'João', chStart: null })], [null, null, null, null])
check('quantos já leram hoje, e a barra', readingProgress({ members: 12, completed: 5 }), { done: 5, total: 12, percent: 42 })
check('…sem números (ou grupo vazio), nada', [readingProgress(null), readingProgress({ members: 0, completed: 0 })], [null, null])
check('…nunca passa do total', readingProgress({ members: 3, completed: 9 }).done, 3)

const capitulos = { Marcos: 16, Rute: 4 }
check('percentual do desafio: capítulos lidos sobre o total dos livros, no máximo 100', [challengePercent(10, ['Marcos'], capitulos), challengePercent(0, ['Marcos'], capitulos), challengePercent(40, ['Marcos', 'Rute'], capitulos), challengePercent(3, [], capitulos)], [63, 0, 100, 0])
const chaves = n => Array.from({ length: n }, (_, i) => `Marcos:${i + 1}`)
const placar = challengeBoard({ books: ['Marcos'] }, [
  { userId: 'u3', name: 'Você', completedKeys: chaves(10), joinedAt: '2026-11-10T10:00:00Z' },
  { userId: 'u1', name: 'Marina', completedKeys: chaves(16), joinedAt: '2026-11-10T09:00:00Z' },
  { userId: 'u4', name: 'Ana', completedKeys: chaves(7), joinedAt: '2026-11-11T09:00:00Z' },
  { userId: 'u2', name: 'Rafael', completedKeys: chaves(10), joinedAt: '2026-11-10T08:00:00Z' },
], capitulos, 'u3')
check('placar: quem leu mais primeiro; no empate, quem entrou antes', placar.rows.map(r => `${r.position}:${r.name}:${r.percent}`), ['1:Marina:100', '2:Rafael:63', '3:Você:63', '4:Ana:44'])
check('…com a linha da própria pessoa', [placar.mine.position, placar.mine.done, placar.total], [3, 10, 16])
check('quem não participa do desafio não tem linha', challengeBoard({ books: ['Marcos'] }, [], capitulos, 'u3'), { total: 16, rows: [], mine: null })

const membros = [{ userId: 'u1', role: 'moderator' }, { userId: 'u2', role: 'member' }, { userId: 'u3', role: 'moderator' }]
const quadros = groupTiles({
  prayers: [{ status: 'open' }, { status: 'closed' }, { status: 'open' }, { status: 'open' }],
  comments: Array.from({ length: 12 }, () => ({})), pinnedNotice: 'Encontro sábado',
  challenge: { name: 'Maratona de Marcos', books: ['Marcos'] }, myPercent: 62, members: membros,
})
check('quadros do grupo: pedidos abertos, recados, desafio e pessoas', quadros.map(q => `${q.id}:${q.value}`), ['prayer:3', 'talk:12', 'challenge:62', 'people:3'])
check('…cada um com a sua linha de apoio', quadros.map(q => [q.sub.key, q.sub.vars]), [['community.tilePrayerMany', { n: 3 }], ['community.tileTalkPinnedMany', { n: 12 }], ['community.tileChallengeName', { name: 'Maratona de Marcos' }], ['community.tilePeopleMany', { n: 2 }]])
const vazios = groupTiles({ prayers: [], comments: [{}], pinnedNotice: '  ', challenge: null, members: [{ userId: 'u1', role: 'moderator' }] })
check('grupo novo: zero pedidos, um recado sem aviso, nenhum desafio, um moderador', vazios.map(q => [q.value, q.sub.key]), [[0, 'community.tilePrayerMany'], [1, 'community.tileTalkOne'], [null, 'community.tileChallengeNone'], [1, 'community.tilePeopleOne']])
check('desafio sem nome usa os livros', groupTiles({ challenge: { name: '', books: ['Marcos', 'Rute'] }, myPercent: 0 })[2].sub.vars, { name: 'Marcos, Rute' })

check('sair: membro só sai', leavePlan(membros, 'u2'), 'leave')
check('sair: moderador com outro moderador no grupo só sai', leavePlan(membros, 'u1'), 'leave')
check('sair: única moderadora com outras pessoas escolhe quem assume', leavePlan([{ userId: 'u1', role: 'moderator' }, { userId: 'u2', role: 'member' }], 'u1'), 'pickModerator')
check('sair: única pessoa do grupo — sair é apagar', leavePlan([{ userId: 'u1', role: 'moderator' }], 'u1'), 'deleteGroup')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de comunidadeMath passaram.')
