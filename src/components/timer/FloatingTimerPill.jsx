// FloatingTimerPill.jsx — pedido dela (2026-10-22): "o relógio continua
// mesmo se ela sair [de Oração/Reflexão] e for pra outra área do app",
// minimizado "como fica na Bíblia" (StepTimerPill.jsx, mesma ideia
// compacta). Oração e Reflexão já ficam sempre montadas em segundo plano
// (prayerVisitedRef/reflectionVisitedRef, App.jsx) — o relógio em si
// nunca parou de contar ao trocar de aba, só não tinha onde aparecer.
//
// Mora no nível do App (fixed, acima de qualquer tela), e tem o PRÓPRIO
// intervalo de atualização — chama `controlsRef.current.computeElapsed()`
// direto na instância de useStepTimer que já está rodando dentro da tela
// escondida, em vez de duplicar o motor do relógio ou forçar o App
// inteiro a re-renderizar a cada tick (só este componente, pequeno,
// atualiza por segundo).
import { useState, useEffect } from 'react'
import { formatClock } from '../../timer/formatClock'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

export default function FloatingTimerPill({ lang, running, controlsRef, onOpen }) {
  const [elapsed, setElapsed] = useState(() => controlsRef.current?.computeElapsed?.() ?? 0)

  useEffect(() => {
    setElapsed(controlsRef.current?.computeElapsed?.() ?? 0)
    if (!running) return
    const id = setInterval(() => setElapsed(controlsRef.current?.computeElapsed?.() ?? 0), 1000)
    return () => clearInterval(id)
  }, [running, controlsRef])

  const { label, totalSeconds } = controlsRef.current ?? {}
  const hasTarget = typeof totalSeconds === 'number' && totalSeconds > 0
  const remaining = hasTarget ? Math.max(0, Math.round(totalSeconds - elapsed)) : null
  const display = hasTarget ? formatClock(remaining) : formatClock(elapsed)

  return (
    <div style={styles.wrap}>
      <button type="button" style={styles.toggleBtn} onClick={e => { e.stopPropagation(); controlsRef.current?.toggle?.() }} aria-label={running ? t('timer.pauseFloating', undefined, lang) : t('timer.resumeFloating', undefined, lang)}>
        <AppIcon name={running ? 'Pause' : 'Play'} size={13} strokeWidth={2.4} color="var(--bento-ink)" fill="var(--bento-ink)" />
      </button>
      <button type="button" style={styles.body} onClick={onOpen} aria-label={t('timer.floatingOpenLabel', { step: label }, lang)}>
        <span style={styles.clock}>{display}</span>
        <span style={styles.label}>{label}</span>
      </button>
      <button type="button" style={styles.stopBtn} onClick={e => { e.stopPropagation(); controlsRef.current?.finish?.() }} aria-label={t('timer.stopBtn', undefined, lang)}>
        <AppIcon name="Square" size={12} color="rgba(255,255,255,.7)" fill="rgba(255,255,255,.7)" />
      </button>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  wrap: {
    position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: '50%', transform: 'translateX(-50%)',
    zIndex: 130, display: 'flex', alignItems: 'center', gap: 2,
    height: 42, borderRadius: 21, background: 'var(--bento-ink)', boxShadow: '0 8px 20px rgba(0,0,0,.22)',
    padding: 3,
  },
  toggleBtn: { flexShrink: 0, width: 34, height: 34, border: 'none', borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  body: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: '0 10px', cursor: 'pointer' },
  clock: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' },
  label: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap' },
  stopBtn: { flexShrink: 0, width: 34, height: 34, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
