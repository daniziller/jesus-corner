// Símbolo da marca (quadros 16a–16c) como SVG — geometria em
// src/brand/brandSymbol.js, compartilhada com o gerador dos ícones do app.
//   variant: 'default' | 'plate' (sobre escuro, quadro 13a) | 'inverse' | 'mono'
//   lines: força o número de linhas nas páginas (padrão: regra de redução).
import { brandSymbolShapes, brandSymbolColors, defaultLineCount, PLATE_PADDING_RATIO, BRAND_COLORS } from '../brand/brandSymbol'

export default function BrandMark({ size = 44, variant = 'default', lines, style, ...props }) {
  const isPlate = variant === 'plate'
  const tileSize = isPlate ? Math.round(size / (1 + 2 * PLATE_PADDING_RATIO)) : size
  const pad = isPlate ? (size - tileSize) / 2 : 0
  const colors = brandSymbolColors(isPlate ? 'default' : variant)
  const shapes = brandSymbolShapes(tileSize, { lines: lines ?? defaultLineCount(tileSize) })
  const tile = shapes[0]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0, ...style }} aria-hidden="true" {...props}>
      {isPlate && <rect x={0} y={0} width={size} height={size} rx={tile.r + pad} fill={BRAND_COLORS.paper} />}
      <g transform={`translate(${pad} ${pad})`}>
        {shapes.map((sh, i) => (
          <rect
            key={i}
            x={sh.x} y={sh.y} width={sh.w} height={sh.h}
            rx={Math.min(sh.r, sh.w / 2, sh.h / 2)}
            fill={sh.kind === 'tile' ? colors.tile : sh.kind === 'page' ? colors.page : sh.kind === 'line' ? colors.line : colors.spine}
          />
        ))}
      </g>
    </svg>
  )
}
