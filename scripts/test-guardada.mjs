// A anotação guardada (N5, handoff-biblioteca-55 §7A.5): a contagem de
// passagens, pontos, palavras e minutos; o que aparece e o que some; a
// síntese guardada no registro; e o que vai ao grupo (nada sem a pessoa
// escolher; as etiquetas nunca vão).
// node scripts/test-guardada.mjs
import { readFileSync } from 'node:fs'
import {
  longDate, savedTitle, savedHeaderLine, SUMMARY_LABEL, SUMMARY_NOTE, wordsFingerprint, summaryPlan, storedSummary, summaryParts,
  savedPoints, savedNumbers, POINTS_LABEL, PASSAGES_LABEL, MARK_LABEL, savedPassages, passagesToMark, markState, readLine, savedBlocks,
  groupPostOfNote, groupsToShare, sharedLine, shareTextOfNote,
} from '../src/anotar/guardadaMath.js'
import { openNote, notePayload } from '../src/anotar/anotarMath.js'

let failures = 0
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}`)
  if (!ok) console.log(`    esperado: ${JSON.stringify(want)}\n    recebido: ${JSON.stringify(got)}`)
}
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')

const longo = Array.from({ length: 12 }, (_, i) => `Judá voltou diferente, frase número ${i + 1} da anotação.`).join(' ')
const nota = {
  id: 'sermon-1', date: '2026-09-02', createdAt: '2026-09-02T23:14:00.000Z', noteType: 'sermon', title: ' A espera que forma ', preacher: 'Pr. João Ribeiro', church: 'Igreja Batista Central',
  passages: [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }, { book: 'Gênesis', bookEn: 'Genesis', chapter: 41, verseStart: 51, verseEnd: 51 }, { book: 'Tiago', bookEn: 'James', chapter: 1, verseStart: 3, verseEnd: 4 }],
  body: [
    { id: 'a', type: 'text', text: longo },
    { id: 'b', type: 'quote', text: 'O homem nos advertiu seriamente.', ref: 'Gênesis 43:3', book: 'Gênesis', chapter: 43, verseStart: 3, verseEnd: 3 },
    { id: 'c', type: 'topic', text: 'A fome que obriga a voltar' }, { id: 'd', type: 'topic', text: '  ' }, { id: 'e', type: 'topic', text: 'O irmão que precisa ser entregue' }, { id: 'f', type: 'topic', text: 'A garantia que alguém oferece com o próprio nome' },
  ],
  durationSeconds: 1440, tags: ['espera', 'família'], sharedGroupIds: [], finalizedAt: '2026-09-03T00:00:00.000Z',
}
const em2026 = new Date(2026, 10, 10)

// ── cabeçalho ─────────────────────────────────────────────────────────
check('a data por extenso; de outro ano, com o ano', [longDate('2026-09-02', em2026), longDate('2025-09-02', em2026), longDate('', em2026)], ['2 de setembro', '2 de setembro de 2025', ''])
check('cabeçalho: "{Tipo} · {Preletor} · {data}"', savedHeaderLine(nota, em2026), 'Sermão · Pr. João Ribeiro · 2 de setembro')
check('cabeçalho: só o que existe; a anotação livre não mostra preletor', [savedHeaderLine({ noteType: 'free', preacher: 'Alguém', date: '2026-09-02' }, em2026), savedHeaderLine({ noteType: 'retiro', date: '2026-01-05' }, em2026), savedHeaderLine({ createdAt: new Date(2026, 2, 8, 10).toISOString() }, em2026)], ['Livre · 2 de setembro', 'retiro · 5 de janeiro', 'Sermão · 8 de março'])
check('título; sem título, "Sem título"', [savedTitle(nota), savedTitle({ title: '  ' })], ['A espera que forma', 'Sem título'])

// ── os três números ───────────────────────────────────────────────────
check('três números: minutos anotando, pontos (tópicos com texto) e passagens', savedNumbers(nota).map(n => `${n.value} ${n.label}`), ['24 min anotando', '3 pontos', '3 passagens'])
check('singular: "1 ponto", "1 passagem"; menos de um minuto conta 1', savedNumbers({ durationSeconds: 20, body: [{ type: 'topic', text: 'Um' }], passages: [{ book: 'Salmos', chapter: 23, verseStart: 1 }] }).map(n => `${n.value} ${n.label}`), ['1 min anotando', '1 ponto', '1 passagem'])
check('número zero: a coluna não aparece', savedNumbers({ ...nota, durationSeconds: 0, body: [{ type: 'text', text: 'só texto' }] }).map(n => n.key), ['passages'])
check('os três zerados: o cartão não aparece', [savedNumbers({ text: 'uma anotação antiga, só texto' }), savedBlocks({ text: 'uma anotação antiga, só texto' }).numbers], [[], false])
check('milhar com ponto', savedNumbers({ durationSeconds: 72000 * 60 / 60 })[0].value, '1.200 min')
check('os pontos, numerados em ordem (tópico vazio não conta)', savedPoints(nota).map(p => `${p.n}. ${p.text}`), ['1. A fome que obriga a voltar', '2. O irmão que precisa ser entregue', '3. A garantia que alguém oferece com o próprio nome'])
check('as passagens, por extenso', savedPassages(nota).map(p => [p.label, p.book, p.chapter, p.verse]), [['Gênesis 43:3', 'Gênesis', 43, 3], ['Gênesis 41:51', 'Gênesis', 41, 51], ['Tiago 1:3-4', 'Tiago', 1, 3]])
check('rótulos fixos', [SUMMARY_LABEL, SUMMARY_NOTE, POINTS_LABEL, PASSAGES_LABEL, MARK_LABEL], ['O que ficou desta anotação', 'Escrito a partir das suas próprias palavras. Nada foi acrescentado.', 'Os pontos que você marcou', 'As passagens', 'Marcar na Bíblia'])

// ── a linha de "Ler a anotação inteira" ───────────────────────────────
const palavras = longo.split(/\s+/).length + 6 + 6 + 9
check('"{n} palavras · # etiqueta · # etiqueta" — só as palavras da pessoa (o versículo citado não conta)', readLine(nota), `${palavras} palavras · # espera · # família`)
check('uma palavra; sem etiquetas', [readLine({ text: 'Amém' }), readLine({ text: 'Graça e paz' })], ['1 palavra', '3 palavras'])

