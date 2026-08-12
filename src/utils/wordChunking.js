// Divide capítulos (com contagem de palavras) em sessões de tamanho
// próximo a targetWords — usado pelo plano cronológico (ver
// src/data/chronologicalPlan.js). mergeAdjacentPassages também é usado por
// api/generate-theme-plan.js na geração do plano por tema (funde as
// passagens antes de virarem "textos" — ver src/themePlans/themeTexts.js —
// não existe mais ritmo dividindo isso em sessões de tamanho fixo, só o
// cronológico ainda usa chunkChaptersByWords).
//
// Duas peças:
// 1. mergeAdjacentPassages — a IA pode devolver o mesmo livro em mais de
//    uma passagem (ex: "Mateus 5" e "Mateus 6" como itens separados); se
//    as faixas de capítulo forem adjacentes ou se sobrepuserem, funde num
//    intervalo só ANTES de dividir em sessões — senão cada passagem virava
//    uma sessão minúscula própria, bem menor que o ritmo escolhido.
//    Passagens do mesmo livro mas NÃO adjacentes (ex: Mateus 5 e Mateus 18)
//    continuam separadas — fundir incluiria capítulos irrelevantes no meio.
// 2. chunkChaptersByWords — divide os capítulos de UM livro (já mesclado
//    acima) em sessões de tamanho parecido. Balanceado em vez de guloso:
//    a versão antiga enchia cada sessão até o limite e jogava a sobra
//    inteira na última (podia sobrar uma sessão minúscula no fim); esta
//    calcula quantas sessões cabem (arredondando pra cima) e distribui as
//    palavras de forma parecida entre elas.
export function mergeAdjacentPassages(passages) {
  const byBook = new Map()
  for (const p of passages) {
    if (!byBook.has(p.book)) byBook.set(p.book, [])
    byBook.get(p.book).push(p)
  }
  const merged = []
  for (const [book, list] of byBook) {
    list.sort((a, b) => a.chStart - b.chStart)
    let current = null
    for (const p of list) {
      if (current && p.chStart <= current.chEnd + 1) {
        current.chEnd = Math.max(current.chEnd, p.chEnd)
        if (!current.reason.includes(p.reason)) current.reason += `; ${p.reason}`
      } else {
        current = { book, chStart: p.chStart, chEnd: p.chEnd, reason: p.reason }
        merged.push(current)
      }
    }
  }
  return merged
}

// chapters: [{ ch, words }, ...] em ordem, já só os capítulos da faixa
// relevante (chStart..chEnd de uma passagem/livro). targetWords <= 0
// (ritmo Livre) devolve 1 grupo por capítulo — mesma regra do plano fixo
// Livre e do cronológico.
export function chunkChaptersByWords(chapters, targetWords) {
  if (chapters.length === 0) return []
  if (targetWords <= 0) return chapters.map(c => ({ chStart: c.ch, chEnd: c.ch }))

  const totalWords = chapters.reduce((s, c) => s + c.words, 0)
  const numChunks = Math.max(1, Math.ceil(totalWords / targetWords))
  const idealPerChunk = totalWords / numChunks

  // Índice do grupo decidido pelo total ACUMULADO até aqui (não por um
  // contador local por grupo) — evita o erro da versão gulosa, que enchia
  // cada grupo até passar do alvo e sobrava um resto pequeno no fim; aqui
  // o "resto" se espalha entre todos os grupos, ficando mais parecido.
  const groups = []
  let running = 0
  for (const c of chapters) {
    const idx = Math.min(numChunks - 1, Math.floor(running / idealPerChunk))
    if (!groups[idx]) groups[idx] = []
    groups[idx].push(c)
    running += c.words
  }
  // filter(Boolean) — um capítulo muito mais longo que o normal pode pular
  // mais de um índice de uma vez, deixando grupos vazios no meio.
  return groups.filter(Boolean).map(g => ({ chStart: g[0].ch, chEnd: g[g.length - 1].ch }))
}
