// Testes da página onde as anotações são feitas (N2 e N3, handoff-
// biblioteca-55 §7A), parte pura: anotações de formato antigo abrem sem
// perder nada; os blocos do texto (tópicos numerados, versículo citado
// como unidade); a segunda linha do cabeçalho; tipo, etiquetas e "Quem vê".
// node scripts/test-anotar.mjs
import { readFileSync } from 'node:fs'
import {
  NOTE_TYPES, noteTypeName, customTypesOf, typeOptions, newNote, ensureBody, openNote, plainText, notePayload, noteHasContent,
  topicNumbers, addTopic, topicEnter, removeCitation, backspaceAtStart, passageLabel, insertCitation, citationFromSelection,
  passagesPill, tagsPill, annotatingLabel, saveLabel, headerSecondLine, UNTITLED, createdLine, sourceRows, fieldSuggestions,
  tagVocabulary, tagChoices, toggleTag, ONLY_ME, whoSeesBlocks, toggleWhoSees, whoSeesLabel, WHO_SEES_NOTE, whoSeesWarning,
  currentDraft, pendingLocalDraft, passageRows, insertDictation,
} from '../src/anotar/anotarMath.js'
import { libraryItems } from '../src/biblioteca/bibliotecaMath.js'
import { sermonOwnWordsText, sermonOwnWordCount } from '../src/notes/sermonText.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')
const agora = new Date(2026, 10, 10, 20, 14)

// ═══ Anotações de formato antigo ══════════════════════════════════════
// Os quatro formatos que existem guardados (os que o app ainda lê):
// 1. o formulário simples de antes da página de anotação: só texto corrido;
const antigaSimples = {
  id: 'sermon-1725300000000-a1b2c3', date: '2026-03-01', createdAt: '2026-03-01T13:10:00.000Z', updatedAt: '2026-03-01T13:40:00.000Z',
  preacher: 'Pr. João Silva', church: 'Igreja Batista Central',
  passages: [{ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 23 }, { book: 'Salmos', chapter: 13 }],
  text: 'Deus é fiel mesmo quando não entendemos o caminho.\n\nTrês pontos: Ele vê, Ele lembra, Ele age.',
}
// 2. a folha sobre o texto (34d): os campos de "De onde veio", texto simples, sem blocos;
const antigaFolha = {
  id: 'sermon-1756000000000-d4e5f6', date: '2026-09-02', createdAt: '2026-09-02T23:14:00.000Z', updatedAt: '2026-09-02T23:50:00.000Z',
  noteType: 'retiro de casais', title: 'A espera que forma', preacher: 'Pr. João Ribeiro', church: '', link: 'https://exemplo.com/video',
  passages: [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }], text: 'Judá é o mesmo que vendeu José.', finalizedAt: null, groupId: 'grupo-antigo',
}
// 3. os blocos (34g), com o bloco "link" que já não se cria e sem contagem de tempo;
const antigaBlocos = {
  id: 'sermon-1757000000000-g7h8i9', date: '2026-09-10', createdAt: '2026-09-10T22:00:00.000Z', updatedAt: '2026-09-10T22:40:00.000Z',
  noteType: 'sermon', title: 'A espera que forma', preacher: 'Pr. João Ribeiro', church: 'Batista Central', link: '',
  passages: [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }, { book: 'Tiago', bookEn: 'James', chapter: 1, verseStart: 3, verseEnd: 4 }],
  body: [
    { id: 'seg-1', type: 'text', text: 'Judá é o mesmo que vendeu José.' },
    { id: 'seg-2', type: 'quote', text: "O homem nos advertiu seriamente: 'Não voltem à minha presença'.", ref: 'Gênesis 43:3', book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 },
    { id: 'seg-3', type: 'topic', text: 'A fome que obriga a voltar' },
    { id: 'seg-4', type: 'link', ref: 'Tiago 1:3-4', book: 'Tiago', bookEn: 'James', chapter: 1, verseStart: 3, verseEnd: 4 },
    { id: 'seg-5', type: 'topic', text: 'O irmão que precisa ser entregue' },
  ],
  text: 'Judá é o mesmo que vendeu José.\n\n"O homem nos advertiu seriamente: \'Não voltem à minha presença\'." — Gênesis 43:3\n\nA fome que obriga a voltar\n\n→ Tiago 1:3-4\n\nO irmão que precisa ser entregue',
  topics: ['A fome que obriga a voltar', 'O irmão que precisa ser entregue'], finalizedAt: '2026-09-10T22:41:00.000Z',
}
// 4. a de hoje, completa.
const atual = { ...antigaBlocos, id: 'sermon-1760000000000-j1k2l3', durationSeconds: 1440, groupId: null, text: `${antigaBlocos.text}\n\nPerguntar depois: por que Jacó demora tanto a ceder`, body: [...antigaBlocos.body, { id: 'seg-6', type: 'text', text: 'Perguntar depois: por que Jacó demora tanto a ceder' }] }

