// ajustarMath.js — "Ajustar meu plano" (handoff-meu-plano-47, A1–A4,
// HANDOFF §12), puro e testável: o RASCUNHO (mesmos campos que o app já
// grava: passo ligado/desligado, minutos, modo, dias de cada passo, as
// três opções do cronômetro — nenhum campo novo), os minutos de cada dia
// da semana a partir dele, o total semanal, "{n} dias com algo", o resumo
// de cada passo com a escrita dos dias ("ter, qui, sáb", "seg a sáb",
// "todos os dias"), e a comparação rascunho × salvo (quantas mudanças e a
// frase do rodapé). Nada é gravado antes de "Salvar plano".
//
// Regras de 35c que continuam (HANDOFF §12): pelo menos um entre Leitura
// e Estudo ligado; minutos de 5 a 60, de 5 em 5; dias independentes por
// passo; desmarcar o último dia de um passo desliga o passo.
import { STEP_KEYS, stepsScheduledForWeekday, markedWeekdayUnion } from '../routine/stepDaysMath.js'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'
import { resolveMinutes, stepName, stepNameLower, offWord } from './meuPlanoMath.js'

export const MIN_MINUTES = 5
export const MAX_MINUTES = 60
export const MINUTES_STEP = 5
export const CLOCK_KEYS = ['showOnReading', 'warnAtZero', 'askToContinue']

export function clampMinutes(n) {
  const rounded = Math.round((n ?? MIN_MINUTES) / MINUTES_STEP) * MINUTES_STEP
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, rounded))
}

// O plano como a tela vê (salvo ou rascunho). Fontes: routine_modules,
// *_minutes (+ fallback do plano), jc_prayer_method/jc_reflection_method,
// step_days, reading_clock_prefs.
export function buildPlan({ routineModules, stepMinutes, plan, prayerMethod, reflectionMethod, stepDays, clockPrefs }) {
  const enabledSet = new Set(routineModules ?? [])
  const m = resolveMinutes(stepMinutes, plan)
  const enabled = {}
  const minutes = {}
  for (const k of STEP_KEYS) {
    enabled[k] = enabledSet.has(k)
    minutes[k] = clampMinutes(m[k])
  }
  return {
    enabled, minutes,
    prayerMethod: prayerMethod === 'free' ? 'free' : 'acts',
    reflectionMethod: reflectionMethod === 'free' ? 'free' : 'questions',
    stepDays: Object.fromEntries(STEP_KEYS.map(k => [k, [...(stepDays?.[k] ?? [false, false, false, false, false, false, false])]])),
    clock: {
      showOnReading: clockPrefs?.showOnReading !== false,
      warnAtZero: clockPrefs?.warnAtZero !== false,
      askToContinue: clockPrefs?.askToContinue !== false,
    },
  }
}

export function activeSteps(plan) {
  return STEP_KEYS.filter(k => plan.enabled[k])
}

// Passos que entram nos minutos do cartão preto: ligados e, no caso do
// Estudo, só com estudo ativo (HANDOFF §12.6).
function countedSteps(plan, hasActiveStudy) {
  return activeSteps(plan).filter(k => k !== 'study' || hasActiveStudy)
}

// Minutos de cada dia da semana (segunda = 0) a partir do plano.
export function weekMinutes(plan, hasActiveStudy = true) {
  const steps = countedSteps(plan, hasActiveStudy)
  return Array.from({ length: 7 }, (_, i) => stepsScheduledForWeekday(plan.stepDays, steps, i).reduce((s, k) => s + plan.minutes[k], 0))
}

export function daysWithSomethingCount(plan) {
  return markedWeekdayUnion(plan.stepDays, activeSteps(plan)).filter(Boolean).length
}

