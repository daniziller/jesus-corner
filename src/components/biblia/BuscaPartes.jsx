// BuscaPartes.jsx — as peças que todos os grupos da busca usam (handoff-
// biblia-52 §6): o cabeçalho com o campo, o rótulo de grupo (com algo à
// direita, quando há), o cartão branco de lista e a linha de lista. A
// busca da Biblioteca (handoff-biblioteca-55 §6) usa o mesmo cabeçalho e
// a mesma lista.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

// O cabeçalho de uma busca: voltar · o campo de 46px com o contorno
// interno preto, a lupa e o cursor laranja · e, com texto, a bolinha de
// limpar. O teclado sobe ao entrar.
export function CabecalhoDeBusca({ value, onChange, onClear, onBack, backLabel = 'Voltar', placeholder, label, inputRef }) {
  return (
    <div style={s.header}>
      <button type="button" className="biblia-alvo" style={s.back} onClick={onBack} aria-label={backLabel}>
        <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
      </button>
      <div style={s.field}>
        <span style={s.lens}><AppIcon name="Search" size={14} strokeWidth={1.7} absoluteStrokeWidth color="var(--bento-ink)" /></span>
        <input
          ref={inputRef}
          className="busca-campo"
          style={s.input}
          type="text" inputMode="search" enterKeyHint="search"
          autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
        />
        {value && (
          <button type="button" style={s.clear} onClick={onClear} aria-label="Limpar a busca">
            <span style={s.clearDot}><AppIcon name="X" size={10} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-t2)" /></span>
          </button>
        )}
      </div>
    </div>
  )
}

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
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '20px 20px 0' },
  back: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  field: { flex: 1, minWidth: 0, height: 46, borderRadius: 16, background: 'var(--bento-card)', boxShadow: 'inset 0 0 0 2px var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px' },
  lens: { width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', caretColor: 'var(--bento-accent)' },
  // Botão de limpar: a bolinha de 20px do quadro dentro de uma área de
  // toque de 44px (as margens negativas devolvem a sobra ao desenho). O
  // cinza é o mesmo do glifo apagado das medalhas (#E4DED7).
  clear: { width: 44, height: 44, flexShrink: 0, margin: '0 -12px', border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  clearDot: { width: 20, height: 20, borderRadius: 99, background: 'var(--medalha-glifo-apagado)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
