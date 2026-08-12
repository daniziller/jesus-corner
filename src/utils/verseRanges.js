// Formata uma lista de versículos marcados (não precisam ser contíguos) numa
// string curta de faixas — [9,10,11,15] -> "9–11, 15". Usado em todo lugar
// que mostra a faixa de um highlight (ver src/highlights/highlightsStore.js).
export function formatVerseRanges(verses) {
  if (!verses?.length) return ''
  const sorted = [...verses].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    const v = sorted[i]
    if (v === prev + 1) { prev = v; continue }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`)
    if (v != null) { start = v; prev = v }
  }
  return ranges.join(', ')
}
