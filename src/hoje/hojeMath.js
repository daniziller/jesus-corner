// hojeMath.js — textos e estados do Hoje (handoff-hoje-50, H1). Nada aqui
// recalcula o que a gamificação e o Meu Plano já calculam: estas funções
// só dão forma (frase, rótulo, estado visual) ao que computeBibleProgress,
// weeksMath, computeMeuPlano e pickClosest devolvem. Puro, sem React nem
// stores — testado em scripts/test-hoje.mjs.
import { formatInt, formatPct, deOf, monthYearLong } from '../gamification/format.js'
import { footerBook } from '../gamification/bibleProgressMath.js'

// ── Bloco 1: Sua caminhada (HANDOFF §3) ─────────────────────────────────

// "50 de 1.189 capítulos"
export function chaptersLine(progress) {
  return `${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
}

// Terceira linha do cartão da Bíblia: "Gênesis 41 de 50 · faltam 9 para o
// selo" · "falta 1 para o selo" · "Comece por onde quiser" (nada lido
// ainda) · "Terminada em setembro de 2026" (Bíblia inteira; vazio enquanto
// a data não chegou).
export function bibleBookLine(progress, currentBook, finishedIso) {
  if (progress.bibliaInteira) return finishedIso ? `Terminada em ${monthYearLong(new Date(finishedIso))}` : ''
  if (progress.capitulosLidos === 0) return 'Comece por onde quiser'
  const book = footerBook(progress, currentBook)
  const p = book ? progress.porLivro[book] : null
  if (!p) return 'Comece por onde quiser'
  const faltam = p.faltam === 1 ? 'falta 1 para o selo' : `faltam ${formatInt(p.faltam)} para o selo`
  return `${book} ${deOf(p.lidos, p.total)} · ${faltam}`
}

// Data em que a Bíblia foi terminada: o capítulo lido mais recente.
export function bibleFinishedIso(chapterRows) {
  let max = null
  for (const r of chapterRows ?? []) if (r?.created_at && (!max || r.created_at > max)) max = r.created_at
  return max
}

// Rótulos dos quatro alvos da caminhada (leitor de tela).
export function bibleCardAria(progress) {
  return `Sua Bíblia, ${formatPct(progress.percent)} lida, ${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
}
export function weeksAria(total) {
  return `${formatInt(total)} ${total === 1 ? 'semana' : 'semanas'} na meta`
}
export function daysAria(feitos, meta) {
  return `${feitos} de ${meta} ${meta === 1 ? 'dia' : 'dias'} na meta esta semana`
}
export function sealsAria(completos, totalLivros) {
  return `${completos} ${completos === 1 ? 'selo' : 'selos'} de ${totalLivros} livros`
}

// Os sete pontos do quadrado "Dias": quatro estados visuais a partir dos
// cinco de computeWeekDayStates (dia fora do plano, descanso e dia que
// passou sem leitura têm a mesma cara — sem vermelho, sem X).
const DOT_KIND = { leu: 'done', hoje: 'today', plano: 'upcoming' }
export function dayDotKind(state) {
  return DOT_KIND[state] ?? 'off'
}
