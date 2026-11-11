// TrilhaActs.jsx — a trilha fina das quatro etapas da oração ACTS
// (handoff-passos-pedidos-53-54 §2, item 2): um traço e o nome de cada
// uma. Feita em marrom, a atual em laranja com o nome em preto, as por vir
// no trilho. Não é tocável; para o leitor de tela é uma imagem só, "Etapa
// 2 de 4, Confissão". `trail` vem de actsTrail (passos/passosMath.js).
const FONT = 'var(--font-bento)'
const BAR = { done: 'var(--bento-sand-icon)', now: 'var(--bento-accent)', upcoming: 'var(--bento-t6)' }
const NAME = {
  done: { fontWeight: 600, color: 'var(--bento-sand-icon)' },
  now: { fontWeight: 800, color: 'var(--bento-ink)' },
  upcoming: { fontWeight: 600, color: 'var(--bento-t4)' },
}

export default function TrilhaActs({ trail, ariaLabel }) {
  return (
    <div style={s.row} role="img" aria-label={ariaLabel}>
      {trail.map(st => (
        <div key={st.id} style={s.col} aria-hidden="true">
          <div style={{ ...s.bar, background: BAR[st.status] }} />
          <p style={{ ...s.name, ...NAME[st.status] }}>{st.name}</p>
        </div>
      ))}
    </div>
  )
}

const s = {
  // No quadro há um respiro de 2px entre a trilha e o cartão preto, com os
  // 10px do vão da coluna de cada lado dele: 12px a mais embaixo.
  row: { flexShrink: 0, display: 'flex', gap: 5, marginBottom: 12 },
  col: { flex: 1, minWidth: 0 },
  bar: { height: 5, borderRadius: 99, margin: '0 0 7px' },
  name: { fontFamily: FONT, fontSize: 10.5, lineHeight: 1, margin: 0 },
}
