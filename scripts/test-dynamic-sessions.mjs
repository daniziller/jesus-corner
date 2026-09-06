// Testa dynamicSessions.js — a divisão do plano fixo (canônico) em sessões
// por MINUTOS reais (Bloco 4 do redesign, item 2/6 da seção 5: minutos
// livres substituem os 4 ritmos fixos como fonte real do tamanho da
// sessão). Roda com `node` puro — arquivo sem I/O.
import { buildDynamicSessionsByBlock } from '../src/data/dynamicSessions.js'
import { BIBLE_BLOCKS, WORDS_PER_MINUTE } from '../src/data/bibleBlocks.js'

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL: ${label} — esperado ${expected}, veio ${actual}`)
    process.exitCode = 1
  } else {
    console.log(`ok: ${label}`)
  }
}

// 15 min/dia (padrão do exemplo do ADENDO) — cada sessão de leitura deve
// ficar perto de 1.500 palavras, nunca estourar tanto que vire 2 sessões
// coladas por engano, e nunca misturar 2 livros na mesma sessão.
const byBlock15 = buildDynamicSessionsByBlock(15)
let totalChapters = 0
let totalReflections = 0
for (const block of BIBLE_BLOCKS) {
  const sessions = byBlock15[block.id]
  const booksInBlock = new Set(block.books)
  for (const s of sessions) {
    if (s.type === 'reflection') { totalReflections++; continue }
    if (!booksInBlock.has(s.book)) {
      console.error(`FAIL: sessão ${s.id} do bloco ${block.id} pertence a um livro fora do bloco (${s.book})`)
      process.exitCode = 1
    }
    totalChapters += s.chEnd - s.chStart + 1
  }
}
assertEqual(totalChapters, 1189, 'total de capítulos cobertos (15 min/dia)')
assertEqual(totalReflections, 66, 'uma reflexão de fechamento por livro (66 livros)')

// Sem preferência salva (0/null) — 1 sessão por capítulo, igual ao plano
// Livre de sempre.
const byBlockFree = buildDynamicSessionsByBlock(0)
const genesisSessionsFree = byBlockFree[1].filter(s => s.book === 'Gênesis' && s.type !== 'reflection')
assertEqual(genesisSessionsFree.length, 50, 'sem minutos salvos, Gênesis vira 1 sessão por capítulo (50)')
assertEqual(genesisSessionsFree.every(s => s.chStart === s.chEnd), true, 'cada sessão de Gênesis é 1 capítulo só')

// Minutos altos (60) agrupam mais capítulos por sessão — Gênesis em bem
// menos sessões que no ritmo livre.
const byBlock60 = buildDynamicSessionsByBlock(60)
const genesisSessions60 = byBlock60[1].filter(s => s.book === 'Gênesis' && s.type !== 'reflection')
assertEqual(genesisSessions60.length < genesisSessionsFree.length, true, '60 min/dia agrupa Gênesis em menos sessões que 0 min/dia')

// Nenhuma sessão de leitura excede MUITO o alvo (a última sessão de um
// livro pode passar um pouco, nunca dobrar).
const targetWords15 = 15 * WORDS_PER_MINUTE
const worst = Math.max(...Object.values(byBlock15).flat().filter(s => s.type !== 'reflection').map(s => s.words))
assertEqual(worst <= targetWords15 * 2, true, `nenhuma sessão de 15 min/dia passa do dobro do alvo (pior caso: ${worst} palavras)`)

if (process.exitCode) {
  console.error('\nFalhas encontradas.')
} else {
  console.log('\nTudo certo.')
}
