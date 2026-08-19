// Calendário mensal da rotina — mostra, dia a dia, quais dos 3 passos
// (oração/leitura/reflexão) foram concluídos. Extraído de HomeScreen.jsx
// pra poder ser reaproveitado também na aba Rotina (RoutineScreen.jsx), sem
// duplicar a lógica de navegação de mês/grade.
import { useState } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { isDayComplete, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { dateKey } from '../utils/dateKey'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import RoutineDayRing from './RoutineDayRing'

export default function RoutineCalendar({ dailyRoutine, lang, wrapStyle, modules = DEFAULT_ROUTINE_MODULES }) {
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay() // 0 = domingo

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i) // uma semana qualquer começando num domingo
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'narrow' }).format(d)
  })
  const monthLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' }).format(monthCursor)

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  function changeMonth(delta) {
    setMonthCursor(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d })
  }

  return (
    <div style={{ ...styles.calendarWrap, ...wrapStyle }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={styles.calendarNavBtn} onClick={() => changeMonth(-1)} aria-label="prev"><AppIcon name="ArrowLeft" size={14} /></button>
        <p style={styles.calendarMonthLabel}>{monthLabel}</p>
        <button style={styles.calendarNavBtn} onClick={() => changeMonth(1)} aria-label="next"><AppIcon name="ArrowLeft" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
      </div>
      <div style={styles.calendarGrid}>
        {weekdayLabels.map((w, i) => <span key={i} style={styles.calendarWeekday}>{w}</span>)}
        {cells.map((day, i) => {
          if (day == null) return <span key={i} />
          const dayData = (dailyRoutine ?? {})[dateKey(new Date(year, month, day))]
          const complete = isDayComplete(dayData, modules)
          return (
            <div key={i} style={styles.calendarDayCell}>
              <div style={styles.calendarDayRingWrap}>
                <RoutineDayRing modules={modules} done={dayData ?? {}} size={26} strokeWidth={2.5} />
                <span style={{ ...styles.calendarDayNum, ...(complete ? styles.calendarDayNumComplete : {}) }}>{day}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.calendarLegend}>
        {modules.includes('prayer') && <LegendDot color={ROUTINE_STEP_COLORS.prayer} label={translate('home.routinePrayer', undefined, lang)} />}
        {modules.includes('reading') && <LegendDot color={ROUTINE_STEP_COLORS.reading} label={translate('home.routineReading', undefined, lang)} />}
        {modules.includes('study') && <LegendDot color={ROUTINE_STEP_COLORS.study} label={translate('home.routineStudy', undefined, lang)} />}
        {modules.includes('reflection') && <LegendDot color={ROUTINE_STEP_COLORS.reflection} label={translate('home.routineReflection', undefined, lang)} />}
      </div>
    </div>
  )
}

export function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' }}>{label}</span>
    </span>
  )
}

// Sem card/fundo próprio de propósito — quem usa decide o wrapper (na Home
// entra dentro do card de rotina já existente com uma linha divisória por
// cima; na aba Rotina entra no próprio card de seção, ver RoutineScreen.jsx).
const styles = {
  calendarWrap:       {},
  calendarNavBtn:      { width: 26, height: 26, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  calendarMonthLabel: { fontSize: 12, fontWeight: 700, color: 'var(--bk)', textTransform: 'capitalize' },
  calendarGrid:       { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' },
  calendarWeekday:    { fontSize: 9, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', padding: '2px 0' },
  calendarDayCell:    { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' },
  calendarDayRingWrap:{ position: 'relative', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarDayNum:     { position: 'relative', fontSize: 10, fontWeight: 600, color: 'var(--g6)', borderRadius: '50%', width: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarDayNumComplete: { background: 'linear-gradient(135deg, var(--gold), var(--or))', color: 'white', fontWeight: 800 },
  calendarLegend:      { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },
}
