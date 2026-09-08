// verseCardImage.js — a imagem de marca de 39i (Compartilhar), pacote 39.
// Mesmo espírito de home/verseShareImage.js e routine/dayCompleteImage.js
// (canvas → blob PNG 2x → navigator.share com arquivo, ou download): "o
// que se vê é a imagem, em escala — não um painel que depois vira
// imagem". Três proporções (Retrato 1080×1350, Quadrado 1080×1080, Story
// 1080×1920) × quatro estilos de paleta — a mesma assinatura da marca em
// TODOS eles, redesenhada aqui em vez de reusar a de verseShareImage.js
// porque o fundo muda de cor (ali é sempre escuro).
const FORMATS = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
}

// bg = fundo do cartão; ink = texto principal (versículo/nota); accent =
// referência/losango/"Corner"/lombada — nos três estilos claros é o
// laranja de sempre; no estilo laranja em si, vira ink (laranja sobre
// laranja não se leria), o mesmo princípio já usado em botões/células
// sobre --bento-accent no resto do app.
const STYLES = {
  dark:   { bg: '#1A1714', ink: '#FFFFFF', accent: '#F0662B', muted: 'rgba(255,255,255,.55)', pages: '#A29A91' },
  sand:   { bg: '#E6DACB', ink: '#3A2A18', accent: '#F0662B', muted: 'rgba(58,42,24,.55)', pages: '#8B8279' },
  light:  { bg: '#EDE8E2', ink: '#1A1714', accent: '#F0662B', muted: 'rgba(26,23,20,.5)', pages: '#A29A91' },
  orange: { bg: '#F0662B', ink: '#1A1714', accent: '#1A1714', muted: 'rgba(26,23,20,.55)', pages: '#1A1714' },
}

export const VERSE_CARD_STYLES = ['dark', 'sand', 'light', 'orange']
export const VERSE_CARD_FORMATS = ['portrait', 'square', 'story']

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

// Assinatura da marca (páginas + lombada laranja + "Jesus' Corner" +
// @jesuscorner) — mesma composição de verseShareImage.js/recapImage.js,
// só com as cores vindas do estilo escolhido em vez de fixas.
function drawSignature(ctx, x, bottomY, style, font) {
  const s = STYLES[style]
  const markSize = 64
  const markY = bottomY - markSize
  roundRect(ctx, x, markY, markSize, markSize, 20)
  ctx.fillStyle = style === 'dark' ? '#1A1714' : 'rgba(0,0,0,.06)'
  ctx.fill()
  const cx = x + markSize / 2, cy = markY + markSize / 2
  ctx.fillStyle = s.pages
  roundRect(ctx, cx - 3 - 5 - 16, cy - 17, 16, 34, 4); ctx.fill()
  roundRect(ctx, cx + 3 + 5, cy - 17, 16, 34, 4); ctx.fill()
  ctx.fillStyle = s.accent
  roundRect(ctx, cx - 3, cy - 13, 6, 26, 3); ctx.fill()

  ctx.textBaseline = 'middle'
  ctx.font = font(800, 27)
  const textX = x + markSize + 18
  const textY = markY + markSize / 2 - 12
  ctx.fillStyle = s.ink
  ctx.fillText("Jesus'", textX, textY)
  const w1 = ctx.measureText("Jesus' ").width
  ctx.fillStyle = s.accent
  ctx.fillText('Corner', textX + w1, textY)

  ctx.font = font(600, 22)
  ctx.fillStyle = s.muted
  ctx.fillText('@jesuscorner', textX, textY + 34)
}

export async function renderVerseCardImage({ text, ref, versionShort, note, style = 'dark', format = 'portrait' }) {
  if (typeof document === 'undefined') return null
  try { await document.fonts?.load?.('800 100px Manrope') } catch { /* segue com fallback */ }
  const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px Manrope, system-ui, sans-serif`

  const { w: W, h: H } = FORMATS[format] ?? FORMATS.portrait
  const s = STYLES[style] ?? STYLES.dark
  const PAD = 80

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = s.bg
  ctx.fillRect(0, 0, W, H)

  // Formatos verticais (story) deixam ~9% da base livres de informação
  // (mesma regra de dayCompleteImage.js) — a assinatura mora ali dentro,
  // não além dele.
  const bottomSafe = format === 'story' ? H * 0.09 : PAD * 0.7
  const contentBottom = H - bottomSafe - 64 - 24 // acima da assinatura

  // Losango — único elemento decorativo, sempre no topo.
  const diamondSize = 26
  ctx.save()
  ctx.translate(PAD + diamondSize / 2, PAD + diamondSize / 2)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = s.accent
  const half = diamondSize / 2.6
  roundRect(ctx, -half, -half, half * 2, half * 2, 5)
  ctx.fill()
  ctx.restore()

  const maxTextWidth = W - PAD * 2
  const quoted = `“${text}”`
  const verseTop = PAD + diamondSize + 56

  let verseFontSize = format === 'square' ? 52 : 58
  let verseLines = []
  let lineHeight = 0
  const availableForVerse = contentBottom - verseTop - 120 // reserva pra referência (+ nota, se houver)
  while (verseFontSize > 30) {
    ctx.font = font(500, verseFontSize, true)
    lineHeight = verseFontSize * 1.5
    verseLines = wrap(ctx, quoted, maxTextWidth)
    if (verseLines.length * lineHeight < availableForVerse) break
    verseFontSize -= 3
  }
  ctx.font = font(500, verseFontSize, true)
  ctx.fillStyle = s.ink
  ctx.textBaseline = 'top'
  let vy = verseTop
  for (const line of verseLines) { ctx.fillText(line, PAD, vy); vy += lineHeight }

  vy += 20
  ctx.font = font(800, 30)
  ctx.fillStyle = s.accent
  ctx.fillText(versionShort ? `${ref} · ${versionShort}` : ref, PAD, vy)
  vy += 44

  // Nota (opcional, "Incluir minha nota") — abaixo da referência, em
  // itálico mais discreto, só quando a pessoa liga o interruptor.
  if (note && note.trim()) {
    ctx.font = font(500, 26, true)
    ctx.fillStyle = s.muted
    const noteLines = wrap(ctx, `"${note.trim()}"`, maxTextWidth)
    for (const line of noteLines.slice(0, 3)) { ctx.fillText(line, PAD, vy); vy += 34 }
  }

  drawSignature(ctx, PAD, H - bottomSafe, style, font)

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

export async function shareVerseCardImage(blob, { title, text }) {
  if (!blob) return false
  const file = new File([blob], 'versiculo.png', { type: 'image/png' })
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

export function downloadVerseCardImage(blob) {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'versiculo.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
