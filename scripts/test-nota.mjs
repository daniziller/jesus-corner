// A folha "Nova" (N1) e a nota em um versículo (N4, handoff-biblioteca-55
// §7A.1 e §7A.4): a linha do rascunho, o que é gravado ao pausar e ao
// sair, "Quem vê" (nasce em "Só eu"; nada vai a grupo sem a pessoa
// escolher; as etiquetas nunca vão) e fechar o app no meio da escrita.
// node scripts/test-nota.mjs
import { readFileSync } from 'node:fs'
import {
  NEW_OPTIONS, NEW_TITLE, NEW_SUPPORT, draftLine, verseReference, noteTitle, noteSubtitle, NOTE_PLACEHOLDER, WHO_SEES_VERSE_NOTE,
  verseQuote, verseRange, findHighlight, openVerseNote, newVerseNoteRecord, pauseAction, emptyAction, groupsToPublish, groupPost, pendingLocalNote,
} from '../src/anotar/notaMath.js'
import { whoSeesBlocks } from '../src/anotar/anotarMath.js'
import { libraryItems, libraryCounts } from '../src/biblioteca/bibliotecaMath.js'

let failures = 0
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}`)
  if (!ok) console.log(`    esperado: ${JSON.stringify(want)}\n    recebido: ${JSON.stringify(got)}`)
}
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')

// ═══ N1 ═══════════════════════════════════════════════════════════════
check('quatro opções, na ordem fixa', NEW_OPTIONS.map(o => o.title), ['Anotação livre', 'Anotar uma pregação', 'Nota em um versículo', 'Criar um estudo'])
check('só "Anotação livre" é preta', NEW_OPTIONS.filter(o => o.dark).map(o => o.key), ['free'])
check('os apoios, palavra por palavra', NEW_OPTIONS.map(o => o.support), ['Uma página em branco. Dê o tipo e o título depois.', 'Sermão, culto, aula, palestra ou vídeo', 'Escolha o versículo e escreva sobre ele', 'Um plano de leitura sobre um tema ou livro'])
check('título e apoio da folha', [NEW_TITLE, NEW_SUPPORT], ['O que você quer guardar?', 'Tudo fica só com você, na sua Biblioteca.'])

const terca = new Date(2026, 10, 10, 10, 0)
const iso = (dia, hora = 10) => new Date(2026, 10, dia, hora, 0).toISOString()
const pregacao = (id, extra) => ({ key: `pregacao:${id}`, type: 'pregacao', id, title: '', text: '', draft: false, ...extra })
const itens = [
  pregacao('finalizada', { title: 'Pronta', at: iso(9), updatedAt: iso(9) }),
  pregacao('domingo', { title: 'A espera que forma', at: iso(8), updatedAt: iso(8), draft: true }),
  pregacao('antigo', { title: 'Outro rascunho', at: iso(1), updatedAt: iso(2), draft: true }),
  { key: 'nota:1', type: 'nota', at: iso(10) },
]
check('linha do rascunho: "Rascunho de domingo: A espera que forma · continuar"', (({ id, lead, title, tail }) => [id, `${lead}${title}${tail}`])(draftLine(itens, terca)), ['domingo', 'Rascunho de domingo: A espera que forma · continuar'])
check('é o rascunho mexido por último, não o criado por último', draftLine([...itens, pregacao('mexido', { title: 'Retomado ontem', at: iso(1), updatedAt: iso(9, 20), draft: true })], terca).title, 'Retomado ontem')
check('sem título: as primeiras palavras do texto', draftLine([pregacao('x', { text: 'Judá é o mesmo que vendeu José e agora se oferece', at: iso(10), draft: true })], terca), { id: 'x', lead: 'Rascunho de hoje: ', title: 'Judá é o mesmo que vendeu…', tail: ' · continuar', aria: 'Rascunho de hoje: Judá é o mesmo que vendeu…. Continuar' })
check('"quando": hoje, ontem, o dia da semana, a data', [iso(10), iso(9), iso(5), new Date(2026, 9, 27).toISOString()].map(at => draftLine([pregacao('x', { title: 'T', at, draft: true })], terca).lead), ['Rascunho de hoje: ', 'Rascunho de ontem: ', 'Rascunho de quinta: ', 'Rascunho de 27 out: '])
check('sem rascunho: a linha não aparece', [draftLine(itens.filter(i => !i.draft), terca), draftLine([], terca)], [null, null])

// ═══ N4 ═══════════════════════════════════════════════════════════════
const trecho = { book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [4] }
check('cabeçalho: "Nota em Salmos 23:4"', [noteTitle(trecho), noteTitle({ ...trecho, verses: [5, 4] }), verseReference({ ...trecho, verses: [4, 6] })], ['Nota em Salmos 23:4', 'Nota em Salmos 23:4–5', 'Salmos 23:4, 6'])
const grupos = [{ groupId: 'g1', name: 'Grupo Semente' }, { groupId: 'g2', name: 'Batista Central' }]
check('segunda linha: "Salva sozinha · só sua"; compartilhada, o nome do grupo', [noteSubtitle({ groups: grupos, shared: [] }), noteSubtitle({ groups: grupos, shared: ['g1'] }), noteSubtitle({ groups: grupos, shared: ['g1', 'g2'] }), noteSubtitle({ groups: grupos, shared: ['saiu'] })], ['Salva sozinha · só sua', 'Salva sozinha · Grupo Semente', 'Salva sozinha · Grupo Semente · Batista Central', 'Salva sozinha · só sua'])
check('textos fixos', [NOTE_PLACEHOLDER, WHO_SEES_VERSE_NOTE], ['O que este versículo diz para você hoje?', 'Dá para escolher mais de um grupo. Só o texto da nota e o versículo vão.'])
check('o texto dos versículos, na ordem', verseQuote({ 4: 'Ainda que eu ande\npelo vale', 5: 'Preparas um banquete' }, [5, 4]), 'Ainda que eu ande pelo vale Preparas um banquete')
check('"+ versículo": do menor ao maior', [verseRange(4, 4), verseRange(3, 6)], [[4], [3, 4, 5, 6]])

// abrir
const marcacao = { id: 'hl-1', book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [4], text: '', color: 'green', tags: [], sharedGroupIds: [], createdAt: iso(3) }
const comNota = { ...marcacao, id: 'hl-2', verses: [1], text: 'Nada me falta.', tags: ['consolo'], sharedGroupIds: ['g1'] }
const notaAntiga = { ...marcacao, id: 'hl-3', verses: [6], kind: 'note', text: 'Bondade me segue.', tags: ['salmos'] }
const todas = [marcacao, comNota, notaAntiga, { ...marcacao, id: 'hl-4', verses: [2], hidden: true }]
const nova = openVerseNote({ reference: { ...trecho, verses: [3] }, id: 'hl-novo' })
check('uma nota nova nasce vazia, sem etiqueta e só da pessoa ("Só eu")', [nova.text, nova.tags, nova.sharedGroupIds, nova.stored, nova.kind], ['', [], [], false, 'note'])
check('"Quem vê" de uma nota nova: "Só eu" selecionado', whoSeesBlocks({ groups: grupos, selected: nova.sharedGroupIds }).map(b => `${b.title}${b.on ? '*' : ''}`), ['Só eu*', 'Grupo Semente', 'Batista Central'])
check('numa nota já guardada, "Quem vê" mostra o que foi escolhido', whoSeesBlocks({ groups: grupos, selected: openVerseNote({ existing: comNota }).sharedGroupIds }).map(b => `${b.title}${b.on ? '*' : ''}`), ['Só eu', 'Grupo Semente*', 'Batista Central'])
check('o versículo já marcado: a nota é escrita naquela marcação', [findHighlight(todas, trecho)?.id, findHighlight(todas, { ...trecho, verses: [2] }), findHighlight(todas, { ...trecho, verses: [9] })], ['hl-1', null, null])
check('abrir uma nota guardada não perde nada', (({ id, text, tags, sharedGroupIds, verses, stored, kind }) => [id, text, tags, sharedGroupIds, verses, stored, kind])(openVerseNote({ existing: comNota })), ['hl-2', 'Nada me falta.', ['consolo'], ['g1'], [1], true, null])

const antiga39f = { id: 'hl-velha', book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [4], text: 'O pastor não tira o vale.', color: 'blue', tags: ['Consolo'], createdAt: iso(1), date: '2026-11-01' }
const semCampos = { id: 'hl-mais-velha', book: 'Jonas', bookEn: 'Jonah', chapter: 2, verses: [2, 3], text: 'Do fundo.', color: 'amarelo', createdAt: iso(1) }
check('nota de formato antigo (uma etiqueta só, sem os campos novos) abre sem perder nada', [openVerseNote({ existing: antiga39f }), openVerseNote({ existing: semCampos })].map(n => [n.id, n.text, n.tags, n.sharedGroupIds, n.verses, n.kind, n.stored]), [['hl-velha', 'O pastor não tira o vale.', ['Consolo'], [], [4], null, true], ['hl-mais-velha', 'Do fundo.', [], [], [2, 3], null, true]])
check('…e continua onde estava na Biblioteca: marcação com nota', libraryItems({ highlights: [antiga39f, semCampos] }).map(i => [i.type, i.note]), [['marcacao', 'O pastor não tira o vale.'], ['marcacao', 'Do fundo.']])

// gravar
const agora = new Date(2026, 10, 10, 10, 0)
const registro = newVerseNoteRecord({ ...nova, text: ' O vale é passagem. ', tags: ['medo'] }, { now: agora, sessionMode: 'session' })
check('a nota que nasce é um registro de marcação com `kind: "note"`, no formato de sempre', registro, { id: 'hl-novo', kind: 'note', book: 'Salmos', bookEn: 'Psalms', chapter: 23, verses: [3], text: 'O vale é passagem.', color: 'yellow', tags: ['medo'], sharedGroupIds: [], createdAt: agora.toISOString(), date: '2026-11-10', sessionMode: 'session' })
check('a nota que nasce entra em Notas; escrever numa marcação continua uma marcação (conta uma vez)', [libraryCounts(libraryItems({ highlights: [registro] })).nota, libraryCounts(libraryItems({ highlights: [comNota] })).marcacao, libraryCounts(libraryItems({ highlights: [comNota] })).nota], [1, 1, 0])
check('ao pausar: com texto, cria e depois atualiza; vazia, nada é guardado', [pauseAction({ ...nova, text: 'oi' }), pauseAction({ ...nova, text: 'oi', stored: true }), pauseAction(nova), pauseAction({ ...nova, text: '   ' }), pauseAction({ ...openVerseNote({ existing: comNota }), text: '' })], ['create', 'update', 'none', 'none', 'none'])
check('ao sair com o campo vazio: a nota some; numa marcação, só a nota sai (a marcação fica)', [emptyAction(nova), emptyAction({ ...nova, stored: true }), emptyAction({ ...openVerseNote({ existing: notaAntiga }), text: '' }), emptyAction({ ...openVerseNote({ existing: comNota }), text: ' ' }), emptyAction(openVerseNote({ existing: comNota }))], ['none', 'hide', 'hide', 'clear', 'none'])

// quem vê
check('sem escolher grupo, nada vai a grupo nenhum', groupsToPublish({ before: [], chosen: [], text: 'oi', textChanged: true }), [])
check('"Pronto" com um grupo escolhido: vai para ele', groupsToPublish({ before: [], chosen: ['g1'], text: 'oi', textChanged: true }), ['g1'])
check('mais de um grupo', groupsToPublish({ before: [], chosen: ['g1', 'g2'], text: 'oi' }), ['g1', 'g2'])
check('reabrir uma nota já compartilhada e tocar em "Pronto" sem mudar nada não publica de novo', groupsToPublish({ before: ['g1'], chosen: ['g1'], text: 'oi', textChanged: false }), [])
check('…mas o texto mudou: vai de novo, como hoje; e só para o grupo novo se o texto não mudou', [groupsToPublish({ before: ['g1'], chosen: ['g1'], text: 'oi!', textChanged: true }), groupsToPublish({ before: ['g1'], chosen: ['g1', 'g2'], text: 'oi', textChanged: false })], [['g1'], ['g2']])
check('nota vazia não vai a grupo', groupsToPublish({ before: [], chosen: ['g1'], text: '  ', textChanged: true }), [])
const publicacao = groupPost({ note: { ...nova, text: ' O vale é passagem. ', tags: ['medo', 'consolo'] }, verseText: 'Ainda que eu ande', versionShort: 'NVT' })
check('ao grupo vão só o texto da nota e o versículo', publicacao, { book: 'Salmos', chapter: 23, body: 'O vale é passagem.', quote: { text: 'Ainda que eu ande', ref: 'Salmos 23:3 (NVT)' } })
check('as etiquetas nunca vão ao grupo', /medo|consolo|tags/.test(JSON.stringify(publicacao)), false)

// fechar o app no meio da escrita e reabrir
const local = { ...registro, text: 'O vale é passagem.', updatedAt: iso(10, 11) }
check('fechou antes da primeira gravação: a nota que só existe no aparelho é criada ao reabrir', pendingLocalNote(local, todas)?.action, 'create')
check('fechou no meio de uma edição: o texto do aparelho, mais novo, atualiza a nota', pendingLocalNote({ ...comNota, text: 'Nada me falta, nem hoje.', updatedAt: iso(10, 11) }, todas), { action: 'update', record: { ...comNota, text: 'Nada me falta, nem hoje.', updatedAt: iso(10, 11) } })
check('a conta já tem aquele texto, ou a nota foi apagada, ou a cópia está vazia: nada a recuperar', [pendingLocalNote({ ...comNota, updatedAt: iso(10, 11) }, todas), pendingLocalNote({ ...marcacao, id: 'hl-4', text: 'x', updatedAt: iso(10, 11) }, todas), pendingLocalNote({ ...local, text: ' ' }, todas), pendingLocalNote(null, todas)], [null, null, null, null])

// ═══ Regras, no código ════════════════════════════════════════════════
const tela = ler('screens/NotaDeVersiculoScreen.jsx')
check('não existe botão "Salvar" na nota de versículo', />\s*Salvar\s*</.test(tela), false)
check('"Pronto" está na tela', />Pronto</.test(tela), true)
const gancho = ler('anotar/useNotaDeVersiculo.js')
check('só "Pronto" leva a nota a um grupo: publicar acontece num lugar só, depois do `done`', [(gancho.match(/api\.publish\(/g) ?? []).length, gancho.indexOf('if (!done') < gancho.indexOf('api.publish(')], [1, true])
check('ao pausar, os grupos não são gravados nem publicados (só texto e etiquetas)', /updateVerseNote\(current\.id, \{ text: current\.text\.trim\(\), tags: current\.tags \}\)/.test(gancho), true)
check('a cópia no aparelho é feita a cada mudança', /api\.keepLocalNote\(ownerRef\.current, localRecord\(note\)\)/.test(gancho), true)
check('a recuperação roda uma de cada vez (duas juntas criariam a mesma nota duas vezes)', /recovering\.then\(run, run\)/.test(ler('anotar/recuperarRascunho.js')), true)
const leitura = ler('screens/ReadingBlockView.jsx')
check('as ações do versículo (39e) abrem a tela da nota, e a leitura não publica nada em grupo', [/<NotaDeVersiculoScreen/.test(leitura), /postToRoom/.test(leitura)], [true, false])

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
