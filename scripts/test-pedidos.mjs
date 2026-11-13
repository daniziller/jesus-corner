// Testes dos pedidos de oração (handoff-passos-pedidos-53-54), parte pura:
// a lista unificada, o "orei" e a lista da Súplica.
// node scripts/test-pedidos.mjs
import { readFileSync, readdirSync } from 'node:fs'
import {
  prayedTodayIds, mergePedidos, activePedidos, originLabel, peopleLine, supportLine,
  applyOrei, revertOrei, suplicaToggle, countsForOthers, prayedCounter, suplicaView, SUPLICA_LIMIT,
  DEFAULT_WHO_SEES, MAX_PEDIDO, whoSeesOptions, requestFormState, requestPayload, ANSWER_OPTIONS, prayedSummary, answerSheetState,
  commentsLine, answeredPedidos, pedidosOfTab, pedidosTabs, answeredRow, answeredBlock, cardTap, othersCard, othersPrayedCount,
} from '../src/pedidos/pedidosMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

// Os arquivos de código, pra os testes de estrutura e de privacidade.
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')
const store = ler('groups/prayerRequestsStore.js')

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

// ── A lista de pedidos (O1) ─────────────────────────────────────────────
const respondido = (id, body, criadoHa, respondidoHa, resposta, nota = null) => meu(id, body, criadoHa, { status: 'closed', resposta, notaResposta: nota, respondidoEm: ha(respondidoHa) })
const comRespondidos = mergePedidos({
  mine: [...minhas, respondido('r1', 'Que meu chefe mudasse', 300, 60, 'aprenda', 'Ele segue igual. Eu que aprendi a responder diferente.'), respondido('r2', 'Trabalho para a Juliana', 69, 10, 'sim', 'Começou em março, no lugar que ela nem tinha pedido.'), respondido('r3', 'A viagem em julho', 40, 30, 'nao')],
  feed, intentions: marcas, todayKey: '2026-11-11',
})
check('abas (o quadro O1, mais a dos amigos): contagens', pedidosTabs(comRespondidos), [{ key: 'ativos', label: 'Ativos · 5' }, { key: 'respondidos', label: 'Respondidos · 3' }, { key: 'grupo', label: 'Do grupo · 1' }, { key: 'amigos', label: 'Amigos · 2' }])
check('sem pedido de amigo, as três abas do quadro; "Do grupo · 0" continua', pedidosTabs(mergePedidos({ mine: [meu('a', 'x', 1)], feed: [], intentions: [], todayKey: '2026-11-11' })).map(t => t.label), ['Ativos · 1', 'Respondidos · 0', 'Do grupo · 0'])
check('aba Ativos: todos os ativos, na ordem da lista', pedidosOfTab(comRespondidos, 'ativos').map(p => p.id), ['a', 'b', 'c', 'd', 'e'])
check('aba Do grupo e aba Amigos: só pedidos de outras pessoas', [pedidosOfTab(comRespondidos, 'grupo').map(p => p.id), pedidosOfTab(comRespondidos, 'amigos').map(p => p.id), pedidosOfTab(comRespondidos, 'grupo').concat(pedidosOfTab(comRespondidos, 'amigos')).some(p => p.isMine)], [['b'], ['d', 'e'], false])
check('aba Respondidos: do mais recente ao mais antigo', [pedidosOfTab(comRespondidos, 'respondidos').map(p => p.id), answeredPedidos(comRespondidos).length], [['r2', 'r3', 'r1'], 3])
check('bloco RESPONDIDOS: os dois mais recentes e "Ver os 3"', (b => [b.total, b.more, b.rows.map(r => r.id)])(answeredBlock(comRespondidos)), [3, 'Ver os 3', ['r2', 'r3']])
check('bloco RESPONDIDOS: com um ou dois, sem "Ver os"; sem nenhum, sem bloco', [answeredBlock(comRespondidos.filter(p => p.id !== 'r1')).more, answeredBlock(lista)], [null, null])
check('respondido "Sim": selo cheio, "orado por 59 dias" (do pedido até a resposta), a frase entre aspas', answeredRow(comRespondidos.find(p => p.id === 'r2')), { id: 'r2', badge: 'Sim', solid: true, span: 'orado por 59 dias', body: 'Trabalho para a Juliana', note: '"Começou em março, no lugar que ela nem tinha pedido."' })
check('respondido "Aprenda": selo claro, "orado por 8 meses"; sem "o que eu vi", sem linha', [(r => [r.badge, r.solid, r.span])(answeredRow(comRespondidos.find(p => p.id === 'r1'))), (r => [r.badge, r.span, r.note])(answeredRow(comRespondidos.find(p => p.id === 'r3')))], [['Aprenda', false, 'orado por 8 meses'], ['Não', 'orado por 10 dias', null]])
check('a partir de 60 dias, em meses (a regra de tempo de sempre)', answeredRow(respondido('x', 'x', 71, 10, 'sim')).span, 'orado por 2 meses')
check('respondido no mesmo dia e em um dia: "1 h" e "1 dia"', [answeredRow(respondido('x', 'x', 1, 1, 'sim')).span, answeredRow(respondido('x', 'x', 2, 1, 'se_mova')).span, answeredRow(respondido('x', 'x', 2, 1, 'se_mova')).badge], ['orado por 1 h', 'orado por 1 dia', 'Se mova'])
check('toque no cartão: meu e ativo → "Como Deus respondeu?"; de outra pessoa ou já respondido → detalhe', [cardTap(a), cardTap(b), cardTap(d), cardTap(comRespondidos.find(p => p.id === 'r2'))], ['responder', 'detalhe', 'detalhe', 'detalhe'])
check('comentários na linha da lista: plural, singular e nenhum', [commentsLine(2), commentsLine(1), commentsLine(0), supportLine({ ...b, commentCount: 2 }, { list: true, now: agora }), supportLine({ ...a, commentCount: 1 }, { list: true, now: agora }), supportLine({ ...b, commentCount: 2 }, { now: agora })], ['2 comentários', '1 comentário', '', 'Há 2 dias · 5 pessoas já oraram · 2 comentários', 'Orando há 24 dias · orei hoje · 1 comentário', '5 pessoas já oraram'])
// O cartão "orações pelos outros" — a família "Oração pelos outros".
check('47 orações (o quadro O1): "Faltam 3 para "Cinquenta orações"", barra em 92,5%', (c => [c.value, c.caption, c.line, c.progress])(othersCard(47)), ['47', 'orações pelos outros', 'Faltam 3 para "Cinquenta orações"', 0.925])
check('"Falta 1 para …", singular "1 oração", e do zero', [othersCard(49).line, othersCard(1).caption, othersCard(0).line, othersCard(0).progress, othersCard(10).line], ['Falta 1 para "Cinquenta orações"', 'oração pelos outros', 'Faltam 10 para "Dez orações"', 0, 'Faltam 40 para "Cinquenta orações"'])
check('último degrau: a segunda linha vira o nome dele e a barra some', (c => [c.value, c.line, c.progress])(othersCard(1200)), ['1.200', 'Intercessor', null])
check('a contagem é a da família: minhas marcas em pedidos de outras pessoas (uma por pedido por dia)', [othersPrayedCount(marcas, new Set(['a', 'c'])), othersPrayedCount([...marcas, { prayer_request_id: 'd', prayed_date: '2026-11-11' }], new Set(['a', 'c'])), othersPrayedCount(null, new Set())], [1, 2, null])

