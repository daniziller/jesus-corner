// Turno 35, Bloco 1 — testa src/reading/bibleOrderMath.js (getBibleOrderMode/
// setBibleOrderMode, em bibleOrderStore.js, fazem I/O — não testados aqui).
// Roda com: node scripts/test-bible-order.mjs
import {
  canonicalBookOrder, chronologicalBookOrder, resolveBookOrder, resolveNextChapter, customBookLists, moveBook, setBookIncluded, keepBooks, dragTargetIndex, dragRowShift,
  planStart, planQueue, splitPointsFor, orderedPlanSessions, sessionAt, findPlanSession, planTotals,
} from '../src/reading/bibleOrderMath.js'
import { computeBookChapterCounts, deriveProgress, sessionKeys } from '../src/utils/progress.js'
import { deriveChronoProgress } from '../src/data/chronologicalPlan.js'
import { SESSIONS_BY_PLAN } from '../src/data/bibleBlocks.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

const canonical = canonicalBookOrder()
const chronological = chronologicalBookOrder()
check('ordem canônica começa em Gênesis', canonical[0], 'Gênesis')
check('ordem canônica termina em Apocalipse', canonical[canonical.length - 1], 'Apocalipse')
check('ordem canônica tem 66 livros', canonical.length, 66)
check('ordem cronológica tem os mesmos 66 livros (nenhum perdido)', [...chronological].sort(), [...canonical].sort())
check('ordem cronológica NÃO é igual à canônica (senão não seria outra ordem)', chronological.join(',') === canonical.join(','), false)
check('ordem cronológica começa em Jó (mais antigo)', chronological[0], 'Jó')

// resolveBookOrder — em "minha ordem" entram só os livros escolhidos.
const customPartial = ['Filipenses', 'Gênesis']
check('minha ordem: só os livros escolhidos, na ordem escolhida', resolveBookOrder('custom', customPartial), customPartial)
check('minha ordem nunca configurada: os 66, na ordem canônica', resolveBookOrder('custom', null), canonical)
check('minha ordem ignora nome que não é livro e livro repetido', resolveBookOrder('custom', ['Rute', 'Não existe', 'Rute', 'Jonas']), ['Rute', 'Jonas'])
check('modo desconhecido cai na canônica', resolveBookOrder('bogus', null), canonical)
check('cronológica ignora customOrder', resolveBookOrder('chronological', customPartial), chronological)
check('ordem livre percorre a ordem da Bíblia', resolveBookOrder('free', customPartial), canonical)

// resolveNextChapter — sobre dados reais de capítulos por livro.
const bookChapterCounts = computeBookChapterCounts(SESSIONS_BY_PLAN.free)
check('Bíblia vazia: próximo é Gênesis 1, em qualquer ordem', resolveNextChapter(new Set(), canonical, bookChapterCounts), { book: 'Gênesis', chapter: 1 })
check('Bíblia vazia, ordem cronológica: próximo é Jó 1', resolveNextChapter(new Set(), chronological, bookChapterCounts), { book: 'Jó', chapter: 1 })

const genesisDone = new Set(Array.from({ length: bookChapterCounts['Gênesis'] }, (_, i) => `Gênesis:${i + 1}`))
check('Gênesis inteiro lido: próximo é Êxodo 1 (canônica)', resolveNextChapter(genesisDone, canonical, bookChapterCounts), { book: 'Êxodo', chapter: 1 })

const allDone = new Set()
for (const book of canonical) {
  for (let ch = 1; ch <= (bookChapterCounts[book] ?? 0); ch++) allDone.add(`${book}:${ch}`)
}
check('Bíblia inteira lida: nenhum capítulo restante', resolveNextChapter(allDone, canonical, bookChapterCounts), null)

// Trocar de ordem no meio da leitura não "perde" progresso — só um pulo
// pra ordem cronológica com Gênesis já lido continua achando o próximo
// certo (o primeiro livro cronológico ainda não concluído).
const nextChrono = resolveNextChapter(genesisDone, chronological, bookChapterCounts)
check('Gênesis lido, mudando pra cronológica: Jó ainda falta (vem antes de Gênesis lá)', nextChrono, { book: 'Jó', chapter: 1 })

