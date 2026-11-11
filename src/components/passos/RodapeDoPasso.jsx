// RodapeDoPasso.jsx — o rodapé de um passo (handoff-passos-pedidos-53-54
// §1), preso no fundo: o botão laranja é o único caminho para a frente; à
// esquerda dele, no máximo uma ação secundária branca.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function RodapeDoPasso({ secondary, primary }) {
  return (
    <div style={s.wrap}>
      {secondary && (
        <button type="button" style={s.secondary} onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button>
      )}
      <button type="button" style={{ ...s.primary, ...(primary.disabled ? s.waiting : null) }} onClick={primary.onClick} disabled={primary.disabled}>
        <span>{primary.label}</span>
        <AppIcon name="ArrowRight" size={16} strokeWidth={2.6} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  )
}

const s = {
  wrap: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px calc(22px + var(--safe-bottom))' },
  secondary: { flexShrink: 0, height: 54, padding: '0 16px', borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', cursor: 'pointer' },
  // O caminho ainda não está pronto (ex: as perguntas sendo preparadas).
  waiting: { opacity: 0.45, cursor: 'default' },
  primary: { flex: 1, minWidth: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
