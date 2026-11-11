// BarraDoDia.jsx — a barra do dia: um segmento por passo de hoje, com a
// largura proporcional aos minutos do passo. Feito em marrom, o de agora
// em laranja, os por vir no trilho. É a mesma barra no Meu Plano (6px) e
// em cima de cada passo (5px, handoff-passos-pedidos-53-54 §1).
// `segments`: [{ key, minutes, status: 'done' | 'now' | 'upcoming' }].
const COLOR = { done: 'var(--bento-sand-icon)', now: 'var(--bento-accent)', upcoming: 'var(--bento-t6)' }

export default function BarraDoDia({ segments, height = 5, style, ...rest }) {
  return (
    <div style={{ display: 'flex', gap: 5, ...style }} {...rest}>
      {segments.map(st => (
        <span key={st.key} style={{ flex: st.minutes, height, minWidth: 0, borderRadius: 99, background: COLOR[st.status] }} />
      ))}
    </div>
  )
}
