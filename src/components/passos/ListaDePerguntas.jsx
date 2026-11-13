// ListaDePerguntas.jsx — o cartão branco embaixo da pergunta atual da
// reflexão (handoff-passos-pedidos-53-54 §5, item 4). "DEPOIS": as
// perguntas que ainda faltam, só para ler. Na última, vira "JÁ
// RESPONDIDAS": as anteriores com o começo do que foi escrito (ou "Sem
// resposta"), e tocar numa volta a ela. `list` vem de reflectionView.
const FONT = 'var(--font-bento)'

export default function ListaDePerguntas({ list, onOpen }) {
  return (
    <section style={s.card} aria-label={list.title}>
      <p style={s.label}>{list.title}</p>
      {list.rows.map(row => {
        const inner = (
          <>
            <span style={s.number} aria-hidden="true">{row.n}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
              <span style={s.text}>{row.text}</span>
              <span style={{ ...s.sub, ...(row.tappable ? s.subOneLine : null) }}>{row.sub}</span>
            </span>
          </>
        )
        return row.tappable ? (
          <button key={row.index} type="button" style={{ ...s.row, ...s.rowButton }} onClick={() => onOpen(row.index)} aria-label={`Voltar à pergunta ${row.n}: ${row.text} ${row.sub}`}>
            {inner}
          </button>
        ) : (
          <div key={row.index} style={s.row}>{inner}</div>
        )
      })}
    </section>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px 3px' },
  // Os 11px de baixo são o respiro do quadro entre o rótulo e a primeira linha.
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 11px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--bento-line)' },
  // O fio de cima é o da linha (s.row); só os outros lados do botão somem.
  rowButton: { width: '100%', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' },
  number: { width: 28, height: 28, flexShrink: 0, borderRadius: 10, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-t3)' },
  text: { display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: '0 0 2px' },
  sub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)' },
  subOneLine: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
}
