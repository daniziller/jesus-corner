// bibliotecaFixture.js — a conta de exemplo da aba Biblioteca na
// pré-visualização de desenvolvimento (handoff-biblioteca-55): os mesmos
// números das capturas (128 guardadas: 31 notas, 46 marcações, 22
// reflexões, 14 pregações, 9 aplicações, 6 perguntas; 23 livros; 9 este
// mês). Só desenvolvimento — nada daqui entra no app.
import { dateKey } from '../src/utils/dateKey'

const dias = n => { const d = new Date(); d.setDate(d.getDate() - n); return d }
const iso = (n, hora = 9) => { const d = dias(n); d.setHours(hora, 0, 0, 0); return d.toISOString() }
const hl = (id, book, bookEn, chapter, verses, n, extra = {}) => ({ id: `hl-${id}`, book, bookEn, chapter, verses, text: '', color: 'amarelo', tags: [], sharedGroupIds: [], createdAt: iso(n), date: dateKey(dias(n)), sessionMode: 'browse', ...extra })

// Marcações: 46 trechos em 11 livros, 12 com nota. As duas de Gênesis e as
// de Salmos e João são as da captura L3.
function marcacoes() {
  const list = [
    hl('gn-39-21', 'Gênesis', 'Genesis', 39, [21], 3),
    hl('gn-41-51', 'Gênesis', 'Genesis', 41, [51], 4, { text: 'esquecer não é apagar — é não doer igual' }),
    hl('sl-23-4', 'Salmos', 'Psalms', 23, [4], 5),
    hl('jo-16-33', 'João', 'John', 16, [33], 29),
  ]
  const resto = [['Gênesis', 'Genesis', 12], ['Salmos', 'Psalms', 8], ['João', 'John', 5], ['Êxodo', 'Exodus', 3], ['Provérbios', 'Proverbs', 3], ['Isaías', 'Isaiah', 2], ['Mateus', 'Matthew', 2], ['Romanos', 'Romans', 3], ['Filipenses', 'Philippians', 2], ['Tiago', 'James', 1], ['Hebreus', 'Hebrews', 1]]
  let comNota = 11
  let n = 40
  for (const [book, bookEn, quantos] of resto) {
    for (let i = 0; i < quantos; i++) {
      list.push(hl(`${bookEn}-${i}`, book, bookEn, 1 + i, [1 + i], n, comNota-- > 0 ? { text: 'Uma nota curta sobre este trecho.' } : {}))
      n += 3
    }
  }
  return list
}

// Notas: 31 presas a um versículo (as que nasceram como nota), em 12 livros
// que as marcações não têm — com eles a conta chega a 23 livros.
function notas() {
  const list = [
    hl('nota-sl-23-4', 'Salmos', 'Psalms', 23, [4], 1, { kind: 'note', text: 'O vale é passagem, não endereço.', tags: ['medo'] }),
    hl('nota-gn-40-23', 'Gênesis', 'Genesis', 40, [23], 11, { kind: 'note', text: 'Esquecido pelo copeiro, não por Deus. A espera continua.', tags: ['espera'] }),
  ]
  const livros = [['1 Samuel', '1 Samuel'], ['Jó', 'Job'], ['Eclesiastes', 'Ecclesiastes'], ['Jeremias', 'Jeremiah'], ['Daniel', 'Daniel'], ['Habacuque', 'Habakkuk'], ['Lucas', 'Luke'], ['Atos', 'Acts'], ['1 Coríntios', '1 Corinthians'], ['Efésios', 'Ephesians'], ['1 Pedro', '1 Peter'], ['Apocalipse', 'Revelation']]
  for (let i = 0; i < 29; i++) {
    const [book, bookEn] = livros[i % livros.length]
    list.push(hl(`nota-${i}`, book, bookEn, 1 + (i % 4), [2 + i], 45 + i * 4, { kind: 'note', text: 'O que este versículo me disse naquele dia.', tags: i % 3 === 0 ? ['família'] : [] }))
  }
  return list
}

