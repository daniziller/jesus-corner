// Normalização de busca (39k/39l) — minúsculas, sem acento, com o MESMO
// comprimento do texto original. NFD quebra cada caractere acentuado em
// base + marca(s) de combinação (ex: "á" -> "a" + ´); removendo só as
// marcas (o mesmo intervalo Unicode que src/utils/slugify.js já usa, sem
// o passo de virar slug), cada posição do texto normalizado corresponde
// exatamente à mesma posição no texto original — verificado antes de usar
// isso pra destacar trechos: 'Não terei medo, pois tu estás comigo.'
// normaliza pro mesmo tamanho (37/37), e o índice achado em "estas" bate
// exatamente com "estás" no original (slice(24,29) === "estás"). É isso
// que permite achar a posição do termo no texto NORMALIZADO e fatiar o
// texto ORIGINAL (com acento e caixa) direto nessa mesma posição, sem
// precisar de um mapa de posições à parte.
export function normalizeForSearch(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Todas as posições (índice de início) onde `term` normalizado aparece em
// `text` normalizado — usado tanto pra destacar (com o texto original,
// pela mesma posição) quanto pra contar ocorrências.
export function findAllOccurrences(normalizedText, normalizedTerm) {
  if (!normalizedTerm) return []
  const positions = []
  let from = 0
  while (true) {
    const idx = normalizedText.indexOf(normalizedTerm, from)
    if (idx === -1) break
    positions.push(idx)
    from = idx + normalizedTerm.length
  }
  return positions
}
