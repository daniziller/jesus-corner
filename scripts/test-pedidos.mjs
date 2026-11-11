// Testes dos pedidos de oração (handoff-passos-pedidos-53-54), parte pura:
// a lista unificada, o "orei" e a lista da Súplica.
// node scripts/test-pedidos.mjs
import { readFileSync } from 'node:fs'
import {
  prayedTodayIds, mergePedidos, activePedidos, originLabel, peopleLine, supportLine,
  applyOrei, revertOrei, suplicaToggle, countsForOthers, prayedCounter, suplicaView, SUPLICA_LIMIT,
} from '../src/pedidos/pedidosMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

const agora = new Date(2026, 10, 11, 10, 0).getTime()
const ha = dias => new Date(agora - dias * 86400000).toISOString()
// Como o armazenamento devolve (prayerRequestsStore.js).
const meu = (id, body, dias, extra = {}) => ({ id, body, scope: 'only_me', groupId: null, groupName: '', isMine: true, status: 'open', resposta: null, notaResposta: null, createdAt: ha(dias), respondidoEm: null, prayCount: 0, diasOrados: 0, prayedToday: false, prayedEver: false, commentCount: 0, ...extra })
const doGrupo = (id, body, dias, extra = {}) => ({ ...meu(id, body, dias), scope: 'group', groupId: 'g1', groupName: 'Grupo Semente', isMine: false, prayCount: 5, ...extra })
const doFeed = (id, body, dias, extra = {}) => ({ id, userId: 'u-outra-pessoa', authorName: 'Marina', body, anonymous: false, scope: 'friends', groupId: null, groupName: '', createdAt: ha(dias), prayCount: 2, prayingByMe: false, prayedEver: false, isMine: false, status: 'open', ...extra })

const minhas = [meu('a', 'Sabedoria para decidir sobre a mudança de cidade', 24, { diasOrados: 9, prayedEver: true }), doGrupo('b', 'A cirurgia da mãe da Marina, na quinta', 2), meu('c', 'Meu pai voltar a falar com meu irmão', 92)]
const feed = [doFeed('d', 'Prova de residência no sábado', 1), doFeed('e', 'Um pedido sem nome', 3, { anonymous: true, authorName: null }), { ...doFeed('b', 'repetido do grupo', 2), scope: 'group' }, { ...doFeed('a', 'meu no feed', 24), isMine: true }]
const marcas = [{ prayer_request_id: 'a', prayed_date: '2026-11-11' }, { prayer_request_id: 'a', prayed_date: '2026-11-10' }, { prayer_request_id: 'b', prayed_date: '2026-11-10' }]

// ── "Orei hoje" no dia do aparelho ──────────────────────────────────────
check('orei hoje: só as marcas com a data de hoje', [...prayedTodayIds(marcas, '2026-11-11')], ['a'])
check('virada do dia: a marca de ontem não vale para hoje', [[...prayedTodayIds(marcas, '2026-11-10')].sort(), [...prayedTodayIds(marcas, '2026-11-12')]], [['a', 'b'], []])
check('sem marcas', [[...prayedTodayIds([], '2026-11-11')], [...prayedTodayIds(null, '2026-11-11')]], [[], []])
// 23h30 em São Paulo já é o dia seguinte em UTC: quem decide é o dia do aparelho.
const servidorDizQueNao = [meu('a', 'x', 1, { prayedToday: false })]
check('o servidor (UTC) diz que não orei, mas a minha marca de hoje (dia do aparelho) diz que sim', mergePedidos({ mine: servidorDizQueNao, feed: [], intentions: [{ prayer_request_id: 'a', prayed_date: '2026-11-11' }], todayKey: '2026-11-11' })[0].prayedToday, true)
check('o servidor diz que orei "hoje" (UTC), mas no meu dia ainda não', mergePedidos({ mine: [meu('a', 'x', 1, { prayedToday: true })], feed: [], intentions: [{ prayer_request_id: 'a', prayed_date: '2026-11-11' }], todayKey: '2026-11-12' })[0].prayedToday, false)
check('sem as marcas (falha de leitura), vale o que o servidor disse', mergePedidos({ mine: [meu('a', 'x', 1, { prayedToday: true })], feed: [], intentions: null, todayKey: '2026-11-11' })[0].prayedToday, true)

// ── Lista unificada ─────────────────────────────────────────────────────
const lista = mergePedidos({ mine: minhas, feed, intentions: marcas, todayKey: '2026-11-11' })
check('lista: meus e dos grupos na ordem em que vieram, amigos depois; sem repetir', lista.map(p => [p.id, p.origin]), [['a', 'mine'], ['b', 'group'], ['c', 'mine'], ['d', 'friend'], ['e', 'friend']])
check('origem: "Meu", o nome do grupo, o nome de quem pediu, "Anônimo"', lista.map(p => originLabel(p)), [{ kind: 'mine', text: 'Meu' }, { kind: 'group', text: 'Grupo Semente' }, { kind: 'mine', text: 'Meu' }, { kind: 'friend', text: 'Marina' }, { kind: 'friend', text: 'Anônimo' }])
check('ativos: os respondidos ficam de fora', activePedidos([...lista, meu('z', 'respondido', 61, { status: 'closed', resposta: 'sim' })]).map(p => p.id), ['a', 'b', 'c', 'd', 'e'])

