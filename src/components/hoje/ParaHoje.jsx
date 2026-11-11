// ParaHoje.jsx — a lista "Para hoje" do Hoje (handoff-hoje-50 §6): um
// cartão branco com linhas (título, subtítulo que pode quebrar em duas
// linhas e nunca é cortado, e à direita um chevron ou um botão). Quais
// linhas aparecem e com que texto vem de paraHojeRows (hojeMath.js); aqui
// só se desenha.
//
// Tocar na linha chama onOpen(key). Numa linha com botão ("Cumpri", "Já
// li"), o botão é um alvo à parte (44px de área) e chama onAction(key) sem
// navegar; depois de marcado vira texto.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function ParaHoje({ rows, onOpen, onAction }) {
  return (
    <div style={s.card}>
      <p style={s.label}>PARA HOJE</p>
      {rows.map((row, i) => (
        <div key={row.key} style={{ ...s.row, borderBottom: i < rows.length - 1 ? '1px solid var(--bento-line)' : 'none' }}>
          <button type="button" style={s.main} onClick={() => onOpen?.(row.key)}>
            <span style={s.text}>
              <span style={s.title}>{row.title}</span>
              {row.subtitle == null
                ? <span className="rb-context-skeleton" style={s.subSkeleton} />
                : <span style={s.sub}>{row.subtitle}</span>}
            </span>
            {row.right.kind === 'chevron' && <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />}
          </button>
          {row.right.kind === 'button' && (
            <button type="button" style={s.actionTarget} onClick={() => onAction?.(row.key)}>
              <span style={s.action}>{row.right.label}</span>
            </button>
          )}
          {row.right.kind === 'done' && <span style={s.done}>{row.right.label}</span>}
        </div>
      ))}
    </div>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 18px 2px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 12 },
  main: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', padding: '13px 0', textAlign: 'left', cursor: 'pointer', fontFamily: FONT },
  text: { flex: 1, minWidth: 0, display: 'block' },
  title: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)' },
  sub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)', marginTop: 3 },
  subSkeleton: { display: 'block', width: '80%', height: 10, borderRadius: 99, background: 'var(--bento-line)', marginTop: 6 },
  // Área de toque de 44px em volta do botão de 34px.
  actionTarget: { flexShrink: 0, height: 44, display: 'flex', alignItems: 'center', border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  action: { height: 34, padding: '0 14px', borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#fff' },
  done: { flexShrink: 0, fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)' },
}
