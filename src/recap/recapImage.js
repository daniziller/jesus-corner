// Imagem do cartão da retrospectiva (quadro 17b) — desenhada num canvas
// (3× o cartão de 350px) pra sair no compartilhamento como imagem, com a
// marca discreta no canto. navigator.share com arquivo quando o aparelho
// deixa; senão, abre a imagem numa aba nova.
const W = 1050
const PAD = 72
const INK = '#1A1714'
const ACCENT = '#F0662B'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export async function renderRecapImage({ month, title, tiles, verse, next, brandText }) {
  if (typeof document === 'undefined') return null
  try { await document.fonts?.load?.('800 100px Manrope') } catch { /* segue com fallback */ }
  const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px Manrope, system-ui, sans-serif`

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  // Altura calculada depois do conteúdo — desenha duas vezes: mede, depois pinta.
  const measure = () => {
    ctx.font = font(800, 102)
    const titleLines = wrap(ctx, title, W - PAD * 2)
    let h = PAD + 90 + 78 + 30 + titleLines.length * 108 + 78
    if (tiles.length) h += Math.ceil(tiles.length / 2) * (228 + 24) + 6
    let verseLines = []
    if (verse?.text) { ctx.font = font(500, 40, true); verseLines = wrap(ctx, `"${verse.text}"`, W - PAD * 2 - 96); h += 48 + 28 + verseLines.length * 60 + 18 + 33 + 48 + 30 }
    if (next) h += 60
    h += PAD
    return { h: Math.max(h, 1200), titleLines, verseLines }
  }
  const { h: H, titleLines, verseLines } = measure()
  canvas.width = W; canvas.height = H

  ctx.fillStyle = '#EDE8E2'; ctx.fillRect(0, 0, W, H)
  roundRect(ctx, 0, 0, W, H, 84); ctx.fillStyle = INK; ctx.fill()
  ctx.save(); roundRect(ctx, 0, 0, W, H, 84); ctx.clip()
  ctx.beginPath(); ctx.arc(W + 90 - 240, -90 + 240, 240, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,102,43,.16)'; ctx.fill()
  ctx.restore()

  // Marca: tile 90 (30×3) com duas páginas e a lombada laranja + logotipo.
  let y = PAD
  roundRect(ctx, PAD, y, 90, 90, 30); ctx.fillStyle = INK; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4.5; roundRect(ctx, PAD, y, 90, 90, 30); ctx.stroke()
  ctx.fillStyle = '#A29A91'; roundRect(ctx, PAD + 45 - 3.75 - 7.5 - 22.5, y + 24, 22.5, 42, 6); ctx.fill()
  roundRect(ctx, PAD + 45 + 3.75 + 7.5, y + 24, 22.5, 42, 6); ctx.fill()
  ctx.fillStyle = ACCENT; roundRect(ctx, PAD + 45 - 3.75, y + 18, 7.5, 54, 4); ctx.fill()
  ctx.font = font(800, 39); ctx.textBaseline = 'middle'
  const brandA = brandText.split(' ')[0]
  ctx.fillStyle = '#fff'; ctx.fillText(brandA, PAD + 90 + 30, y + 45)
  const wA = ctx.measureText(`${brandA} `).width
  ctx.fillStyle = ACCENT; ctx.fillText(brandText.slice(brandA.length + 1), PAD + 90 + 30 + wA, y + 45)
  y += 90 + 78

  ctx.textBaseline = 'top'
  ctx.font = font(800, 31.5); ctx.fillStyle = ACCENT
  ctx.letterSpacing = '4px'
  ctx.fillText(month.toUpperCase(), PAD, y)
  ctx.letterSpacing = '0px'
  y += 30 + 30
  ctx.font = font(800, 102); ctx.fillStyle = '#fff'
  ctx.letterSpacing = '-4.8px'
  for (const line of titleLines) { ctx.fillText(line, PAD, y); y += 108 }
  ctx.letterSpacing = '0px'
  y += 78 - 30

  if (tiles.length) {
    const tw = (W - PAD * 2 - 24) / 2
    tiles.forEach((tile, i) => {
      const x = PAD + (i % 2) * (tw + 24)
      const ty = y + Math.floor(i / 2) * (228 + 24)
      roundRect(ctx, x, ty, tw, 228, 54); ctx.fillStyle = tile.accent ? 'rgba(240,102,43,.16)' : 'rgba(255,255,255,.06)'; ctx.fill()
      ctx.font = font(800, 90); ctx.fillStyle = tile.accent ? ACCENT : '#fff'; ctx.letterSpacing = '-4.2px'
      ctx.fillText(tile.num, x + 48, ty + 48)
      const numW = ctx.measureText(tile.num).width
      if (tile.unit) { ctx.font = font(800, 51); ctx.fillStyle = tile.accent ? 'rgba(240,102,43,.6)' : '#fff'; ctx.fillText(tile.unit, x + 48 + numW + 2, ty + 48 + 34) }
      ctx.letterSpacing = '0px'
      ctx.font = font(600, 33); ctx.fillStyle = 'rgba(255,255,255,.5)'
      ctx.fillText(tile.label, x + 48, ty + 48 + 90 + 18)
    })
    y += Math.ceil(tiles.length / 2) * (228 + 24) + 6
  }

  if (verse?.text) {
    const vh = 48 + 28 + verseLines.length * 60 + 18 + 33 + 48
    roundRect(ctx, PAD, y, W - PAD * 2, vh, 54); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill()
    ctx.font = font(800, 28.5); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.letterSpacing = '3.4px'
    ctx.fillText(verse.label.toUpperCase(), PAD + 48, y + 48)
    ctx.letterSpacing = '0px'
    let vy = y + 48 + 28 + 24
    ctx.font = font(500, 40, true); ctx.fillStyle = 'rgba(255,255,255,.85)'
    for (const line of verseLines) { ctx.fillText(line, PAD + 48, vy); vy += 60 }
    ctx.font = font(800, 33); ctx.fillStyle = ACCENT
    ctx.fillText(verse.ref, PAD + 48, vy + 18)
    y += vh + 30
  }

  if (next) {
    ctx.font = font(500, 34.5); ctx.fillStyle = 'rgba(255,255,255,.35)'
    ctx.fillText(next, PAD, y + 12)
  }

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

export async function shareRecapImage(blob, { title, text }) {
  if (!blob) return false
  const file = new File([blob], 'seu-mes.png', { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return true } catch { return false }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ title, text }); return true } catch { /* cai no fallback */ }
  }
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}
