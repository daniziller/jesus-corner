// CartaoDeReflexao.jsx — uma reflexão na tela Reflexões (handoff-
// biblioteca-55 §5): o título (o livro e os capítulos do dia) e quando; o
// começo da primeira resposta; e, se houver frase do dia, uma linha em
// itálico com ela. Tocar abre a reflexão em leitura; segurar, o menu do
// item (`hold`). `card` vem de tiposMath.js/reflectionCard.
const FONT = 'var(--font-bento)'

export default function CartaoDeReflexao({ card, onOpen, hold }) {
  return (
    <button type="button" style={s.card} onClick={onOpen} {...hold}>
      <span style={s.top}>
        <span style={s.title}>{card.title}</span>
        <span style={s.when}>{card.when}</span>
      </span>
      {card.excerpt && <span style={s.excerpt}>{card.excerpt}</span>}
      {card.phrase && <span style={s.phrase}>{card.phrase}</span>}
    </button>
  )
}

const clamp = lines => ({ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflow: 'hidden' })

const s = {
  card: { width: '100%', border: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px 14px', display: 'block', textAlign: 'left', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  title: { minWidth: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.3px', color: 'var(--bento-ink)', overflowWrap: 'anywhere' },
  when: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  excerpt: { ...clamp(3), fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-quote-ink)', margin: '7px 0 0', overflowWrap: 'anywhere' },
  phrase: { ...clamp(2), fontFamily: FONT, fontSize: 12.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-t2)', margin: '9px 0 0', overflowWrap: 'anywhere' },
}
