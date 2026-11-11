// CartaoPergunta.jsx — o cartão preto da pergunta atual da reflexão
// (handoff-passos-pedidos-53-54 §5, item 3): "PERGUNTA {n} DE 3" e os
// marcadores, a pergunta, e o campo dentro do cartão. `view` vem de
// reflectionView (passos/reflexaoMath.js). Sem `onChange` (as perguntas
// ainda estão sendo preparadas), só o texto, sem campo.
import CampoQueCresce from './CampoQueCresce'

const FONT = 'var(--font-bento)'

export default function CartaoPergunta({ label, markers, question, placeholder, value, onChange, children }) {
  return (
    <div style={s.card}>
      {/* Trocar de pergunta é anunciado; o que se digita, não. */}
      <div aria-live="polite">
        <div style={s.top}>
          <p style={s.label}>{label}</p>
          <div style={s.markers} aria-hidden="true">
            {markers.map((on, i) => <span key={i} style={{ ...s.marker, ...(on ? s.markerOn : null) }} />)}
          </div>
        </div>
        <h2 style={{ ...s.question, ...(onChange ? null : s.waiting) }}>{question}</h2>
      </div>
      {onChange && (
        <CampoQueCresce
          className="passo-campo-escuro" style={s.field} minHeight={104}
          placeholder={placeholder} aria-label={`${question} ${placeholder}`}
          value={value} onChange={onChange}
        />
      )}
      {children}
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 26, background: 'var(--bento-ink)', padding: 18 },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 0 12px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  markers: { display: 'flex', gap: 4, flexShrink: 0 },
  marker: { width: 6, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.2)' },
  markerOn: { width: 18, background: 'var(--bento-accent)' },
  question: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.6px', color: '#fff', margin: '0 0 16px', textWrap: 'pretty' },
  waiting: { color: 'rgba(255,255,255,.45)', margin: 0 },
  field: { borderRadius: 16, background: 'rgba(255,255,255,.08)', padding: '13px 14px', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: '#fff' },
}
