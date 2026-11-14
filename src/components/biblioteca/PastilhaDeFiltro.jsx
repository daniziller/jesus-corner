// PastilhaDeFiltro.jsx — a pastilha de filtro da aba Biblioteca (handoff-
// biblioteca-55 §1): 34px de altura (44px de área de toque), o nome e,
// opcional, a contagem. A ativa fica preta; é um botão `aria-pressed`.
const FONT = 'var(--font-bento)'

export default function PastilhaDeFiltro({ label, count = null, active = false, onClick }) {
  return (
    <button type="button" className="biblioteca-pastilha" style={{ ...s.pill, ...(active ? s.on : null) }} aria-pressed={active} onClick={onClick}>
      {label}
      {count != null && <span style={{ ...s.count, ...(active ? s.countOn : null) }}>{count}</span>}
    </button>
  )
}

// A fileira das pastilhas: quebra de linha, 6px entre elas.
export function FileiraDePastilhas({ label, children }) {
  return <div role="group" aria-label={label} style={s.row}>{children}</div>
}

const s = {
  row: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { flex: 'none', height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  on: { background: 'var(--bento-ink)', fontWeight: 800, color: '#fff' },
  count: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  countOn: { color: 'rgba(255,255,255,.55)' },
}
