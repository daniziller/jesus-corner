// Home (34a) — testa a parte pura de src/home/homeVerseMath.js (o fetch do
// texto do livro, em bible-text/bibleTextStore.js, é I/O — verificado no
// navegador) e a lista dos 500 versículos mais lidos.
// Roda com: node scripts/test-home-verse.mjs
import { dailyVerseIndex, dailyRotationIndex, daysSinceEpoch, verseOfTheDayRef, flattenVerseText } from '../src/home/homeVerseMath.js'
import { MOST_READ_VERSES } from '../src/data/versiculosMaisLidos.js'
import { VERSES_PER_CHAPTER } from '../src/data/versiculosPorCapitulo.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label}`)
  }
}

check('dailyVerseIndex sem versículos', dailyVerseIndex(0), 0)
check('dailyVerseIndex 1 versículo só, sempre 0', dailyVerseIndex(1, new Date(2026, 0, 1)), 0)
check('dailyVerseIndex 1º de janeiro (dia 1) com 10 versículos', dailyVerseIndex(10, new Date(2026, 0, 1)), 1)
check('dailyVerseIndex gira dentro do total de versículos', dailyVerseIndex(5, new Date(2026, 0, 5)), 0)

// ── Os 500 mais lidos ───────────────────────────────────────────────────
const canon = new Set(BIBLE_BLOCKS.flatMap(b => b.books))
check('são 500 versículos', MOST_READ_VERSES.length, 500)
check('nenhum repetido', new Set(MOST_READ_VERSES.map(v => v.join(' '))).size, 500)
check('todo livro é um nome canônico (bibleBlocks.js)', MOST_READ_VERSES.filter(([b]) => !canon.has(b)).map(([b]) => b), [])
check('toda referência existe no texto (capítulo e versículo dentro do livro)', MOST_READ_VERSES.filter(([b, c, v]) => { const counts = VERSES_PER_CHAPTER[b]; return !counts || c < 1 || c > counts.length || v < 1 || v > counts[c - 1] }), [])
check('começa pelos mais citados', MOST_READ_VERSES.slice(0, 4).map(v => v.join(' ')), ['João 3 16', 'Jeremias 29 11', 'Filipenses 4 13', 'Romanos 8 28'])
check('dos dois Testamentos', [MOST_READ_VERSES.some(([b]) => b === 'Salmos'), MOST_READ_VERSES.some(([b]) => b === 'Provérbios'), MOST_READ_VERSES.some(([b]) => b === 'Isaías')], [true, true, true])

// ── O rodízio ───────────────────────────────────────────────────────────
check('dias desde a data fixa: o próprio dia é 0, o seguinte 1 (hora local, sem fuso)', [daysSinceEpoch(new Date(2026, 0, 1, 23, 59)), daysSinceEpoch(new Date(2026, 0, 2, 0, 1))], [0, 1])
check('o índice gira pela lista inteira e volta ao começo', [dailyRotationIndex(500, new Date(2026, 0, 1)), dailyRotationIndex(500, new Date(2026, 0, 2)), dailyRotationIndex(500, new Date(2027, 4, 16)), dailyRotationIndex(500, new Date(2027, 4, 17))], [0, 1, 500 - 500 + (daysSinceEpoch(new Date(2027, 4, 16)) % 500), (daysSinceEpoch(new Date(2027, 4, 17)) % 500)])
check('500 dias seguidos passam pelos 500 versículos, cada um uma vez', new Set(Array.from({ length: 500 }, (_, i) => dailyRotationIndex(500, new Date(2026, 0, 1 + i)))).size, 500)
check('antes da data fixa não dá índice negativo', dailyRotationIndex(500, new Date(2025, 11, 31)) >= 0, true)
check('o versículo de 1º de janeiro de 2026 é João 3:16', verseOfTheDayRef(new Date(2026, 0, 1)), { bookPt: 'João', chapter: 3, verseNum: 16 })
check('o mesmo versículo o dia inteiro', verseOfTheDayRef(new Date(2026, 10, 18, 0, 5)), verseOfTheDayRef(new Date(2026, 10, 18, 23, 55)))
check('o de 18/11/2026 é o 321º da lista', verseOfTheDayRef(new Date(2026, 10, 18)), (([bookPt, chapter, verseNum]) => ({ bookPt, chapter, verseNum }))(MOST_READ_VERSES[daysSinceEpoch(new Date(2026, 10, 18))]))
check('texto de poesia vira um parágrafo só', flattenVerseText('O Senhor é meu pastor,\ne nada me faltará.'), 'O Senhor é meu pastor, e nada me faltará.')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de homeVerseMath passaram.')
