// PedidosDaSuplica.jsx — o cartão "Pedidos de oração" dentro da Súplica
// (handoff-passos-pedidos-53-54 §3): uma linha por pedido ativo, com a
// origem, o pedido inteiro, a linha de apoio e um check de 44px — o mesmo
// "orei" da lista de pedidos. Mais de cinco: "Ver os {n} pedidos" abre o
// resto no lugar. A última linha é "Fazer um pedido".
//
// Privacidade: de cada pedido só aparecem o texto, a origem e QUANTAS
// pessoas oraram — nunca quem.
import { useState } from 'react'
import AppIcon from '../../icons/AppIcon'
import Check from './Check'
import { suplicaView, originLabel, supportLine, suplicaToggle } from '../../pedidos/pedidosMath.js'

const FONT = 'var(--font-bento)'

export default function PedidosDaSuplica({ list, loading, error, sessionMarks, onOrar, onDesfazer, onAdd }) {
  const [expanded, setExpanded] = useState(false)
  const view = suplicaView(list, { expanded })

  function toggle(p) {
    const action = suplicaToggle(p, sessionMarks)
    if (action === 'orar') onOrar(p)
    else if (action === 'desfazer') onDesfazer(p)
  }

  return (
    <section style={s.card} aria-labelledby="suplica-pedidos">
      <div style={s.top}>
        <h3 style={s.label} id="suplica-pedidos">Pedidos de oração</h3>
        {view.counter && <span style={s.counter} role="status">{view.counter}</span>}
      </div>

      {loading ? (
        <p style={s.note}>Carregando os pedidos…</p>
      ) : error ? (
        <p style={s.note}>Não foi possível carregar os pedidos agora.</p>
      ) : view.empty ? (
        <p style={s.note}>Nenhum pedido por enquanto.</p>
      ) : (
        view.rows.map(p => {
          const origin = originLabel(p)
          return (
            <div key={p.id} style={s.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...s.origin, color: origin.kind === 'mine' ? 'var(--bento-accent)' : 'var(--bento-sand-icon)' }}>{origin.text}</p>
                <p style={s.body}>{p.body}</p>
                <p style={s.support}>{supportLine(p)}</p>
              </div>
              <button
                type="button" style={{ ...s.check, ...(p.prayedToday ? s.checkOn : null) }}
                aria-pressed={p.prayedToday} aria-label={`Orei por este pedido: ${p.body}`}
                onClick={() => toggle(p)}
              >
                <Check size={16} color={p.prayedToday ? '#fff' : 'var(--bento-t5)'} />
              </button>
            </div>
          )
        })
      )}

      {view.more && (
        <button type="button" style={s.line} onClick={() => setExpanded(true)} aria-expanded="false">
          <span style={s.lineText}>{view.more}</span>
          <AppIcon name="ChevronDown" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
        </button>
      )}

      <button type="button" style={s.line} onClick={onAdd}>
        <span style={s.diamond} aria-hidden="true" />
        <span style={s.lineText}>Fazer um pedido</span>
        <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
      </button>
    </section>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 4px' },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 0 12px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  counter: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap' },
  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0, padding: '13px 0', borderTop: '1px solid var(--bento-line)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid var(--bento-line)' },
  origin: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 6px' },
  body: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: '0 0 3px', overflowWrap: 'anywhere' },
  support: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  check: { width: 44, height: 44, flexShrink: 0, borderRadius: 15, border: 'none', padding: 0, background: 'var(--bento-card)', boxShadow: 'inset 0 0 0 1.5px var(--bento-t6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  checkOn: { background: 'var(--bento-sand-icon)', boxShadow: 'none' },
  line: { width: '100%', height: 50, boxSizing: 'content-box', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' },
  lineText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  diamond: { width: 7, height: 7, flexShrink: 0, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5 },
}
