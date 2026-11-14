// CartaoDeLivro.jsx — os itens de um livro numa tela de tipo da Biblioteca
// (L3 "Por livro", handoff-biblioteca-55 §4.3; Notas, §5): o quadradinho
// na cor do bloco do livro, o nome e a contagem; os dois itens mais
// recentes; e, com mais de dois, "Ver os {n} de {Livro}", que abre o
// livro no lugar. Areia nas Marcações, branco nas Notas (`tone`). `group`
// vem de tiposMath.js (marksByBook, notesByBook).
import { blockColorVar } from '../../data/gamificationBlocks'
import { bookMarksShown } from '../../biblioteca/tiposMath'
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function CartaoDeLivro({ group, expanded, onExpand, renderRow, tone = 'sand' }) {
  const white = tone === 'white'
  const shown = bookMarksShown(group, expanded)
  return (
    <section style={{ ...s.card, ...(white ? s.cardWhite : null) }} aria-label={`${group.name}, ${group.count}`}>
      <div style={s.head}>
        <span style={{ ...s.marker, background: blockColorVar(group.blocoId) }} />
        <h3 style={{ ...s.name, ...(white ? s.inkWhite : null) }}>{group.name}</h3>
        <span style={{ ...s.count, ...(white ? s.countWhite : null) }}>{group.count}</span>
      </div>
      {shown.map(item => renderRow(item))}
      {group.more && !expanded && (
        <button type="button" style={{ ...s.more, ...(white ? s.moreWhite : null) }} onClick={onExpand} aria-expanded="false">
          {group.more}
          <AppIcon name="ArrowRight" size={15} strokeWidth={2.2} color={white ? 'var(--bento-accent)' : 'var(--bento-sand-icon)'} style={{ flexShrink: 0 }} />
        </button>
      )}
    </section>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-sand)', padding: '15px 18px 3px' },
  cardWhite: { background: 'var(--bento-card)' },
  inkWhite: { color: 'var(--bento-ink)' },
  countWhite: { color: 'var(--bento-t3)' },
  moreWhite: { borderTop: '1px solid var(--bento-line)', color: 'var(--bento-ink)' },
  head: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' },
  marker: { width: 9, height: 9, flexShrink: 0, borderRadius: 3 },
  name: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.3px', color: 'var(--bento-sand-ink-strong)', margin: 0 },
  count: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-label)' },
  more: { width: '100%', height: 46, border: 'none', borderTop: '1px solid var(--bento-sand-line)', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand-ink-strong)', textAlign: 'left', cursor: 'pointer' },
}
