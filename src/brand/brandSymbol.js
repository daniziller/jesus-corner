// Símbolo da marca (quadros 16a–16c do design_handoff_jesus_corner/Jesus
// Corner Redesign.dc.html): livro aberto — tile #1A1714 de raio ~29% do
// lado, duas páginas #A29A91 com linhas de texto #1A1714 e a lombada
// #F0662B. Este módulo é só geometria/cores (sem React) pra ser usado tanto
// pelo componente BrandMark.jsx quanto pelo gerador de ícones em
// brand/render-icons.mjs — uma fonte só, os PNGs nunca divergem da UI.
//
// Medidas exatas de cada tamanho desenhado no quadro; tamanhos entre eles
// são interpolados linearmente, acima de 112 escalam proporcionalmente.
//   size: [tileR, pageW, pageH, pageR, spineW, spineH, gap, lineW, lineShortW, lineH, lineGap]
const SPECS = [
  [16,  5,   4,   8,  1,   2,   11,  1.5, 0,  0,  0,   0],
  [28,  9,   7.5, 14, 2,   2.5, 18,  2.5, 0,  0,  0,   0],
  [44,  14,  12,  22, 3,   3.5, 28,  4,   7,  7,  2,   3],
  [52,  17,  14,  26, 3,   4,   33,  5,   8,  5,  2,   4],
  [72,  22,  20,  36, 4,   5,   44,  6,   11, 7,  2.5, 5],
  [112, 32,  31,  56, 6,   7,   68,  8,   18, 12, 3.5, 7],
]
const KEYS = ['tileR', 'pageW', 'pageH', 'pageR', 'spineW', 'spineH', 'gap', 'lineW', 'lineShortW', 'lineH', 'lineGap']

// Regra de redução do quadro 16b: 72px com três linhas, 44px com duas,
// 28px e 16px sem nenhuma. O tile de 52px da placa do quadro 13a já tem
// três linhas, então o corte pra três fica em 52; o de 34px do cabeçalho
// do site (16b) ainda tem duas, então o corte pra duas fica em 34.
export function defaultLineCount(size) {
  if (size >= 52) return 3
  if (size >= 34) return 2
  return 0
}

export function brandSymbolSpec(size) {
  let lo = SPECS[0], hi = SPECS[SPECS.length - 1]
  if (size <= lo[0]) { const k = size / lo[0]; return withKeys(lo.slice(1).map(v => v * k)) }
  if (size >= hi[0]) { const k = size / hi[0]; return withKeys(hi.slice(1).map(v => v * k)) }
  for (let i = 0; i < SPECS.length - 1; i++) {
    if (size >= SPECS[i][0] && size <= SPECS[i + 1][0]) { lo = SPECS[i]; hi = SPECS[i + 1]; break }
  }
  const f = (size - lo[0]) / (hi[0] - lo[0])
  return withKeys(lo.slice(1).map((v, i) => v + (hi[i + 1] - v) * f))
}
function withKeys(values) {
  return Object.fromEntries(KEYS.map((k, i) => [k, values[i]]))
}

// As três versões do quadro 16c (e só três) + a placa do quadro 13a.
//   default — tile preto, páginas cinza, lombada laranja (sobre claro e sobre laranja).
//   plate   — o símbolo igual, dentro de uma placa #EDE8E2 com 7px de respiro (sobre fundo escuro, 13a).
//   inverse — sobre preto: tile laranja, páginas pretas, lombada #EDE8E2.
//   mono    — carimbo/fatura/favicon monocromático: tudo #A29A91 sobre tile preto.
export const BRAND_COLORS = {
  ink: '#1A1714', page: '#A29A91', spine: '#F0662B', paper: '#EDE8E2',
}
export function brandSymbolColors(variant = 'default') {
  const C = BRAND_COLORS
  if (variant === 'inverse') return { tile: C.spine, page: C.ink, line: C.spine, spine: C.paper }
  if (variant === 'mono') return { tile: C.ink, page: C.page, line: C.ink, spine: C.page }
  if (variant === 'white') return { tile: 'transparent', page: '#FFFFFF', line: 'transparent', spine: '#FFFFFF' }
  // Só o livro, sem o tile — camada de frente do ícone adaptativo do Android.
  if (variant === 'foreground') return { tile: 'transparent', page: C.page, line: C.ink, spine: C.spine }
  return { tile: C.ink, page: C.page, line: C.ink, spine: C.spine }
}

// Placa do quadro 13a: 66px com o tile de 52 dentro → respiro de 7px por
// lado e raio 22 (o raio do tile + o respiro).
export const PLATE_PADDING_RATIO = 7 / 52

// Retângulos do símbolo (em px, origem no canto do tile) — usados pelo SVG
// do componente e pelo gerador de PNG.
export function brandSymbolShapes(size, { lines = defaultLineCount(size), tileRadius } = {}) {
  const s = brandSymbolSpec(size)
  const r = tileRadius ?? s.tileR
  const bookW = s.pageW * 2 + s.gap * 2 + s.spineW
  const x0 = (size - bookW) / 2
  const cy = size / 2
  const shapes = [{ kind: 'tile', x: 0, y: 0, w: size, h: size, r }]
  const pageXs = [x0, x0 + s.pageW + s.gap + s.spineW + s.gap]
  for (const px of pageXs) {
    shapes.push({ kind: 'page', x: px, y: cy - s.pageH / 2, w: s.pageW, h: s.pageH, r: s.pageR })
    if (lines > 0) {
      const total = lines * s.lineH + (lines - 1) * s.lineGap
      let y = cy - total / 2
      for (let i = 0; i < lines; i++) {
        const w = i === lines - 1 && lines === 3 ? s.lineShortW : s.lineW
        shapes.push({ kind: 'line', x: px + (s.pageW - w) / 2, y, w, h: s.lineH, r: 99 })
        y += s.lineH + s.lineGap
      }
    }
  }
  shapes.push({ kind: 'spine', x: x0 + s.pageW + s.gap, y: cy - s.spineH / 2, w: s.spineW, h: s.spineH, r: 99 })
  return shapes
}
