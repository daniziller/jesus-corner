// Testa src/bible/bookProgress.js e src/bible/chapterOrigin.js (pacote
// 39). Roda com: node scripts/test-bible-book-progress.mjs
import { computeBookProgress, computeAllBookProgress, computeTestamentProgress } from '../src/bible/bookProgress.js'
import { buildChapterOriginMap, originOf, bookOriginCounts } from '../src/bible/chapterOrigin.js'

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

const completedSet = new Set(['Gênesis:1', 'Gênesis:2', 'Gênesis:3', 'Rute:1', 'Rute:2', 'Rute:3', 'Rute:4'])

check('Gênesis: 3 de 50 = 6%', computeBookProgress('Gênesis', completedSet, 50), { read: 3, total: 50, percent: 6 })
check('Rute: livro inteiro lido = 100%', computeBookProgress('Rute', completedSet, 4), { read: 4, total: 4, percent: 100 })
check('Êxodo: 0 lido = 0%', computeBookProgress('Êxodo', completedSet, 40), { read: 0, total: 40, percent: 0 })
check('livro sem capítulo nenhum (total 0) não divide por zero', computeBookProgress('X', completedSet, 0), { read: 0, total: 0, percent: 0 })

const counts = { 'Gênesis': 50, 'Rute': 4, 'Êxodo': 40 }
check('computeAllBookProgress cobre todos os livros do mapa', Object.keys(computeAllBookProgress(completedSet, counts)).sort(), ['Gênesis', 'Rute', 'Êxodo'].sort())

const blocksSubset = [{ books: ['Gênesis', 'Êxodo'] }, { books: ['Rute'] }]
check('computeTestamentProgress soma os livros dos blocos', computeTestamentProgress(blocksSubset, completedSet, counts), { read: 7, total: 94, percent: Math.round((7 / 94) * 1000) / 10 })

const rows = [
  { livro: 'Gênesis', capitulo: 1, origem: 'sessao' },
  { livro: 'Gênesis', capitulo: 2, origem: 'manual' },
  // capítulo 3 sem linha nenhuma — cai em 'sessao' por padrão.
]
const originMap = buildChapterOriginMap(rows)
check('origin: capítulo com linha sessao', originOf(originMap, 'Gênesis', 1), 'sessao')
check('origin: capítulo com linha manual', originOf(originMap, 'Gênesis', 2), 'manual')
check('origin: capítulo sem linha nenhuma cai em sessao (suposição segura)', originOf(originMap, 'Gênesis', 3), 'sessao')

check('bookOriginCounts: 2 no app, 1 manual', bookOriginCounts('Gênesis', completedSet, 50, originMap), { app: 2, manual: 1 })
check('bookOriginCounts: livro sem linha nenhuma cai tudo em app', bookOriginCounts('Rute', completedSet, 4, new Map()), { app: 4, manual: 0 })

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de bookProgress/chapterOrigin passaram.')
