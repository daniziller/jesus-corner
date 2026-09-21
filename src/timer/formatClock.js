// Formato único mm:ss (antes triplicado: fmt() em PrayerScreen.jsx,
// fmt() em ReflectionScreen.jsx, formatClock() em ReadingBlockView.jsx —
// as três faziam exatamente a mesma conta). Minutos sempre com dois
// dígitos (00:05, não 0:05) — mesmo padrão que as três já usavam.
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}
