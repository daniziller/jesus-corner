// RelogioDoPasso.jsx — a pílula do relógio no cabeçalho de um passo
// (handoff-passos-pedidos-53-54 §1): ponto laranja + o tempo que falta.
// Tocar pausa e retoma. Pausado, o ponto e o tempo esmaecem. Zerado, a
// pílula pulsa uma vez e o tempo passa a contar para cima, em cinza, como
// o relógio dos passos sempre fez — informa, não cobra.
//
// Leitor de tela: os algarismos ficam escondidos; o nome do botão diz os
// minutos que faltam e só muda de minuto em minuto, sem região viva — nada
// é anunciado a cada segundo.
import { clockDisplay, clockAria } from '../../passos/passosMath.js'

const FONT = 'var(--font-bento)'

export default function RelogioDoPasso({ totalSeconds, elapsedSeconds, running, onToggle, flash = false }) {
  const { text, overtime } = clockDisplay(totalSeconds, elapsedSeconds)
  return (
    <button
      type="button" className="passo-alvo" style={{ ...s.pill, ...(flash ? s.flash : null) }}
      onClick={onToggle} aria-label={clockAria(totalSeconds, elapsedSeconds, running)} aria-live="off"
    >
      <span style={{ ...s.dot, opacity: running ? 1 : 0.35 }} aria-hidden="true" />
      <span style={{ ...s.time, opacity: running ? 1 : 0.65, ...(overtime ? s.overtime : null) }} aria-hidden="true">{text}</span>
    </button>
  )
}

const s = {
  pill: { height: 38, flexShrink: 0, padding: '0 12px', borderRadius: 13, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'transform .25s ease-out' },
  flash: { transform: 'scale(1.06)' },
  dot: { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-accent)', transition: 'opacity .2s' },
  overtime: { color: 'var(--bento-t3)' },
  time: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1, letterSpacing: '-.2px', color: '#fff', fontVariantNumeric: 'tabular-nums', transition: 'opacity .2s' },
}