function mapaDeNotas() {
  const notes = {}
  // Reflexões: 22, a de hoje com pergunta e resposta.
  notes[`reflection:${dateKey(dias(0))}`] = { text: 'O que a espera de José mostra sobre Deus?\nDeus não desperdiça a espera. Dois anos na prisão foram preparo.', updatedAt: iso(0, 7) }
  notes[`reflection:${dateKey(dias(3))}`] = { text: 'O que este capítulo mostra?\nO copeiro esqueceu, Deus não. A espera tinha data marcada.', updatedAt: iso(3, 7) }
  for (let i = 0; i < 20; i++) notes[`reflection:${dateKey(dias(41 + i * 3))}`] = { text: 'Uma reflexão sobre a leitura daquele dia.', updatedAt: iso(41 + i * 3, 7) }
  // Aplicações: 9 frases do dia.
  notes[`application:${dateKey(dias(2))}`] = { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: iso(2, 8), fulfilled: true }
  for (let i = 0; i < 8; i++) notes[`application:${dateKey(dias(42 + i * 5))}`] = { text: 'Hoje eu escolho confiar antes de entender.', updatedAt: iso(42 + i * 5, 8), fulfilled: i % 2 === 0 }
  // A frase fixada no Hoje nunca é um item da Biblioteca.
  notes['application:pinned'] = { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: iso(2, 8) }
  return notes
}

const passagem = (book, bookEn, chapter, verseStart, verseEnd = verseStart) => ({ book, bookEn, chapter, verseStart, verseEnd })
const pregacao = (id, n, noteType, title, preacher, church, text, passages) => ({ id: `sermon-${id}`, date: dateKey(dias(n)), createdAt: iso(n, 10), updatedAt: iso(n, 11), noteType, title, preacher, church, link: '', passages, text, body: [{ id: `seg-${id}`, type: 'text', text }], topics: [], durationSeconds: 1440, finalizedAt: iso(n, 11), groupId: null })

// Pregações: 14 anotações de 5 pregadores — 8 sermões, 3 cultos, 2 aulas e
// 1 vídeo online. As três primeiras são as da captura L2 (domingo, quarta e
// 27 de outubro, a partir de uma terça, 10 de novembro).
function pregacoes() {
  const list = [
    pregacao('fidelidade', 2, 'sermon', 'A fidelidade que não se explica', 'Pr. João Silva', 'Igreja Batista Central', 'Deus é fiel mesmo quando não entendemos o caminho. Três pontos: Ele vê, Ele lembra, Ele age no tempo dele.', [passagem('Gênesis', 'Genesis', 39, 21), passagem('Romanos', 'Romans', 8, 28), passagem('Salmos', 'Psalms', 105, 19)]),
    pregacao('panorama', 6, 'class', 'Panorama de Gênesis · aula 4', 'Prof. Lívia Prado', 'Escola Bíblica', 'José como figura de Cristo: rejeitado pelos irmãos, exaltado para salvar os mesmos que o venderam.', [{ book: 'Gênesis', bookEn: 'Genesis', chapter: 37, verseStart: null, verseEnd: null }, passagem('Gênesis', 'Genesis', 45, 5)]),
    pregacao('demora', 14, 'video', 'Quando Deus demora', 'Tim Keller', 'legendado', 'A demora não é ausência. O que Deus faz em nós enquanto esperamos é a resposta.', [{ book: 'Salmos', bookEn: 'Psalms', chapter: 13, verseStart: null, verseEnd: null }, passagem('Habacuque', 'Habakkuk', 2, 3)]),
  ]
  const outros = [['sermon', 'Pr. João Silva', 'Igreja Batista Central', 5], ['sermon', 'Pr. Marcos Lima', 'Comunidade da Graça', 2], ['service', 'Pr. João Silva', 'Igreja Batista Central', 3], ['class', 'Prof. Lívia Prado', 'Escola Bíblica', 1]]
  let n = 44
  let i = 0
  for (const [tipo, quem, onde, quantos] of outros) {
    for (let k = 0; k < quantos; k++) {
      // O quinto pregador: o último culto.
      const ultimoCulto = tipo === 'service' && k === quantos - 1
      list.push(pregacao(`p${i++}`, n, tipo, `Anotação ${i}`, ultimoCulto ? 'Pra. Ana Reis' : quem, onde, 'O que ficou da mensagem daquele dia, com as minhas palavras.', [passagem('Salmos', 'Psalms', 1 + i, 1)]))
      n += 7
    }
  }
  return list
}

