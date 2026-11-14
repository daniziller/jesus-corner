// SeletorDeRefinar.jsx — um seletor de "REFINAR" na busca da Biblioteca
// (handoff-biblioteca-55 §6.1): o rótulo pequeno (LIVRO, PERÍODO,
// PREGADOR) e o valor numa linha, com a seta. Com valor escolhido o
// seletor fica preto, com a seta laranja. Abre uma folha de escolha;
// anuncia o valor ("Livro: Gênesis"). `selector` vem de
// buscaDaBiblioteca.js/refineSelectors.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function SeletorDeRefinar({ selector, onClick }) {
  const on = selector.applied
  return (
    <button type="button" style={{ ...s.box, ...(on ? s.boxOn : null) }} onClick={onClick} aria-label={selector.aria} aria-haspopup="dialog">
      <span style={{ ...s.label, ...(on ? s.labelOn : null) }}>{selector.label}</span>
      <span style={s.line}>
        <span style={{ ...s.value, ...(on ? s.valueOn : null) }}>{selector.value}</span>
        <AppIcon name="ChevronDown" size={11} strokeWidth={3} color={on ? 'var(--bento-accent)' : 'var(--bento-t3)'} style={{ flexShrink: 0 }} />
      </span>
    </button>
  )
}

const s = {
  box: { flex: 1, minWidth: 0, border: 'none', borderRadius: 14, background: 'var(--bento-card)', padding: '10px 12px', display: 'block', textAlign: 'left', cursor: 'pointer' },
  boxOn: { background: 'var(--bento-ink)' },
  label: { display: 'block', fontFamily: FONT, fontSize: 8.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  labelOn: { color: 'rgba(255,255,255,.5)' },
  line: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  value: { minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 0', margin: '-2px 0' },
  valueOn: { color: '#fff' },
}
