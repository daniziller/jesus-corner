// PedidosDaSuplica.jsx — o cartão "Pedidos de oração" dentro da Súplica
// (handoff-passos-pedidos-53-54 §3): uma linha por pedido ativo (LinhaDo-
// Pedido), com a origem, o pedido inteiro, a linha de apoio e um check de
// 44px — o mesmo "orei" da lista de pedidos. A última linha é "Fazer um
// pedido".
//
// Pedido dela (2026-11-18): o rótulo do cartão e, com mais de cinco
// pedidos, "Ver os {n} pedidos" abrem a folha de pedidos da Súplica
// (FolhaPedidosDaSuplica) por cima da oração — não a lista de pedidos,
// que pausava o relógio e saía da tela.
//
// Privacidade: de cada pedido só aparecem o texto, a origem e QUANTAS
// pessoas oraram — nunca quem.
import AppIcon from '../../icons/AppIcon'
import LinhaDoPedido from './LinhaDoPedido'
import { suplicaView } from '../../pedidos/pedidosMath.js'
import { t, currentLanguage } from '../../i18n'

const FONT = 'var(--font-bento)'

export default function PedidosDaSuplica({ list, loading, error, sessionMarks, onOrar, onDesfazer, onAdd, onOpenAll }) {
  const view = suplicaView(list, { lang: currentLanguage() })

  return (
    <section style={s.card} aria-labelledby="suplica-pedidos">
      <div style={s.top}>
        {/* O rótulo abre a folha com todos os pedidos, sem sair da oração. */}
        <h3 style={s.label} id="suplica-pedidos">
          <button type="button" className="passo-rotulo" style={s.labelButton} onClick={onOpenAll} aria-label={t('passosTx.requestsAria')}>{t('passosTx.requestsTitle')}</button>
        </h3>
        {view.counter && <span style={s.counter} role="status">{view.counter}</span>}
      </div>

      {loading ? (
        <p style={s.note}>{t('passosTx.loadingRequests')}</p>
      ) : error ? (
        <p style={s.note}>{t('passosTx.requestsError')}</p>
      ) : view.empty ? (
        <p style={s.note}>{t('passosTx.noRequests')}</p>
      ) : (
        view.rows.map(p => (
          <LinhaDoPedido key={p.id} pedido={p} sessionMarks={sessionMarks} onOrar={onOrar} onDesfazer={onDesfazer} />
        ))
      )}

      {view.more && (
        <button type="button" style={s.line} onClick={onOpenAll}>
          <span style={s.lineText}>{view.more}</span>
          <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
        </button>
      )}

      <button type="button" style={s.line} onClick={onAdd}>
        <span style={s.diamond} aria-hidden="true" />
        <span style={s.lineText}>{t('passosTx.makeRequest')}</span>
        <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
      </button>
    </section>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 4px' },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 0 12px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  labelButton: { border: 'none', background: 'none', padding: 0, font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'inherit', cursor: 'pointer' },
  counter: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap' },
  note: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0, padding: '13px 0', borderTop: '1px solid var(--bento-line)' },
  line: { width: '100%', height: 50, boxSizing: 'content-box', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' },
  lineText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
  diamond: { width: 7, height: 7, flexShrink: 0, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5 },
}
