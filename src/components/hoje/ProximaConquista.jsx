// ProximaConquista.jsx — o cartão "Próxima conquista" do Hoje
// (handoff-hoje-50 §5): "a mais perto" de Minhas conquistas, com a MESMA
// Medalha (não ganha, em laranja), quanto falta e a barra do progresso
// entre o degrau atual e o próximo. Toque → a família daquela conquista.
// `next` vem de nextAchievement(pickClosest(...)); quem chama não desenha
// o cartão quando ele é null (tudo conquistado).
import Medalha from '../gamificacao/Medalha'

const FONT = 'var(--font-bento)'

export default function ProximaConquista({ next, onOpen }) {
  return (
    <div
      style={s.card} role="button" tabIndex={0} aria-label={next.aria} onClick={() => onOpen?.(next.familyId)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(next.familyId) } }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>
        <Medalha familia={next.familyId} degrau={next.degrau} size={54} ganha={false} tracejadoLaranja />
      </span>
      <div style={s.right} aria-hidden="true">
        <div style={s.top}>
          <p style={s.label}>PRÓXIMA CONQUISTA</p>
          <p style={s.remaining}>{next.remaining}</p>
        </div>
        <p style={s.name}>{next.nome}</p>
        <div style={s.track}>
          <div style={{ ...s.fill, width: `${Math.round(next.progress * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' },
  right: { flex: 1, minWidth: 0 },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  remaining: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'nowrap' },
  name: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.3px', color: 'var(--bento-ink)', margin: '8px 0 9px' },
  track: { height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
}
