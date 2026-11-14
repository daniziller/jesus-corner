// CartaoEstudos.jsx — o cartão preto de Estudos na raiz da Biblioteca
// (L1 §2.5): "ESTUDOS · {n}", o estudo em andamento com a barra, ou
// quantos estão guardados, ou "Criar um estudo" (`card`, de
// bibliotecaMath.js/studiesCard).
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function CartaoEstudos({ card, onClick }) {
  const pct = card.progress == null ? null : Math.round(Math.min(1, Math.max(0, card.progress)) * 100)
  return (
    <button type="button" style={s.card} onClick={onClick}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={s.label}>{card.label}</span>
        <span style={{ ...s.title, ...(pct == null ? s.titleAlone : null) }}>{card.title}</span>
        {pct != null && (
          <span style={s.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ ...s.fill, width: `${pct}%` }} />
          </span>
        )}
      </span>
      <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="rgba(255,255,255,.5)" style={{ flexShrink: 0 }} />
    </button>
  )
}

const s = {
  card: { width: '100%', border: 'none', borderRadius: 22, background: 'var(--bento-ink)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  label: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  title: { display: 'block', fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.4px', color: '#fff', margin: '9px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  titleAlone: { margin: '9px 0 0' },
  track: { display: 'block', height: 5, borderRadius: 99, background: 'rgba(255,255,255,.14)', overflow: 'hidden' },
  fill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
}
