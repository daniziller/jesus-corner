// meuPlanoMath.js — o estado da aba Meu Plano (handoff-meu-plano-47,
// HANDOFF §3–§8), puro e testável: quais passos entram hoje, em que estado
// cada um está, o rótulo do botão único, os textos da barra, o cartão
// "Amanhã" e as frases com plural. Nada aqui lê rede nem localStorage.
// Testes em scripts/test-meu-plano.mjs.
//
// Regras (HANDOFF §1): só os passos de hoje (ligados em Ajustar E que caem
// hoje); ordem Oração → Leitura → Estudo → Reflexão; um botão só; nada de
// cobrança. P1–P5 são a mesma rota: o estado sai dos dados, nunca de flag.
import { STEP_KEYS, stepsScheduledForWeekday, nextScheduledWeekday, markedWeekdayUnion } from '../routine/stepDaysMath.js'
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'

export const STEP_ORDER = STEP_KEYS // ['prayer', 'reading', 'study', 'reflection']

export const STEP_NAME = { prayer: 'Oração', reading: 'Leitura', study: 'Estudo', reflection: 'Reflexão' }
// Artigo e concordância: Oração/Leitura/Reflexão são femininas, Estudo é
// masculino ("feita"/"feito", "a oração"/"o estudo").
const STEP_FEM = { prayer: true, reading: true, study: false, reflection: true }
const STEP_ARTICLE = { prayer: 'a', reading: 'a', study: 'o', reflection: 'a' }

export function stepName(key) { return STEP_NAME[key] ?? key }
export function stepNameLower(key) { return stepName(key).toLowerCase() }
export function doneWord(key) { return STEP_FEM[key] ? 'feita' : 'feito' }
export function offWord(key) { return STEP_FEM[key] ? 'Desligada' : 'Desligado' }

