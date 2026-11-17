// A conferência do fecho da leitura (api/generate-reading-summary.js): cada
// "momento" precisa apontar para versículos que existem de verdade no
// trecho lido. Antes, a resposta inteira era descartada se a IA mandasse
// 2 ou 4 momentos em vez de 3, ou um só momento com a faixa errada — e a
// tela ficava sem resumo nenhum. Agora os momentos ruins saem, e o resumo
// vale com 2 ou 3 momentos certos (no máximo 3, na ordem em que vieram).

export function momentIsReal(m, chapters, chStart, chEnd) {
  if (!m || !Number.isInteger(m.chapter) || !Number.isInteger(m.verseStart) || !Number.isInteger(m.verseEnd)) return false
  if (m.chapter < chStart || m.chapter > chEnd) return false
  if (m.verseStart < 1 || m.verseEnd < m.verseStart) return false
  if (!String(m.label ?? '').trim() || !String(m.text ?? '').trim()) return false
  const chapterData = chapters?.[String(m.chapter)]
  if (!chapterData?.verses) return false
  for (let v = m.verseStart; v <= m.verseEnd; v++) if (!chapterData.verses[String(v)]) return false
  return true
}

// Os momentos que ficam (até 3), ou null se sobrarem menos de 2.
export function pickMoments(moments, chapters, chStart, chEnd) {
  const real = (Array.isArray(moments) ? moments : []).filter(m => momentIsReal(m, chapters, chStart, chEnd)).slice(0, 3)
  return real.length >= 2 ? real : null
}

// O resto do fecho precisa ter texto em todos os campos que a tela mostra.
export function summaryHasText(s) {
  return ['thesis', 'threadOfStory', 'aboutGod', 'characterName', 'aboutCharacter', 'prayer'].every(k => String(s?.[k] ?? '').trim())
}
