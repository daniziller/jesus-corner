// BlocoRespondidos.jsx — o bloco areia dos pedidos respondidos (handoff-
// passos-pedidos-53-54 §7, item 5). Na aba Ativos: os dois mais recentes
// e "Ver os {n}" (leva à aba Respondidos). Na aba Respondidos: todos, no
// mesmo formato. Cada um: o selo da resposta (só "Sim" é cheio), "orado
// por {tempo}", o pedido e, se houver, "o que eu vi" em itálico. `rows`
// vem de answeredRow (pedidos/pedidosMath.js); tocar numa linha abre o
// pedido.
const FONT = 'var(--font-bento)'

export default function BlocoRespondidos({ rows, more, onMore, onOpen, style }) {
  return (
    <section style={{ ...s.block, ...style }} aria-labelledby="pedidos-respondidos">
      <div style={s.top}>
        <h2 style={s.label} id="pedidos-respondidos">Respondidos</h2>
        {more && <button type="button" className="passo-rotulo" style={s.more} onClick={onMore}>{more}</button>}
      </div>
      {rows.map(row => (
        <button key={row.id} type="button" style={s.row} onClick={() => onOpen(row.id)}>
          <span style={s.rowTop}>
            <span style={{ ...s.badge, ...(row.solid ? s.badgeSolid : null) }}>{row.badge}</span>
            <span style={{ flex: 1 }} />
            <span style={s.span}>{row.span}</span>
          </span>
          <span style={s.body}>{row.body}</span>
          {row.note && <span style={s.note}>{row.note}</span>}
        </button>
      ))}
    </section>
  )
}

const s = {
  block: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-sand)', padding: '15px 18px 3px' },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 0 12px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  // "Ver os 12": 11px de texto; a área de toque de 44px vem da classe.
  more: { border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-icon)', cursor: 'pointer' },
  // O fio e o selo claro são o marrom do bloco em transparência (valores do quadro).
  row: { display: 'block', width: '100%', border: 'none', borderTop: '1px solid rgba(58,42,24,.1)', background: 'none', padding: '13px 0', textAlign: 'left', cursor: 'pointer' },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 7px' },
  badge: { height: 20, padding: '0 8px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase', background: 'rgba(122,74,30,.14)', color: 'var(--bento-sand-icon)' },
  badgeSolid: { background: 'var(--bento-sand-icon)', color: '#fff' },
  span: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-sand-label)' },
  body: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-sand-ink-strong)', margin: '0 0 3px', overflowWrap: 'anywhere' },
  note: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink)', overflowWrap: 'anywhere' },
}
