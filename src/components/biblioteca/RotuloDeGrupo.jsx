// RotuloDeGrupo.jsx — o rótulo de um grupo da aba Biblioteca (handoff-
// biblioteca-55 §1): maiúsculas pequenas à esquerda e, à direita, uma
// contagem ou uma ação ("Ver tudo", "Limpar"). `select`: a ação é um
// seletor — texto mais escuro e a seta para baixo ("Mais recentes").
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function RotuloDeGrupo({ children, right = null, onRight = null, select = false, rightLabel }) {
  return (
    <div style={{ ...s.row, ...(select ? s.rowSelect : null) }}>
      <h2 style={s.label}>{children}</h2>
      {right != null && (onRight
        ? (
          <button type="button" className="biblioteca-rotulo-acao" style={{ ...s.action, ...(select ? s.select : null) }} onClick={onRight} aria-label={rightLabel} aria-haspopup={select ? 'dialog' : undefined}>
            {right}
            {select && <AppIcon name="ChevronDown" size={11} strokeWidth={3} color="var(--bento-t3)" />}
          </button>
        )
        : <span style={s.right}>{right}</span>)}
    </div>
  )
}

const s = {
  row: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 0' },
  rowSelect: { alignItems: 'center' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  right: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  action: { flexShrink: 0, border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', cursor: 'pointer' },
  select: { display: 'flex', alignItems: 'center', gap: 5, color: 'var(--bento-quote-ink)' },
}
