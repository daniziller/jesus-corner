// CartaoDePergunta.jsx — uma pergunta guardada na tela Perguntas
// (handoff-biblioteca-55 §5): a pergunta, a referência de onde foi feita
// (em pastilha — abre a Bíblia ali), o começo da resposta (até duas
// linhas) e quando. Tocar abre a conversa guardada; segurar, o menu do
// item (`hold`). `card` vem de tiposMath.js/questionCard.
import { t } from '../../i18n'
const FONT = 'var(--font-bento)'

export default function CartaoDePergunta({ card, onOpen, onOpenPassage, hold }) {
  return (
    <article style={s.card}>
      <button type="button" style={s.main} onClick={onOpen} {...hold}>
        <span style={s.question}>{card.question}</span>
      </button>
      <div style={s.pills}>
        <button type="button" className="biblioteca-ref" style={s.pill} onClick={() => onOpenPassage(card.pill)} aria-label={t('bibliotecaTx.openInBible', { ref: card.pill.label })}>{card.pill.label}</button>
      </div>
      {/* O resto do cartão também abre a conversa (o botão acima já diz o que é). */}
      <div style={s.rest} onClick={onOpen} aria-hidden="true" {...hold}>
        {card.answer && <span style={s.answer}>{card.answer}</span>}
        <span style={s.when}>{card.when}</span>
      </div>
    </article>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px 14px' },
  // O botão ocupa o respiro de cima do cartão e o vão até a pastilha: com
  // uma linha de pergunta ainda tem 44px de área de toque.
  main: { width: 'calc(100% + 32px)', border: 'none', background: 'none', margin: '-15px -16px 0', padding: '15px 16px 10px', display: 'block', textAlign: 'left', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  question: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: 'var(--bento-ink)', overflowWrap: 'anywhere' },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 5, margin: '0 0 9px' },
  pill: { height: 24, border: 'none', borderRadius: 8, background: 'var(--bento-line)', padding: '0 8px', display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  rest: { cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  answer: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: '0 0 8px', overflowWrap: 'anywhere' },
  when: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
}
