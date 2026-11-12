// CartaoOracoesPelosOutros.jsx — o cartão do topo da lista de pedidos
// (handoff-passos-pedidos-53-54 §7, item 2): quantas vezes a pessoa orou
// por pedidos de outros, quanto falta para o próximo degrau da família
// "Oração pelos outros" e a barra entre o degrau atual e o próximo. Leva
// à família em Minhas conquistas. `card` vem de othersCard
// (pedidos/pedidosMath.js).
const FONT = 'var(--font-bento)'

export default function CartaoOracoesPelosOutros({ card, onOpen }) {
  return (
    <button type="button" style={s.card} onClick={onOpen} aria-label={`${card.aria} Abrir a família em Minhas conquistas.`}>
      <span style={s.top}>
        <span style={s.value}>{card.value}</span>
        <span style={s.texts}>
          <span style={s.caption}>{card.caption}</span>
          <span style={s.line}>{card.line}</span>
        </span>
      </span>
      {card.progress != null && (
        <span style={s.track}><span style={{ ...s.fill, width: `${card.progress * 100}%` }} /></span>
      )}
    </button>
  )
}

const s = {
  card: { flexShrink: 0, width: '100%', boxSizing: 'border-box', display: 'block', border: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', textAlign: 'left', cursor: 'pointer' },
  top: { display: 'flex', alignItems: 'flex-end', gap: 12 },
  value: { fontFamily: FONT, fontSize: 40, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-2px', color: 'var(--bento-ink)' },
  texts: { flex: 1, minWidth: 0, display: 'block', padding: '0 0 1px' },
  caption: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)' },
  line: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)' },
  track: { display: 'block', height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden', marginTop: 13 },
  fill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
}
