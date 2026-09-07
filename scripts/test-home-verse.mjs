// Home (34a) — testa a parte pura de src/home/homeVerseMath.js (o fetch do
// texto do capítulo, em bible-text/bibleTextStore.js, é I/O — verificado
// manualmente no navegador). Roda com: node scripts/test-home-verse.mjs
import { dailyVerseIndex, excerptOf } from '../src/home/homeVerseMath.js'

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

check('dailyVerseIndex sem versículos', dailyVerseIndex(0), 0)
check('dailyVerseIndex 1 versículo só, sempre 0', dailyVerseIndex(1, new Date(2026, 0, 1)), 0)
check('dailyVerseIndex 1º de janeiro (dia 1) com 10 versículos', dailyVerseIndex(10, new Date(2026, 0, 1)), 1)
check('dailyVerseIndex gira dentro do total de versículos', dailyVerseIndex(5, new Date(2026, 0, 5)), 0)

check('excerptOf texto curto não corta', excerptOf('Uma frase curta.'), 'Uma frase curta.')
check('excerptOf texto vazio', excerptOf(''), '')
check('excerptOf null', excerptOf(null), '')
{
  const long = 'José disse a seus irmãos: acheguem-se a mim, e eles se achegaram; e ele disse: eu sou José, vosso irmão, a quem vendestes para o Egito.'
  const out = excerptOf(long, 40)
  check('excerptOf corta em fronteira de palavra', out.endsWith('…') && !long.startsWith(out.slice(0, -1) + 'x'), true)
  check('excerptOf respeita o tamanho máximo (+ reticências)', out.length <= 41, true)
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de homeVerseMath passaram.')
