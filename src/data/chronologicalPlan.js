// Plano de leitura cronológica — os mesmos 66 livros do plano padrão,
// reordenados numa sequência aproximada de quando os eventos aconteceram
// (ou, no caso das cartas, de quando foram escritas) em vez da ordem
// canônica. É uma ordem por LIVRO INTEIRO — nunca quebra um livro no meio
// pra intercalar com outro. Bíblias cronológicas "completas" costumam
// intercalar capítulos (ex: alguns Salmos entre capítulos de 2 Samuel),
// mas isso quebraria a regra do app de "1 sessão = 1 livro só" (mesma regra
// do plano por tema, ver api/generate-theme-plan.js). A ordem entre livros
// segue a cronologia tradicionalmente aceita — datação de autoria/eventos é
// discutida entre estudiosos, não é uma verdade absoluta; livros como
// 1 Reis e 2 Crônicas cobrem mais de um período (reino unido E dividido) e
// foram colocados no período em que começam.
//
// Não usa banco de dados nem IA: a divisão em sessões é 100% determinística
// (mesma heurística palavras/minuto de bibleBlocks.js), calculada em
// memória a partir da contagem de palavras por capítulo que já existe em
// SESSIONS_BY_PLAN.free (que tem exatamente 1 sessão por capítulo — dado
// pronto, não precisa duplicar). Progresso é o completedSet de sempre
// (chave livro:capítulo / livro:reflection), o mesmo compartilhado com a
// leitura livre e os planos Leve/Padrão/Intensivo — ler Gênesis aqui já
// conta pro progresso geral da Bíblia.
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN, PLANS, WORDS_PER_MINUTE } from './bibleBlocks.js'
import { sessionKeys } from '../utils/progress.js'

