// QuemVe.jsx — "QUEM VÊ" de uma anotação (N3 e N4, handoff-biblioteca-55
// §7A.3): três blocos lado a lado — "Só eu / na Biblioteca" primeiro e
// selecionado; depois os grupos da pessoa, com quantas pessoas. Mais de um
// grupo pode ser escolhido; "Só eu" desmarca os grupos. Com mais de dois
// grupos a fileira rola de lado. `blocks` vem de anotarMath.js/whoSeesBlocks.
const FONT = 'var(--font-bento)'

export default function QuemVe({ blocks, onToggle }) {
  const scrolls = blocks.length > 3
  return (
    <div role="group" aria-label="Quem vê" style={{ ...s.row, ...(scrolls ? s.rowScroll : null) }}>
      {blocks.map(block => (
        <button
          key={block.key} type="button" aria-pressed={block.on}
          style={{ ...s.block, ...(scrolls ? s.blockFixed : null), ...(block.on ? s.blockOn : null) }} onClick={() => onToggle(block.key)}
        >
          <span style={{ ...s.title, ...(block.on ? s.titleOn : null) }}>{block.title}</span>
          {block.sub && <span style={{ ...s.sub, ...(block.on ? s.subOn : null) }}>{block.sub}</span>}
        </button>
      ))}
    </div>
  )
}

const s = {
  row: { display: 'flex', gap: 6, margin: '12px 0 11px' },
  rowScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '12px -16px 11px', padding: '0 16px' },
  block: { flex: 1, minWidth: 0, minHeight: 44, border: 'none', borderRadius: 16, background: 'var(--bento-line)', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', cursor: 'pointer' },
  blockFixed: { flex: '0 0 104px' },
  blockOn: { background: 'var(--bento-ink)' },
  title: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, color: 'var(--bento-ink)', margin: '0 0 4px', overflowWrap: 'anywhere' },
  titleOn: { color: '#fff' },
  sub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  subOn: { color: 'rgba(255,255,255,.55)' },
}
