// PlanClockBar.jsx — o relógio do plano (pedido de 18/11): uma faixa no
// topo, acima de qualquer tela, enquanto a pessoa está dentro do plano
// guiado. Conta PARA CIMA todo o tempo no plano, com pausa e play — os
// relógios regressivos de cada passo continuam nos cabeçalhos dos passos e
// andam juntos com este (ver timer/PlanClockContext.js).
//
// É uma faixa (e não uma pílula solta por cima) para não cobrir o cabeçalho
// dos passos: a tela de baixo só desce um pouco. Atualiza sozinha a cada
// segundo — só ela, sem fazer o App inteiro redesenhar.
//
// Leitor de tela: os algarismos ficam escondidos; o nome do botão diz os
// minutos, que só mudam de minuto em minuto, sem região viva.
import { useState, useEffect } from 'react'
import AppIcon from '../../icons/AppIcon'
import { formatElapsed, elapsedMinutes } from '../../timer/planClockMath'
import { t } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function PlanClockBar({ lang, running, computeSeconds, onToggle, onOpen }) {
  const [seconds, setSeconds] = useState(() => computeSeconds())
  useEffect(() => {
    setSeconds(computeSeconds())
    if (!running) return
    const id = setInterval(() => setSeconds(computeSeconds()), 1000)
    return () => clearInterval(id)
  }, [running, computeSeconds])

  const minutes = elapsedMinutes(seconds)
  const T = (k, vars) => t(`timer.${k}`, vars, lang)
  const n = minutes === 1 ? 'One' : 'Many'
  return (
    <div style={s.strip}>
      <div style={s.pill}>
        <button
          type="button" className="passo-alvo" style={s.toggle} onClick={onToggle}
          aria-label={T(`${running ? 'planPause' : 'planResume'}${n}`, { count: minutes })}
        >
          <AppIcon name={running ? 'Pause' : 'Play'} size={13} strokeWidth={2.4} color="var(--bento-ink)" fill="var(--bento-ink)" />
        </button>
        <button type="button" className="passo-alvo" style={s.body} onClick={onOpen} aria-label={T(`planOpen${n}`, { count: minutes })} aria-live="off">
          <span style={{ ...s.clock, opacity: running ? 1 : 0.6 }} aria-hidden="true">{formatElapsed(seconds)}</span>
          <span style={s.label} aria-hidden="true">{T(running ? 'planClockLabel' : 'planClockPaused')}</span>
        </button>
      </div>
    </div>
  )
}

const s = {
  strip: { flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '10px 16px 0', background: 'var(--bento-bg)' },
  pill: { display: 'flex', alignItems: 'center', gap: 2, height: 42, borderRadius: 21, background: 'var(--bento-ink)', boxShadow: '0 6px 16px rgba(0,0,0,.16)', padding: 3 },
  toggle: { flexShrink: 0, width: 36, height: 36, border: 'none', borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 },
  body: { flexShrink: 0, minHeight: 36, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '0 14px 0 10px', cursor: 'pointer' },
  clock: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.2px', transition: 'opacity .2s' },
  label: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap' },
}
