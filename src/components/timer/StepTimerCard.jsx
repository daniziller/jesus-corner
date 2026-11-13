// StepTimerCard.jsx — o cartão escuro do cronômetro da oração livre (36c)
// e da reflexão livre (37b): o tempo do plano no dia, o relógio grande do
// passo, a barra de progresso e os botões de tocar/pausar e parar. As
// telas com etapas (oração ACTS, reflexão com perguntas, leitura) usam a
// pílula do cabeçalho do passo (components/passos/RelogioDoPasso.jsx).
import { formatClock } from '../../timer/formatClock'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

export default function StepTimerCard({
  lang,
  planSeconds,
  etapaSeconds,           // os segundos do passo
  etapaDurationSeconds,   // number | null — presente = relógio conta REGRESSIVO (+ hora extra); ausente = conta progressivo
  running,
  onToggle,
  onStop,
  playLabel,
  pauseLabel,
}) {
  const T = (k, vars) => t(`timer.${k}`, vars, lang)
  const hasEtapaTarget = typeof etapaDurationSeconds === 'number' && etapaDurationSeconds > 0
  const etapaRemaining = hasEtapaTarget ? Math.round(etapaDurationSeconds - etapaSeconds) : null
  const etapaOvertime = hasEtapaTarget && etapaRemaining < 0
  const etapaDisplay = hasEtapaTarget ? formatClock(Math.abs(etapaRemaining)) : formatClock(etapaSeconds)
  const etapaProgress = hasEtapaTarget ? Math.min(1, Math.max(0, etapaSeconds / etapaDurationSeconds)) : null

  return (
    <div style={styles.card}>
      {/* Um relógio pequeno só, no topo (pedido dela, 2026-10-22): tinha
          "plano" (dia inteiro) e "passo" (este passo) lado a lado, mas
          os dois mostram o MESMO número sempre que oração/leitura/
          reflexão é o primeiro passo feito no dia (nada gravado antes
          ainda) — parecia relógio duplicado/quebrado. "passo" saiu;
          "plano" sobrou. */}
      <div style={styles.metaRow}>
        <span style={styles.metaItem}>{T('planLabel')} <b style={styles.metaValue}>{formatClock(planSeconds)}</b></span>
      </div>

      <p style={{ ...styles.etapaClock, color: etapaOvertime ? 'rgba(255,255,255,.4)' : '#fff' }}>{etapaDisplay}</p>
      {hasEtapaTarget && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${etapaProgress * 100}%` }} />
        </div>
      )}

      <div style={styles.btnRow}>
        <button
          type="button"
          style={styles.playBtn}
          onClick={onToggle}
          aria-label={running ? (pauseLabel ?? T('stopBtn')) : (playLabel ?? T('stopBtn'))}
        >
          <AppIcon name={running ? 'Pause' : 'Play'} size={17} color="var(--bento-ink)" fill="var(--bento-ink)" />
        </button>
        <button type="button" style={styles.stopBtn} onClick={onStop} aria-label={T('stopBtn')}>
          <AppIcon name="Square" size={15} color="#fff" fill="#fff" />
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  card: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 22px 20px' },

  metaRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 },
  metaItem: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em', color: 'rgba(255,255,255,.5)' },
  metaValue: { color: 'rgba(255,255,255,.85)', fontVariantNumeric: 'tabular-nums' },

  etapaClock: { fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: '-1.2px', margin: '0 0 10px', fontVariantNumeric: 'tabular-nums' },
  progressTrack: { height: 5, borderRadius: 99, background: 'rgba(255,255,255,.14)', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },

  btnRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  playBtn: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stopBtn: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
