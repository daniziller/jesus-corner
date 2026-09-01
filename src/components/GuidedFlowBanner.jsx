// Faixa fina no topo das telas de passo (Oração / Leitura / Reflexão)
// quando a pessoa iniciou a "rotina guiada" em Meu Plano — mostra em que
// passo está, e cada passo abre o seguinte sozinho (ver guidedFlow em
// App.jsx). O "X" sai do modo guiado sem perder o progresso do dia.
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

export default function GuidedFlowBanner({ guided, lang, onExit }) {
  if (!guided) return null
  const { step, idx, total, steps } = guided
  const L = (k, vars) => t(`guided.${k}`, vars, lang)

  return (
    <div style={styles.wrap}>
      <div style={styles.dots}>
        {steps.map((s, i) => (
          <span key={s} style={{ ...styles.dot, background: i < idx ? 'var(--gr)' : i === idx ? 'white' : 'rgba(255,255,255,.28)' }} />
        ))}
      </div>
      <span style={styles.label}>
        {L('banner')} · {L('stepOf', { n: idx + 1, total })} · <strong>{L(`step_${step}`)}</strong>
      </span>
      <button style={styles.exitBtn} onClick={onExit} aria-label={L('exit')}>
        <AppIcon name="X" size={14} color="rgba(255,255,255,.8)" />
      </button>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 16px 0', padding: '8px 12px', borderRadius: 14, background: 'var(--bk-hero)', color: 'white' },
  dots: { display: 'flex', gap: 5, flexShrink: 0 },
  dot: { width: 7, height: 7, borderRadius: '50%' },
  label: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  exitBtn: { width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
