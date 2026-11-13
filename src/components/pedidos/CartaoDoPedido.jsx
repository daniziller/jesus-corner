// CartaoDoPedido.jsx — um pedido ativo na lista (handoff-passos-pedidos-
// 53-54 §7, item 4): a origem, o pedido inteiro, a linha de apoio e UM
// botão — o "orei". Laranja: ainda não orei hoje; marrom: já orei (não
// desmarca). Tocar no resto do cartão abre o pedido (quem decide o quê é
// cardTap, em pedidos/pedidosMath.js).
//
// Privacidade: aparecem o texto, a origem e QUANTAS pessoas oraram —
// nunca quem.
import Check from '../passos/Check'
import { originLabel, supportLine } from '../../pedidos/pedidosMath.js'

const FONT = 'var(--font-bento)'

export default function CartaoDoPedido({ pedido, onOpen, onOrar }) {
  const origin = originLabel(pedido)
  return (
    <div style={s.card}>
      <button type="button" style={s.text} onClick={() => onOpen(pedido)}>
        <span style={{ ...s.origin, color: origin.kind === 'mine' ? 'var(--bento-accent)' : 'var(--bento-sand-icon)' }}>{origin.text}</span>
        <span style={s.body}>{pedido.body}</span>
        <span style={s.support}>{supportLine(pedido, { list: true })}</span>
      </button>
      <button
        type="button" style={{ ...s.orei, ...(pedido.prayedToday ? s.oreiDone : null) }}
        aria-label="Orei por este pedido" aria-pressed={pedido.prayedToday}
        onClick={() => { if (!pedido.prayedToday) onOrar(pedido) }}
      >
        <Check size={17} color={pedido.prayedToday ? '#fff' : 'var(--bento-ink)'} />
      </button>
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13 },
  text: { flex: 1, minWidth: 0, display: 'block', border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  origin: { display: 'block', fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 7px' },
  body: { display: 'block', fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-.2px', color: 'var(--bento-ink)', margin: '0 0 4px', textWrap: 'pretty', overflowWrap: 'anywhere' },
  support: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)' },
  orei: { width: 48, height: 48, flexShrink: 0, borderRadius: 16, border: 'none', padding: 0, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  oreiDone: { background: 'var(--bento-sand-icon)', cursor: 'default' },
}