// ── Linhas de apoio ─────────────────────────────────────────────────────
check('quantas pessoas oraram', [peopleLine(5), peopleLine(1), peopleLine(0)], ['5 pessoas já oraram', '1 pessoa já orou', 'Ninguém orou ainda'])
check('Súplica: "Orando há 24 dias" nos meus, pessoas nos outros', lista.slice(0, 3).map(p => supportLine(p, { now: agora })), ['Orando há 24 dias', '5 pessoas já oraram', 'Orando há 3 meses'])
check('lista (O1): " · orei hoje" nos meus; "Há 2 dias · " nos outros', lista.slice(0, 4).map(p => supportLine(p, { list: true, now: agora })), ['Orando há 24 dias · orei hoje', 'Há 2 dias · 5 pessoas já oraram', 'Orando há 3 meses', 'Há 1 dia · 2 pessoas já oraram'])
check('pedido feito agora: em horas', supportLine({ ...meu('n', 'novo', 0), origin: 'mine' }, { now: agora }), 'Orando há 1 h')

// ── O "orei" ────────────────────────────────────────────────────────────
const [a, b, c, d] = lista
check('orar por pedido de outra pessoa, primeira vez: marca hoje e soma uma pessoa', (({ prayedToday, prayedEver, prayCount }) => ({ prayedToday, prayedEver, prayCount }))(applyOrei(d)), { prayedToday: true, prayedEver: true, prayCount: 3 })
check('orar de novo, outro dia, pelo mesmo pedido de outra pessoa: não é pessoa nova', applyOrei({ ...b, prayedEver: true }).prayCount, 5)
check('orar por pedido meu: só registra o dia (uma vez a mais), não soma pessoa', (({ prayedToday, prayCount, diasOrados }) => ({ prayedToday, prayCount, diasOrados }))(applyOrei(c)), { prayedToday: true, prayCount: 0, diasOrados: 1 })
check('uma vez por pedido por dia: marcar de novo no mesmo dia não muda nada', [applyOrei(a) === a, applyOrei(applyOrei(d)).prayCount, applyOrei(applyOrei(c)).diasOrados], [true, 3, 1])
// A Súplica deixa desmarcar — só a marca feita naquela mesma oração.
const marcadasAgora = new Set(['b'])
check('check da Súplica: não orado → marca', [suplicaToggle(b, marcadasAgora), suplicaToggle(c, new Set())], ['orar', 'orar'])
check('check da Súplica: marcado nesta oração → desmarca', suplicaToggle(applyOrei(b), marcadasAgora), 'desfazer')
check('check da Súplica: orado antes, hoje (fora desta oração) → fica como está', [suplicaToggle(a, marcadasAgora), suplicaToggle(a, new Set()), suplicaToggle(a, undefined)], [null, null, null])
check('desmarcar devolve o pedido de outra pessoa ao que era (a pessoa a mais sai)', (({ prayedToday, prayedEver, prayCount }) => ({ prayedToday, prayedEver, prayCount }))(revertOrei(applyOrei(d), d)), { prayedToday: false, prayedEver: false, prayCount: 2 })
check('desmarcar um pedido meu devolve o dia', (({ prayedToday, diasOrados }) => ({ prayedToday, diasOrados }))(revertOrei(applyOrei(c), c)), { prayedToday: false, diasOrados: 0 })
check('desmarcar num pedido em que eu já tinha orado outro dia: continuo contando como pessoa', (x => [x.prayedEver, x.prayCount])(revertOrei(applyOrei({ ...b, prayedEver: true }), { ...b, prayedEver: true })), [true, 5])

check('conta na família "Oração pelos outros"? só pedido de outra pessoa', [countsForOthers(a), countsForOthers(b), countsForOthers(d)], [false, true, true])