for (const [nome, guardada] of [['formulário simples', antigaSimples], ['folha sobre o texto', antigaFolha], ['blocos com "link"', antigaBlocos], ['atual', atual]]) {
  const aberta = openNote(guardada)
  const gravada = notePayload(aberta, { now: agora, trim: false })
  check(`${nome}: abrir não perde nenhum campo guardado`, Object.keys(guardada).filter(k => k !== 'body' && k !== 'text' && JSON.stringify(aberta[k]) !== JSON.stringify(guardada[k])), [])
  check(`${nome}: as palavras da pessoa são as mesmas depois de abrir`, sermonOwnWordsText(aberta), sermonOwnWordsText(guardada))
  check(`${nome}: abrir e gravar sem mexer mantém o texto corrido`, gravada.text, guardada.text)
  check(`${nome}: abrir e gravar mantém passagens, datas, título, pregador, instituição e link`, [gravada.passages, gravada.id, gravada.date, gravada.createdAt, gravada.title ?? '', gravada.preacher ?? '', gravada.church ?? '', gravada.link ?? '', gravada.finalizedAt ?? null], [guardada.passages, guardada.id, guardada.date, guardada.createdAt, guardada.title ?? '', guardada.preacher ?? '', guardada.church ?? '', guardada.link ?? '', guardada.finalizedAt ?? null])
  check(`${nome}: continua aparecendo na Biblioteca, com o mesmo texto`, libraryItems({ sermonNotes: [gravada] })[0]?.text, libraryItems({ sermonNotes: [guardada] })[0]?.text)
  check(`${nome}: o último bloco é um parágrafo, para continuar escrevendo`, aberta.body[aberta.body.length - 1].type, 'text')
}
check('formulário simples: o texto inteiro vira um bloco de texto', [openNote(antigaSimples).body.length, openNote(antigaSimples).body[0].type, openNote(antigaSimples).body[0].text], [1, 'text', antigaSimples.text])
check('formulário simples: sem tipo guardado, abre como Sermão; sem etiqueta; só da pessoa', [openNote(antigaSimples).noteType, openNote(antigaSimples).tags, openNote(antigaSimples).sharedGroupIds, openNote(antigaSimples).title], ['sermon', [], [], ''])
check('folha sobre o texto: o tipo criado pela pessoa e o campo antigo de grupo continuam', [openNote(antigaFolha).noteType, notePayload(openNote(antigaFolha), { now: agora }).groupId], ['retiro de casais', 'grupo-antigo'])
check('blocos: os ids e a ordem não mudam; o bloco "link" continua lá', [openNote(antigaBlocos).body.slice(0, 5).map(s => `${s.id}:${s.type}`), openNote(antigaBlocos).body.length], [['seg-1:text', 'seg-2:quote', 'seg-3:topic', 'seg-4:link', 'seg-5:topic'], 6])
check('blocos: os tópicos gravados são os do texto', notePayload(openNote(antigaBlocos), { now: agora }).topics, ['A fome que obriga a voltar', 'O irmão que precisa ser entregue'])
check('atual: o tempo anotando continua', notePayload(openNote(atual), { now: agora }).durationSeconds, 1440)
check('bloco sem id ou com lixo no meio não quebra', ensureBody({ body: [null, { type: 'text', text: 'a' }, 'x'] }).map(s => [typeof s.id, s.type, s.text]), [['string', 'text', 'a']])
check('anotação sem corpo e sem texto abre em branco', ensureBody({}).map(s => [s.type, s.text]), [['text', '']])
check('gravar atualiza só a data de atualização', notePayload(openNote(atual), { now: agora }).updatedAt, agora.toISOString())
check('ao finalizar, sobras de espaço saem; no rascunho automático, não', [notePayload({ ...openNote(antigaFolha), title: '  A espera  ' }, { now: agora }).title, notePayload({ ...openNote(antigaFolha), title: 'A espera ' }, { now: agora, trim: false }).title], ['A espera', 'A espera '])

