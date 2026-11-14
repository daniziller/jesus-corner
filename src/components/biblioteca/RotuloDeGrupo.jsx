// RotuloDeGrupo.jsx — o rótulo de um grupo da aba Biblioteca (handoff-
// biblioteca-55 §1): maiúsculas pequenas à esquerda e, à direita, uma
// contagem ou uma ação ("Ver tudo", "Limpar").
const FONT = 'var(--font-bento)'

export default function RotuloDeGrupo({ children, right = null, onRight = null }) {
  return (
    <div style={s.row}>
      <h2 style={s.label}>{children}</h2>
      {right != null && (onRight
        ? <button type="button" className="biblioteca-rotulo-acao" style={s.action} onClick={onRight}>{right}</button>
        : <span style={s.right}>{right}</span>)}
    </div>
  )
}

const s = {
  row: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 0' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  right: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  action: { border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', cursor: 'pointer' },
}