// ── o que aparece e o que some ────────────────────────────────────────
check('anotação completa: síntese, números, pontos e passagens', savedBlocks(nota), { summary: true, numbers: true, points: true, passages: true })
check('menos de ~40 palavras: o bloco da síntese não aparece', savedBlocks({ ...nota, body: [{ type: 'text', text: 'Curta demais para ter síntese.' }, ...nota.body.slice(1)] }).summary, false)
check('40 palavras é o limite: 39 não, 40 sim', [39, 40].map(n => savedBlocks({ text: Array.from({ length: n }, () => 'palavra').join(' ') }).summary), [false, true])
check('sem tópicos, o cartão dos pontos não aparece; sem passagens, o das passagens também não', savedBlocks({ ...nota, passages: [], body: [nota.body[0]] }), { summary: true, numbers: true, points: false, passages: false })

// ── a síntese guardada ────────────────────────────────────────────────
const sintese = { before: 'Você voltou duas vezes ao mesmo ponto', highlight: 'a mudança de um homem ao longo de vinte anos de espera', after: '' }
check('sem síntese guardada e com texto suficiente: pedir', summaryPlan(nota).action, 'request')
check('pede com as palavras da pessoa, sem o versículo citado', summaryPlan(nota).words.includes('O homem nos advertiu'), false)
const guardada = { ...nota, summary: storedSummary(sintese, wordsFingerprint(nota)) }
check('a síntese guardada vale enquanto o texto é o mesmo: não pede de novo', [summaryPlan(guardada).action, summaryPlan(guardada).summary.highlight], ['stored', sintese.highlight])
check('o texto mudou: pede de novo', summaryPlan({ ...guardada, body: [{ ...nota.body[0], text: `${longo} Mais uma frase.` }, ...nota.body.slice(1)] }).action, 'request')
check('mexer em título, etiquetas ou "Quem vê" não muda o texto: a síntese continua', summaryPlan({ ...guardada, title: 'Outro', tags: [], sharedGroupIds: ['g1'] }).action, 'stored')
check('texto curto: nada a pedir, mesmo com síntese antiga guardada', summaryPlan({ ...guardada, body: [{ type: 'text', text: 'Agora ficou curta.' }] }), { action: 'none', summary: null })
check('síntese sem o trecho-chave não é guardada', storedSummary({ before: 'x' }, 'f'), null)
check('a síntese guardada passa pela gravação da página sem se perder', notePayload(openNote(guardada), { trim: false }).summary, guardada.summary)
check('a síntese na tela: antes · trecho-chave · depois (como em 34h)', [summaryParts(sintese), summaryParts({ before: '', highlight: 'x', after: 'E depois' })], [{ before: 'Você voltou duas vezes ao mesmo ponto ', highlight: sintese.highlight, after: '.' }, { before: '', highlight: 'x', after: '. E depois' }])

