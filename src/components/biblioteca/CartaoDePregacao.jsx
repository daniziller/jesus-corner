// CartaoDePregacao.jsx — uma anotação na tela Pregações (L2, handoff-
// biblioteca-55 §3.4): tipo · data, o título, "{Pregador} · {Instituição}",
// o começo do que foi escrito (até três linhas) e as passagens citadas em
// pastilhas — cada uma abre a Bíblia naquele versículo. Tocar no cartão
// abre a anotação; segurar, o menu do item (`hold`). `card` vem de
// tiposMath.js/sermonCard.
const FONT = 'var(--font-bento)'

export default function CartaoDePregacao({ card, onOpen, onOpenPassage, hold }) {
  const hasPills = card.pills.length > 0
  return (
    <article style={s.card}>
      <button type="button" style={s.main} onClick={onOpen} {...hold}>
        <span style={s.top}>
          <span style={s.type}>{card.type}</span>
          <span style={s.date}>{card.date}</span>
        </span>
        <span style={{ ...s.title, ...(card.sub ? null : s.titleAlone) }}>{card.title}</span>
        {card.sub && <span style={s.sub}>{card.sub}</span>}
        {card.excerpt && <span style={{ ...s.excerpt, ...(hasPills ? null : s.excerptLast) }}>{card.excerpt}</span>}
      </button>
      {hasPills && (
        <div style={s.pills}>
          {card.pills.map((p, i) => (
            <button key={`${p.label}-${i}`} type="button" className="biblioteca-ref" style={s.pill} onClick={() => onOpenPassage(p)} aria-label={`Abrir ${p.label} na Bíblia`}>{p.label}</button>
          ))}
          {card.more && <span style={{ ...s.pill, cursor: 'default' }}>{card.more}</span>}
        </div>
      )}
    </article>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px 14px' },
  main: { width: '100%', border: 'none', background: 'none', padding: 0, display: 'block', textAlign: 'left', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 0 8px' },
  type: { minWidth: 0, fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-icon)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  date: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  title: { display: 'block', fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.3px', color: 'var(--bento-ink)', margin: '0 0 3px', overflowWrap: 'anywhere' },
  titleAlone: { margin: '0 0 9px' },
  sub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--bento-t3)', margin: '0 0 9px', overflowWrap: 'anywhere' },
  excerpt: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden', fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-quote-ink)', margin: '0 0 11px', overflowWrap: 'anywhere' },
  excerptLast: { margin: 0 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  pill: { height: 24, border: 'none', borderRadius: 8, background: 'var(--bento-line)', padding: '0 8px', display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
}
