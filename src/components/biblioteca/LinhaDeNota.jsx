// LinhaDeNota.jsx — uma nota, dentro de um cartão branco (tela Notas,
// handoff-biblioteca-55 §5): a referência e quando; o texto da nota, até
// três linhas. Tocar abre a Bíblia naquele versículo, com a nota aberta;
// segurar, o menu do item (`hold`). `row` vem de tiposMath.js/noteRow.
// `first`: sem o fio de cima.
const FONT = 'var(--font-bento)'

export default function LinhaDeNota({ row, first = false, onOpen, hold }) {
  return (
    <button type="button" style={{ ...s.row, ...(first ? s.first : null) }} onClick={onOpen} {...hold}>
      <span style={s.meta}>
        <span style={s.ref}>{row.reference}</span>
        <span style={s.when}>{row.when}</span>
      </span>
      <span style={s.text}>{row.text}</span>
    </button>
  )
}

const s = {
  row: { width: '100%', border: 'none', borderTop: '1px solid var(--bento-line)', background: 'none', padding: '13px 0', display: 'block', textAlign: 'left', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  first: { borderTop: 'none' },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 0 6px' },
  ref: { minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)' },
  when: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  text: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden', fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)', overflowWrap: 'anywhere' },
}
