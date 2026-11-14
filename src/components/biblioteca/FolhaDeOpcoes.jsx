// FolhaDeOpcoes.jsx — uma folha inferior de escolha, da qual uma opção
// está escolhida: a ordem das pregações e os seletores de refinar da
// busca (livro, período, pregador). Fundo creme, as opções em cartões
// brancos — num cartão só (`options`) ou em grupos com rótulo (`groups`,
// os livros por bloco); cada opção pode trazer uma contagem. Tocar numa
// opção escolhe e fecha (`stay(key)` diz as que não fecham — "De… até…",
// que abre os campos de data em `children`). "Limpar" (`onClear`) volta
// ao padrão. Sem opção nenhuma, o texto de `empty`.
import FolhaInferior from '../FolhaInferior'
import Check from '../passos/Check'

const FONT = 'var(--font-bento)'

export default function FolhaDeOpcoes({ title, options = null, groups = null, current, onChoose, onClose, onClear = null, stay = null, empty = null, children = null }) {
  const sections = (groups ?? [{ id: 'unico', name: null, options }]).filter(section => section.options?.length > 0)
  return (
    <FolhaInferior fixed form onClose={onClose} labelledBy="biblioteca-opcoes-titulo">
      <div style={s.head}>
        <h2 id="biblioteca-opcoes-titulo" style={s.title}>{title}</h2>
        {onClear && <button type="button" className="biblioteca-rotulo-acao" style={s.clear} onClick={() => { onClear(); onClose() }}>Limpar</button>}
      </div>
      <div role="radiogroup" aria-labelledby="biblioteca-opcoes-titulo" style={s.sections}>
        {sections.map(section => (
          <div key={section.id} style={s.section}>
            {section.name && <p style={s.sectionLabel}>{section.name}</p>}
            <div style={s.card}>
              {section.options.map((option, i) => {
                const on = option.key === current
                return (
                  <button
                    key={option.key} type="button" role="radio" aria-checked={on} style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }}
                    onClick={() => { onChoose(option.key); if (!stay?.(option.key)) onClose() }}
                  >
                    <span style={{ ...s.label, ...(on ? s.labelOn : null) }}>{option.label}</span>
                    {option.count != null && <span style={s.count}>{option.count}</span>}
                    <span style={s.check}>{on && <Check size={13} color="var(--bento-accent)" />}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {sections.length === 0 && empty && <p style={s.empty}>{empty}</p>}
      {children}
    </FolhaInferior>
  )
}

const s = {
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '0 2px 12px' },
  title: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  clear: { flexShrink: 0, border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', cursor: 'pointer' },
  sections: { display: 'flex', flexDirection: 'column', gap: 10 },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '4px 2px 0' },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '2px 18px' },
  row: { width: '100%', minHeight: 52, border: 'none', background: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' },
  rowLine: { borderTop: '1px solid var(--bento-line)' },
  label: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-quote-ink)', overflowWrap: 'anywhere' },
  labelOn: { fontWeight: 800, color: 'var(--bento-ink)' },
  count: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t4)' },
  check: { width: 13, flexShrink: 0, display: 'flex' },
  empty: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '0 2px' },
}
