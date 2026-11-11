// CartaoDeEscrita.jsx — o cartão de escrita de uma etapa da oração ACTS
// (handoff-passos-pedidos-53-54 §2, item 4): as frases de começo como
// pastilhas, o campo e a linha de privacidade. Tocar numa pastilha escreve
// a frase no campo (sem as reticências, numa linha nova se já houver
// texto) e deixa o cursor no fim.
//
// Privacidade: este componente só devolve o texto a quem o chamou
// (`onChange`). Não guarda, não envia, não importa nenhum armazenamento —
// o que se escreve na oração não sai da tela.
import { useRef, useLayoutEffect } from 'react'
import { insertStarter } from '../../passos/passosMath.js'

const FONT = 'var(--font-bento)'

export default function CartaoDeEscrita({ starters, value, onChange }) {
  const fieldRef = useRef(null)
  const focusEndRef = useRef(false)

  // O campo cresce com o texto (mínimo de 96px).
  useLayoutEffect(() => {
    const el = fieldRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(96, el.scrollHeight)}px`
    if (focusEndRef.current) {
      focusEndRef.current = false
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.scrollIntoView?.({ block: 'nearest' })
    }
  }, [value])

  function writeStarter(phrase) {
    focusEndRef.current = true
    const next = insertStarter(value, phrase)
    if (next === value) {
      // A mesma frase de novo: nada muda no texto, só o cursor volta ao fim.
      focusEndRef.current = false
      const el = fieldRef.current
      el?.focus()
      el?.setSelectionRange(el.value.length, el.value.length)
      return
    }
    onChange(next)
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
      <textarea
        ref={fieldRef} className="passo-campo" style={s.field} rows={1}
        placeholder="Escreva, ou só ore. Nada aqui é obrigatório."
        aria-label="O que você quer dizer a Deus. Opcional."
        value={value} onChange={e => onChange(e.target.value)}
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
  field: { display: 'block', width: '100%', minHeight: 96, boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden', borderRadius: 16, background: 'var(--bento-line)', padding: '13px 14px', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-ink)' },
  privacy: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: '10px 2px 0' },
}