// "2 h 45" · "45 min" · "3 h"
export function weekTotalLabel(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

// Altura da barra: minutos ÷ 40 × 48px, limitada a 72px.
export function barHeight(minutes) {
  return Math.min(72, Math.round((minutes / 40) * 48))
}

// "ter, qui, sáb" · "seg a sáb" (três ou mais seguidos) · "todos os dias"
export function daysLabel(days) {
  const abbr = WEEKDAY_ABBR3.pt.map(a => a.toLowerCase())
  const idx = days.map((v, i) => (v ? i : -1)).filter(i => i >= 0)
  if (idx.length === 0) return ''
  if (idx.length === 7) return 'todos os dias'
  const parts = []
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++
    if (j - i >= 2) parts.push(`${abbr[idx[i]]} a ${abbr[idx[j]]}`)
    else for (let k = i; k <= j; k++) parts.push(abbr[idx[k]])
    i = j + 1
  }
  return parts.join(', ')
}

// Resumo da linha de cada passo (A1). ctx: { readingPassage, study:
// { title, dayN, dayTotal } | null }.
export function stepSummary(key, plan, ctx = {}) {
  if (!plan.enabled[key]) return `${offWord(key)} · não entra na rotina nem no total`
  const dias = daysLabel(plan.stepDays[key])
  if (key === 'prayer') return `${plan.prayerMethod === 'free' ? 'Livre' : 'ACTS'} · ${dias}`
  if (key === 'reflection') return `${plan.reflectionMethod === 'free' ? 'Livre' : 'Com perguntas'} · ${dias}`
  if (key === 'reading') return ctx.readingPassage ? `${ctx.readingPassage} · ${dias}` : dias
  if (!ctx.study) return 'Nenhum estudo em andamento'
  return `${ctx.study.title}, dia ${ctx.study.dayN} de ${ctx.study.dayTotal} · ${dias}`
}

