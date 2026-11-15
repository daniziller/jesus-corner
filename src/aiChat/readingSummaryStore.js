import { authHeaders } from '../lib/authHeaders'

// Fecho da leitura — tela 37e do pacote 36-37. O conteúdo em si vem de
// api/generate-reading-summary.js (GET com o token da conta, cacheado na
// borda; sem limite diário próprio). Se falhar, quem chama mostra a tela
// sem os blocos gerados em vez de travar — ver ReadingSummaryScreen.jsx.
export async function fetchReadingSummary({ book, chStart, chEnd, lang }) {
  const params = new URLSearchParams({ book, chStart: String(chStart), chEnd: String(chEnd ?? chStart), lang: lang === 'en' ? 'en' : 'pt' })
  const res = await fetch(`/api/generate-reading-summary?${params}`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  const body = await res.json()
  return body.summary
}
