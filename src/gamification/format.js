// format.js — frases e números da gamificação: em português com vírgula
// decimal e ponto de milhar (HANDOFF §8), e em inglês quando `lang` é
// 'en'. Pura; reaproveita formatPercent (bible/formatPercent.js). Testes
// em scripts/test-gamificacao.mjs.
import { formatPercent } from '../bible/formatPercent.js'

const localeOf = lang => (lang === 'en' ? 'en-US' : 'pt-BR')

export function formatInt(n, lang = 'pt') {
  return Number(n).toLocaleString(localeOf(lang), { maximumFractionDigits: 0 })
}

// "4,2%" — uma casa decimal quando existe (formatPercent já decide).
export function formatPct(value, lang = 'pt') {
  return `${formatPercent(value, lang)}%`
}

export function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm
}

// "faltam 9 capítulos" / "falta 1 capítulo" · "9 chapters to go"
export function faltamPhrase(n, singular, pluralForm, lang = 'pt') {
  if (lang === 'en') return `${formatInt(n, lang)} ${n === 1 ? singular : pluralForm} to go`
  return n === 1 ? `falta 1 ${singular}` : `faltam ${formatInt(n)} ${pluralForm}`
}

// "{lidos} de {total}" · "{read} of {total}"
export function deOf(a, b, lang = 'pt') {
  return `${formatInt(a, lang)} ${lang === 'en' ? 'of' : 'de'} ${formatInt(b, lang)}`
}

const MONTHS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const monthsOf = lang => MONTHS[lang] ?? MONTHS.pt

export function monthName(date, lang = 'pt') {
  return monthsOf(lang)[date.getMonth()]
}

// "mar/25" (G6) · "Mar/25"
export function monthYearShort(iso, lang = 'pt') {
  const d = new Date(iso)
  return `${monthsOf(lang)[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(-2)}`
}

// "28 de agosto" (G8) · "28 ago 2025" (G10) · "março de 2029" (G2);
// em inglês "August 28" · "Aug 28 2025" · "March 2029".
export function dayMonthLong(iso, lang = 'pt') {
  const d = new Date(iso)
  return lang === 'en' ? `${monthsOf(lang)[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} de ${monthsOf(lang)[d.getMonth()]}`
}
export function dayMonthYearShort(iso, lang = 'pt') {
  const d = new Date(iso)
  const mon = monthsOf(lang)[d.getMonth()].slice(0, 3)
  return lang === 'en' ? `${mon} ${d.getDate()} ${d.getFullYear()}` : `${d.getDate()} ${mon} ${d.getFullYear()}`
}
// "8 nov" · "Nov 8" — o dia e o mês abreviado (datas dos cartões).
export function dayMonthShort(date, lang = 'pt') {
  const mon = monthsOf(lang)[date.getMonth()].slice(0, 3)
  return lang === 'en' ? `${mon} ${date.getDate()}` : `${date.getDate()} ${mon}`
}
export function monthYearLong(date, lang = 'pt') {
  return lang === 'en' ? `${monthsOf(lang)[date.getMonth()]} ${date.getFullYear()}` : `${monthsOf(lang)[date.getMonth()]} de ${date.getFullYear()}`
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
