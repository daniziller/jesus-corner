// seuPlanoMath.js — a tela "Seu plano" (handoff-meu-plano-47, P6, HANDOFF
// §9), puro e testável: a semana por extenso (sete linhas, segunda a
// domingo, com os chips de cada dia e o estado de cada um), "{n} dias com
// algo", a frase do ritmo e o título da leitura. Mesmas regras de dias por
// trilha e de meta semanal do pacote 35 (stepDaysMath.js).
import { STEP_KEYS, stepsScheduledForWeekday, stepSatisfiedDays, countMarkedWeekdays } from '../routine/stepDaysMath.js'
import { mondayOf } from '../routine/routineStreak.js'
import { dateKey } from '../utils/dateKey.js'
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath.js'
import { tr, trN } from '../i18n/tr.js'

const tx = (lang, key, vars) => tr(lang, `planoTx.${key}`, vars)
const txN = (lang, base, n, vars) => trN(lang, `planoTx.${base}`, n, vars)
const localeOf = lang => (lang === 'en' ? 'en-US' : 'pt-BR')

// "6 dias com algo" · "1 dia com algo"
export function daysWithSomething(n, lang = 'pt') {
  return txN(lang, 'daysWithSomething', n)
}

export function countDaysWithSomething(stepDays, routineModules) {
  const enabled = new Set(routineModules ?? [])
  return stepDays ? countMarkedWeekdays(stepDays, STEP_KEYS.filter(k => enabled.has(k))) : 0
}

// As sete linhas da semana atual (segunda a domingo). Cada linha:
//   { idx, key, dayNumber, abbr, isToday, state, chips, minutes, fulfilled }
//   state: 'today' | 'done' | 'past' | 'upcoming' | 'rest'
//   chips: [{ key, state: 'done' | 'now' | 'todo' }] na ordem do dia
// "feito" = todos os passos do dia satisfeitos (com reposição, como a
// meta semanal já conta); dia passado não cumprido fica com os chips
// feitos em marrom e o total de minutos — sem vermelho, sem "perdido".
export function computeWeekRows({ stepDays, routineModules, minutes, dailyRoutine, today = new Date(), lang = 'pt' }) {
  const enabled = new Set(routineModules ?? [])
  const active = STEP_KEYS.filter(k => enabled.has(k))
  const monday = mondayOf(today)
  const todayKey = dateKey(today)
  const satisfied = {}
  for (const k of active) satisfied[k] = stepDays ? stepSatisfiedDays(stepDays[k], dailyRoutine, k, monday, today).satisfied : new Array(7).fill(false)
  const rows = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const key = dateKey(d)
    const isToday = key === todayKey
    const scheduled = stepDays ? stepsScheduledForWeekday(stepDays, active, i) : []
    const entry = dailyRoutine?.[key] ?? {}
    let nowAssigned = false
    const chips = scheduled.map(k => {
      const done = satisfied[k][i] || !!entry[k]
      let state = 'todo'
      if (done) state = 'done'
      else if (isToday && !nowAssigned) { state = 'now'; nowAssigned = true }
      return { key: k, state }
    })
    const fulfilled = scheduled.length > 0 && chips.every(c => c.state === 'done')
    let state = 'upcoming'
    if (scheduled.length === 0) state = 'rest'
    else if (fulfilled) state = 'done'
    else if (isToday) state = 'today'
    else if (key < todayKey) state = 'past'
    rows.push({
      idx: i, key, dayNumber: d.getDate(), abbr: (WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt)[i].toUpperCase(), isToday, state, chips,
      minutes: scheduled.reduce((s, k) => s + (minutes[k] ?? 0), 0), fulfilled,
    })
  }
  return rows
}

// "Nesse ritmo: um capítulo por dia de leitura, 3 dias por semana"
export function paceSentence(chaptersPerDay, useLearnedPace, readingDays, lang = 'pt') {
  const days = txN(lang, 'daysPerWeek', readingDays)
  if (!useLearnedPace || !chaptersPerDay) return tx(lang, 'paceOne', { days })
  const n = Math.round(chaptersPerDay * 10) / 10
  const label = n.toLocaleString(localeOf(lang), { maximumFractionDigits: 1 })
  return tx(lang, n === 1 ? 'paceAboutOne' : 'paceAboutMany', { n: label, days })
}

// "Gênesis 41 de 50" e "Pentateuco · 40 de 1.189 capítulos lidos"
export function readingHeadline(book, nextChapter, bookChapters, lang = 'pt') {
  return `${book} ${tx(lang, 'passageOf', { passage: nextChapter, n: bookChapters })}`
}
export function readingSubline(sectionName, chaptersRead, totalChapters, lang = 'pt') {
  return tx(lang, 'chaptersRead', { section: sectionName, read: chaptersRead.toLocaleString(localeOf(lang)), total: totalChapters.toLocaleString(localeOf(lang)) })
}

// "6:30 nos dias combinados" — hora sem zero à esquerda, minuto com.
export function reminderLine(reminder, lang = 'pt') {
  if (!reminder) return null
  return tx(lang, 'reminderAt', { time: `${reminder.hour ?? 7}:${String(reminder.minute ?? 0).padStart(2, '0')}` })
}