// ── Minha ordem: arrastar e escolher os livros ─────────────────────────
const listas = customBookLists(['Salmos', 'João', 'Gênesis'])
check('listas de "minha ordem": os do plano, na ordem montada', listas.included, ['Salmos', 'João', 'Gênesis'])
check('…e os de fora, na ordem da Bíblia', [listas.excluded.length, listas.excluded[0], listas.excluded.includes('Salmos')], [63, 'Êxodo', false])
check('nunca configurada: todos dentro, nenhum fora', [customBookLists(null).included.length, customBookLists(null).excluded], [66, []])
check('arrastar um livro para qualquer posição', [moveBook(['A', 'B', 'C', 'D'], 3, 0), moveBook(['A', 'B', 'C', 'D'], 0, 2), moveBook(['A', 'B', 'C', 'D'], 1, 99), moveBook(['A', 'B'], 1, 1)], [['D', 'A', 'B', 'C'], ['B', 'C', 'A', 'D'], ['A', 'C', 'D', 'B'], ['A', 'B']])
check('pôr um livro no plano: entra no fim da fila; já estava, nada muda', [setBookIncluded(['Salmos'], 'Rute', true), setBookIncluded(['Salmos', 'Rute'], 'Rute', true)], [['Salmos', 'Rute'], ['Salmos', 'Rute']])
check('tirar um livro do plano; o último não sai (o plano nunca fica vazio)', [setBookIncluded(['Salmos', 'Rute'], 'Salmos', false), setBookIncluded(['Rute'], 'Rute', false)], [['Rute'], ['Rute']])

check('escolha rápida: ficam só os livros pedidos — os que já estavam mantêm a ordem montada, os novos entram no fim', keepBooks(['João', 'Salmos', 'Mateus'], ['Mateus', 'Marcos', 'Lucas', 'João']), ['João', 'Mateus', 'Marcos', 'Lucas'])
check('escolha rápida "Todos": nada do que foi montado se perde', keepBooks(['João', 'Salmos'], canonical).slice(0, 3), ['João', 'Salmos', 'Gênesis'])
check('arrastar: a posição de destino acompanha o dedo, linha a linha, sem sair da lista', [dragTargetIndex(2, 0, 48, 10), dragTargetIndex(2, 23, 48, 10), dragTargetIndex(2, 25, 48, 10), dragTargetIndex(2, -100, 48, 10), dragTargetIndex(2, -500, 48, 10), dragTargetIndex(2, 5000, 48, 10)], [2, 2, 3, 0, 0, 9])
check('arrastar para baixo: as linhas do caminho sobem uma casa; as outras ficam', [1, 2, 3, 4, 5].map(i => dragRowShift(i, 2, 4, 48)), [0, 0, -48, -48, 0])
check('arrastar para cima: as linhas do caminho descem uma casa', [0, 1, 2, 3, 4].map(i => dragRowShift(i, 3, 1, 48)), [0, 48, 48, 0, 0])

