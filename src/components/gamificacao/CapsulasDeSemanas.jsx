// CapsulasDeSemanas.jsx — as cápsulas das últimas semanas (HANDOFF da
// gamificação §G3; no Hoje, handoff-hoje-50 §3.2): uma por semana, a atual
// à direita. Bateu a meta = preta; não bateu = fundo da tela; atual =
// laranja claro com o laranja subindo de baixo (feitos ÷ meta); anterior
// ao cadastro = transparente, ocupando o lugar. Recebe o que
// computeWeekCapsules devolve; a altura e o vão vêm por prop.
export default function CapsulasDeSemanas({ capsules, height = 10, gap = 2 }) {
  const base = { flex: 1, minWidth: 0, height, borderRadius: 99, position: 'relative', overflow: 'hidden' }
  return (
    <span style={{ display: 'flex', gap, width: '100%' }} aria-hidden="true">
      {capsules.map(c => {
        if (c.beforeStart) return <span key={c.mondayKey} style={base} />
        if (c.isCurrent) {
          return (
            // Laranja claro (#FCDFCF) = o tom de Evangelhos e Atos, ver index.css.
            <span key={c.mondayKey} style={{ ...base, background: 'var(--bloco-evangelhos-atos-tom)' }}>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.round(Math.min(c.fill, 1) * 100)}%`, background: 'var(--bento-accent)' }} />
            </span>
          )
        }
        return <span key={c.mondayKey} style={{ ...base, background: c.met ? 'var(--bento-ink)' : 'var(--bento-bg)' }} />
      })}
    </span>
  )
}
