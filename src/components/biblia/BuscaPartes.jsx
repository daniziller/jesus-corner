// BuscaPartes.jsx — as peças que todos os grupos da busca usam (handoff-
// biblia-52 §6): o rótulo de grupo (com algo à direita, quando há), o
// cartão branco de lista e a linha de lista.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

// Rótulo de grupo — "ONDE VOCÊ ESTAVA". `right` é o que vai à direita
// (uma contagem, ou o botão Limpar).
export function GrupoRotulo({ children, right }) {
  return (
    <div style={s.label}>
      <p style={s.labelText}>{children}</p>
      {right}
    </div>
  )
}

export function ListaCartao({ children }) {
  return <div style={s.card}>{children}</div>
}

// Linha de lista: título + subtítulo + chevron; `icon` à esquerda (o
// relógio das buscas recentes); `last` tira o fio de baixo; `clamp` corta
// o subtítulo em duas linhas (o começo de um versículo).
export function ListaLinha({ title, sub, icon, last, clamp, onClick, ariaLabel }) {
  return (
    <button type="button" style={{ ...s.row, borderBottom: last ? 'none' : '1px solid var(--bento-line)' }} onClick={onClick} aria-label={ariaLabel}>
      {icon && <span style={s.rowIcon}><AppIcon name={icon} size={13} strokeWidth={1.5} absoluteStrokeWidth color="var(--bento-t4)" /></span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={s.rowTitle}>{title}</span>
        {sub && <span style={{ ...s.rowSub, ...(clamp ? s.rowSubClamp : null) }}>{sub}</span>}
      </span>
      <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// Medidas do HANDOFF §6 ("Corpo" e "Linha de lista"). Antes de cada
// rótulo o arquivo de referência põe um espaçador de 2px como item da
// coluna — com os vãos de 10px, são 22px do cartão de cima até o rótulo;
// os 12px daqui somam com o vão.
const s = {
  label: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '12px 2px 0', flexShrink: 0 },
  labelText: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px', flexShrink: 0 },
  row: { width: '100%', minHeight: 52, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' },
  // O ícone ocupa os 15px do quadro, com o desenho um pouco menor dentro.
  rowIcon: { width: 15, height: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: 'var(--bento-ink)', marginBottom: 2 },
  rowSub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)' },
  rowSubClamp: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
}
