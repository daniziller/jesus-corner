// LinhaDoPedido.jsx — uma linha de pedido na Súplica (handoff-passos-
// pedidos-53-54 §3): a origem, o pedido inteiro, a linha de apoio e um
// check de 44px — o "orei" que marca e, só nesta oração, desmarca (quem
// decide é suplicaToggle, em pedidos/pedidosMath.js). É a mesma linha no
// cartão da Súplica e na folha que abre por cima dela.
//
// Privacidade: de cada pedido só aparecem o texto, a origem e QUANTAS
// pessoas oraram — nunca quem.
import Check from './Check'
import { originLabel, supportLine, suplicaToggle } from '../../pedidos/pedidosMath.js'
import { t, currentLanguage } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function LinhaDoPedido({ pedido: p, sessionMarks, onOrar, onDesfazer, first = false }) {
  const lang = currentLanguage()
  const origin = originLabel(p, lang)

  function toggle() {
    const action = suplicaToggle(p, sessionMarks)
    if (action === 'orar') onOrar(p)
    else if (action === 'desfazer') onDesfazer(p)
  }

  return (
    <div style={{ ...s.row, ...(first ? s.rowFirst : null) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...s.origin, color: origin.kind === 'mine' ? 'var(--bento-accent)' : 'var(--bento-sand-icon)' }}>{origin.text}</p>
        <p style={s.body}>{p.body}</p>
        <p style={s.support}>{supportLine(p, { lang })}</p>
      </div>
      <button
        type="button" style={{ ...s.check, ...(p.prayedToday ? s.checkOn : null) }}
        aria-pressed={p.prayedToday} aria-label={t('passosTx.prayedFor', { body: p.body })}
        onClick={toggle}
      >
        <Check size={16} color={p.prayedToday ? '#fff' : 'var(--bento-t5)'} />
      </button>
    </div>
  )
}

const s = {
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid var(--bento-line)' },
  rowFirst: { borderTop: 'none', paddingTop: 2 },
  origin: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 6px' },
  body: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: '0 0 3px', overflowWrap: 'anywhere' },
  support: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  check: { width: 44, height: 44, flexShrink: 0, borderRadius: 15, border: 'none', padding: 0, background: 'var(--bento-card)', boxShadow: 'inset 0 0 0 1.5px var(--bento-t6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  checkOn: { background: 'var(--bento-sand-icon)', boxShadow: 'none' },
}
