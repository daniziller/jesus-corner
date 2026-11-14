// QuadradoDoTipo.jsx — um quadrado de "POR TIPO" na raiz da Biblioteca
// (L1 §2.4): o marcador e o nome, a contagem e a linha de apoio. O
// tratamento vem do tipo (`tile`, de bibliotecaMath.js/typeTiles):
// Marcações em areia, os demais em branco.
import AppIcon from '../../icons/AppIcon'

const FONT = 'var(--font-bento)'
const MARKER = { ink: 'var(--bento-ink)', sand: 'var(--bento-sand-icon)', accent: 'var(--bento-accent)' }

export default function QuadradoDoTipo({ tile, onClick }) {
  const sand = tile.tone === 'sand'
  return (
    <button type="button" style={{ ...s.tile, ...(sand ? s.tileSand : null) }} onClick={onClick} aria-label={tile.aria}>
      <span style={s.top}>
        <span style={{ ...s.marker, borderRadius: tile.marker === 'circle' ? 99 : 3, background: MARKER[tile.color] }} />
        <span style={{ ...s.name, ...(sand ? s.inkSand : null) }}>{tile.name}</span>
        <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
      </span>
      <span style={{ ...s.count, ...(sand ? s.inkSand : null) }}>{tile.count}</span>
      <span style={{ ...s.support, ...(sand ? s.supportSand : null) }}>{tile.support}</span>
    </button>
  )
}

const s = {
  tile: { minWidth: 0, border: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '14px 14px 13px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', textAlign: 'left', cursor: 'pointer' },
  tileSand: { background: 'var(--bento-sand)' },
  top: { display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px' },
  marker: { width: 9, height: 9, flexShrink: 0 },
  name: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.3px', color: 'var(--bento-ink)' },
  count: { display: 'block', fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: '0 0 7px' },
  support: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)' },
  inkSand: { color: 'var(--bento-sand-ink-strong)' },
  supportSand: { color: 'var(--bento-sand-label)' },
}
