// onboardingAnswers.js — respostas do onboarding de 7 telas (quadros 15a–15f)
// e o que cada uma muda no app.
//
// As respostas ficam em localStorage porque, nesse ponto, ainda não existe
// conta nem linha de convidado (a linha nasce em App.startGuestReading, ao
// tocar "Ler Gênesis 1 agora" no 15e). Plano, meta semanal e passos da
// rotina vão pra linha de dados (userDataStore) na hora de começar; o
// horário do lembrete espera uma conta de verdade (a inscrição push é por
// usuário — ver pushStore.js), então fica pendente aqui até o primeiro login.
import { PLANS } from '../data/bibleBlocks'

const ANSWERS_KEY = 'jc_onboarding_answers'
const REMINDER_KEY = 'jc_pending_reminder'

// 15a — histórico com a Bíblia.
export const HISTORY = ['never', 'stopped', 'done']
// 15b — o que faz parar (multi).
export const PAINS = ['understand', 'rhythm', 'time', 'forget', 'alone']
// 15f — tempo de cada passo, três controles independentes (5 em 5 min).
// Padrões do quadro: Oração 10 · Leitura 15 (nunca zera — é a única que
// afeta o plano) · Reflexão 5.
export const STEP_MINUTES_DEFAULT = { prayer: 10, reading: 15, reflection: 5 }
export const STEP_MINUTES_STEP = 5
export const STEP_MINUTES_MIN = { prayer: 0, reading: 5, reflection: 0 }
export const STEP_MINUTES_MAX = { prayer: 60, reading: 60, reflection: 60 }
// 15c — hora do lembrete.
export const REMINDERS = {
  morning: { hour: 6, minute: 30 },
  midday: { hour: 12, minute: 30 },
  night: { hour: 21, minute: 30 },
}
// 15d — dias por semana.
export const WEEK_DAYS = [3, 4, 5, 6, 7]

export const TOTAL_CHAPTERS = 1189

// Qual demonstração aparece depois do 15b (ADENDO: "não entendo" → 14c,
// "perco o ritmo" → 14e, "leio sozinho" → 14f, outras → 14b). Com mais de
// uma marcada, vale a primeira nessa ordem de prioridade.
export function demoFor(pains) {
  if (pains.includes('understand')) return 'ask'
  if (pains.includes('rhythm')) return 'week'
  if (pains.includes('alone')) return 'group'
  return 'reading'
}

// Ritmo de leitura (árvore de sessões em SESSIONS_BY_PLAN) que cabe no
// tempo de leitura escolhido no 15f: o maior plano cujo readingMinutes não
// passa do alvo. Abaixo de 12 min cai no 'free' (1 capítulo por sessão).
export function planIdFor(readingMinutes) {
  const timed = PLANS.filter(p => p.readingMinutes).sort((a, b) => a.readingMinutes - b.readingMinutes)
  let chosen = null
  for (const p of timed) if (p.readingMinutes <= readingMinutes) chosen = p
  return chosen ? chosen.id : 'free'
}

// Estimativa de conclusão: capítulos por dia do ritmo × dias por semana.
export function estimateCompletion(planId, daysPerWeek, today = new Date()) {
  const plan = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  const perDay = plan.avgChapters || 1
  const weeks = Math.ceil(TOTAL_CHAPTERS / (perDay * daysPerWeek))
  const months = Math.max(1, Math.round((weeks * 7) / 30.44))
  const end = new Date(today)
  end.setDate(end.getDate() + weeks * 7)
  return { perDay, weeks, months, years: Math.floor(months / 12), restMonths: months % 12, endDate: end }
}

export function saveOnboardingAnswers(answers) {
  try { localStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...answers, savedAt: new Date().toISOString() })) } catch { /* ignora */ }
}

export function getOnboardingAnswers() {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Lembrete escolhido no 15c — aplicado na primeira sessão de verdade (ver
// applyPendingReminder em App.jsx), porque a inscrição push exige usuário.
export function savePendingReminder(reminder) {
  try {
    if (reminder) localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder))
    else localStorage.removeItem(REMINDER_KEY)
  } catch { /* ignora */ }
}

export function getPendingReminder() {
  try {
    const raw = localStorage.getItem(REMINDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingReminder() {
  try { localStorage.removeItem(REMINDER_KEY) } catch { /* ignora */ }
}

export function formatClock(hour, minute) {
  return `${hour}:${String(minute).padStart(2, '0')}`
}
