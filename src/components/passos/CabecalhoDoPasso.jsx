// CabecalhoDoPasso.jsx — o topo de um passo do plano (handoff-passos-
// pedidos-53-54 §1): voltar · o nome do passo com "Passo {n} de {total} ·
// {modo}" embaixo · o relógio (`clock`, quando o passo tem um) — e, logo
// abaixo, a barra do dia.
import AppIcon from '../../icons/AppIcon'
import BarraDoDia from './BarraDoDia'

const FONT = 'var(--font-bento)'

export default function CabecalhoDoPasso({ title, subtitle, onBack, backLabel = 'Voltar', clock = null, segments, barLabel }) {
  return (
    <div style={s.wrap}>
      <div style={s.row}>
        <button type="button" className="passo-alvo" style={s.back} onClick={onBack} aria-label={backLabel}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={s.title}>{title}</h1>
          {subtitle && <p style={s.subtitle}>{subtitle}</p>}
        </div>
        {clock}
      </div>
      {segments?.length > 0 && <BarraDoDia segments={segments} style={s.bar} role="img" aria-label={barLabel} />}
    </div>
  )
}

const s = {
  wrap: { flexShrink: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  back: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px' },
  subtitle: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0 },
  bar: { padding: '14px 20px 0' },
}