// Perguntas guardadas: 6, só no aparelho.
function perguntas() {
  const pergunta = (book, bookEn, chapter, verse, n, question, reply) => ({ book, bookEn, chapter, verseStart: verse, verseEnd: verse, question, answer: { outcome: 'answer', reply }, createdAt: iso(n, 21) })
  return [
    pergunta('Gênesis', 'Genesis', 41, 1, 12, 'Por que dois anos inteiros até o copeiro lembrar de José?', 'O texto não explica a demora; só marca o tempo ("dois anos completos") e mostra que o momento coincide com o sonho do faraó.'),
    ...Array.from({ length: 5 }, (_, i) => pergunta('João', 'John', 3 + i, 16, 50 + i * 6, 'O que este versículo quer dizer no contexto do capítulo?', 'Uma resposta guardada, conferida com o texto.')),
  ]
}

const sessoes = feitas => Array.from({ length: 6 }, (_, i) => ({ id: i + 1, book: 'Filipenses', chStart: 1 + (i % 4), chEnd: 1 + (i % 4), completedAt: i < feitas ? iso(3 - i) : undefined }))

// `conta`: 'exemplo' (as capturas) · 'nova' (nada guardado) · 'um' (um item
// de cada, para ver o singular). `estudos`: 'andamento' · 'guardados' ·
// 'um' · 'nenhum'.
export function linhaDeExemplo({ conta = 'exemplo', estudos = 'andamento' } = {}) {
  const estudo = { id: 'estudo-filipenses', title: 'Filipenses', sessions: sessoes(1) }
  const outros = [{ id: 'estudo-rute', title: 'Rute', sessions: sessoes(6) }, { id: 'estudo-oracao', title: 'A oração de Jesus', sessions: sessoes(0) }]
  const ai = estudos === 'nenhum' || conta === 'nova' ? [] : estudos === 'um' ? [outros[0]] : [estudo, ...outros]
  const base = { ai_studies: ai, inductive_studies: [], studies_completed: [], active_study: estudos === 'andamento' && ai.length ? { studyId: estudo.id } : null }
  // O que a Biblioteca nunca pode mostrar: a oração mora na mesma linha.
  const oracao = { prayer_requests: [{ id: 'pr-1', text: 'PEDIDO DE ORAÇÃO — não pode aparecer na Biblioteca' }], prayer_stats: { totalSeconds: 9999 } }
  if (conta === 'nova') return { ...base, ...oracao, notes: {}, highlights: [], sermon_notes: [] }
  if (conta === 'um') {
    return {
      ...base, ...oracao,
      notes: { [`reflection:${dateKey(dias(0))}`]: { text: 'Uma reflexão só.', updatedAt: iso(0, 7) }, [`application:${dateKey(dias(2))}`]: { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: iso(2, 8) } },
      highlights: [marcacoes()[0], notas()[0]], sermon_notes: [pregacoes()[0]],
    }
  }
  return { ...base, ...oracao, notes: mapaDeNotas(), highlights: [...marcacoes(), ...notas()], sermon_notes: pregacoes() }
}

export function perguntasDeExemplo(conta = 'exemplo') {
  return conta === 'nova' ? [] : conta === 'um' ? perguntas().slice(0, 1) : perguntas()
}

// Os capítulos lidos em cada dia (o título das reflexões).
export function leiturasDeExemplo() {
  return [{ livro: 'Gênesis', capitulo: 41, created_at: iso(0, 6) }, { livro: 'Gênesis', capitulo: 40, created_at: iso(3, 6) }]
}
