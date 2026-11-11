// WeekdayChipRow.jsx — fileira compacta de 7 dias (Seg…Dom), um por passo
// (Oração/Leitura/Estudo/Reflexão têm cada um o seu, ver HANDOFF-35-meu-
// plano.md, 35c/35i/35j: "cada passo ligado tem os seus dias — leitura e
// estudo podem cair em dias diferentes"). Mais compacta que
// WeeklyDaysPicker.jsx (sem atalhos, sem ponto de destaque) — visual próprio
// dos quadros 35c/35i/35j: pílula preta quando marcado, areia clara quando
// não.
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'

// tone 'ajustar' (handoff-meu-plano-47, A2 "EM QUE DIAS"): botão de 38px
// de altura visual com área de toque de 44px, raio 12, gap 5, marcado
// preto/branco 800 11.5, desmarcado areia clara/cinza 700 11.5.
export default function WeekdayChipRow({ days, onChange, lang, tone = 'sand' }) {
  const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt

  function toggleDay(i) {
    const next = [...days]
    next[i] = !next[i]
    onChange(next)
  }

  if (tone === 'ajustar') {
    return (
      <div style={{ ...s.row, gap: 5 }}>
        {abbr.map((label, i) => {
          const on = days[i]
          return (
            <button key={i} type="button" aria-pressed={on} aria-label={label} onClick={() => toggleDay(i)} style={s.tapArea}>
              <span style={{ ...s.visual, background: on ? 'var(--bento-ink)' : 'var(--bento-line)', color: on ? '#fff' : 'var(--bento-t4)', fontWeight: on ? 800 : 700 }}>{label}</span>
            </button>
          )
        })}
      </div>
    )
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
  tapArea: { flex: 1, minWidth: 0, height: 44, border: 'none', background: 'none', padding: '3px 0', cursor: 'pointer', display: 'flex' },
  visual: { flex: 1, minWidth: 0, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 11.5, lineHeight: 1 },
  chip: {
    flex: 1, minWidth: 0, height: 40, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 0,
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, lineHeight: 1,
  },
}
