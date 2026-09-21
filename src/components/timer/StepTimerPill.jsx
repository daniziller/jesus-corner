// Versão compacta do cronômetro pra Leitura — a tela de leitura é
// imersiva (o cabeçalho já some ao rolar, pra não roubar espaço do
// texto), então o card grande de StepTimerCard.jsx não cabe aqui.
// Mesmo conceito (três tempos + tocar/pausar + parar sempre visíveis),
// encolhido numa pílula só. Leitura não tem etapas — o número grande da
// pílula É o tempo do passo (igual sempre foi), com o total do dia como
// legenda pequena embaixo.
import { formatClock } from '../../timer/formatClock'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

export default function StepTimerPill({ lang, planSeconds, passoSeconds, passoDurationSeconds, running, onToggle, onStop, flash = false, style }) {
  const T = (k) => t(`timer.${k}`, undefined, lang)
  const hasTarget = typeof passoDurationSeconds === 'number' && passoDurationSeconds > 0
  const remaining = hasTarget ? Math.round(passoDurationSeconds - passoSeconds) : null
  const overtime = hasTarget && remaining < 0
  const display = hasTarget ? formatClock(Math.abs(remaining)) : formatClock(passoSeconds)

  return (
    <div style={{ ...styles.wrap, ...style }}>
      <button
        type="button"
        style={{ ...styles.pill, ...(flash ? styles.pillFlash : {}) }}
        onClick={onToggle}
        aria-label={running ? t('reading.clockPause', undefined, lang) : t('reading.clockResume', undefined, lang)}
      >
        <AppIcon name={running ? 'Pause' : 'Play'} size={13} strokeWidth={2.4} color="var(--bento-accent)" />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ ...styles.pillClock, color: overtime ? 'var(--bento-t3)' : '#fff' }}>{display}</span>
          <span style={styles.pillSub}>{T('planLabel')} {formatClock(planSeconds)}</span>
        </span>
      </button>
      <button type="button" style={styles.stopBtn} onClick={onStop} aria-label={T('stopBtn')}>
        <AppIcon name="Square" size={12} color="var(--bento-ink)" fill="var(--bento-ink)" />
      </button>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  wrap: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 },
  pill: { flexShrink: 0, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', cursor: 'pointer' },
  pillFlash: { background: 'var(--bento-accent)' },
  pillClock: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 },
  pillSub: { fontFamily: FONT, fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,.5)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 },
  stopBtn: { flexShrink: 0, width: 38, height: 38, border: 'none', borderRadius: 13, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
