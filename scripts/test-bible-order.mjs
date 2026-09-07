// Turno 35, Bloco 1 — testa src/reading/bibleOrderMath.js (getBibleOrderMode/
// setBibleOrderMode, em bibleOrderStore.js, fazem I/O — não testados aqui).
// Roda com: node scripts/test-bible-order.mjs
import { canonicalBookOrder, chronologicalBookOrder, resolveBookOrder, resolveNextChapter } from '../src/reading/bibleOrderMath.js'
import { computeBookChapterCounts } from '../src/utils/progress.js'
import { SESSIONS_BY_PLAN } from '../src/data/bibleBlocks.js'

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

const canonical = canonicalBookOrder()
const chronological = chronologicalBookOrder()
check('ordem canônica começa em Gênesis', canonical[0], 'Gênesis')
check('ordem canônica termina em Apocalipse', canonical[canonical.length - 1], 'Apocalipse')
check('ordem canônica tem 66 livros', canonical.length, 66)
check('ordem cronológica tem os mesmos 66 livros (nenhum perdido)', [...chronological].sort(), [...canonical].sort())
check('ordem cronológica NÃO é igual à canônica (senão não seria outra ordem)', chronological.join(',') === canonical.join(','), false)
check('ordem cronológica começa em Jó (mais antigo)', chronological[0], 'Jó')

// resolveBookOrder — custom incompleto não perde livro nenhum.
const customPartial = ['Filipenses', 'Gênesis']
const resolvedCustom = resolveBookOrder('custom', customPartial)
check('minha ordem parcial: os escolhidos vêm primeiro, na ordem escolhida', resolvedCustom.slice(0, 2), customPartial)
check('minha ordem parcial: nenhum livro falta no total', resolvedCustom.length, 66)
check('modo desconhecido cai na canônica', resolveBookOrder('bogus', null), canonical)
check('cronológica ignora customOrder', resolveBookOrder('chronological', customPartial), chronological)

// resolveNextChapter — sobre dados reais de capítulos por livro.
const bookChapterCounts = computeBookChapterCounts(SESSIONS_BY_PLAN.free)
check('Bíblia vazia: próximo é Gênesis 1, em qualquer ordem', resolveNextChapter(new Set(), canonical, bookChapterCounts), { book: 'Gênesis', chapter: 1 })
check('Bíblia vazia, ordem cronológica: próximo é Jó 1', resolveNextChapter(new Set(), chronological, bookChapterCounts), { book: 'Jó', chapter: 1 })

const genesisDone = new Set(Array.from({ length: bookChapterCounts['Gênesis'] }, (_, i) => `Gênesis:${i + 1}`))
check('Gênesis inteiro lido: próximo é Êxodo 1 (canônica)', resolveNextChapter(genesisDone, canonical, bookChapterCounts), { book: 'Êxodo', chapter: 1 })

const allDone = new Set()
for (const book of canonical) {
  for (let ch = 1; ch <= (bookChapterCounts[book] ?? 0); ch++) allDone.add(`${book}:${ch}`)
}
check('Bíblia inteira lida: nenhum capítulo restante', resolveNextChapter(allDone, canonical, bookChapterCounts), null)

// Trocar de ordem no meio da leitura não "perde" progresso — só um pulo
// pra ordem cronológica com Gênesis já lido continua achando o próximo
// certo (o primeiro livro cronológico ainda não concluído).
const nextChrono = resolveNextChapter(genesisDone, chronological, bookChapterCounts)
check('Gênesis lido, mudando pra cronológica: Jó ainda falta (vem antes de Gênesis lá)', nextChrono, { book: 'Jó', chapter: 1 })

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de bibleOrderMath passaram.')
