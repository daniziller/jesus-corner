// homeVerseMath.js — parte pura (sem I/O) do "Versículo do dia" e da linha
// de continuidade da Home (34a). Testado em node puro, ver
// scripts/test-home-verse.mjs.
//
// Regra do handoff: "prefira um versículo do trecho que a pessoa está
// lendo; só use a lista curada como fallback" — dailyVerseIndex escolhe UM
// versículo dentro do capítulo em foco, girando por dia do ano (mesmo
// espírito de utils/upliftingVerse.js, mas dentro do conjunto de
// versículos do capítulo, não da lista curada inteira), pra não cair
// sempre no versículo 1 e pra todo mundo que abrir o app no mesmo dia ver
// o mesmo.
export function dailyVerseIndex(verseCount, date = new Date()) {
  if (!verseCount || verseCount < 1) return 0
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return dayOfYear % verseCount
}
