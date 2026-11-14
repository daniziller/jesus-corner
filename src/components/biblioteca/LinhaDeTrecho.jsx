// LinhaDeTrecho.jsx — um trecho marcado, dentro de um cartão areia (L3,
// handoff-biblioteca-55 §4.3): o trecho entre aspas, em itálico · a
// referência e quando · "Com nota: …", se houver. Tocar abre a Bíblia
// naquele versículo; segurar, o menu do item (`hold`). `row` vem de
// tiposMath.js/markRow; `text` é o trecho, carregado à parte (a marcação
// não guarda o texto do versículo). `first`: sem o fio de cima.
const FONT = 'var(--font-bento)'

export default function LinhaDeTrecho({ row, text, first = false, onOpen, hold }) {
  return (
    <button type="button" style={{ ...s.row, ...(first ? s.first : null) }} onClick={onOpen} {...hold}>
      {text && <span style={s.quote}>&quot;{text}&quot;</span>}
      <span style={s.meta}>
        <span style={s.ref}>{row.reference}</span>
        <span style={s.when}>{row.when}</span>
      </span>
      {row.note && <span style={s.note}>{row.note}</span>}
    </button>
  )
}

const s = {
  row: { width: '100%', border: 'none', borderTop: '1px solid var(--bento-sand-line)', background: 'none', padding: '13px 0', display: 'block', textAlign: 'left', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  first: { borderTop: 'none' },
  quote: { display: 'block', fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: '0 0 7px', textWrap: 'pretty', overflowWrap: 'anywhere' },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ref: { minWidth: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-icon)' },
  when: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-sand-label)' },
  note: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-note)', margin: '8px 0 0', overflowWrap: 'anywhere' },
}
