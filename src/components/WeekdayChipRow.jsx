// WeekdayChipRow.jsx — fileira compacta de 7 dias (Seg…Dom), um por passo
// (Oração/Leitura/Estudo/Reflexão têm cada um o seu, ver HANDOFF-35-meu-
// plano.md, 35c/35i/35j: "cada passo ligado tem os seus dias — leitura e
// estudo podem cair em dias diferentes"). Mais compacta que
// WeeklyDaysPicker.jsx (sem atalhos, sem ponto de destaque) — visual próprio
// dos quadros 35c/35i/35j: pílula preta quando marcado, areia clara quando
// não.
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'

export default function WeekdayChipRow({ days, onChange, lang, tone = 'sand' }) {
  const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt

  function toggleDay(i) {
    const next = [...days]
    next[i] = !next[i]
    onChange(next)
  }

  return (
    <div style={s.row}>
      {abbr.map((label, i) => {
        const on = days[i]
        return (
          <button
            key={i} type="button" aria-pressed={on} onClick={() => toggleDay(i)}
            style={{
              ...s.chip,
              background: on ? 'var(--bento-ink)' : tone === 'sand' ? 'rgba(255,255,255,.5)' : 'var(--bento-line)',
              color: on ? '#fff' : 'var(--bento-t3)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

const s = {
  row: { display: 'flex', gap: 6 },
  chip: {
    flex: 1, minWidth: 0, height: 40, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 0,
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, lineHeight: 1,
  },
}