// ── Fazer um pedido (O2) ────────────────────────────────────────────────
check('"Só eu" é o padrão de "Quem vê"', [DEFAULT_WHO_SEES, requestFormState().publishing, requestFormState({ body: 'x' }).button], ['only_me', false, 'Guardar pedido'])
const quemVe = whoSeesOptions({ groups: [{ groupId: 'g1', name: 'Grupo Semente' }], memberCounts: { g1: 6 }, friendsCount: 12 })
check('"Quem vê" (o quadro O2): "Só eu" primeiro, depois os grupos e "Meus amigos"', quemVe, [{ key: 'only_me', title: 'Só eu', sub: 'no seu diário' }, { key: 'group:g1', title: 'Grupo Semente', sub: '6 pessoas' }, { key: 'friends', title: 'Meus amigos', sub: '12 pessoas' }])
check('sem grupo: "Só eu" e "Meus amigos"; plurais "1 pessoa" e "0 pessoas"', whoSeesOptions({ groups: [{ groupId: 'g', name: 'G' }], memberCounts: { g: 1 } }).map(o => o.sub).concat(whoSeesOptions().map(o => o.key)), ['no seu diário', '1 pessoa', '0 pessoas', 'only_me', 'friends'])
const frase = 'Meu pai começa o tratamento na terça e eu estou com medo.'
check('estado 1 — "Só eu" (o quadro O2): guarda, sem cartão de anonimato', requestFormState({ body: frase, choice: 'only_me' }), { publishing: false, showAnonymous: false, button: 'Guardar pedido', note: 'Fica só com você, no seu diário de oração. Para pedir oração a outras pessoas, escolha um grupo acima.', counter: '57 / 240', over: false, canSubmit: true })
check('estado 2 — um grupo escolhido: publica, com "Publicar sem meu nome" e o aviso do número', (st => [st.publishing, st.showAnonymous, st.button, st.note])(requestFormState({ body: frase, choice: 'group:g1' })), [true, true, 'Publicar pedido', 'Você recebe só o número de pessoas que oraram, nunca os nomes. Pode encerrar o pedido quando quiser.'])
check('"Meus amigos" também é publicar', requestFormState({ body: frase, choice: 'friends' }).button, 'Publicar pedido')
check('botão desabilitado com o campo vazio, só com espaços, ou acima de 240', [requestFormState({ body: '' }).canSubmit, requestFormState({ body: '   \n' }).canSubmit, requestFormState({ body: 'a'.repeat(241) }).canSubmit, requestFormState({ body: 'a'.repeat(241) }).over, requestFormState({ body: 'a'.repeat(240) }).canSubmit, MAX_PEDIDO], [false, false, false, true, true, 240])
check('o que é gravado com "Só eu": nunca leva grupo nem anonimato, mesmo se a chave ficou ligada', requestPayload({ body: `  ${frase} `, choice: 'only_me', anonymous: true }), { body: frase, scope: 'only_me', groupId: null, anonymous: false })
check('só publica com um grupo (ou os amigos) escolhido', [requestPayload({ body: frase }), requestPayload({ body: frase, choice: 'group:g1' }), requestPayload({ body: frase, choice: 'group:g1', anonymous: true }), requestPayload({ body: frase, choice: 'friends' })], [{ body: frase, scope: 'only_me', groupId: null, anonymous: false }, { body: frase, scope: 'group', groupId: 'g1', anonymous: false }, { body: frase, scope: 'group', groupId: 'g1', anonymous: true }, { body: frase, scope: 'friends', groupId: null, anonymous: false }])
const folhaPedido = ler('components/pedidos/FolhaFazerPedido.jsx')
check('a folha sempre abre em "Só eu" e com "Publicar sem meu nome" desligado — nada é lembrado', [/useState\(DEFAULT_WHO_SEES\)/.test(folhaPedido), /const \[anonymous, setAnonymous\] = useState\(false\)/.test(folhaPedido), /localStorage|sessionStorage|defaultGroupId|lastChoice/.test(folhaPedido)], [true, true, false])
check('a gravação recebe o que requestPayload devolve', /createPrayerRequest\(requestPayload\(\{ body, choice, anonymous \}\)\)/.test(folhaPedido), true)

