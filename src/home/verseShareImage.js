// verseShareImage.js — cartão do "Versículo do dia" (Home, 34a) desenhado
// num canvas no formato do Instagram Stories (1080×1920, 9:16), com a marca
// Jesus' Corner e o @ do Instagram — pra quem compartilhar já sair com a
// cara do app e o jeito de encontrar a gente. Mesmo espírito de
// recap/recapImage.js (canvas → blob PNG → navigator.share com arquivo,
// que é o que faz o Instagram oferecer "Adicionar aos stories" no seletor
// nativo de compartilhamento — não existe API própria do Instagram
// acessível de dentro de um PWA, o share sheet do sistema é o caminho
// real). Desenho da marca duplicado de propósito (não extraído pra um
// helper comum) — mesmo raciocínio de joinNames/BOOK_EN_BY_PT em outros
// arquivos: telas pequenas assim não valem o acoplamento de compartilhar.
const W = 1080
const H = 1920
const PAD = 96
const INK = '#1A1714'
const ACCENT = '#F0662B'
const INSTAGRAM_HANDLE = '@jesuscorner.app'

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

export async function renderVerseShareImage({ text, ref, version, brandText }) {
  if (typeof document === 'undefined') return null
  try { await document.fonts?.load?.('800 100px Manrope') } catch { /* segue com fallback */ }
  const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px Manrope, system-ui, sans-serif`

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fundo escuro com o mesmo brilho laranja discreto no canto do recap.
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()
  ctx.beginPath(); ctx.arc(W + 120 - 320, -120 + 320, 320, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,102,43,.16)'; ctx.fill()
  ctx.beginPath(); ctx.arc(-120 + 260, H + 120 - 260, 260, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,102,43,.1)'; ctx.fill()
  ctx.restore()

  // Marca: tile com duas páginas + lombada laranja + logotipo — mesma
  // composição de recap/recapImage.js, tamanhos maiores pro formato vertical.
  const markSize = 108
  let y = PAD
  roundRect(ctx, PAD, y, markSize, markSize, 36); ctx.fillStyle = INK; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 5; roundRect(ctx, PAD, y, markSize, markSize, 36); ctx.stroke()
  const cx = PAD + markSize / 2, cy = y + markSize / 2
  ctx.fillStyle = '#A29A91'
  roundRect(ctx, cx - 4.5 - 9 - 27, cy - 29, 27, 58, 7); ctx.fill()
  roundRect(ctx, cx + 4.5 + 9, cy - 29, 27, 58, 7); ctx.fill()
  ctx.fillStyle = ACCENT
  roundRect(ctx, cx - 4.5, cy - 22, 9, 44, 5); ctx.fill()
  ctx.font = font(800, 46); ctx.textBaseline = 'middle'
  const brandA = brandText.split(' ')[0]
  ctx.fillStyle = '#fff'; ctx.fillText(brandA, PAD + markSize + 30, cy)
  const wA = ctx.measureText(`${brandA} `).width
  ctx.fillStyle = ACCENT; ctx.fillText(brandText.slice(brandA.length + 1), PAD + markSize + 30 + wA, cy)
  y += markSize

  // Versículo do dia — rótulo laranja pequeno, texto grande e itálico
  // (mesmo tom da leitura), quebrado pra caber; a fonte diminui sozinha se
  // o versículo for longo, em vez de estourar o cartão (caso extremo:
  // versículo de mais de uma linha longa).
  const labelY = y + 150
  ctx.textBaseline = 'top'
  ctx.font = font(800, 32); ctx.fillStyle = ACCENT
  ctx.letterSpacing = '3.5px'
  ctx.fillText('VERSÍCULO DO DIA', PAD, labelY)
  ctx.letterSpacing = '0px'

  const maxTextWidth = W - PAD * 2
  const quoted = `"${text}"`
  let verseFontSize = 76
  let verseLines = []
  let lineHeight = 0
  while (verseFontSize > 40) {
    ctx.font = font(500, verseFontSize, true)
    lineHeight = verseFontSize * 1.42
    verseLines = wrap(ctx, quoted, maxTextWidth)
    if (verseLines.length * lineHeight < H - labelY - 150 - 260) break
    verseFontSize -= 4
  }
  const verseBlockHeight = verseLines.length * lineHeight
  const verseTop = labelY + 150 + Math.max(0, (H - labelY - 150 - 260 - verseBlockHeight) / 2)
  ctx.font = font(500, verseFontSize, true); ctx.fillStyle = '#fff'
  let vy = verseTop
  for (const line of verseLines) { ctx.fillText(line, PAD, vy); vy += lineHeight }

  ctx.font = font(800, 38); ctx.fillStyle = ACCENT
  ctx.fillText(version ? `${ref} · ${version}` : ref, PAD, vy + 24)

  // Rodapé: @ do Instagram, sempre visível (é o motivo do cartão existir).
  const footerY = H - PAD - 44
  ctx.font = font(700, 36); ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.fillText(INSTAGRAM_HANDLE, PAD, footerY)

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

// Mesmo mecanismo de shareRecapImage (recap/recapImage.js) — arquivo
// primeiro (Instagram/WhatsApp/etc. aparecem no seletor nativo só quando o
// compartilhamento é de um arquivo, não de texto solto); sem suporte,
// abre a imagem numa aba nova pra salvar manualmente.
export async function shareVerseImage(blob, { title, text }) {
  if (!blob) return false
  const file = new File([blob], 'versiculo-do-dia.png', { type: 'image/png' })
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