// "Aparece na leitura · avisa ao zerar" · "Desligado"
export function clockSummary(clock) {
  const parts = []
  if (clock.showOnReading) parts.push('aparece na leitura')
  if (clock.warnAtZero) parts.push('avisa ao zerar')
  if (clock.askToContinue) parts.push('pergunta se quero continuar')
  if (parts.length === 0) return 'Desligado'
  const text = parts.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Pode desligar? Pelo menos um entre Leitura e Estudo fica ligado.
export const LAST_BIBLE_STEP_MESSAGE = 'Seu plano precisa de leitura ou de estudo. Ligue o outro antes de desligar este.'
export function canDisable(plan, key) {
  if (key !== 'reading' && key !== 'study') return true
  const other = key === 'reading' ? 'study' : 'reading'
  return plan.enabled[other]
}

// ── Atualizadores do rascunho (devolvem um plano novo) ─────────────────
export function withEnabled(plan, key, on) {
  return { ...plan, enabled: { ...plan.enabled, [key]: on } }
}
export function withMinutes(plan, key, minutes) {
  return { ...plan, minutes: { ...plan.minutes, [key]: clampMinutes(minutes) } }
}
export function withMethod(plan, key, method) {
  if (key === 'prayer') return { ...plan, prayerMethod: method === 'free' ? 'free' : 'acts' }
  return { ...plan, reflectionMethod: method === 'free' ? 'free' : 'questions' }
}
// Desmarcar o último dia desliga o passo (HANDOFF §12.3).
export function withDayToggled(plan, key, dayIdx) {
  const days = [...plan.stepDays[key]]
  days[dayIdx] = !days[dayIdx]
  const next = { ...plan, stepDays: { ...plan.stepDays, [key]: days } }
  if (!days.some(Boolean)) return { plan: withEnabled(next, key, false), disabled: true }
  return { plan: next, disabled: false }
}
export function withClock(plan, key, on) {
  return { ...plan, clock: { ...plan.clock, [key]: on } }
}

// ── Rascunho × salvo ───────────────────────────────────────────────────
// Lista de mudanças, cada uma com uma frase curta em minúsculas (as duas
// primeiras vão no rodapé): "leitura de 20 min", "sábado sem leitura",
// "reflexão desligada", "oração livre", "cronômetro".
export function diffPlans(saved, draft) {
  const changes = []
  for (const k of STEP_KEYS) {
    if (saved.enabled[k] !== draft.enabled[k]) {
      changes.push({ field: 'enabled', key: k, text: `${stepNameLower(k)} ${draft.enabled[k] ? (k === 'study' ? 'ligado' : 'ligada') : offWord(k).toLowerCase()}` })
    }
  }
  for (const k of STEP_KEYS) {
    if (saved.minutes[k] !== draft.minutes[k]) changes.push({ field: 'minutes', key: k, text: `${stepNameLower(k)} de ${draft.minutes[k]} min` })
  }
  if (saved.prayerMethod !== draft.prayerMethod) changes.push({ field: 'prayerMethod', text: draft.prayerMethod === 'free' ? 'oração livre' : 'oração com ACTS' })
  if (saved.reflectionMethod !== draft.reflectionMethod) changes.push({ field: 'reflectionMethod', text: draft.reflectionMethod === 'free' ? 'reflexão livre' : 'reflexão com perguntas' })
  for (const k of STEP_KEYS) {
    for (let i = 0; i < 7; i++) {
      if (saved.stepDays[k][i] !== draft.stepDays[k][i]) {
        changes.push({ field: 'stepDays', key: k, day: i, text: `${WEEKDAY_FULL.pt[i]} ${draft.stepDays[k][i] ? 'com' : 'sem'} ${stepNameLower(k)}` })
      }
    }
  }
  if (CLOCK_KEYS.some(c => saved.clock[c] !== draft.clock[c])) changes.push({ field: 'clock', text: 'cronômetro' })
  return changes
}

// "2 mudanças · leitura de 20 min, sábado sem leitura" · "4 mudanças"
// · "1 mudança · reflexão desligada"
export function changesLine(changes) {
  const n = changes.length
  if (n === 0) return ''
  const head = `${n} ${n === 1 ? 'mudança' : 'mudanças'}`
  if (n > 2) return head
  return `${head} · ${changes.map(c => c.text).join(', ')}`
}

// O rascunho viaja pra 35i/35j/lembrete e volta: se o salvo mudou lá
// fora (ex.: dias da leitura em 35i), o campo volta com o valor novo; o
// que só mudou no rascunho fica.
export function reconcileDraft(draft, oldSaved, newSaved) {
  const next = { ...draft, enabled: { ...draft.enabled }, minutes: { ...draft.minutes }, stepDays: { ...draft.stepDays }, clock: { ...draft.clock } }
  for (const k of STEP_KEYS) {
    if (oldSaved.enabled[k] !== newSaved.enabled[k]) next.enabled[k] = newSaved.enabled[k]
    if (oldSaved.minutes[k] !== newSaved.minutes[k]) next.minutes[k] = newSaved.minutes[k]
    if (JSON.stringify(oldSaved.stepDays[k]) !== JSON.stringify(newSaved.stepDays[k])) next.stepDays[k] = [...newSaved.stepDays[k]]
  }
  if (oldSaved.prayerMethod !== newSaved.prayerMethod) next.prayerMethod = newSaved.prayerMethod
  if (oldSaved.reflectionMethod !== newSaved.reflectionMethod) next.reflectionMethod = newSaved.reflectionMethod
  for (const c of CLOCK_KEYS) if (oldSaved.clock[c] !== newSaved.clock[c]) next.clock[c] = newSaved.clock[c]
  return next
}

// Rodapé do cartão preto: "{total} por semana · a Bíblia termina em
// {mês} de {ano}" — sem Leitura ligada, só a primeira metade; sem dia
// marcado, "Nenhum dia marcado".
export function weekFooter(plan, hasActiveStudy, finishLabel) {
  const mins = weekMinutes(plan, hasActiveStudy)
  const total = mins.reduce((s, m) => s + m, 0)
  if (daysWithSomethingCount(plan) === 0) return 'Nenhum dia marcado'
  const left = `${weekTotalLabel(total)} por semana`
  return plan.enabled.reading && finishLabel ? `${left} · a Bíblia termina em ${finishLabel}` : left
}

export { stepName }
