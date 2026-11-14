// FolhaDePassagens.jsx — a folha das passagens citadas numa anotação (a
// pastilha "{n} passagens" de N2, handoff-biblioteca-55 §7A.2): cada
// passagem por extenso, com o começo do texto citado. Tocar abre a Bíblia
// ali. `rows` vem de anotarMath.js/passageRows.
import FolhaInferior from '../FolhaInferior'
import Icone from './Icone'

const FONT = 'var(--font-bento)'

export default function FolhaDePassagens({ rows, onOpen, onClose }) {
  return (
    <FolhaInferior fixed form onClose={onClose} labelledBy="anotar-passagens-titulo">
      <h2 id="anotar-passagens-titulo" style={s.title}>Passagens citadas</h2>
      <div style={s.card}>
        {rows.map((row, i) => (
          <button key={row.key} type="button" style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }} onClick={() => onOpen(row)} aria-label={`Abrir ${row.label} na Bíblia`}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={s.label}>{row.label}</span>
              {row.text && <span style={s.text}>{row.text}</span>}
            </span>
            <Icone name="right" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
          </button>
        ))}
      </div>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 2px 12px' },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '2px 18px' },
  row: { width: '100%', minHeight: 56, border: 'none', background: 'none', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' },
  rowLine: { borderTop: '1px solid var(--bento-line)' },
  label: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1.25, color: 'var(--bento-ink)' },
  text: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)', margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
}