// ── Anotação nova ─────────────────────────────────────────────────────
const nova = newNote({ type: 'free', now: agora })
check('anotação livre nova: em branco, tipo Livre, só da pessoa', [nova.noteType, nova.title, nova.passages, nova.body.map(s => [s.type, s.text]), nova.tags, nova.sharedGroupIds, nova.finalizedAt, nova.date], ['free', '', [], [['text', '']], [], [], null, '2026-11-10'])
check('anotação nova por padrão é Sermão', newNote({ now: agora }).noteType, 'sermon')
check('"Quem vê" nasce em "Só eu", sempre', [newNote({ now: agora }).sharedGroupIds, newNote({ type: 'free', now: agora }).sharedGroupIds], [[], []])
check('tem conteúdo?', [noteHasContent(nova), noteHasContent({ ...nova, title: ' ' }), noteHasContent({ ...nova, title: 'x' }), noteHasContent({ ...nova, body: [{ id: 'a', type: 'text', text: 'oi' }] }), noteHasContent({ ...nova, passages: [{}] }), noteHasContent(null)], [false, false, true, true, true, false])
check('"Livre" cabe no mesmo campo de tipo, sem mudar o formato', typeof notePayload(nova, { now: agora }).noteType, 'string')

// ═══ Os blocos do texto ═══════════════════════════════════════════════
const t = (id, text = '') => ({ id, type: 'text', text })
const p = (id, text = '') => ({ id, type: 'topic', text })
const c = (id, book, chapter, v1, v2 = v1) => ({ id, type: 'quote', text: 'texto do versículo', ref: `${book} ${chapter}:${v1}`, book, chapter, verseStart: v1, verseEnd: v2 })
const forma = body => body.map(s => `${s.type}${s.text ? `:${s.text}` : ''}`).join(' | ')

