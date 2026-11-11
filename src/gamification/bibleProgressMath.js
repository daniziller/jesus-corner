// bibleProgressMath.js — progresso por livro e por bloco da gamificação
// (roda, legenda, estante, selos). Pura, sem I/O: recebe completedSet (a
// fonte de verdade de "lido", ver src/progress/progressStore.js) e devolve
// o que a roda e a estante desenham. Testes em scripts/test-gamificacao.mjs.
//
// "Livro completo" AQUI = todos os capítulos lidos (conquistas.json:
// "livros com todos os capítulos lidos") — diferente de
// computeCompletedBooks em utils/progress.js, que também exige a chave de
// reflexão e alimenta o feed de amigos e o cartão de métricas. Decisão da
// autora (2026-11-11): a definição do JSON vale só na gamificação; o resto
// não muda.
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS, BIBLE_CHAPTERS, BIBLE_BOOKS_TOTAL } from '../data/gamificationBlocks.js'

export function chaptersReadInBook(nome, total, completedSet) {
  let lidos = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${nome}:${ch}`)) lidos++
  return lidos
}

// Primeiro capítulo ainda não lido de um livro (1..total), ou null se o
// livro está completo — "O próximo selo" abre o livro nele (G9).
export function nextUnreadChapter(nome, total, completedSet) {
  for (let ch = 1; ch <= total; ch++) if (!completedSet.has(`${nome}:${ch}`)) return ch
  return null
}

// Tudo o que a roda, a legenda, G2, G9 e as famílias Leitura/Livros/Blocos
// precisam, numa passada só pelos 66 livros.
export function computeBibleProgress(completedSet) {
  const porLivro = {}
  const completos = []
  let capitulosLidos = 0

  for (const livro of GAMIFICATION_BOOKS) {
    const lidos = chaptersReadInBook(livro.nome, livro.capitulos, completedSet)
    const completo = lidos === livro.capitulos
    porLivro[livro.nome] = { lidos, total: livro.capitulos, faltam: livro.capitulos - lidos, completo, comecado: lidos > 0 }
    capitulosLidos += lidos
    if (completo) completos.push(livro.nome)
  }

  const porBloco = GAMIFICATION_BLOCKS.map(block => {
    let lidos = 0
    let livrosCompletos = 0
    for (const livro of block.livros) {
      lidos += porLivro[livro.nome].lidos
      if (porLivro[livro.nome].completo) livrosCompletos++
    }
    return {
      id: block.id, nome: block.nome, lidos, total: block.capitulos,
      livrosCompletos, livrosTotal: block.livros.length,
      comecado: lidos > 0, completo: livrosCompletos === block.livros.length,
    }
  })

  return {
    porLivro,
    porBloco,
    capitulosLidos,
    totalCapitulos: BIBLE_CHAPTERS,
    percent: Math.round((capitulosLidos / BIBLE_CHAPTERS) * 1000) / 10,
    livrosCompletos: completos.length,
    totalLivros: BIBLE_BOOKS_TOTAL,
    completos, // nomes, em ordem canônica
    blocosComecados: porBloco.filter(b => b.comecado).length,
    blocosCompletos: porBloco.filter(b => b.completo).length,
    bibliaInteira: capitulosLidos === BIBLE_CHAPTERS,
  }
}

// "O próximo selo" (G9): o livro em andamento mais adiantado (maior
// lidos/total entre os começados e não completos); empate → ordem
// canônica. Null se nada está em andamento.
export function closestSeal(progress) {
  let best = null
  for (const livro of GAMIFICATION_BOOKS) {
    const p = progress.porLivro[livro.nome]
    if (!p.comecado || p.completo) continue
    const ratio = p.lidos / p.total
    if (!best || ratio > best.ratio) best = { nome: livro.nome, ratio, faltam: p.faltam, lidos: p.lidos, total: p.total }
  }
  return best
}

// Livro mostrado junto da roda no Hoje: o livro atual do plano enquanto
// faltar capítulo nele; senão o selo mais perto; senão o primeiro livro
// incompleto na ordem canônica. Null com a Bíblia inteira lida.
export function footerBook(progress, currentBook) {
  if (currentBook && progress.porLivro[currentBook]?.faltam > 0) return currentBook
  const seal = closestSeal(progress)
  if (seal) return seal.nome
  const next = Object.keys(progress.porLivro).find(nome => !progress.porLivro[nome].completo)
  return next ?? null
}

// Próximo bloco a acender (rodapé do cartão "Blocos da Bíblia", G5): o
// primeiro bloco incompleto na ordem canônica, com o livro que falta pra
// fechá-lo quando falta só um; null com a Bíblia inteira lida.
export function nextBlockToLight(progress) {
  const block = progress.porBloco.find(b => !b.completo)
  if (!block) return null
  const faltantes = GAMIFICATION_BLOCKS.find(b => b.id === block.id).livros
    .map(l => l.nome)
    .filter(nome => !progress.porLivro[nome].completo)
  return { id: block.id, nome: block.nome, livrosFaltantes: faltantes }
}
