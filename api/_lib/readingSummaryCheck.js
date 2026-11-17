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
const TEXT_FIELDS = ['thesis', 'threadOfStory', 'aboutGod', 'characterName', 'aboutCharacter', 'prayer']
export function summaryHasText(s) {
  return TEXT_FIELDS.every(k => String(s?.[k] ?? '').trim())
}

// Por que um momento não vale — para o registro do servidor (só números e
// nomes de campo, nunca o texto gerado).
export function momentProblem(m, chapters, chStart, chEnd) {
  if (!m) return 'vazio'
  if (![m.chapter, m.verseStart, m.verseEnd].every(Number.isInteger)) return 'capítulo/versículo não é número inteiro'
  if (m.chapter < chStart || m.chapter > chEnd) return `capítulo ${m.chapter} fora do trecho ${chStart}–${chEnd}`
  if (m.verseStart < 1 || m.verseEnd < m.verseStart) return `faixa ${m.verseStart}–${m.verseEnd} inválida`
  if (!String(m.label ?? '').trim() || !String(m.text ?? '').trim()) return 'sem nome ou sem texto'
  const verses = chapters?.[String(m.chapter)]?.verses
  if (!verses) return `capítulo ${m.chapter} sem texto`
  for (let v = m.verseStart; v <= m.verseEnd; v++) if (!verses[String(v)]) return `versículo ${m.chapter}:${v} não existe`
  return null
}

// O resumo do que falhou na conferência, para o registro: quantos momentos
// vieram, o problema de cada um que caiu e os campos de texto vazios.
export function verificationReport(s, chapters, chStart, chEnd) {
  const moments = Array.isArray(s?.moments) ? s.moments : []
  const bad = moments.map((m, i) => [i + 1, momentProblem(m, chapters, chStart, chEnd)]).filter(([, p]) => p).map(([n, p]) => `momento ${n}: ${p}`)
  const empty = TEXT_FIELDS.filter(k => !String(s?.[k] ?? '').trim())
  return [`${moments.length} momento(s)`, ...bad, ...(empty.length ? [`campos vazios: ${empty.join(', ')}`] : [])].join('; ')
}