// ── O ponto de partida nunca marca nada ────────────────────────────────
const minutos = 15
const plano = (lidos, ponto) => deriveProgress(lidos, 'standard', 'ot_first', minutos, splitPointsFor(ponto))
const onde = (lidos, ordem, ponto) => {
  const { blocks, sessionsByBlock } = plano(lidos, ponto)
  const achada = findPlanSession({ blocks, sessionsByBlock, bookOrder: ordem, start: ponto })
  return achada ? `${achada.session.book} ${achada.session.type === 'reflection' ? 'reflexão' : achada.session.chStart}${achada.finished ? ' (fim)' : ''}` : null
}
const lido = (livro, de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => `${livro}:${de + i}`)
const vazio = new Set()
check('sem ponto de partida: a sessão de hoje é Gênesis 1', onde(vazio, canonical), 'Gênesis 1')
const pontoSalmos = { book: 'Salmos', chapter: 23 }
check('ponto de partida em Salmos 23: a sessão de hoje começa exatamente em Salmos 23', onde(vazio, canonical, pontoSalmos), 'Salmos 23')
check('escolher o ponto de partida não marca nada como lido (o conjunto de lidos é o mesmo)', vazio.size, 0)
check('o que ficou para trás continua por ler: nenhuma sessão antes do ponto está feita', plano(vazio, pontoSalmos).blocks.every(b => b.sessionsDone === 0), true)
check('a divisão em sessões recomeça no ponto de partida (nenhuma sessão mistura Salmos 22 com 23)', plano(vazio, pontoSalmos).sessionsByBlock[3].filter(x => x.book === 'Salmos' && x.type !== 'reflection' && x.chStart < 23 && x.chEnd >= 23).length, 0)
check('ponto no capítulo 1 não precisa cortar nada', splitPointsFor({ book: 'Salmos', chapter: 1 }), null)
const filaSalmos = orderedPlanSessions({ ...plano(vazio, pontoSalmos), bookOrder: canonical, start: pontoSalmos })
const nomes = filaSalmos.map(e => `${e.session.book}:${e.session.type === 'reflection' ? 'R' : e.session.chStart}`)
check('a fila gira: Salmos 23 em diante, Provérbios…, depois Gênesis…Jó e, no fim, o começo de Salmos e a reflexão dele', [nomes[0], nomes.indexOf('Provérbios:1') < nomes.indexOf('Gênesis:1'), nomes.indexOf('Jó:1') < nomes.indexOf('Salmos:1'), nomes[nomes.length - 1]], ['Salmos:23', true, true, 'Salmos:R'])
check('nenhuma sessão some nem repete ao girar a fila', [filaSalmos.length, new Set(filaSalmos.map(e => `${e.block.id}:${e.session.id}`)).size], [Object.values(plano(vazio, pontoSalmos).sessionsByBlock).flat().length, filaSalmos.length])
const primeiraSessao = filaSalmos[0].session
const leuPrimeira = new Set(sessionKeys(primeiraSessao))
check('lida no plano a sessão do ponto de partida, o plano segue adiante em Salmos, sem voltar a Gênesis', onde(leuPrimeira, canonical, pontoSalmos), `Salmos ${primeiraSessao.chEnd + 1}`)
const terminouDali = new Set(canonical.slice(canonical.indexOf('Salmos')).flatMap(b => lido(b, b === 'Salmos' ? 23 : 1, bookChapterCounts[b])))
for (const b of canonical.slice(canonical.indexOf('Provérbios'))) terminouDali.add(`${b}:reflection`)
check('lido de Salmos 23 até Apocalipse: o plano dá a volta e chega em Gênesis 1 (que nunca foi dado como lido)', onde(terminouDali, canonical, pontoSalmos), 'Gênesis 1')
const sessaoGenesis = plano(vazio).sessionsByBlock[1][0]
check('marcar à mão na leitura livre conta: com a primeira sessão de Gênesis toda marcada, a sessão de hoje é a seguinte', onde(new Set(sessionKeys(sessaoGenesis)), canonical), `Gênesis ${sessaoGenesis.chEnd + 1}`)
check('ponto de partida num livro que não está no plano não vale', planStart('custom', { start: pontoSalmos }, ['João', 'Rute']), null)
check('ponto de partida inválido não vale', [planStart('canonical', null, canonical), planStart('canonical', { start: { book: 'Salmos', chapter: 0 } }, canonical)], [null, null])
check('próximo capítulo a partir do ponto, dando a volta', [resolveNextChapter(vazio, canonical, bookChapterCounts, pontoSalmos), resolveNextChapter(terminouDali, canonical, bookChapterCounts, pontoSalmos)], [{ book: 'Salmos', chapter: 23 }, { book: 'Gênesis', chapter: 1 }])

const ritmoFixo = deriveProgress(vazio, 'standard')
const semDivisao = findPlanSession({ ...ritmoFixo, bookOrder: canonical, start: pontoSalmos })
check('ritmo fixo (sem divisão no ponto): o plano abre na sessão que contém o capítulo escolhido', [semDivisao.session.book, semDivisao.session.chStart <= 23 && 23 <= semDivisao.session.chEnd], ['Salmos', true])

// ── Minha ordem de verdade ─────────────────────────────────────────────
const minha = ['João', 'Salmos', 'Rute']
check('minha ordem: a sessão de hoje é do primeiro livro da fila', onde(vazio, minha), 'João 1')
const leuJoao = new Set([...lido('João', 1, bookChapterCounts['João']), 'João:reflection'])
check('terminado o primeiro livro, vem o segundo da fila (não o próximo da Bíblia)', onde(leuJoao, minha), 'Salmos 1')
check('livro fora do plano nunca vira sessão de hoje', orderedPlanSessions({ ...plano(vazio), bookOrder: minha }).some(e => !minha.includes(e.session.book)), false)
const totalMinha = planTotals({ ...plano(leuJoao), bookOrder: minha })
check('o total do plano conta só os livros escolhidos', [totalMinha.total < planTotals({ ...plano(leuJoao), bookOrder: canonical }).total, totalMinha.done > 0], [true, true])
const tudoDaMinha = new Set(minha.flatMap(b => [...lido(b, 1, bookChapterCounts[b]), `${b}:reflection`]))
check('lidos todos os livros escolhidos: o plano terminou', onde(tudoDaMinha, minha).endsWith('(fim)'), true)
check('minha ordem com ponto de partida no meio', onde(vazio, minha, { book: 'Salmos', chapter: 100 }), 'Salmos 100')

