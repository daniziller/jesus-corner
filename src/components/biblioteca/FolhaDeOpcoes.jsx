// FolhaDeOpcoes.jsx — uma folha inferior com uma lista curta de opções,
// da qual uma está escolhida (a ordem das pregações; os seletores de
// refinar da busca). Tocar numa opção escolhe e fecha.
import FolhaInferior from '../FolhaInferior'
import Check from '../passos/Check'

const FONT = 'var(--font-bento)'

export default function FolhaDeOpcoes({ title, options, current, onChoose, onClose }) {
  return (
    <FolhaInferior fixed onClose={onClose} labelledBy="biblioteca-opcoes-titulo">
      <h2 id="biblioteca-opcoes-titulo" style={s.title}>{title}</h2>
      <div role="radiogroup" aria-labelledby="biblioteca-opcoes-titulo">
        {options.map((option, i) => {
          const on = option.key === current
          return (
            <button key={option.key} type="button" role="radio" aria-checked={on} style={{ ...s.row, ...(i > 0 ? s.rowLine : null) }} onClick={() => { onChoose(option.key); onClose() }}>
              <span style={{ ...s.label, ...(on ? s.labelOn : null) }}>{option.label}</span>
              {on && <Check size={13} color="var(--bento-accent)" />}
            </button>
          )
        })}
      </div>
    </FolhaInferior>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  row: { width: '100%', height: 52, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', cursor: 'pointer' },
  rowLine: { borderTop: '1px solid var(--bento-line)' },
  label: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1.2, color: 'var(--bento-quote-ink)' },
  labelOn: { fontWeight: 800, color: 'var(--bento-ink)' },
}
