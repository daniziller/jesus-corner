// CartaoRecentes.jsx — "RECENTES" na raiz da Biblioteca (L1 §2.6): um
// cartão branco com os três itens mais recentes, de qualquer tipo —
// rótulo do tipo no singular, na cor do tipo · quando · título · uma
// linha do texto (`rows`, de bibliotecaMath.js/recentRows).
const FONT = 'var(--font-bento)'
const LABEL = { ink: 'var(--bento-ink)', sand: 'var(--bento-sand-icon)', accent: 'var(--bento-accent)' }

export default function CartaoRecentes({ rows, onOpen }) {
  return (
    <ul style={s.card}>
      {rows.map((row, i) => (
        <li key={row.key} style={i < rows.length - 1 ? s.itemLine : null}>
          <button type="button" style={s.row} onClick={() => onOpen(row.item)}>
            <span style={s.top}>
              <span style={{ ...s.label, color: LABEL[row.color] }}>{row.label}</span>
              <span style={s.when}>{row.when}</span>
            </span>
            <span style={s.title}>{row.title}</span>
            {row.line && <span style={s.line}>{row.line}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

const clamp = lines => ({ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' })

const s = {
  card: { listStyle: 'none', margin: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '2px 18px' },
  itemLine: { borderBottom: '1px solid var(--bento-line)' },
  row: { width: '100%', border: 'none', background: 'none', padding: '13px 0', display: 'block', textAlign: 'left', cursor: 'pointer' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 6px' },
  label: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase' },
  when: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  title: { ...clamp(2), fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: '0 0 3px', overflowWrap: 'anywhere' },
  line: { ...clamp(2), fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t2)', overflowWrap: 'anywhere' },
}