// ── Ordem livre ────────────────────────────────────────────────────────
const posicao = { start: { book: 'Êxodo', chapter: 1 }, free: { book: 'João', chapter: 3 } }
check('ordem livre segue de onde a pessoa está no plano; as outras, do ponto de partida escolhido', [planStart('free', posicao, canonical), planStart('canonical', posicao, canonical)], [{ book: 'João', chapter: 3 }, { book: 'Êxodo', chapter: 1 }])
check('ordem livre em João 3: a sessão de hoje é João 3 — e nada antes é dado como lido', [onde(vazio, canonical, posicao.free), vazio.size], ['João 3', 0])
const leuJoao3 = new Set(lido('João', 3, 4))
check('lido João 3–4 no plano: segue em João 5', onde(leuJoao3, canonical, posicao.free), 'João 5')
check('a pessoa vai para Salmos 23 na leitura do plano: o plano passa a seguir dali, e João 5 fica para depois', onde(leuJoao3, canonical, { book: 'Salmos', chapter: 23 }), 'Salmos 23')
check('…sem marcar o que ficou entre um ponto e outro', leuJoao3.size, 2)
check('ordem livre sem posição guardada: do começo', [planStart('free', { start: posicao.start, free: null }, canonical), onde(vazio, canonical, null)], [null, 'Gênesis 1'])

const emSalmos = sessionAt(plano(vazio, { book: 'Salmos', chapter: 23 }), 'Salmos', 23)
check('abrir a leitura do plano num texto escolhido: a sessão começa exatamente nele, no bloco do livro', [emSalmos.session.chStart, emSalmos.block.books.includes('Salmos'), sessionAt(plano(vazio), 'Não existe', 1)], [23, true, null])

// ── A fila de cada plano ───────────────────────────────────────────────
check('Novo Testamento primeiro: a ordem da Bíblia começa em Mateus e termina em Malaquias', [canonicalBookOrder('nt_first')[0], canonicalBookOrder('nt_first')[65], canonicalBookOrder('nt_first').length], ['Mateus', 'Malaquias', 66])
check('…e a sessão de hoje também', onde(vazio, canonicalBookOrder('nt_first')), 'Mateus 1')
check('fila do plano de sempre na ordem livre: ordem da Bíblia, de onde a pessoa está', (q => [q.bookOrder[0], q.start])(planQueue('fixed', 'free', minha, posicao)), ['Gênesis', { book: 'João', chapter: 3 }])
check('fila do plano de sempre em minha ordem: os livros escolhidos, do ponto de partida (se o livro está no plano)', [planQueue('fixed', 'custom', minha, posicao), planQueue('fixed', 'custom', minha, { start: { book: 'Rute', chapter: 2 } }).start], [{ bookOrder: minha, start: null }, { book: 'Rute', chapter: 2 }])
check('fila do plano cronológico: sempre a ordem cronológica, com o ponto de partida', (q => [q.bookOrder[0], q.start])(planQueue('chrono', 'free', minha, posicao)), [chronological[0], { book: 'Êxodo', chapter: 1 }])
check('plano de sempre com a ordem cronológica escolhida (um estudo em pausa): ordem da Bíblia', planQueue('fixed', 'chronological', null, null, 'nt_first').bookOrder[0], 'Mateus')

// ── Cronológica com ponto de partida ───────────────────────────────────
const pontoAtos = { book: 'Atos', chapter: 9 }
const crono = deriveChronoProgress(vazio, 'standard', splitPointsFor(pontoAtos))
const achadaCrono = findPlanSession({ ...crono, bookOrder: chronological, start: pontoAtos })
check('cronológica com ponto de partida: começa em Atos 9, no movimento de Atos, sem marcar nada', [`${achadaCrono.session.book} ${achadaCrono.session.chStart}`, crono.blocks.find(b => b.id === achadaCrono.block.id).books.includes('Atos'), crono.blocks.every(b => b.sessionsDone === 0)], ['Atos 9', true, true])
check('cronológica sem ponto: Jó 1, como sempre', (({ session }) => `${session.book} ${session.chStart}`)(findPlanSession({ ...deriveChronoProgress(vazio, 'standard'), bookOrder: chronological })), 'Jó 1')
check('as chaves de uma sessão continuam sendo livro:capítulo', sessionKeys(achadaCrono.session)[0], 'Atos:9')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de bibleOrderMath passaram.')