// ── Tópicos ───────────────────────────────────────────────────────────
check('numeração: contínua, na ordem do texto, pulando o que não é tópico', topicNumbers([t('a', 'x'), p('b', '1'), c('q', 'Gênesis', 1, 1), p('d', '2'), t('e'), p('f', '3')]), { b: 1, d: 2, f: 3 })
check('numeração: apagar um tópico no meio renumera os de baixo', topicNumbers([p('b', '1'), p('f', '3')]), { b: 1, f: 2 })
check('numeração: sem tópicos', topicNumbers([t('a')]), {})
const comTopico = addTopic([t('a', 'Um parágrafo.'), t('z')], 'a')
check('"Tópico" depois de um parágrafo com texto: entra abaixo dele e recebe o cursor', [forma(comTopico.body), comTopico.focusId === comTopico.body[1].id], ['text:Um parágrafo. | topic | text', true])
const viraTopico = addTopic([t('a', 'Um parágrafo.'), t('z')], 'z')
check('"Tópico" num parágrafo vazio: o parágrafo vira o tópico, e sobra um parágrafo depois', [forma(viraTopico.body), viraTopico.focusId], ['text:Um parágrafo. | topic | text', 'z'])
check('"Tópico" sem cursor: entra no fim, antes do parágrafo vazio que fecha a página', forma(addTopic([t('a', 'x'), t('z')]).body), 'text:x | topic | text')
check('"Tópico" sem cursor e sem parágrafo vazio no fim', forma(addTopic([t('a', 'x')]).body), 'text:x | topic | text')
const proximo = topicEnter([t('a', 'x'), p('b', 'A fome'), t('z')], 'b')
check('Enter num tópico com texto: cria o próximo logo abaixo, com o cursor nele', [forma(proximo.body), proximo.focusId === proximo.body[2].id, topicNumbers(proximo.body)[proximo.focusId]], ['text:x | topic:A fome | topic | text', true, 2])
const volta = topicEnter(proximo.body, proximo.focusId)
check('Enter num tópico vazio: volta a ser parágrafo', [forma(volta.body), volta.focusId === proximo.focusId, Object.keys(topicNumbers(volta.body)).length], ['text:x | topic:A fome | text | text', true, 1])
check('Enter num tópico no meio de outros: o novo entra entre eles e os de baixo sobem um número', Object.values(topicNumbers(topicEnter([p('a', '1'), p('b', '2'), p('c', '3')], 'a').body)), [1, 2, 3, 4])
check('Enter fora de um tópico não faz nada', forma(topicEnter([t('a', 'x')], 'a').body), 'text:x')

