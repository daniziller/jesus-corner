// Card de cronômetro compartilhado — mesmo visual que Oração (PrayerScreen.jsx)
// já tinha (o estilo que ela pediu pra usar como referência), agora
// reaproveitado por Oração, Reflexão e (em versão compacta, StepTimerPill.jsx)
// Leitura. Só cuida da "casca" do cronômetro — fileira de chips de
// etapa, os três tempos (plano/passo/etapa), a barra de progresso da
// etapa, e os botões de tocar/pausar + parar. O CONTEÚDO de cada etapa
// (frase de oração, pergunta de reflexão etc.) continua vivendo em cada
// tela, passado via `children` — renderiza dentro do mesmo cartão escuro,
// pra manter a aparência de um cartão só (igual já era em Oração).
import { formatClock } from '../../timer/formatClock'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

export default function StepTimerCard({
  lang,
  steps,                 // [{id, title}] | null — null/undefined = sem chips (Reflexão livre)
  currentIndex = 0,
  planSeconds,
  passoSeconds,
  etapaSeconds,           // já igual a passoSeconds quando não há etapa (decisão de cada tela)
  etapaDurationSeconds,   // number | null — presente = relógio conta REGRESSIVO (+ hora extra); ausente = conta progressivo
  running,
  onToggle,
  onStop,
  playLabel,
  pauseLabel,
  justZeroed = false,
  children,
}) {
  const T = (k, vars) => t(`timer.${k}`, vars, lang)
  const hasEtapaTarget = typeof etapaDurationSeconds === 'number' && etapaDurationSeconds > 0
  const etapaRemaining = hasEtapaTarget ? Math.round(etapaDurationSeconds - etapaSeconds) : null
  const etapaOvertime = hasEtapaTarget && etapaRemaining < 0
  const etapaDisplay = hasEtapaTarget ? formatClock(Math.abs(etapaRemaining)) : formatClock(etapaSeconds)
  const etapaProgress = hasEtapaTarget ? Math.min(1, Math.max(0, etapaSeconds / etapaDurationSeconds)) : null

  return (
    <>
      {steps && (
        <div style={styles.chipsRow}>
          {steps.map((s, i) => {
            const st = i < currentIndex ? 'done' : i === currentIndex ? 'now' : 'later'
            return (
              <div key={s.id} style={{ ...styles.chip, ...(st === 'done' ? styles.chipDone : st === 'now' ? styles.chipNow : styles.chipLater) }}>
                <p style={{ ...styles.chipTitle, color: st === 'done' ? 'var(--bento-sand-icon)' : st === 'now' ? '#fff' : 'var(--bento-t3)' }}>{s.title}</p>
              </div>
            )
          })}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.metaRow}>
          <span style={styles.metaItem}>{T('planLabel')} <b style={styles.metaValue}>{formatClock(planSeconds)}</b></span>
          <span style={styles.metaDivider}>·</span>
          <span style={styles.metaItem}>{T('passoLabel')} <b style={styles.metaValue}>{formatClock(passoSeconds)}</b></span>
        </div>

        {steps && <p style={styles.etapaLabel}>{T('etapaLabel')}</p>}
        <p style={{ ...styles.etapaClock, color: etapaOvertime ? 'rgba(255,255,255,.4)' : '#fff' }}>{etapaDisplay}</p>
        {hasEtapaTarget && (
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${etapaProgress * 100}%` }} />
          </div>
        )}

        <div style={styles.btnRow}>
          <button
            type="button"
            style={{ ...styles.playBtn, ...(justZeroed ? styles.playBtnFlash : null) }}
            onClick={onToggle}
            aria-label={running ? (pauseLabel ?? T('stopBtn')) : (playLabel ?? T('stopBtn'))}
          >
            <AppIcon name={running ? 'Pause' : 'Play'} size={17} color="var(--bento-ink)" fill="var(--bento-ink)" />
          </button>
          <button type="button" style={styles.stopBtn} onClick={onStop} aria-label={T('stopBtn')}>
            <AppIcon name="Square" size={15} color="#fff" fill="#fff" />
          </button>
        </div>

        {children}
      </div>
    </>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  chipsRow: { display: 'flex', gap: 6, marginBottom: 10 },
  chip: { flex: 1, minWidth: 0, borderRadius: 15, padding: '9px 10px' },
  chipDone: { background: 'var(--bento-sand)' },
  chipNow: { background: 'var(--bento-ink)' },
  chipLater: { background: 'var(--bento-line)' },
  chipTitle: { fontFamily: FONT, fontSize: 12, fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  card: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 22px 20px' },

  metaRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 },
  metaItem: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em', color: 'rgba(255,255,255,.5)' },
  metaValue: { color: 'rgba(255,255,255,.85)', fontVariantNumeric: 'tabular-nums' },
  metaDivider: { color: 'rgba(255,255,255,.3)' },

  etapaLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 4px' },
  etapaClock: { fontFamily: FONT, fontSize: 44, fontWeight: 800, letterSpacing: '-1.2px', margin: '0 0 10px', fontVariantNumeric: 'tabular-nums' },
  progressTrack: { height: 5, borderRadius: 99, background: 'rgba(255,255,255,.14)', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },

  btnRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  playBtn: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  playBtnFlash: { background: '#fff' },
  stopBtn: { flexShrink: 0, width: 44, height: 44, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