// ── Como Deus respondeu? (O3) ───────────────────────────────────────────
check('as cinco respostas, na ordem da grade, com os apoios', ANSWER_OPTIONS.map(o => `${o.title} / ${o.sub}`), ['Sim / Veio como eu pedi', 'Não / Ele fechou a porta', 'Espere / Ainda não é o tempo', 'Aprenda / A situação ficou; eu mudei', 'Se mova / A resposta pedia um passo meu'])
check('nenhuma vem escolhida: botão "Guardar o pedido", desabilitado', [answerSheetState(null), answerSheetState(undefined).canSave], [{ canSave: false, keepsActive: false, button: 'Guardar o pedido' }, false])
check('"Sim", "Não", "Aprenda", "Se mova": guardam o pedido', ['sim', 'nao', 'aprenda', 'se_mova'].map(k => answerSheetState(k)), Array(4).fill({ canSave: true, keepsActive: false, button: 'Guardar o pedido' }))
check('"Espere" mantém o pedido ativo e o botão diz "Seguir orando"', answerSheetState('espere'), { canSave: true, keepsActive: true, button: 'Seguir orando' })
check('"Espere" não chama o servidor: o pedido não muda', /if \(response === 'espere'\) return/.test(store), true)
check('"Orado por 24 dias · 9 vezes" (o quadro O3)', prayedSummary(a, agora), 'Orado por 24 dias · 9 vezes')
check('"Orado por 1 dia · 1 vez"; meses; sem marca nenhuma, só o tempo', [prayedSummary(meu('x', 'x', 1, { diasOrados: 1 }), agora), prayedSummary(meu('x', 'x', 92, { diasOrados: 40 }), agora), prayedSummary(c, agora)], ['Orado por 1 dia · 1 vez', 'Orado por 3 meses · 40 vezes', 'Orado por 3 meses'])

