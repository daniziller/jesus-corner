// CartaoAgora.jsx — o cartão preto que diz o que fazer agora (handoff-
// passos-pedidos-53-54 §1): rótulo laranja · título · texto.
const FONT = 'var(--font-bento)'

export default function CartaoAgora({ label, title, text, children }) {
  return (
    <div style={s.card}>
      <p style={s.label}>{label}</p>
      <h2 style={s.title}>{title}</h2>
      {text && <p style={s.text}>{text}</p>}
      {children}
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 19px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  title: { fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px', color: '#fff', margin: '12px 0 8px' },
  text: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.65)', margin: 0, textWrap: 'pretty' },
}
