// Anel dividido em fatias iguais — uma por passo LIGADO na rotina (1/2 se
// só 2 passos, 1/3 se 3, 1/4 se 4), cada fatia na cor do passo quando feito
// naquele dia, cinza quando não. Substitui a fileira de pontinhos embaixo
// do número do dia (calendário mensal e "sua semana" na Home) — com 3-4
// pontos minúsculos lado a lado ficava difícil de ler qual cor era qual.
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'

export default function RoutineDayRing({ modules, done, size = 26, strokeWidth = 2.5 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const n = modules.length || 1
  // Um pequeno vão entre fatias só quando há mais de uma — com 1 passo só,
  // o círculo inteiro pertence a ele, sem vão pra cortar.
  const gap = n > 1 ? Math.min(3, c / n / 4) : 0
  const segLen = Math.max(0, c / n - gap)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g2)" strokeWidth={strokeWidth} />
      {modules.map((key, i) => (done?.[key] ? (
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
      ) : null))}
    </svg>
  )
}
