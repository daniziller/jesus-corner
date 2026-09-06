// Bloco 2 do redesign — testa src/data/metricsBlocks.js: confere que os 8
// blocos batem exatamente com os totais do ADENDO-TURNOS-24-32.md (rodada
// 30c) — Pentateuco 187, Históricos 249, Poéticos 243, Profetas maiores
// 183, Profetas menores 67, Evangelhos e Atos 117, Cartas 121, Apocalipse
// 22 — e que a soma bate com o total de 1.189 capítulos usado no resto do
// app. Roda com: node scripts/test-metrics-blocks.mjs
import { METRICS_BLOCKS, computeMetricsBlocks, computeTestamentTotals } from '../src/data/metricsBlocks.js'

const EXPECTED_TOTALS = {
  pentateuco: 187,
  historicos: 249,
  poeticos: 243,
  'profetas-maiores': 183,
  'profetas-menores': 67,
  'evangelhos-atos': 117,
  cartas: 121,
  apocalipse: 22,
}

const emptySet = new Set()
const blocks = computeMetricsBlocks(emptySet)

let failures = 0
function check(label, actual, expected) {
  if (actual !== expected) {
    console.error(`FALHOU: ${label} — esperado ${expected}, veio ${actual}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${actual}`)
  }
}

check('total de blocos', blocks.length, 8)
for (const block of blocks) {
  check(`${block.id} (${block.name}) capítulos totais`, block.chaptersTotal, EXPECTED_TOTALS[block.id])
  check(`${block.id} lidos com completedSet vazio`, block.chaptersRead, 0)
  check(`${block.id} percent com completedSet vazio`, block.percent, 0)
}

const sumTotal = blocks.reduce((s, b) => s + b.chaptersTotal, 0)
check('soma dos 8 blocos', sumTotal, 1189)

// Marca a Bíblia inteira como lida (todo book:chapter de todo bloco) e
// confere 100% em todos os blocos e nos dois testamentos — usa os próprios
// livros de cada bloco, perguntando quantos capítulos cada livro tem (mesma
// fonte que computeMetricsBlocks usa por baixo).
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../src/data/bibleBlocks.js'
const fullSet = new Set()
const chaptersByBook = {}
for (const block of BIBLE_BLOCKS) {
  for (const s of SESSIONS_BY_PLAN.free[block.id]) {
    if (s.type === 'reflection') continue
    chaptersByBook[s.book] = Math.max(chaptersByBook[s.book] ?? 0, s.chEnd)
  }
}
for (const block of METRICS_BLOCKS) {
  for (const book of block.books) {
    const total = chaptersByBook[book] ?? 0
    for (let ch = 1; ch <= total; ch++) fullSet.add(`${book}:${ch}`)
  }
}
const fullBlocks = computeMetricsBlocks(fullSet)
for (const block of fullBlocks) {
  check(`${block.id} 100% lido`, block.percent, 100)
  check(`${block.id} lidos == total`, block.chaptersRead, block.chaptersTotal)
}

const testaments = computeTestamentTotals(fullBlocks)
check('AT 100%', testaments.ot.percent, 100)
check('NT 100%', testaments.nt.percent, 100)
check('AT total capítulos', testaments.ot.chaptersTotal, 187 + 249 + 243 + 183 + 67)
check('NT total capítulos', testaments.nt.chaptersTotal, 117 + 121 + 22)

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de metricsBlocks passaram.')
