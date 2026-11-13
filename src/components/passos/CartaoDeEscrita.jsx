// CartaoDeEscrita.jsx — o cartão de escrita de uma etapa da oração ACTS
// (handoff-passos-pedidos-53-54 §2, item 4): as frases de começo como
// pastilhas, o campo e a linha de privacidade. Tocar numa pastilha escreve
// a frase no campo (sem as reticências, numa linha nova se já houver
// texto) e deixa o cursor no fim.
//
// Privacidade: este componente só devolve o texto a quem o chamou
// (`onChange`). Não guarda, não envia, não importa nenhum armazenamento —
// o que se escreve na oração não sai da tela.
import { useState } from 'react'
import { insertStarter } from '../../passos/passosMath.js'
import CampoQueCresce from './CampoQueCresce'

const FONT = 'var(--font-bento)'

export default function CartaoDeEscrita({ starters, value, onChange }) {
  // Cada toque numa pastilha leva o cursor ao fim do campo — inclusive na
  // mesma frase de novo, quando o texto não muda.
  const [focusEndKey, setFocusEndKey] = useState(0)
  function writeStarter(phrase) {
    const next = insertStarter(value, phrase)
    if (next !== value) onChange(next)
    setFocusEndKey(k => k + 1)
  }

  return (
    <div style={s.card}>
      <p style={s.label}>Se ajudar, comece assim</p>
      <div style={s.pills}>
        {starters.map(phrase => (
          <button key={phrase} type="button" className="passo-pastilha" style={s.pill} onClick={() => writeStarter(phrase)}>
            {phrase}
          </button>
        ))}
      </div>
      <CampoQueCresce
        className="passo-campo" style={s.field} minHeight={96} focusEndKey={focusEndKey}
        placeholder="Escreva, ou só ore. Nada aqui é obrigatório."
        aria-label="O que você quer dizer a Deus. Opcional."
        value={value} onChange={onChange}
      />
      <p style={s.privacy}>Só seu. Nunca vai para grupo nem para a Biblioteca.</p>
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 14px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '11px 0 12px' },
  pill: { height: 34, padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1, color: 'var(--bento-quote-ink)', cursor: 'pointer', whiteSpace: 'nowrap' },
  field: { borderRadius: 16, background: 'var(--bento-line)', padding: '13px 14px', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-ink)' },
  privacy: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: '10px 2px 0' },
}
