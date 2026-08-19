// Anel dividido em fatias iguais — uma por passo LIGADO na rotina (1/2 se
// só 2 passos, 1/3 se 3, 1/4 se 4). Cada fatia tem sempre o mesmo tamanho
// fixo (a posição de cada passo no anel nunca muda); o que varia é quanto
// dela vem colorida — `done[key]` aceita tanto um boolean (fatia cheia ou
// vazia, usado no calendário mensal e na "sua semana" da Home: feito ou não
// naquele dia) quanto uma fração 0–1 (fatia parcialmente preenchida,
// usada na "constância" semanal — RoutineScreen.jsx — pra mostrar quantos
// dos 7 dias aquele passo foi feito). Substitui tanto a fileira de
// pontinhos embaixo do número do dia quanto os anéis separados um do lado
// do outro da constância — um só anel, mesma linguagem visual nos dois
// lugares.
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'

export default function RoutineDayRing({ modules, done, size = 26, strokeWidth = 2.5 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const n = modules.length || 1
  // Um pequeno vão entre fatias só quando há mais de uma — com 1 passo só,
  // o círculo inteiro pertence a ele, sem vão pra cortar.
  const gap = n > 1 ? Math.min(3, c / n / 4) : 0
  const slotLen = Math.max(0, c / n - gap)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g2)" strokeWidth={strokeWidth} />
      {modules.map((key, i) => {
        const raw = done?.[key]
        const frac = typeof raw === 'number' ? Math.max(0, Math.min(1, raw)) : (raw ? 1 : 0)
        if (frac <= 0) return null
        const segLen = slotLen * frac
        return (
          <circle
            key={key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ROUTINE_STEP_COLORS[key]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segLen} ${c - segLen}`}
            strokeDashoffset={-(i * c) / n}
          />
        )
      })}
    </svg>
  )
}