// ── Privacidade ─────────────────────────────────────────────────────────
// Quem pediu vê só o número: nenhum pedido carrega quem orou, nem o id de
// outra pessoa.
const chavesProibidas = ['userId', 'user_id', 'author_id', 'prayedBy', 'sharers', 'names']
check('nenhum pedido da lista carrega id ou nome de quem orou', lista.flatMap(p => Object.keys(p).filter(k => chavesProibidas.includes(k))), [])
check('o número de quem orou é só um número', lista.every(p => typeof p.prayCount === 'number'), true)
check('pedido de amigo publicado sem nome: o nome de quem pediu não passa', [lista[4].authorName, originLabel(lista[4]).text], ['', 'Anônimo'])
check('pedido de grupo: a origem é o grupo, nunca o nome de quem pediu', [lista[1].authorName, originLabel(lista[1]).text], ['', 'Grupo Semente'])
// O armazenamento só lê as PRÓPRIAS marcas de "orei" e nunca nomes de quem orou.
const leituras = [...store.matchAll(/\.from\('group_prayer_intentions'\)\s*\.select\([^)]*\)([\s\S]*?)(?:\n\s*if|\n\s*return)/g)]
check('toda leitura das marcas de "orei" filtra pela própria pessoa', [leituras.length > 0, leituras.every(m => /\.eq\('user_id', userId\)/.test(m[1]))], [true, true])

// ── O "orei" é um só ────────────────────────────────────────────────────
// A Súplica (S2) marca pelo mesmo caminho da lista de pedidos: pedidos/
// orei.js. Nenhuma peça dela fala direto com a gravação.
const orei = ler('pedidos/orei.js')
check('orei.js é quem grava e desfaz a marca', [/markPraying\(request\.id\)/.test(orei), /unmarkPrayingToday\(request\.id\)/.test(orei)], [true, true])
check('orar por pedido próprio não avisa a família "Oração pelos outros"', /function notify\(request\) \{\s*if \(!countsForOthers\(request\)\) return/.test(orei), true)
const pecasDaSuplica = ['screens/PrayerScreen.jsx', 'components/passos/PedidosDaSuplica.jsx', 'pedidos/usePedidos.js', 'pedidos/pedidosApi.js']
check('a Súplica não chama a gravação por fora do orei.js', pecasDaSuplica.filter(f => /markPraying|unmarkPrayingToday|group_prayer_intentions/.test(ler(f))), [])
check('a lista de pedidos usa o orarPor/desfazerOrei do orei.js', /orar: orarPor,\s*desfazer: desfazerOrei/.test(ler('pedidos/pedidosApi.js')), true)
// Uma vez por pedido por dia: a marca é (pedido, pessoa, dia do aparelho) e repetir não cria outra.
check('a gravação é uma por pedido por dia, no dia do aparelho', [/prayed_date: dateKey\(\)/.test(store), /onConflict: 'prayer_request_id,user_id,prayed_date', ignoreDuplicates: true/.test(store)], [true, true])
check('desfazer só apaga a própria marca de hoje', /\.delete\(\)\s*\.eq\('prayer_request_id', requestId\)\s*\.eq\('user_id', userId\)\s*\.eq\('prayed_date', dateKey\(\)\)/.test(store), true)
// Fora do orei.js, ninguém grava a marca: lista, detalhe do pedido e aba de oração dos grupos.
const fontes = readdirSync(new URL('../src/', import.meta.url), { recursive: true }).filter(f => /\.(jsx?|mjs)$/.test(String(f))).map(String)
check('em todo o app, só o orei.js (e o próprio armazenamento) chama markPraying', fontes.filter(f => /markPraying\(/.test(ler(f))).sort(), ['groups/prayerRequestsStore.js', 'pedidos/orei.js'])
const telaLista = ler('screens/PrayerRequestsScreen.jsx')
const cartao = ler('components/pedidos/CartaoDoPedido.jsx')
check('a lista (O1) marca pelo mesmo caminho da Súplica', [/usePedidos\(/.test(telaLista), /onOrar=\{pedidos\.orar\}/.test(telaLista), /markPraying|group_prayer_intentions/.test(telaLista + cartao)], [true, true, false])
check('o botão da lista não desmarca: só chama o "orei" quando ainda não orei hoje', [/if \(!pedido\.prayedToday\) onOrar\(pedido\)/.test(cartao), /onDesfazer|desfazer/.test(telaLista + cartao)], [true, false])
check('um botão por pedido: "orei", com aria-pressed; sem "Orei por isso" nem "Arquivar"', [(cartao.match(/aria-label="Orei por este pedido"/g) ?? []).length, /aria-pressed=\{pedido\.prayedToday\}/.test(cartao), /Orei por isso|Arquivar/.test(cartao + telaLista)], [1, true, false])
check('a lista e os cartões só mostram contagem — nenhum nome de quem orou', /prayedBy|sharers|quemOrou/.test(telaLista + cartao + ler('components/pedidos/BlocoRespondidos.jsx')), false)
// A Súplica não mostra nome de quem orou nem abre comentário.
const suplica = ler('components/passos/PedidosDaSuplica.jsx')
check('a Súplica só mostra texto, origem e contagem — sem nomes de quem orou, sem comentários', /prayedBy|comment|Comment/.test(suplica), false)

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes dos pedidos (parte pura) passaram.')
