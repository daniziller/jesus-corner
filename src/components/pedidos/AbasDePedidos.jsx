// AbasDePedidos.jsx — o segmentado da lista de pedidos (handoff-passos-
// pedidos-53-54 §7, item 3): Ativos · Respondidos · Do grupo, com a
// contagem — e Amigos, quando há pedido de amigo. Com três abas elas
// dividem a largura, como no quadro; com quatro, cada uma tem a largura
// do seu texto e a fileira rola de lado se não couber. `tabs` vem de
// pedidosTabs (pedidos/pedidosMath.js).
import { useRef, useEffect } from 'react'

const FONT = 'var(--font-bento)'

export default function AbasDePedidos({ tabs, current, onChange }) {
  const fits = tabs.length <= 3
  // Com quatro abas numa tela estreita, a aba escolhida vem para a vista.
  const rowRef = useRef(null)
  useEffect(() => {
    if (fits) return
    rowRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [fits, current])
  return (
    <div ref={rowRef} style={{ ...s.row, ...(fits ? null : s.rowScroll) }} role="tablist" aria-label="Pedidos de oração">
      {tabs.map(tab => {
        const on = tab.key === current
        return (
          <button
            key={tab.key} type="button" role="tab" aria-selected={on}
            style={{ ...s.tab, ...(fits ? s.tabEqual : s.tabAuto), ...(on ? s.tabOn : null) }}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const s = {
  row: { flexShrink: 0, display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'var(--bento-card)' },
  rowScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  tab: { height: 36, minWidth: 0, border: 'none', borderRadius: 12, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap', cursor: 'pointer' },
  tabEqual: { flex: 1 },
  tabAuto: { flex: '1 0 auto', padding: '0 5px' },
  tabOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
}
