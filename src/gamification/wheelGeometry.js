// wheelGeometry.js — a geometria exata da roda da Bíblia (HANDOFF §2),
// pura e testável: 66 fatias em anel, viewBox 300×300, centro (150,150).
//
//   r0 = 80  r1 = 136   folga entre livros 0,7°   folga entre blocos 3,4°
//   ângulo útil = 360 − 66×0,7 − 8×(3,4 − 0,7) = 292,2°
//   início 1,7° depois do topo, sentido horário, Gênesis → Apocalipse
//   modo livros:    todas as fatias com 292,2/66
//   modo capitulos: fatia proporcional, 292,2 × capítulos/1189
//   depois de cada livro +0,7°; depois do último livro do bloco +3,4°
import { GAMIFICATION_BOOKS, BIBLE_CHAPTERS } from '../data/gamificationBlocks.js'

export const R0 = 80
export const R1 = 136
export const CENTER = 150
export const GAP_BOOK = 0.7
export const GAP_BLOCK = 3.4
export const USABLE_DEGREES = 360 - 66 * GAP_BOOK - 8 * (GAP_BLOCK - GAP_BOOK) // 292.2
export const START_DEGREES = GAP_BLOCK / 2 // 1.7
export const MIN_SECTOR_DEGREES = 0.04
export const MARKER_RADIUS = R1 + 8

// Ângulo (graus, 0 = topo, horário) → ponto no raio r.
export function point(r, degrees) {
  const t = ((degrees - 90) * Math.PI) / 180
  return [CENTER + r * Math.cos(t), CENTER + r * Math.sin(t)]
}

const fmt = n => Math.round(n * 1000) / 1000

// Setor de anel entre a0 e a1 graus, de rIn a rOut: dois arcos + duas
// retas. Vazio ('') se a largura for menor que MIN_SECTOR_DEGREES.
export function sectorPath(a0, a1, rIn, rOut) {
  if (a1 - a0 < MIN_SECTOR_DEGREES) return ''
  const large = a1 - a0 > 180 ? 1 : 0
  const [x0, y0] = point(rOut, a0)
  const [x1, y1] = point(rOut, a1)
  const [x2, y2] = point(rIn, a1)
  const [x3, y3] = point(rIn, a0)
  return `M${fmt(x0)} ${fmt(y0)}A${rOut} ${rOut} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}A${rIn} ${rIn} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)}Z`
}

// As 66 fatias de um modo: [{ nome, sigla, blocoId, capitulos, a0, a1,
// trail }] — `trail` é o path do trilho inteiro (r0→r1, no tom do bloco).
// Não depende do progresso: calcula-se uma vez por modo e memoiza.
export function computeSlices(mode) {
  const slices = []
  let a = START_DEGREES
  GAMIFICATION_BOOKS.forEach((book, i) => {
    const width = mode === 'capitulos' ? (USABLE_DEGREES * book.capitulos) / BIBLE_CHAPTERS : USABLE_DEGREES / 66
    const a0 = a
    const a1 = a + width
    slices.push({ nome: book.nome, sigla: book.sigla, blocoId: book.blocoId, posicao: book.posicao, capitulos: book.capitulos, a0, a1, trail: sectorPath(a0, a1, R0, R1) })
    const next = GAMIFICATION_BOOKS[i + 1]
    a = a1 + (next && next.blocoId === book.blocoId ? GAP_BOOK : GAP_BLOCK)
  })
  return slices
}

// Preenchimento de uma fatia com `lidos` capítulos (na cor do bloco):
// modo livros cresce de dentro pra fora; modo capitulos no sentido
// horário. '' quando não há nada a desenhar.
export function fillPath(slice, lidos, mode) {
  if (!lidos || lidos <= 0) return ''
  const ratio = Math.min(1, lidos / slice.capitulos)
  if (mode === 'capitulos') return sectorPath(slice.a0, slice.a0 + (slice.a1 - slice.a0) * ratio, R0, R1)
  return sectorPath(slice.a0, slice.a1, R0, R0 + (R1 - R0) * ratio)
}

// Ângulo do marcador do livro atual: meio da fatia (livros) ou fim do
// preenchimento (capitulos).
export function markerAngle(slice, lidos, mode) {
  if (mode === 'capitulos') return slice.a0 + (slice.a1 - slice.a0) * Math.min(1, (lidos ?? 0) / slice.capitulos)
  return (slice.a0 + slice.a1) / 2
}

// Contorno de destaque de um livro: de r0−4 a r1+4, 0,6° além de cada
// lado da fatia.
export function highlightPath(slice) {
  return sectorPath(slice.a0 - 0.6, slice.a1 + 0.6, R0 - 4, R1 + 4)
}
