// Fecho da leitura — tela 37e do pacote 36-37. O conteúdo em si vem de
// api/generate-reading-summary.js (GET público, cacheado na borda — mesmo
// espírito de chapterContextStore.js/reflectionQuestionsStore.js: sem
// token, sem limite diário próprio; se falhar, quem chama mostra a tela
// sem os blocos gerados em vez de travar — ver ReadingSummaryScreen.jsx).
export async function fetchReadingSummary({ book, bookEn, chStart, chEnd, lang }) {
  const params = new URLSearchParams({ book, chStart: String(chStart), chEnd: String(chEnd ?? chStart), lang: lang === 'en' ? 'en' : 'pt' })
  if (bookEn) params.set('bookEn', bookEn)
  const res = await fetch(`/api/generate-reading-summary?${params}`)
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return body.summary
}
