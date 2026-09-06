// WeeklyDaysPicker.jsx — grade dos 7 dias + atalhos (quadro 27a, Bloco 8).
// Compartilhado entre o onboarding (OnboardingFlow.jsx, pergunta 4) e
// "Ritmo da semana" em Ajustar meu plano (AdjustPlanScreen.jsx) — mesmo
// componente nos dois lugares, como o handoff pede explicitamente ("os dias
// aparecem como a linha 'Seg · Qua · Sex · Dom', editável no mesmo
// componente desta tela").
//
// `days` é o array de 7 booleanos de sempre (índice 0 = segunda, ver
// weeklyDaysMath.js); `onChange(nextDays)` dispara a cada toque, num tile
// OU num atalho.
import { t } from '../i18n'
import { WEEKDAY_ABBR3, WEEKLY_DAYS_PRESETS } from '../routine/weeklyDaysStore'

const FONT = 'var(--font-bento)'
const PRESET_KEYS = ['threeDays', 'fourDays', 'weekdays', 'everyDay']

function sameDays(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export default function WeeklyDaysPicker({ days, onChange, lang }) {
  const L = (k) => t(`weeklyDays.${k}`, undefined, lang)
  const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt

  function toggleDay(i) {
    const next = [...days]
    next[i] = !next[i]
    onChange(next)
  }

  return (
    <div>
      <div style={s.grid}>
        {abbr.map((label, i) => {
          const on = days[i]
          return (
            <button key={i} type="button" aria-pressed={on} onClick={() => toggleDay(i)}
              style={{ ...s.tile, background: on ? 'var(--bento-ink)' : 'var(--bento-card)' }}>
              <span style={{ ...s.tileLabel, color: on ? '#fff' : 'var(--bento-t2)' }}>{label}</span>
              {on && <span style={s.tileDot} />}
            </button>
          )
        })}
      </div>
      <div style={s.presetRow}>
        {PRESET_KEYS.map(key => {
          const preset = WEEKLY_DAYS_PRESETS[key]
          const on = sameDays(days, preset)
          return (
            <button key={key} type="button" onClick={() => onChange(preset)}
              style={{ ...s.presetBtn, background: on ? 'var(--bento-sand)' : 'var(--bento-card)', color: on ? 'var(--bento-sand-ink)' : 'var(--bento-t3)' }}>
              {L(`preset_${key}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  grid: { display: 'flex', gap: 6, marginBottom: 10 },
  tile: { flex: 1, height: 58, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tileLabel: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1 },
  tileDot: { width: 5, height: 5, borderRadius: 99, background: 'var(--bento-accent)' },
  presetRow: { display: 'flex', gap: 8 },
  presetBtn: { flex: 1, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 800, padding: 0 },
}
