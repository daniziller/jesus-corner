// LeituraDoItemScreen.jsx — um item da Biblioteca aberto só para ler
// (handoff-biblioteca-55): a reflexão de um dia — o texto inteiro, com as
// perguntas e as respostas, e a frase daquele dia no cartão preto — ou
// uma pergunta guardada, com a resposta inteira. Nada aqui se edita.
// `page` vem de tiposMath.js/readingPage.
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import CartaoDeAplicacao from '../components/biblioteca/CartaoDeAplicacao'
import { ListaDoTipo, tipoStyles as t } from '../components/biblioteca/TelaDeTipo'

const FONT = 'var(--font-bento)'

export default function LeituraDoItemScreen({ page, onBack, onOpenPassage }) {
  return (
    <div style={t.screen}>
      <CabecalhoDoPasso title={page.title} subtitle={page.sub} onBack={onBack} />
      <ListaDoTipo>
        {page.kind === 'pergunta' ? (
          <div style={s.card}>
            <p style={s.question}>{page.question}</p>
            <div style={s.pills}>
              <button type="button" className="biblioteca-ref" style={s.pill} onClick={() => onOpenPassage(page.pill)} aria-label={`Abrir ${page.pill.label} na Bíblia`}>{page.pill.label}</button>
            </div>
            <p style={{ ...s.answer, ...(page.answer ? null : s.muted) }}>{page.answer || 'Esta pergunta ficou sem resposta guardada.'}</p>
          </div>
        ) : (
          <>
            {page.blocks.length > 0 && (
              <div style={s.card}>
                {page.blocks.map((block, i) => (
                  <div key={i} style={i > 0 ? s.block : null}>
                    {block.question && <p style={s.blockQuestion}>{block.question}</p>}
                    <p style={s.text}>{block.answer}</p>
                  </div>
                ))}
              </div>
            )}
            {page.phrase && <CartaoDeAplicacao card={page.phrase} />}
          </>
        )}
      </ListaDoTipo>
    </div>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 18px 17px' },
  block: { marginTop: 16 },
  blockQuestion: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 5px', overflowWrap: 'anywhere' },
  text: { fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-ink)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  question: { fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-.3px', color: 'var(--bento-ink)', margin: 0, overflowWrap: 'anywhere' },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 5, margin: '11px 0 13px' },
  pill: { height: 24, border: 'none', borderRadius: 8, background: 'var(--bento-line)', padding: '0 8px', display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  answer: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-quote-ink)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  muted: { color: 'var(--bento-t3)' },
}
