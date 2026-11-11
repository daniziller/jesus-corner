// CartaoSuasSemanas.jsx — o cartão SUAS SEMANAS do Hoje (G1/G3, HANDOFF
// §3.2), no lugar do antigo "ESTA SEMANA": total de semanas na meta, "{feitos}
// de {meta}" desta semana, as doze cápsulas das últimas semanas, os sete
// dias da semana atual e a frase fixa. Toque no cartão → Minhas
// conquistas (G5).
//
// Tudo vem de weeksMath.js (puro): semana de segunda a domingo no fuso do
// aparelho, meta VIGENTE em cada semana (weekly_goal_history), "dia
// cumprido" = leitura feita. Nada aqui é vermelho, X ou alerta — um dia
// perdido é só um dia claro (HANDOFF §0).
import { useMemo } from 'react'
import { computeWeeksInGoal, computeWeekCapsules, computeWeekDayStates, computeCurrentWeekGoal } from '../../gamification/weeksMath'
import { WEEKDAY_LETTERS } from '../../routine/weekRings'
import { formatInt } from '../../gamification/format'

const FONT = 'var(--font-bento)'

export default function CartaoSuasSemanas({ dailyRoutine, goalHistory, weeklyGoalDays, weeklyDays, firstActivityKey, onOpen }) {
  const data = useMemo(() => {
    const today = new Date()
    return {
      total: computeWeeksInGoal(dailyRoutine, goalHistory, weeklyGoalDays, today),
      capsules: computeWeekCapsules(dailyRoutine, goalHistory, weeklyGoalDays, firstActivityKey, today, 12),
      days: computeWeekDayStates(dailyRoutine, weeklyDays, today),
      week: computeCurrentWeekGoal(dailyRoutine, goalHistory, weeklyGoalDays, today),
    }
  }, [dailyRoutine, goalHistory, weeklyGoalDays, weeklyDays, firstActivityKey])

  const letters = WEEKDAY_LETTERS.pt
  const ariaLabel = `${formatInt(data.total)} ${data.total === 1 ? 'semana' : 'semanas'} na meta, ${data.week.feitos} de ${data.week.meta} dias esta semana`

  return (
    <div style={s.card} role="button" tabIndex={0} onClick={onOpen} aria-label={ariaLabel}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
    >
      <div style={s.head}>
        <p style={s.label}>SUAS SEMANAS</p>
        <p style={s.goal}>meta: {weeklyGoalDays} {weeklyGoalDays === 1 ? 'dia' : 'dias'}</p>
      </div>

      <div style={s.numberRow}>
        <p style={s.big}>{formatInt(data.total)}</p>
        <p style={s.bigCaption}>{data.total === 1 ? 'semana' : 'semanas'}<br />na meta</p>
        <div style={s.thisWeek}>
          <p style={s.thisWeekCount}>{data.week.feitos} de {data.week.meta}</p>
          <p style={s.thisWeekLabel}>esta semana</p>
        </div>
      </div>

      <div style={s.capsules} aria-hidden="true">
        {data.capsules.map(c => {
          if (c.beforeStart) return <span key={c.mondayKey} style={s.capsule} />
          if (c.isCurrent) {
            return (
              <span key={c.mondayKey} style={{ ...s.capsule, ...s.capsuleCurrent }}>
                <span style={{ ...s.capsuleFill, height: `${Math.round(c.fill * 100)}%` }} />
              </span>
            )
          }
          return <span key={c.mondayKey} style={{ ...s.capsule, background: c.met ? 'var(--bento-ink)' : 'var(--bento-bg)' }} />
        })}
      </div>
      <div style={s.capsuleLegend}>
        <span style={s.legendLeft}>12 semanas atrás</span>
        <span style={s.legendRight}>agora</span>
      </div>

      <div style={s.days} aria-hidden="true">
        {data.days.map((d, i) => (
          <span key={d.key} style={{ ...s.day, ...s.day_[d.state] }}>{letters[i]}</span>
        ))}
      </div>

      <p style={s.note}>O número só sobe: conta <strong style={s.noteStrong}>semanas na meta</strong>, não semanas seguidas. Uma semana fraca vira uma cápsula clara — e a próxima recomeça cheia de chance.</p>
    </div>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '17px 18px 16px', cursor: 'pointer' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  goal: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', margin: 0 },
  numberRow: { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 },
  big: { fontFamily: FONT, fontSize: 54, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-3px', color: 'var(--bento-ink)', margin: 0 },
  bigCaption: { fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: 0 },
  thisWeek: { marginLeft: 'auto', textAlign: 'right' },
  thisWeekCount: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-accent)', margin: 0, lineHeight: 1.2 },
  thisWeekLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },
  capsules: { display: 'flex', gap: 5 },
  capsule: { flex: 1, minWidth: 0, height: 34, borderRadius: 99, background: 'transparent', position: 'relative', overflow: 'hidden' },
  // Laranja claro (#FCDFCF) = o tom de Evangelhos e Atos, ver index.css.
  capsuleCurrent: { background: 'var(--bloco-evangelhos-atos-tom)' },
  capsuleFill: { position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--bento-accent)' },
  capsuleLegend: { display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 14 },
  legendLeft: { fontFamily: FONT, fontSize: 10, fontWeight: 600, color: 'var(--bento-t5)' },
  legendRight: { fontFamily: FONT, fontSize: 10, fontWeight: 800, color: 'var(--bento-accent)' },
  days: { display: 'flex', gap: 5 },
  day: { flex: 1, minWidth: 0, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, boxSizing: 'border-box' },
  day_: {
    leu: { background: 'var(--bento-ink)', color: '#fff' },
    hoje: { background: 'var(--bento-accent)', color: 'var(--bento-ink)' },
    plano: { background: '#fff', boxShadow: 'inset 0 0 0 1.5px var(--bento-t6)', color: 'var(--bento-ink)' },
    fora: { background: 'transparent', color: 'var(--bento-t5)' },
    descanso: { background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--bento-bg)', color: 'var(--bento-t5)' },
  },
  note: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: '12px 0 0' },
  noteStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
}
