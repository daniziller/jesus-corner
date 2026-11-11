// format.js — frases e números da gamificação, em português com vírgula
// decimal e ponto de milhar (HANDOFF §8). Pura; reaproveita formatPercent
// (bible/formatPercent.js). Testes em scripts/test-gamificacao.mjs.
import { formatPercent } from '../bible/formatPercent.js'

export function formatInt(n) {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

// "4,2%" — uma casa decimal quando existe (formatPercent já decide).
export function formatPct(value) {
  return `${formatPercent(value, 'pt')}%`
}

export function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm
}

// "faltam 9 capítulos" / "falta 1 capítulo"
export function faltamPhrase(n, singular, pluralForm) {
  return n === 1 ? `falta 1 ${singular}` : `faltam ${formatInt(n)} ${pluralForm}`
}

// "{lidos} de {total}"
export function deOf(a, b) {
  return `${formatInt(a)} de ${formatInt(b)}`
}

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function monthName(date) {
  return MONTHS_PT[date.getMonth()]
}

// "mar/25" (G6)
export function monthYearShort(iso) {
  const d = new Date(iso)
  return `${MONTHS_PT[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(-2)}`
}

// "28 de agosto" (G8) · "28 ago 2025" (G10) · "março de 2029" (G2)
export function dayMonthLong(iso) {
  const d = new Date(iso)
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`
}
export function dayMonthYearShort(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}
export function monthYearLong(date) {
  return `${MONTHS_PT[date.getMonth()]} de ${date.getFullYear()}`
}

// Horas/minutos de uma soma de segundos: "52 min" até 59 min, "1 h 05"
// a partir de uma hora (G8/G10 "Tempo").
export function formatDuration(seconds) {
  const min = Math.round(seconds / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
