// CartaoAgora.jsx — o cartão preto que diz o que fazer agora (handoff-
// passos-pedidos-53-54 §1): rótulo laranja · título · texto. Com `clock`
// (a oração ACTS), o tempo da etapa fica à direita do rótulo — o que falta,
// contando junto com o relógio do cabeçalho — e uma barra fina no pé do
// cartão mostra quanto da etapa já passou. `clock` vem de
// passosMath.js/stageClock, com `aria` (stageClockAria).
const FONT = 'var(--font-bento)'

export default function CartaoAgora({ label, title, text, clock = null, children }) {
  return (
    <div style={s.card}>
      <div style={s.top}>
        <p style={s.label}>{label}</p>
        {clock && (
          <span style={s.clock} role="img" aria-label={clock.aria}>
            <span style={{ ...s.clockTime, ...(clock.overtime ? s.overtime : null), opacity: clock.running === false ? 0.6 : 1 }} aria-hidden="true">{clock.text}</span>
          </span>
        )}
      </div>
      <h2 style={s.title}>{title}</h2>
      {text && <p style={s.text}>{text}</p>}
      {children}
      {clock && (
        <div style={s.bar} aria-hidden="true">
          <div style={{ ...s.barFill, width: `${Math.round(clock.progress * 100)}%`, ...(clock.overtime ? s.barDone : null) }} />
        </div>
      )}
    </div>
  )
}

const s = {
  card: { flexShrink: 0, borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 19px' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 14 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  clock: { flexShrink: 0, display: 'flex', alignItems: 'center' },
  clockTime: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1, letterSpacing: '-.2px', color: '#fff', fontVariantNumeric: 'tabular-nums', transition: 'opacity .2s' },
  overtime: { color: 'rgba(255,255,255,.45)' },
  title: { fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px', color: '#fff', margin: '12px 0 8px' },
  text: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.65)', margin: 0, textWrap: 'pretty' },
  bar: { height: 4, borderRadius: 99, background: 'rgba(255,255,255,.12)', margin: '16px 0 0', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)', transition: 'width .25s linear' },
  barDone: { background: 'rgba(255,255,255,.35)' },
}
