// projectionMath.js — "Como a roda vai ficando" (G2, HANDOFF §4.5): ritmo
// dos últimos 60 dias, projeção "em um ano" e data estimada da Bíblia
// inteira. Pura, sem I/O.
//
// Sem ritmo pra estimar (menos de 14 dias de uso, ou zero leitura no
// período): devolve null e a tela mostra só "Hoje" e "A Bíblia inteira"
// sem data.
import { BIBLE_CHAPTERS } from '../data/gamificationBlocks.js'

export const RATE_WINDOW_DAYS = 60
export const MIN_DAYS_OF_USE = 14

function isoDaysAgo(today, n) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - n).toISOString()
}

// `chapterRows`: linhas de chapters_read com created_at; `firstActivityIso`:
// primeiro registro de atividade da conta (qualquer fonte). Capítulos por
// dia nos últimos 60 dias, ou null.
export function readingRatePerDay(chapterRows, firstActivityIso, today = new Date()) {
  if (!firstActivityIso) return null
  const daysOfUse = (today.getTime() - new Date(firstActivityIso).getTime()) / 86400000
  if (daysOfUse < MIN_DAYS_OF_USE) return null
  const since = isoDaysAgo(today, RATE_WINDOW_DAYS)
  let n = 0
  for (const r of chapterRows ?? []) if (r?.created_at && new Date(r.created_at).toISOString() >= since) n++
  if (n === 0) return null
  const window = Math.min(RATE_WINDOW_DAYS, daysOfUse)
  return n / window
}

// Percentual da Bíblia daqui a um ano, no ritmo dado (máximo 100).
export function projectPercentInOneYear(capitulosLidos, ratePerDay) {
  const chapters = Math.min(BIBLE_CHAPTERS, capitulosLidos + ratePerDay * 365)
  return Math.round((chapters / BIBLE_CHAPTERS) * 1000) / 10
}

// Capítulos por livro daqui a um ano, no ritmo dado, avançando na ordem
// canônica a partir do primeiro capítulo não lido de cada livro — é o
// desenho da roda "Em um ano". `books`: [{nome, capitulos}] em ordem.
export function projectBookReads(porLivro, books, ratePerDay) {
  let budget = Math.round(ratePerDay * 365)
  const out = {}
  for (const b of books) {
    const lidos = porLivro[b.nome]?.lidos ?? 0
    const add = Math.min(b.capitulos - lidos, budget)
    out[b.nome] = lidos + add
    budget -= add
  }
  return out
}

// Data estimada da Bíblia inteira (Date) ou null.
export function estimateBibleCompletion(capitulosLidos, ratePerDay, today = new Date()) {
  const remaining = BIBLE_CHAPTERS - capitulosLidos
  if (remaining <= 0 || !ratePerDay) return null
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() + Math.ceil(remaining / ratePerDay))
  return d
}
