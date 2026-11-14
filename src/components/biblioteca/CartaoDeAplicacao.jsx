// CartaoDeAplicacao.jsx — uma frase do dia: o cartão preto das Aplicações
// (handoff-biblioteca-55 §5, o mesmo do fim de L5): a frase entre aspas,
// em itálico, e "Frase do dia · {data} · cumprida" (ou "em aberto").
// Tocar abre a reflexão daquele dia; sem `onOpen` (a página de leitura), é
// só o cartão. `card` vem de tiposMath.js/applicationCard.
const FONT = 'var(--font-bento)'

export default function CartaoDeAplicacao({ card, onOpen = null, hold }) {
  const body = (
    <>
      <span style={s.quote}>{card.quote}</span>
      <span style={s.meta}>{card.meta}</span>
    </>
  )
  return onOpen
    ? <button type="button" style={{ ...s.card, ...s.button }} onClick={onOpen} {...hold}>{body}</button>
    : <div style={s.card}>{body}</div>
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-ink)', padding: '15px 18px', display: 'block', textAlign: 'left' },
  button: { width: '100%', border: 'none', cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' },
  quote: { display: 'block', fontFamily: FONT, fontSize: 14.5, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.45, color: '#fff', margin: '0 0 8px', overflowWrap: 'anywhere' },
  meta: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.55)' },
}