// "6:42" — 24 h, sem zero à esquerda na hora (HANDOFF §10).
export function formatHour(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function minLabel(n) { return `${n} min` }

// Minutos de cada passo (5–60) a partir das colunas *_minutes com os
// fallbacks que o app já usa (plano fixo / 15 pro estudo / 5 reflexão).
export function resolveMinutes(stepMinutes, plan) {
  return {
    prayer: stepMinutes?.prayer ?? plan?.prayerMinutes ?? 10,
    reading: stepMinutes?.reading ?? plan?.readingMinutes ?? 15,
    study: stepMinutes?.study ?? 15,
    reflection: stepMinutes?.reflection ?? plan?.reflectionMinutes ?? 5,
  }
}

// Os passos de hoje, na ordem do dia: ligados em Ajustar e marcados pro
// dia da semana. `todayIdx`: segunda = 0.
export function todaysSteps(routineModules, stepDays, todayIdx) {
  const enabled = new Set(routineModules ?? [])
  const active = STEP_ORDER.filter(k => enabled.has(k))
  return stepDays ? stepsScheduledForWeekday(stepDays, active, todayIdx) : []
}

// O estado de hoje. `dayEntry` = daily_routine[hoje]: { prayer: true,
// prayerAt: ISO, prayerProgress: { startedAt, elapsedSeconds }, ... }.
// `extraElapsed` = segundos já gravados hoje por passo fora do Progress
// (a leitura registra em session_seconds, não no relógio do App).
export function computeMeuPlano({ routineModules, stepDays, minutes, dayEntry, todayIdx, extraElapsed = {} }) {
  const keys = todaysSteps(routineModules, stepDays, todayIdx)
  const entry = dayEntry ?? {}
  let nowAssigned = false
  const steps = keys.map((key, i) => {
    const done = !!entry[key]
    const progress = entry[`${key}Progress`] ?? null
    const elapsedSeconds = Math.max(progress?.elapsedSeconds ?? 0, extraElapsed[key] ?? 0)
    let status = 'upcoming'
    if (done) status = 'done'
    else if (!nowAssigned) { status = 'now'; nowAssigned = true }
    return {
      key, index: i, minutes: minutes[key] ?? 0, status,
      doneAt: done ? (entry[`${key}At`] ?? null) : null,
      startedAt: progress?.startedAt ?? null,
      elapsedSeconds,
      interrupted: !done && !!progress?.startedAt,
    }
  })
  const total = steps.length
  const doneCount = steps.filter(s => s.status === 'done').length
  const totalMinutes = steps.reduce((s, x) => s + x.minutes, 0)
  const remainingMinutes = steps.filter(s => s.status !== 'done').reduce((s, x) => s + x.minutes, 0)
  const now = steps.find(s => s.status === 'now') ?? null
  const kind = total === 0 ? 'rest' : doneCount === 0 ? 'before' : doneCount === total ? 'done' : 'during'
  return { kind, steps, total, doneCount, totalMinutes, remainingMinutes, now }
}

// "1 de 3 passos" · "1 de 1 passo"
export function stepsCountText(doneCount, total) {
  return `${doneCount} de ${total} ${total === 1 ? 'passo' : 'passos'}`
}

// Texto da direita da barra (HANDOFF §3.3).
export function barRightText(state) {
  if (state.kind === 'before') return `${state.totalMinutes} min no total`
  if (state.kind === 'done') return `${state.totalMinutes} min com Deus hoje`
  return `faltam ${state.remainingMinutes} min`
}

// Rótulo do botão único (HANDOFF §3.4).
export function buttonLabel(state) {
  if (!state.now) return null
  if (state.doneCount === 0 && !state.now.interrupted) return 'Começar meu plano'
  const key = state.now.key
  const verb = state.now.interrupted ? 'Continuar' : 'Começar'
  return `${verb} ${STEP_ARTICLE[key]} ${stepNameLower(key)}`
}

export function nowCardLabel(state) {
  if (!state.now) return ''
  return `AGORA · PASSO ${state.now.index + 1} DE ${state.total}`
}

// Minutos no topo do cartão preto: o que falta quando o relógio já correu
// (HANDOFF §10), senão os minutos do passo.
export function nowCardMinutes(step) {
  if (step.interrupted && step.elapsedSeconds > 0) {
    return Math.max(1, step.minutes - Math.floor(step.elapsedSeconds / 60))
  }
  return step.minutes
}

// aria-label do cartão preto: "Agora, passo 2 de 3, Leitura, 15 minutos".
export function nowCardAria(state) {
  if (!state.now) return ''
  const m = nowCardMinutes(state.now)
  return `Agora, passo ${state.now.index + 1} de ${state.total}, ${stepName(state.now.key)}, ${m} ${m === 1 ? 'minuto' : 'minutos'}`
}

// Linha de um passo feito: "feita às 6:42" ou "Gênesis 41 · feita às 7:01".
export function doneLine(step, passage) {
  const at = step.doneAt ? `${doneWord(step.key)} às ${formatHour(step.doneAt)}` : doneWord(step.key)
  return passage ? `${passage} · ${at}` : at
}

// Descrição curta (minúsculas) do passo por vir e do passo de agora.
// ctx: { prayerMethod: 'acts'|'free', reflectionMethod: 'questions'|'free',
//        readingPassage: 'Gênesis 41', study: { title, dayN, dayTotal,
//        reference } | null, studyToday: bool }
export function stepDescription(key, status, ctx) {
  const now = status === 'now'
  if (key === 'prayer') return ctx.prayerMethod === 'free' ? 'livre' : 'ACTS · quatro etapas guiadas'
  if (key === 'reading') return ctx.readingPassage ? `${ctx.readingPassage} — onde você parou` : ''
  if (key === 'study') {
    const s = ctx.study
    if (!s) return ''
    const base = `${s.title} · dia ${s.dayN} de ${s.dayTotal}`
    return now && s.reference ? `${base} · ${s.reference}` : base
  }
  // reflection
  if (ctx.studyToday) return 'a pergunta do estudo'
  if (ctx.reflectionMethod === 'free') return 'folha em branco'
  return now ? 'Três perguntas sobre o texto' : 'três perguntas sobre o texto'
}

// "Oração, estudo e reflexão" — só o primeiro em maiúscula.
export function stepsSentence(keys) {
  const names = keys.map(stepNameLower)
  if (names.length === 0) return ''
  const first = names[0].charAt(0).toUpperCase() + names[0].slice(1)
  if (names.length === 1) return first
  const rest = names.slice(1)
  return `${[first, ...rest.slice(0, -1)].join(', ')} e ${rest[rest.length - 1]}`
}

// Cartão "Amanhã" (HANDOFF §3.5): o próximo dia com algo marcado a partir
// de amanhã; rótulo "AMANHÃ · DIA" ou "PRÓXIMO DIA · DIA". Null quando
// nenhum dia tem nada.
export function tomorrowCard({ routineModules, stepDays, minutes, todayIdx }) {
  const enabled = new Set(routineModules ?? [])
  const active = STEP_ORDER.filter(k => enabled.has(k))
  if (!stepDays) return null
  const union = markedWeekdayUnion(stepDays, active)
  const idx = nextScheduledWeekday(union, todayIdx)
  if (idx == null) return null
  const keys = stepsScheduledForWeekday(stepDays, active, idx)
  const total = keys.reduce((s, k) => s + (minutes[k] ?? 0), 0)
  const isTomorrow = idx === (todayIdx + 1) % 7
  const dayName = WEEKDAY_FULL.pt[idx].toUpperCase()
  return {
    label: `${isTomorrow ? 'AMANHÃ' : 'PRÓXIMO DIA'} · ${dayName}`,
    text: `${stepsSentence(keys)} · ${total} min`,
    weekdayIdx: idx,
  }
}

// "3 leituras por semana · termina em março de 2029"
export function seuPlanoLine(readingDaysCount, finishLabel) {
  const n = readingDaysCount
  const left = `${n} ${n === 1 ? 'leitura' : 'leituras'} por semana`
  return finishLabel ? `${left} · termina em ${finishLabel}` : left
}

// "1 salvo · 2 concluídos"
export function studiesLine(saved, completed) {
  return `${saved} ${saved === 1 ? 'salvo' : 'salvos'} · ${completed} ${completed === 1 ? 'concluído' : 'concluídos'}`
}

// "Terça, 2 de setembro" → nome do dia pra "{Dia} já conta..." (P3).
export function weekdayCapitalized(idx) {
  const n = WEEKDAY_FULL.pt[idx]
  return n.charAt(0).toUpperCase() + n.slice(1)
}

// Número por extenso até dez (P3: "Você fez os três passos.").
const NUMBER_WORDS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
export function doneTitle(total) {
  if (total === 1) return 'Você fez o passo de hoje.'
  const word = NUMBER_WORDS[total] ?? String(total)
  return `Você fez os ${word} passos.`
}

// P3: "Terça já conta para a sua semana: 2 de 6 dias." — a meta é o número
// de dias com algo marcado (computeStepWeekGoal, a regra que já existe).
export function weekCountSentence(todayIdx, feitos, meta) {
  return `${weekdayCapitalized(todayIdx)} já conta para a sua semana: ${feitos} de ${meta} ${meta === 1 ? 'dia' : 'dias'}.`
}

// P5: a data em que o estudo termina — "Volta em {d} de {mês}, quando o
// estudo terminar". Conta os dias de estudo (stepDays.study) a partir de
// hoje: hoje entra se o estudo de hoje ainda não foi feito; `remaining`
// = dias do estudo ainda não concluídos. Null sem dia de estudo marcado.
export function studyReturnDate(today, studyDays, remaining, todayStudyDone) {
  if (!studyDays?.some(Boolean) || remaining <= 0) return null
  let left = remaining
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  for (let i = 0; i < 7 * 60; i++) {
    const idx = (d.getDay() + 6) % 7
    const counts = studyDays[idx] && !(i === 0 && todayStudyDone)
    if (counts) { left--; if (left === 0) return d }
    d.setDate(d.getDate() + 1)
  }
  return null
}

// Dia de estudo (P5): estudo no caminho e leitura fora dele.
export function isStudyOnlyDay(state) {
  const keys = state.steps.map(s => s.key)
  return keys.includes('study') && !keys.includes('reading')
}