// ── A lista da Súplica ──────────────────────────────────────────────────
const tres = lista.slice(0, 3)
check('contador: "1 de 3 orado" (o quadro S2)', suplicaView(tres).counter, '1 de 3 orado')
check('contador: plural e singular', [prayedCounter(2, 3), prayedCounter(0, 3), prayedCounter(1, 1), prayedCounter(3, 3)], ['2 de 3 orados', '0 de 3 orados', '1 de 1 orado', '3 de 3 orados'])
check('Súplica com três: todos, na ordem da lista, sem "Ver os"', (v => [v.rows.map(r => r.id), v.total, v.more, v.empty])(suplicaView(tres)), [['a', 'b', 'c'], 3, null, false])
const sete = [...lista, meu('f', 'seis', 5), meu('g', 'sete', 6)]
check(`mais de ${SUPLICA_LIMIT}: mostram-se ${SUPLICA_LIMIT} e a linha "Ver os 7 pedidos"`, (v => [v.rows.length, v.total, v.more, v.counter])(suplicaView(sete)), [5, 7, 'Ver os 7 pedidos', '1 de 7 orado'])
check('aberta no lugar: os sete, e a linha some', (v => [v.rows.length, v.more])(suplicaView(sete, { expanded: true })), [7, null])
check('exatamente cinco: sem a linha', suplicaView(sete.slice(0, 5)).more, null)
check('nenhum pedido ativo: vazio, sem contador', suplicaView([meu('z', 'respondido', 61, { status: 'closed' })]), { rows: [], total: 0, empty: true, counter: null, more: null })
check('lista ainda não carregada', suplicaView(undefined).empty, true)

// ── Privacidade ─────────────────────────────────────────────────────────
// Quem pediu vê só o número: nenhum pedido carrega quem orou, nem o id de
// outra pessoa.
const chavesProibidas = ['userId', 'user_id', 'author_id', 'prayedBy', 'sharers', 'names']
check('nenhum pedido da lista carrega id ou nome de quem orou', lista.flatMap(p => Object.keys(p).filter(k => chavesProibidas.includes(k))), [])
check('o número de quem orou é só um número', lista.every(p => typeof p.prayCount === 'number'), true)
check('pedido de amigo publicado sem nome: o nome de quem pediu não passa', [lista[4].authorName, originLabel(lista[4]).text], ['', 'Anônimo'])
check('pedido de grupo: a origem é o grupo, nunca o nome de quem pediu', [lista[1].authorName, originLabel(lista[1]).text], ['', 'Grupo Semente'])
// O armazenamento só lê as PRÓPRIAS marcas de "orei" e nunca nomes de quem orou.
const store = readFileSync(new URL('../src/groups/prayerRequestsStore.js', import.meta.url), 'utf8')
const leituras = [...store.matchAll(/\.from\('group_prayer_intentions'\)\s*\.select\([^)]*\)([\s\S]*?)(?:\n\s*if|\n\s*return)/g)]
check('toda leitura das marcas de "orei" filtra pela própria pessoa', [leituras.length > 0, leituras.every(m => /\.eq\('user_id', userId\)/.test(m[1]))], [true, true])

// ── O "orei" é um só ────────────────────────────────────────────────────
// A Súplica (S2) marca pelo mesmo caminho da lista de pedidos: pedidos/
// orei.js. Nenhuma peça dela fala direto com a gravação.
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')
const orei = ler('pedidos/orei.js')
check('orei.js é quem grava e desfaz a marca', [/markPraying\(request\.id\)/.test(orei), /unmarkPrayingToday\(request\.id\)/.test(orei)], [true, true])
check('orar por pedido próprio não avisa a família "Oração pelos outros"', /function notify\(request\) \{\s*if \(!countsForOthers\(request\)\) return/.test(orei), true)
const pecasDaSuplica = ['screens/PrayerScreen.jsx', 'components/passos/PedidosDaSuplica.jsx', 'pedidos/usePedidos.js', 'pedidos/pedidosApi.js']
check('a Súplica não chama a gravação por fora do orei.js', pecasDaSuplica.filter(f => /markPraying|unmarkPrayingToday|group_prayer_intentions/.test(ler(f))), [])
check('a lista de pedidos usa o orarPor/desfazerOrei do orei.js', /orar: orarPor,\s*desfazer: desfazerOrei/.test(ler('pedidos/pedidosApi.js')), true)
// Uma vez por pedido por dia: a marca é (pedido, pessoa, dia do aparelho) e repetir não cria outra.
check('a gravação é uma por pedido por dia, no dia do aparelho', [/prayed_date: dateKey\(\)/.test(store), /onConflict: 'prayer_request_id,user_id,prayed_date', ignoreDuplicates: true/.test(store)], [true, true])
check('desfazer só apaga a própria marca de hoje', /\.delete\(\)\s*\.eq\('prayer_request_id', requestId\)\s*\.eq\('user_id', userId\)\s*\.eq\('prayed_date', dateKey\(\)\)/.test(store), true)
// A Súplica não mostra nome de quem orou nem abre comentário.
const suplica = ler('components/passos/PedidosDaSuplica.jsx')
check('a Súplica só mostra texto, origem e contagem — sem nomes de quem orou, sem comentários', /prayedBy|comment|Comment/.test(suplica), false)

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes dos pedidos (parte pura) passaram.')