// ── marcar na Bíblia ──────────────────────────────────────────────────
const agora = new Date(2026, 10, 10, 10, 0)
const marcar = passagesToMark(nota, [], agora)
check('"Marcar na Bíblia": uma marcação por passagem, sem nota, na cor padrão', marcar.map(h => [h.book, h.chapter, h.verses, h.text, h.color, h.sessionMode]), [['Gênesis', 43, [3], '', 'yellow', 'browse'], ['Gênesis', 41, [51], '', 'yellow', 'browse'], ['Tiago', 1, [3, 4], '', 'yellow', 'browse']])
check('ids diferentes', new Set(marcar.map(h => h.id)).size, 3)
const jaMarcada = [{ id: 'h', book: 'Gênesis', chapter: 43, verses: [3] }, { id: 'x', book: 'Tiago', chapter: 1, verses: [3, 4], hidden: true }]
check('não repete o que já está marcado ali (marcação apagada não conta)', passagesToMark(nota, jaMarcada, agora).map(h => `${h.book} ${h.chapter}`), ['Gênesis 41', 'Tiago 1'])
check('capítulo inteiro (passagem sem versículo) e passagem repetida não geram marcação', passagesToMark({ passages: [{ book: 'Salmos', chapter: 13, verseStart: null }, nota.passages[0], nota.passages[0]] }, [], agora).length, 1)
check('estado da ação: a marcar · tudo marcado · nada a marcar', [markState(nota, []), markState(nota, marcar), markState({ passages: [{ book: 'Salmos', chapter: 13, verseStart: null }] }, [])], ['todo', 'done', 'none'])

// ── levar ao grupo ────────────────────────────────────────────────────
const post = groupPostOfNote(nota)
check('ao grupo vão o título e as palavras da pessoa, na sala do capítulo da primeira passagem', [post.book, post.chapter, post.body.startsWith('A espera que forma\n\nJudá voltou diferente')], ['Gênesis', 43, true])
check('as etiquetas nunca vão ao grupo', /espera\b.*#|# espera|família|tags/.test(JSON.stringify(post)), false)
check('o versículo citado não é repetido como se fosse texto da pessoa', post.body.includes('O homem nos advertiu'), false)
check('sem passagem citada, ou sem nada escrito: não há o que levar', [groupPostOfNote({ ...nota, passages: [] }), groupPostOfNote({ passages: nota.passages, title: '', text: '' })], [null, null])
check('sem escolher grupo, nada vai a grupo nenhum — nem ao finalizar', [groupsToShare({ chosen: [], finalizedNow: true }), groupsToShare({ chosen: [], wasFinalized: true, sharedBefore: [] })], [[], []])
check('um rascunho com grupo escolhido não vai a lugar nenhum enquanto é rascunho', groupsToShare({ chosen: ['g1'], finalizedNow: false }), [])
check('ao finalizar, vai aos grupos escolhidos', groupsToShare({ chosen: ['g1', 'g2'], finalizedNow: true }), ['g1', 'g2'])
check('finalizar de novo uma anotação já compartilhada não publica de novo', groupsToShare({ chosen: ['g1'], wasFinalized: true, finalizedNow: true, sharedBefore: ['g1'] }), [])
check('numa anotação já finalizada, só o grupo escolhido depois recebe', groupsToShare({ chosen: ['g1', 'g2'], wasFinalized: true, sharedBefore: ['g1'] }), ['g2'])
const grupos = [{ groupId: 'g1', name: 'Grupo Semente' }, { groupId: 'g2', name: 'Manhã com a Palavra' }, { groupId: 'g3', name: 'Família' }]
check('a linha de confirmação', [sharedLine(grupos, ['g1']), sharedLine(grupos, ['g1', 'g2']), sharedLine(grupos, ['g1', 'g2', 'g3']), sharedLine(grupos, []), sharedLine(grupos, ['saiu'])], ['Compartilhada com Grupo Semente.', 'Compartilhada com Grupo Semente e Manhã com a Palavra.', 'Compartilhada com Grupo Semente, Manhã com a Palavra e Família.', null, null])

// ── compartilhar para fora ────────────────────────────────────────────
check('"Compartilhar": título, de onde veio, o texto e as passagens — sem etiquetas', [shareTextOfNote(nota).split('\n\n')[0], shareTextOfNote(nota).split('\n\n')[1], shareTextOfNote(nota).endsWith('Gênesis 43:3, Gênesis 41:51, Tiago 1:3-4'), shareTextOfNote(nota).includes('# espera')], ['A espera que forma', 'Sermão · Pr. João Ribeiro · Igreja Batista Central', true, false])

// ═══ Regras, no código ════════════════════════════════════════════════
const tela = ler('screens/AnotacaoGuardadaScreen.jsx')
check('N5 tem um botão preto só: "Continuar escrevendo"', [/Continuar escrevendo/.test(tela), /Guardar na biblioteca|Voltar e escrever mais|Levar ao grupo/.test(tela)], [true, false])
check('N5 não tem interruptor de grupo', /toggle|role="switch"/i.test(tela), false)
const pagina = ler('screens/PaginaDeAnotacao.jsx')
check('levar ao grupo passa sempre por `groupsToShare` (nada vai sem a pessoa ter escolhido)', /groupsToShare\(/.test(pagina) && /groupsToShare\(/.test(tela), true)
const sala = ler('groups/chapterRoomStore.js')
check('publicar devolve o id da publicação, para o "Desfazer"', /\.select\('id'\)/.test(sala) && /return data\?\.id \?\? null/.test(sala), true)

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