// ── Versículo citado ──────────────────────────────────────────────────
const nota = { body: [t('a', 'Antes.'), t('z')], passages: [] }
const trecho = { book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3, text: 'O homem nos advertiu seriamente.' }
const citada = insertCitation(nota, trecho, 'a')
check('"+ Versículo": o bloco entra depois do cursor, como uma unidade, com a referência por extenso', [forma(citada.body), citada.body[1].ref, citada.body[1].book, citada.body[1].verseStart], ['text:Antes. | quote:O homem nos advertiu seriamente. | text', 'Gênesis 43:3', 'Gênesis', 3])
check('a passagem entra na lista da anotação', citada.passages, [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 43, verseStart: 3, verseEnd: 3 }])
check('o cursor vai para o parágrafo depois do bloco', citada.focusId, 'z')
const duasVezes = insertCitation({ body: citada.body, passages: citada.passages }, trecho, 'z')
check('citar o mesmo trecho duas vezes: dois blocos, uma passagem só', [duasVezes.body.filter(s => s.type === 'quote').length, duasVezes.passages.length], [2, 1])
check('"+ Versículo" sem cursor: no fim, antes do parágrafo vazio', forma(insertCitation(nota, trecho).body), 'text:Antes. | quote:O homem nos advertiu seriamente. | text')
check('referência por extenso: versículo, intervalo, capítulo', [passageLabel({ book: 'Gênesis', chapter: 43, verseStart: 3, verseEnd: 3 }), passageLabel({ book: 'Tiago', chapter: 1, verseStart: 3, verseEnd: 4 }), passageLabel({ book: 'Salmos', chapter: 13 })], ['Gênesis 43:3', 'Tiago 1:3-4', 'Salmos 13'])
check('do seletor: do menor ao maior versículo marcado, num trecho só', citationFromSelection({ book: 'Gênesis', bookEn: 'Genesis', chapter: 1, verses: { 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze' }, selected: [12, 9] }), { book: 'Gênesis', bookEn: 'Genesis', chapter: 1, verseStart: 9, verseEnd: 12, text: 'nove dez onze doze' })
check('do seletor: nada marcado, nada', citationFromSelection({ book: 'Gênesis', chapter: 1, verses: {}, selected: [] }), null)
const semBloco = removeCitation({ body: citada.body, passages: citada.passages }, citada.body[1].id)
check('apagar o bloco: sai inteiro, e a passagem sai da lista', [forma(semBloco.body), semBloco.passages], ['text:Antes.', []])
const umDeDois = removeCitation({ body: duasVezes.body, passages: duasVezes.passages }, duasVezes.body[1].id)
check('apagar um de dois blocos do mesmo trecho: a passagem fica', [umDeDois.body.filter(s => s.type === 'quote').length, umDeDois.passages.length], [1, 1])
const entre = removeCitation({ body: [t('a', 'Antes.'), c('q', 'Gênesis', 43, 3), t('b', 'Depois.')], passages: [{ book: 'Gênesis', chapter: 43, verseStart: 3, verseEnd: 3 }] }, 'q')
check('apagar o bloco entre dois parágrafos: eles se juntam, e o cursor fica na emenda', [forma(entre.body), entre.focusId, entre.caret], ['text:Antes.\n\nDepois.', 'a', 8])
check('apagar o único bloco de uma anotação deixa um parágrafo em branco', forma(removeCitation({ body: [c('q', 'Gênesis', 1, 1)], passages: [] }, 'q').body), 'text')
check('apagar um bloco que não é versículo não faz nada', forma(removeCitation({ body: [t('a', 'x')], passages: [] }, 'a').body), 'text:x')
const comApagar = backspaceAtStart({ body: [t('a', 'Antes.'), c('q', 'Gênesis', 43, 3), t('b', 'Depois.')], passages: [{ book: 'Gênesis', chapter: 43, verseStart: 3, verseEnd: 3 }] }, 'b')
check('apagar no começo do parágrafo abaixo de um versículo: o bloco sai inteiro, de uma vez', [forma(comApagar.body), comApagar.passages], ['text:Antes.\n\nDepois.', []])
check('apagar no começo de um tópico vazio: volta a ser parágrafo', forma(backspaceAtStart({ body: [t('a', 'x'), p('b'), t('z')], passages: [] }, 'b').body), 'text:x | text | text')
check('apagar num parágrafo vazio do meio: ele some e o cursor sobe', [forma(backspaceAtStart({ body: [p('a', 'Um'), t('b'), p('c', 'Dois'), t('z')], passages: [] }, 'b').body), backspaceAtStart({ body: [p('a', 'Um'), t('b'), p('c', 'Dois'), t('z')], passages: [] }, 'b').focusId], ['topic:Um | topic:Dois | text', 'a'])
check('apagar no começo do primeiro bloco: nada a fazer', backspaceAtStart({ body: [t('a', 'x')], passages: [] }, 'a'), null)
check('apagar no começo de um tópico com texto: nada a fazer (o navegador decide)', backspaceAtStart({ body: [t('a', 'x'), p('b', 'tópico')], passages: [] }, 'b'), null)
check('a cópia corrida do texto: versículo entre aspas com a referência; "link" só com a referência', plainText(antigaBlocos.body), antigaBlocos.text)
check('as palavras da pessoa não incluem o versículo citado', [sermonOwnWordsText({ body: citada.body }), sermonOwnWordCount({ body: citada.body })], ['Antes.', 1])

// ═══ O cabeçalho de N2 ════════════════════════════════════════════════
check('pastilha de passagens: plural, singular e nenhuma', [passagesPill({ passages: [1, 2, 3] }), passagesPill({ passages: [1] }), passagesPill({ passages: [] }), passagesPill(null)], ['3 passagens', '1 passagem', null, null])
check('pastilha de etiquetas', [tagsPill({ tags: ['a', 'b'] }), tagsPill({ tags: [] })], ['# 2', null])
check('tempo anotando', [annotatingLabel(1440), annotatingLabel(20), annotatingLabel(0), annotatingLabel(89)], ['24 min', '1 min', '1 min', '1 min'])
const t0 = agora.getTime()
check('estado da gravação', [saveLabel({ saving: true, savedAt: t0 }), saveLabel({ savedAt: t0, now: t0 + 20000 }), saveLabel({ savedAt: t0, now: t0 + 61000 }), saveLabel({ savedAt: t0, now: t0 + 12 * 60000 }), saveLabel({})], ['salvando…', 'salvo agora', 'salvo há 1 min', 'salvo há 12 min', ''])
check('segunda linha: tipo · preletor · estado', headerSecondLine({ noteType: 'sermon', preacher: 'Pr. João Ribeiro' }, { savedAt: t0, now: t0 }), 'Sermão · Pr. João Ribeiro · salvo agora')
check('segunda linha: anotação livre não mostra preletor que ficou de outro tipo', headerSecondLine({ noteType: 'free', preacher: 'Pr. João Ribeiro' }, {}), 'Livre')
check('segunda linha: só o que existe', [headerSecondLine({ noteType: 'free', preacher: '' }, {}), headerSecondLine({ noteType: 'free' }, { saving: true }), headerSecondLine({ noteType: 'video', preacher: ' Tim Keller ' }, {}), headerSecondLine({ noteType: 'retiro de casais' }, {})], ['Livre', 'Livre · salvando…', 'Vídeo · Tim Keller', 'retiro de casais'])
check('sem título', UNTITLED, 'Sem título')

// ═══ Detalhes (N3) ════════════════════════════════════════════════════
check('tipos na ordem fixa', NOTE_TYPES.map(x => x.label), ['Sermão', 'Culto', 'Aula', 'Palestra', 'Vídeo', 'Livre'])
check('nome do tipo', ['sermon', 'video', 'free', 'retiro', undefined].map(noteTypeName), ['Sermão', 'Vídeo', 'Livre', 'retiro', 'Sermão'])
check('tipos criados pela pessoa, sem repetir', customTypesOf([{ noteType: 'retiro' }, { noteType: 'sermon' }, { noteType: 'célula' }, { noteType: 'retiro' }, {}]), ['retiro', 'célula'])
check('grade: os seis e, depois, os criados; um selecionado', typeOptions(['retiro'], 'free').map(o => `${o.label}${o.on ? '*' : ''}`), ['Sermão', 'Culto', 'Aula', 'Palestra', 'Vídeo', 'Livre*', 'retiro'])
check('grade: o tipo recém-criado desta anotação aparece', typeOptions([], 'célula').map(o => `${o.label}${o.on ? '*' : ''}`).slice(-1), ['célula*'])
check('quando foi criada', createdLine(new Date(2025, 8, 2, 20, 14).toISOString()), 'Terça, 2 de setembro · 20:14')
check('"De onde veio": quatro linhas', sourceRows('sermon').map(r => r.label), ['Título', 'Preletor', 'Instituição', 'Link'])
check('"De onde veio": textos de apoio', [sourceRows('sermon')[2].placeholder, sourceRows('sermon')[3].placeholder], ['Igreja, escola, canal…', 'Cole o endereço do vídeo'])
check('com o tipo Livre, só o Título', sourceRows('free').map(r => r.label), ['Título'])
check('sugestões de preletor: os já usados, do mais recente para o mais antigo, sem repetir', fieldSuggestions([{ preacher: 'Pr. João Silva' }, { preacher: 'Tim Keller' }, { preacher: 'pr. joão silva ' }, { preacher: '' }], 'preacher'), ['Pr. João Silva', 'Tim Keller'])
const vocabulario = tagVocabulary({ highlights: [{ tags: ['espera', 'família'] }, { tags: ['espera'] }, { tags: ['oculta'], hidden: true }], sermonNotes: [{ tags: ['espera', 'perdão'] }, {}] })
check('etiquetas: as das notas de versículo e as das anotações, juntas, das mais usadas para as menos', vocabulario, ['espera', 'família', 'perdão'])
check('pastilhas de etiqueta: marcadas e desmarcadas', tagChoices(vocabulario, ['espera', 'família']).map(x => `${x.label}${x.on ? '*' : ''}`), ['# espera*', '# família*', '# perdão'])
check('etiqueta recém-criada aparece no fim, marcada', tagChoices(vocabulario, ['nova']).map(x => `${x.label}${x.on ? '*' : ''}`), ['# espera', '# família', '# perdão', '# nova*'])
check('marcar e desmarcar; mais de uma pode ficar marcada; vazia não entra', [toggleTag(['espera'], 'família'), toggleTag(['espera', 'família'], 'espera'), toggleTag(['espera'], '  '), toggleTag([], ' nova ')], [['espera', 'família'], ['família'], ['espera'], ['nova']])

// ── Quem vê ───────────────────────────────────────────────────────────
const grupos = [{ groupId: 'g1', name: 'Grupo Semente' }, { groupId: 'g2', name: 'Manhã com a Palavra' }]
const blocos = selected => whoSeesBlocks({ groups: grupos, memberCounts: { g1: 6, g2: 1 }, selected }).map(b => `${b.title}/${b.sub}${b.on ? '*' : ''}`)
check('"Só eu" vem primeiro e selecionado', blocos([]), ['Só eu/na Biblioteca*', 'Grupo Semente/6 pessoas', 'Manhã com a Palavra/1 pessoa'])
check('um grupo escolhido: "Só eu" desmarca', blocos(['g1']), ['Só eu/na Biblioteca', 'Grupo Semente/6 pessoas*', 'Manhã com a Palavra/1 pessoa'])
check('vários grupos podem ser escolhidos', [toggleWhoSees([], 'g1'), toggleWhoSees(['g1'], 'g2'), blocos(['g1', 'g2'])], [['g1'], ['g1', 'g2'], ['Só eu/na Biblioteca', 'Grupo Semente/6 pessoas*', 'Manhã com a Palavra/1 pessoa*']])
check('"Só eu" desmarca os grupos', toggleWhoSees(['g1', 'g2'], ONLY_ME), [])
check('desmarcar o último grupo volta a "Só eu"', [toggleWhoSees(['g1'], 'g1'), blocos(toggleWhoSees(['g1'], 'g1'))[0]], [[], 'Só eu/na Biblioteca*'])
check('grupo de que a pessoa já saiu não fica escolhido', blocos(['g9'])[0], 'Só eu/na Biblioteca*')
check('sem grupo nenhum: só o bloco "Só eu"', whoSeesBlocks({}).map(b => b.title), ['Só eu'])
check('quem vê, por extenso', [whoSeesLabel({ groups: grupos, selected: [] }), whoSeesLabel({ groups: grupos, selected: ['g1', 'g2'] })], ['Só eu', 'Grupo Semente · Manhã com a Palavra'])
check('a linha fixa de "Quem vê"', WHO_SEES_NOTE, 'Nasce só sua. Se escolher um grupo, vão o texto e as passagens — as etiquetas ficam com você.')
check('grupo escolhido numa anotação sem versículo citado: o aviso', [whoSeesWarning({ selected: ['g1'], passages: [] }), whoSeesWarning({ selected: ['g1'], passages: [{}] }), whoSeesWarning({ selected: [], passages: [] })], ['Para ir ao grupo, a anotação precisa citar um versículo.', null, null])

// ── O rascunho: fechar o app no meio da escrita e reabrir ─────────────
const rascunhoVelho = { id: 'r1', updatedAt: '2026-11-01T10:00:00.000Z', title: 'Antigo', body: [{ id: 'a', type: 'text', text: 'um' }] }
const rascunhoNovo = { id: 'r2', updatedAt: '2026-11-09T10:00:00.000Z', title: '', body: [{ id: 'a', type: 'text', text: 'dois' }] }
const finalizada = { id: 'f1', updatedAt: '2026-11-10T10:00:00.000Z', finalizedAt: '2026-11-10T10:00:00.000Z', text: 'pronta' }
const vazia = { id: 'v1', updatedAt: '2026-11-10T11:00:00.000Z', title: '', body: [{ id: 'a', type: 'text', text: '  ' }] }
check('o rascunho em andamento é o não finalizado mais recente, com algo escrito', currentDraft([finalizada, rascunhoVelho, vazia, rascunhoNovo])?.id, 'r2')
check('sem rascunho: nada a retomar', currentDraft([finalizada, vazia]), null)
const noAparelho = { ...rascunhoNovo, updatedAt: '2026-11-09T10:05:00.000Z', body: [{ id: 'a', type: 'text', text: 'dois e mais uma frase' }] }
check('fechou no meio da escrita: a cópia do aparelho, mais nova que a da conta, é recuperada', pendingLocalDraft(noAparelho, [rascunhoNovo, finalizada])?.body[0].text, 'dois e mais uma frase')
check('fechou antes da primeira gravação: a anotação que só existe no aparelho é recuperada', pendingLocalDraft(noAparelho, [finalizada])?.id, 'r2')
check('a conta já tem aquela versão (ou uma mais nova): nada a recuperar', [pendingLocalDraft(rascunhoNovo, [rascunhoNovo]), pendingLocalDraft(rascunhoNovo, [noAparelho])], [null, null])
check('cópia vazia ou inexistente: nada a recuperar', [pendingLocalDraft(vazia, []), pendingLocalDraft(null, [rascunhoNovo])], [null, null])
check('a cópia recuperada, gravada, mantém cada palavra', notePayload(openNote(pendingLocalDraft(noAparelho, [rascunhoNovo])), { now: agora, trim: false }).text, 'dois e mais uma frase')
const rascunhoLocal = ler('anotar/rascunhoLocal.js')
check('a cópia do aparelho é uma por conta', /const keyOf = owner => `\$\{name\}:\$\{owner \?\? 'guest'\}`/.test(rascunhoLocal), true)
const gancho = ler('anotar/useAnotacao.js')
check('fechar o app não finaliza: só "Finalizar" marca a anotação como finalizada', (gancho.match(/finalize: true/g) ?? []).length, 1)
check('a cópia no aparelho é feita a cada mudança, antes de a gravação na conta sair', /api\.keepLocal\(ownerRef\.current, payloadOf\(draft\)\)/.test(gancho), true)
const jornada = ler('screens/JourneyScreen.jsx')
const lapis = ler('components/biblia/LapisFlutuante.jsx')
check('a tela da Bíblia não grava nem finaliza anotação: só mostra o lápis', [/saveSermonNote|deleteSermonNote|finalizedAt|visibilitychange/.test(jornada), /<LapisFlutuante/.test(jornada)], [false, true])
check('o lápis só lê o rascunho em andamento (regravar dali apagaria etiquetas e "Quem vê")', [/saveSermonNote|deleteSermonNote|updateRow/.test(lapis), /currentDraft\(/.test(lapis)], [false, true])

// ── A folha de passagens e o ditado ───────────────────────────────────
check('folha de passagens: por extenso, com o texto do bloco que cita', passageRows(openNote(atual)).map(r => [r.label, r.text.slice(0, 12), r.verse]), openNote(atual).passages.map(p => [passageLabel(p), (openNote(atual).body.find(b => b.type === 'quote' && b.verseStart === p.verseStart && b.book === p.book)?.text ?? '').slice(0, 12), p.verseStart ?? null]))
check('ditado: entra no cursor, com espaço antes quando precisa', [insertDictation('Judá voltou', 'para casa'), insertDictation('Judá voltou', 'depois', 4, 4), insertDictation('', 'começo'), insertDictation('fim. ', 'outra')], [{ text: 'Judá voltou para casa', caret: 21 }, { text: 'Judá depois voltou', caret: 11 }, { text: 'começo', caret: 6 }, { text: 'fim. outra', caret: 10 }])

// ═══ Regras da página, no código ══════════════════════════════════════
const tela = ler('screens/AnotarScreen.jsx')
check('não existe botão "Salvar" na página de escrever', />\s*Salvar\s*</.test(tela), false)
check('"Finalizar" e "Sem título" estão na página', [tela.includes('Finalizar'), tela.includes('UNTITLED')], [true, true])
const detalhes = ler('components/anotar/DetalhesDaAnotacao.jsx')
check('N3 não publica nada: escolher um grupo só guarda a escolha', /postToRoom|publish|supabase/.test(detalhes), false)
const apiAnotar = ler('anotar/anotarApi.js')
check('a página grava pelo mesmo caminho de sempre (saveSermonNote)', /saveSermonNote/.test(apiAnotar), true)

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
