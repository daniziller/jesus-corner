// EtiquetasDaAnotacao.jsx — as etiquetas de uma anotação (N3 e N4,
// handoff-biblioteca-55 §7A.3): pastilhas de 32px com as etiquetas da
// pessoa, as mais usadas primeiro — marcadas em preto; mais de uma pode
// ficar marcada — e "+ nova", que abre um campo curto para criar uma.
// `choices` vem de anotarMath.js/tagChoices.
import { useState } from 'react'

const FONT = 'var(--font-bento)'

export default function EtiquetasDaAnotacao({ choices, onToggle }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  function confirm() {
    const clean = text.trim()
    if (clean) onToggle(clean)
    setText('')
    setAdding(false)
  }
  return (
    <div style={s.row} role="group" aria-label="Etiquetas">
      {choices.map(choice => (
        <button key={choice.tag} type="button" className="biblioteca-etiqueta" aria-pressed={choice.on} style={{ ...s.pill, ...(choice.on ? s.pillOn : null) }} onClick={() => onToggle(choice.tag)}>
          {choice.label}
        </button>
      ))}
      {adding ? (
        <input
          autoFocus type="text" style={s.input} value={text} maxLength={24} placeholder="nova etiqueta" aria-label="Nova etiqueta"
          onChange={e => setText(e.target.value)} onBlur={confirm}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { setText(''); setAdding(false) } }}
        />
      ) : (
        <button type="button" className="biblioteca-etiqueta" style={s.pill} onClick={() => setAdding(true)}>+ nova</button>
      )}
    </div>
  )
}

const s = {
  row: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 0' },
  pill: { height: 32, border: 'none', borderRadius: 11, background: 'var(--bento-line)', padding: '0 11px', display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', whiteSpace: 'nowrap', cursor: 'pointer' },
  pillOn: { background: 'var(--bento-ink)', fontWeight: 800, color: '#fff' },
  input: { height: 32, width: 124, boxSizing: 'border-box', border: 'none', borderRadius: 11, background: 'var(--bento-line)', outline: '2px solid var(--bento-ink)', padding: '0 11px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)' },
}
