// Progresso por bloco pra métricas (item 7 da seção 5; tela 30c) — os OITO
// blocos exatos do ADENDO (rodada 30): Pentateuco, Históricos, Poéticos,
// Profetas maiores, Profetas menores, Evangelhos e Atos, Cartas, Apocalipse.
//
// Esta divisão é DIFERENTE da de src/data/bibleBlocks.js (BIBLE_BLOCKS),
// que também tem 8 blocos mas agrupa Profetas maiores+menores juntos e
// separa Evangelhos de Atos — essa é a divisão do PLANO DE LEITURA
// (sessões do dia, "Bloco 1 de 8" em Meu Plano), usada em tela alheia a
// esta. Mudar BIBLE_BLOCKS pra bater com o ADENDO quebraria a estrutura de
// sessões do plano em uso — por isso este é um agrupamento novo e
// independente, só pra 30c, reaproveitando os MESMOS nomes de livro (e por
// tabela os mesmos dados de capítulo) que BIBLE_BLOCKS já usa, sem duplicar
// a lista de sessões.
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from './bibleBlocks.js'

// Junta o nome em pt e en de cada livro a partir de BIBLE_BLOCKS (fonte
// única), pra este arquivo não ter que repetir os dois idiomas.
const BOOK_EN = {}
for (const block of BIBLE_BLOCKS) {
  block.books.forEach((pt, i) => { BOOK_EN[pt] = block.booksEn[i] })
}

export const METRICS_BLOCKS = [
  { id: 'pentateuco', name: 'Pentateuco', nameEn: 'Pentateuch', books: ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio'] },
  { id: 'historicos', name: 'Históricos', nameEn: 'Historical', books: ['Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester'] },
  { id: 'poeticos', name: 'Poéticos', nameEn: 'Poetic', books: ['Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cântico dos Cânticos'] },
  { id: 'profetas-maiores', name: 'Profetas maiores', nameEn: 'Major Prophets', books: ['Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel'] },
  { id: 'profetas-menores', name: 'Profetas menores', nameEn: 'Minor Prophets', books: ['Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'] },
  { id: 'evangelhos-atos', name: 'Evangelhos e Atos', nameEn: 'Gospels and Acts', books: ['Mateus', 'Marcos', 'Lucas', 'João', 'Atos'] },
  { id: 'cartas', name: 'Cartas', nameEn: 'Letters', books: ['Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemon', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas'] },
  { id: 'apocalipse', name: 'Apocalipse', nameEn: 'Revelation', books: ['Apocalipse'] },
]

let _chaptersByBook = null
function chaptersByBook() {
  if (_chaptersByBook) return _chaptersByBook
  const counts = {}
  for (const block of BIBLE_BLOCKS) {
    for (const s of SESSIONS_BY_PLAN.free[block.id]) {
      if (s.type === 'reflection') continue
      counts[s.book] = Math.max(counts[s.book] ?? 0, s.chEnd)
    }
  }
  _chaptersByBook = counts
  return counts
}

// [{ id, name, nameEn, chaptersRead, chaptersTotal, percent }] pros 8 blocos,
// na ordem do array acima (AT primeiro, NT depois — mesma ordem de leitura
// padrão). `completedSet` é o de sempre (getCompletedSet).
export function computeMetricsBlocks(completedSet) {
  const counts = chaptersByBook()
  return METRICS_BLOCKS.map(block => {
    let chaptersRead = 0
    let chaptersTotal = 0
    for (const book of block.books) {
      const total = counts[book] ?? 0
      chaptersTotal += total
      for (let ch = 1; ch <= total; ch++) {
        if (completedSet.has(`${book}:${ch}`)) chaptersRead++
      }
    }
    const percent = chaptersTotal ? Math.round((chaptersRead / chaptersTotal) * 1000) / 10 : 0
    return { id: block.id, name: block.name, nameEn: block.nameEn, chaptersRead, chaptersTotal, percent }
  })
}

// { chaptersRead, chaptersTotal, percent } do Antigo/Novo Testamento —
// AT = primeiros 5 blocos (Pentateuco a Profetas menores), NT = últimos 3
// (Evangelhos e Atos, Cartas, Apocalipse). Usado no topo de 30c.
export function computeTestamentTotals(metricsBlocks) {
  const sum = (blocks) => blocks.reduce((acc, b) => ({ chaptersRead: acc.chaptersRead + b.chaptersRead, chaptersTotal: acc.chaptersTotal + b.chaptersTotal }), { chaptersRead: 0, chaptersTotal: 0 })
  const ot = sum(metricsBlocks.slice(0, 5))
  const nt = sum(metricsBlocks.slice(5))
  const pct = ({ chaptersRead, chaptersTotal }) => chaptersTotal ? Math.round((chaptersRead / chaptersTotal) * 1000) / 10 : 0
  return {
    ot: { ...ot, percent: pct(ot) },
    nt: { ...nt, percent: pct(nt) },
  }
}
