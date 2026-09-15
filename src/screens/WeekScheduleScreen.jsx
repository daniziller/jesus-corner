// WeekScheduleScreen.jsx — "Esta semana" por dentro (pedido dela,
// 2026-09-15): tocar no cartão "ESTA SEMANA" da Home (Bloco 5,
// HomeScreen.jsx) abre esta tela, um dia por cartão (segunda a domingo)
// com a programação de cada passo (Oração/Leitura/Estudo/Reflexão) e se
// foi cumprido ou ainda falta. Não inventa estado novo: reaproveita
// stepSatisfiedDays/stepsScheduledForWeekday (stepDaysMath.js), a MESMA
// lógica que já decide a grade de quadradinhos do cartão — inclusive
// reposição (um passo repost num dia de folga conta como feito no dia
// original que faltou, não só no dia em que foi feito de verdade).
//
// Dia sem nada agendado = "dia livre" (não é um passo perdido, é
// descanso — mesmo critério de sempre). Passo agendado e não feito nunca
// vira um estado de "perdido"/vermelho, seja no passado ou no futuro —
// mesma regra de "um dia perdido não zera nada" que rege o resto do app
// (ver stepDaysMath.js, computeWeekPillStates).
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { DEFAULT_ROUTINE_MODULES, mondayOf } from '../routine/routineStreak'
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath'
import { STEP_ORDER } from '../routine/planTodayRows'
import { getStepDays, stepsScheduledForWeekday, stepSatisfiedDays, computeStepWeekGoal } from '../routine/stepDaysStore'
import { dateKey } from '../utils/dateKey'

const FONT = 'var(--font-bento)'

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

function formatDayShort(date, lang) {
  const raw = date.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short' })
  return raw.replace('.', '')
}

export default function WeekScheduleScreen({ session, onBack }) {
  const { lang, routineModules, dailyRoutine } = session
  const L = (k, vars) => t(`weekSchedule.${k}`, vars, lang)
  const stepTitle = k => t(`home.routine${cap(k)}`, undefined, lang)
  const weekdayFull = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt

  const [stepDays, setStepDays] = useState(null)
  useEffect(() => { getStepDays().then(setStepDays).catch(() => {}) }, [])

  if (!stepDays) return <div style={styles.screen} />

  const activeSteps = STEP_ORDER.filter(k => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(k))
  const today = new Date()
  const monday = mondayOf(today)
  const todayIdx = (today.getDay() + 6) % 7

  const satisfiedByStep = {}
  for (const step of activeSteps) {
    satisfiedByStep[step] = stepSatisfiedDays(stepDays[step], dailyRoutine, step, monday, today).satisfied
  }
  const weekGoal = computeStepWeekGoal(dailyRoutine, stepDays, activeSteps, today)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const scheduled = stepsScheduledForWeekday(stepDays, activeSteps, i)
    return {
      key: dateKey(d), date: d, weekdayIdx: i, isToday: i === todayIdx,
      steps: scheduled.map(step => ({ step, done: !!satisfiedByStep[step]?.[i] })),
    }
  })

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button type="button" style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={17} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.title}>{L('title')}</p>
          <p style={styles.subtitle}>{L('subtitle', { done: weekGoal.doneCount, total: weekGoal.markedCount })}</p>
        </div>
      </div>

      <div style={styles.body}>
        {days.map(day => (
          <div key={day.key} style={{ ...styles.dayCard, ...(day.isToday ? styles.dayCardToday : {}) }}>
            <div style={styles.dayHead}>
              <p style={styles.dayName}>
                {weekdayFull[day.weekdayIdx]}
                {day.isToday && <span style={styles.todayTag}>{L('todayTag')}</span>}
              </p>
              <p style={styles.dayDate}>{formatDayShort(day.date, lang)}</p>
            </div>

            {day.steps.length === 0 ? (
              <p style={styles.restNote}>{L('restDay')}</p>
            ) : (
              <div style={styles.stepsList}>
                {day.steps.map(s => (
                  <div key={s.step} style={styles.stepRow}>
                    <span style={{ ...styles.stepDotBase, ...(s.done ? styles.stepDotDone : styles.stepDotPending) }}>
                      {s.done && <AppIcon name="Check" size={12} strokeWidth={3} color="var(--bento-sand)" />}
                    </span>
                    <span style={{ ...styles.stepName, ...(s.done ? styles.stepNameDone : null) }}>{stepTitle(s.step)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', minHeight: '100%', background: 'var(--bento-bg)', boxSizing: 'border-box', fontFamily: FONT, overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 14, padding: '22px 20px 18px' },
  backBtn: { width: 38, height: 38, borderRadius: 13, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  title: { fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', margin: '4px 0 0' },
  body: { padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560, margin: '0 auto', boxSizing: 'border-box' },
  dayCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  dayCardToday: { boxShadow: '0 0 0 1.5px var(--bento-accent) inset' },
  dayHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  dayName: { fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
  todayTag: { fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  dayDate: { fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },
  restNote: { fontSize: 13, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  stepsList: { display: 'flex', flexDirection: 'column', gap: 9 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 10 },
  stepDotBase: { width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  stepDotDone: { background: 'var(--bento-sand-icon)' },
  stepDotPending: { border: '2px solid var(--bento-divider)' },
  stepName: { fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)' },
  stepNameDone: { color: 'var(--bento-t3)' },
}