export const CHRONOLOGICAL_MOVEMENTS = [
  {
    id: 1, icon: 'Tent', gradientKey: 'gold',
    name: 'Origens e Patriarcas', nameEn: 'Origins and Patriarchs',
    desc: 'Jó e Gênesis — a criação, a queda e as famílias que originaram o povo de Israel.',
    descEn: 'Job and Genesis — creation, the fall, and the families that became the people of Israel.',
    books: ['Jó', 'Gênesis'],
  },
  {
    id: 2, icon: 'Mountain', gradientKey: 'orange',
    name: 'Êxodo, Lei e Deserto', nameEn: 'Exodus, Law and Wilderness',
    desc: 'A saída do Egito, a Lei entregue no Sinai e os 40 anos no deserto.',
    descEn: 'The exodus from Egypt, the Law given at Sinai, and 40 years in the wilderness.',
    books: ['Êxodo', 'Levítico', 'Números', 'Deuteronômio'],
  },
  {
    id: 3, icon: 'Swords', gradientKey: 'red',
    name: 'Conquista e Juízes', nameEn: 'Conquest and Judges',
    desc: 'A entrada em Canaã e o ciclo de juízes que governou antes dos reis.',
    descEn: 'The entry into Canaan and the cycle of judges before the kings.',
    books: ['Josué', 'Juízes', 'Rute'],
  },
  {
    id: 4, icon: 'Crown', gradientKey: 'purple',
    name: 'O Reino Unido', nameEn: 'The United Kingdom',
    desc: 'Saul, Davi e Salomão — o auge do reino de Israel, com os Salmos e a literatura sapiencial da época.',
    descEn: "Saul, David and Solomon — Israel's kingdom at its height, with the Psalms and wisdom writings of the era.",
    books: ['1 Samuel', '2 Samuel', '1 Crônicas', 'Salmos', '1 Reis', 'Provérbios', 'Eclesiastes', 'Cântico dos Cânticos', '2 Crônicas'],
  },
  {
    id: 5, icon: 'Flame', gradientKey: 'blue',
    name: 'Reino Dividido e os Profetas', nameEn: 'The Divided Kingdom and the Prophets',
    desc: 'Israel e Judá como reinos separados, e os profetas que falaram durante essa época até a queda de Jerusalém.',
    descEn: 'Israel and Judah as separate kingdoms, and the prophets who spoke during that time up to the fall of Jerusalem.',
    books: ['2 Reis', 'Obadias', 'Joel', 'Jonas', 'Amós', 'Oseias', 'Isaías', 'Miquéias', 'Naum', 'Sofonias', 'Habacuque', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel'],
  },
  {
    id: 6, icon: 'Landmark', gradientKey: 'teal',
    name: 'Exílio e Retorno', nameEn: 'Exile and Return',
    desc: 'O povo exilado na Babilônia e o retorno para reconstruir Jerusalém e o templo.',
    descEn: 'The people exiled in Babylon and the return to rebuild Jerusalem and the temple.',
    books: ['Esdras', 'Ageu', 'Zacarias', 'Ester', 'Neemias', 'Malaquias'],
  },
  {
    id: 7, icon: 'Cross', gradientKey: 'green',
    name: 'Os Evangelhos', nameEn: 'The Gospels',
    desc: 'A vida, morte e ressurreição de Jesus contadas por Mateus, Marcos, Lucas e João.',
    descEn: 'The life, death and resurrection of Jesus told by Matthew, Mark, Luke and John.',
    books: ['Mateus', 'Marcos', 'Lucas', 'João'],
  },
  {
    id: 8, icon: 'Mail', gradientKey: 'gray',
    name: 'A Igreja Primitiva e as Cartas', nameEn: 'The Early Church and the Letters',
    desc: 'Atos e as cartas do Novo Testamento, na ordem aproximada em que foram escritas.',
    descEn: 'Acts and the New Testament letters, in roughly the order they were written.',
    books: ['Atos', 'Tiago', 'Gálatas', '1 Tessalonicenses', '2 Tessalonicenses', '1 Coríntios', '2 Coríntios', 'Romanos', 'Colossenses', 'Filemon', 'Efésios', 'Filipenses', '1 Timóteo', 'Tito', '1 Pedro', '2 Timóteo', 'Hebreus', '2 Pedro', 'Judas', '1 João', '2 João', '3 João'],
  },
  {
    id: 9, icon: 'Eye', gradientKey: 'gold',
    name: 'Apocalipse', nameEn: 'Revelation',
    desc: 'A visão final de João sobre o retorno de Cristo e a nova criação.',
    descEn: "John's final vision of Christ's return and the new creation.",
    books: ['Apocalipse'],
  },
]

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

// Palavras por capítulo de cada livro, lidas do plano 'free' (que sempre
// tem exatamente 1 sessão = 1 capítulo) — evita duplicar esse dado.
const CHAPTER_WORDS = {}
for (const block of BIBLE_BLOCKS) {
  for (const s of SESSIONS_BY_PLAN.free[block.id]) {
    if (!CHAPTER_WORDS[s.book]) CHAPTER_WORDS[s.book] = []
    CHAPTER_WORDS[s.book][s.chStart - 1] = s.words
  }
}

function makeSession(id, book, chStart, chEnd, chapterWords) {
  const bookEn = BOOK_EN_BY_PT[book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const words = chapterWords.slice(chStart - 1, chEnd).reduce((s, w) => s + w, 0)
  return {
    id, book, bookEn, books: [book],
    title: `${book} ${range}`, titleEn: `${bookEn} ${range}`,
    passage: `${book} ${range}`, passageEn: `${bookEn} ${range}`,
    words, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    chStart, chEnd,
  }
}

function makeReflectionSession(id, book) {
  const bookEn = BOOK_EN_BY_PT[book]
  return {
    id, book, bookEn, books: [book],
    title: `Reflexão: ${book}`, titleEn: `Reflection: ${bookEn}`,
    passage: '4 perguntas de reflexão', passageEn: '4 reflection questions',
    words: 0, minutes: 10, type: 'reflection',
  }
}

// Divide os capítulos de UM livro em sessões de ~targetWords cada (nunca
// combina livros diferentes numa sessão), igual à divisão usada pelo plano
// por tema — e fecha com a mesma sessão de reflexão que os planos fixos já
// têm ao final de cada livro (ver bibleBlocks.js).
function buildBookSessions(book, targetWords, startId) {
  const chapterWords = CHAPTER_WORDS[book] ?? []
  const sessions = []
  let id = startId
  let chunkStart = 1
  let chunkWords = 0
  chapterWords.forEach((words, i) => {
    const ch = i + 1
    if (chunkWords > 0 && chunkWords + words > targetWords) {
      sessions.push(makeSession(id++, book, chunkStart, ch - 1, chapterWords))
      chunkStart = ch
      chunkWords = 0
    }
    chunkWords += words
  })
  sessions.push(makeSession(id++, book, chunkStart, chapterWords.length, chapterWords))
  sessions.push(makeReflectionSession(id++, book))
  return { sessions, nextId: id }
}

function buildChronoSessionsByMovement(planPaceId) {
  const pace = PLANS.find(p => p.id === planPaceId) ?? PLANS.find(p => p.id === 'standard')
  const targetWords = (pace.readingMinutes ?? 20) * WORDS_PER_MINUTE
  const sessionsByMovement = {}
  for (const movement of CHRONOLOGICAL_MOVEMENTS) {
    let nextId = 1
    const sessions = []
    for (const book of movement.books) {
      const { sessions: bookSessions, nextId: n } = buildBookSessions(book, targetWords, nextId)
      sessions.push(...bookSessions)
      nextId = n
    }
    sessionsByMovement[movement.id] = sessions
  }
  return sessionsByMovement
}

// Espelha deriveProgress (src/utils/progress.js), mas sobre os "movimentos"
// cronológicos em vez dos 8 blocos temáticos — tudo em memória, sem rede
// nem IA, já que a ordem é fixa (não depende do usuário nem muda com o tempo).
export function deriveChronoProgress(completedSet, planPaceId) {
  const sessionsByMovementRaw = buildChronoSessionsByMovement(planPaceId)
  const blocks = []
  const sessionsByBlock = {}

  for (const movement of CHRONOLOGICAL_MOVEMENTS) {
    const staticSessions = sessionsByMovementRaw[movement.id]
    let doneCount = 0
    let anyChapterDone = false

    const sessions = staticSessions.map(s => {
      const keys = sessionKeys(s)
      const isDone = keys.every(k => completedSet.has(k))
      if (isDone) doneCount++
      if (!anyChapterDone && keys.some(k => completedSet.has(k))) anyChapterDone = true
      return { ...s, status: isDone ? 'done' : 'pending' }
    })

    const firstPending = sessions.find(s => s.status === 'pending')
    if (firstPending) firstPending.status = 'current'

    const total = sessions.length
    const percent = total ? Math.round((doneCount / total) * 1000) / 10 : 0
    const blockDone = doneCount === total

    blocks.push({
      ...movement,
      status: blockDone ? 'done' : anyChapterDone ? 'active' : 'todo',
      percent,
      sessionsTotal: total,
      sessionsDone: doneCount,
      sessionsLeft: total - doneCount,
      currentBook: firstPending ? firstPending.book : null,
      currentBookEn: firstPending ? firstPending.bookEn : null,
    })
    sessionsByBlock[movement.id] = sessions
  }

  return { blocks, sessionsByBlock }
}
