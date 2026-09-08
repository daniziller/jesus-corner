// Testa src/reading/findCurrentReadingSession.js — correção do bug "leitura
// livre marcada fora de ordem não afeta o plano" (2026-09-08): a sessão
// "atual" agora é sempre a primeira ainda não concluída na ordem canônica,
// nunca mais ancorada em onde a pessoa tocou por último (lastReadPosition
// saiu da função). Roda com: node scripts/test-find-current-reading-session.mjs
import { findCurrentReadingSession } from '../src/reading/findCurrentReadingSession.js'

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

function session(id, book, chStart, chEnd, status) {
  return { id, book, chStart, chEnd, status, type: 'reading' }
}

const blockA = { id: 'A' }
const blockB = { id: 'B' }
const blocks = [blockA, blockB]

// Cenário base: bloco A com 2 sessões (1ª feita, 2ª pendente), bloco B com
// 1 sessão pendente.
function baseSessionsByBlock() {
  return {
    A: [session('a1', 'Gênesis', 1, 20, 'done'), session('a2', 'Gênesis', 21, 40, 'pending')],
    B: [session('b1', 'Êxodo', 1, 15, 'pending')],
  }
}

// Caso normal: acha a primeira pendente (a2), sem precisar de nenhum
// "ponteiro" de onde a pessoa tocou por último.
check('primeira sessão pendente do bloco A', findCurrentReadingSession(blocks, baseSessionsByBlock()).session.id, 'a2')

// O bug relatado: "Marcar lidos" (fora de ordem, sem passar pela leitura
// guiada) completou a2 inteira sem nunca abrir a tela de leitura — antes,
// como isso nunca atualizava lastReadPosition, o plano ficava "preso" em
// a2 (já feita). Agora, sem ponteiro nenhum na função, ela sempre acha o
// que falta de verdade: b1.
{
  const sessionsByBlock = baseSessionsByBlock()
  sessionsByBlock.A[1] = { ...sessionsByBlock.A[1], status: 'done' } // a2 completada fora de ordem
  check('a2 completada fora de ordem → plano avança pra b1 (bloco seguinte)', findCurrentReadingSession(blocks, sessionsByBlock).session.id, 'b1')
}

// "Reler" um capítulo já concluído (a1) não deveria mais "prender" o
// plano nele — como lastReadPosition nem entra na função, isso já é
// garantido estruturalmente (não há como a1 voltar a ser "a atual" só
// por ter sido reaberta) — confirmando que o resultado independe de
// qualquer noção de "último tocado".
check('reler a1 (já feita) não muda o resultado — continua a2', findCurrentReadingSession(blocks, baseSessionsByBlock()).session.id, 'a2')

// Bíblia inteira concluída: cai no fallback (última sessão do último bloco).
{
  const sessionsByBlock = {
    A: [session('a1', 'Gênesis', 1, 20, 'done'), session('a2', 'Gênesis', 21, 40, 'done')],
    B: [session('b1', 'Êxodo', 1, 15, 'done')],
  }
  check('tudo concluído → cai na última sessão do último bloco', findCurrentReadingSession(blocks, sessionsByBlock).session.id, 'b1')
}

// Bloco inteiro já concluído (A) — passa direto pro primeiro pendente de B,
// sem se prender ao último capítulo de A.
{
  const sessionsByBlock = {
    A: [session('a1', 'Gênesis', 1, 20, 'done'), session('a2', 'Gênesis', 21, 40, 'done')],
    B: [session('b1', 'Êxodo', 1, 15, 'pending')],
  }
  check('bloco A inteiro concluído → primeira pendente de B', findCurrentReadingSession(blocks, sessionsByBlock).session.id, 'b1')
}

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de findCurrentReadingSession passaram.')
