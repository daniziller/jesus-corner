// dayCompleteImage.js — a imagem exportável do dia concluído (37c/37d,
// pacote 36-37). Mesmo espírito de home/verseShareImage.js (canvas 2D →
// blob PNG → navigator.share com arquivo; desenho da marca duplicado de
// propósito, telas pequenas assim não valem o acoplamento de
// compartilhar) — mas aqui é A MESMA função que desenha tanto o cartão
// reduzido de 37c (o "painel" É a imagem, não uma versão à parte que
// depois vira imagem) quanto o arquivo final 1080×1920 de 37d.
const W = 1080
const H = 1920
const PAD = 96
const INK = '#1A1714'
const ACCENT = '#F0662B'
const HANDLE = '@jesuscorner'

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

// data: { dayNumber, dateLabel (já formatado, "terça, 2 de setembro"),
//   name, chapterLabel (ou null — vira "Li X hoje" sem o nome), phrase
//   (ou null), minutes: {prayer,reading,reflection} (segundos reais),
//   totalMinutes, weeksInGoal, percentRead (0-100), percentReadChapter,
//   labels: { ..., day, myPhraseToday } }. `labels` já chega traduzida de
//   DayCompleteScreen.jsx — nenhum texto fica preso em português aqui
//   dentro (achado na conferência do handoff-app-completo: "DIA N" e
//   "MINHA FRASE DE HOJE" eram os 2 únicos literais fixos do arquivo,
//   saindo sempre em pt mesmo pra quem usa o app em inglês).
// include: { phrase, times, whereInBible, name } — chips de 37c; qualquer
// um desligado fecha o espaço (não deixa buraco), mesma regra do quadro.
export async function renderDayCompleteImage(data, include) {
  if (typeof document === 'undefined') return null
  try { await document.fonts?.load?.('800 100px Manrope') } catch { /* segue com fallback */ }
  const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px Manrope, system-ui, sans-serif`

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)

  // 12% de cima / 9% de baixo ficam sem informação (safe area do story) —
  // todo o conteúdo desenha só entre topY e bottomY.
  const topY = H * 0.12
  const bottomY = H * (1 - 0.09)
  let y = topY

  ctx.textBaseline = 'top'
  ctx.font = font(800, 34); ctx.fillStyle = ACCENT
  ctx.letterSpacing = '3px'
  ctx.fillText(`${data.labels.day.toUpperCase()} ${data.dayNumber} · ${data.dateLabel.toUpperCase()}`, PAD, y)
  ctx.letterSpacing = '0px'
  y += 74

  const title = include.name && data.name
    ? data.titleWithName
    : data.titleWithoutName
  ctx.font = font(800, 62); ctx.fillStyle = '#fff'
  const titleLines = wrap(ctx, title, W - PAD * 2)
  const titleLineHeight = 74
  for (const line of titleLines) { ctx.fillText(line, PAD, y); y += titleLineHeight }
  y += 32

  if (include.phrase && data.phrase) {
    const cardPad = 40
    ctx.font = font(500, 40, true)
    const phraseText = `"${data.phrase}"`
    const phraseLines = wrap(ctx, phraseText, W - PAD * 2 - cardPad * 2)
    const phraseLineHeight = 58
    const cardHeight = 48 + 30 + phraseLines.length * phraseLineHeight + cardPad
    roundRect(ctx, PAD, y, W - PAD * 2, cardHeight, 26); ctx.fillStyle = 'rgba(240,102,43,.14)'; ctx.fill()
    let py = y + cardPad
    ctx.font = font(800, 26); ctx.fillStyle = ACCENT
    ctx.letterSpacing = '2px'
    ctx.fillText(data.labels.myPhraseToday.toUpperCase(), PAD + cardPad, py)
    ctx.letterSpacing = '0px'
    py += 48
    ctx.font = font(500, 40, true); ctx.fillStyle = '#fff'
    for (const line of phraseLines) { ctx.fillText(line, PAD + cardPad, py); py += phraseLineHeight }
    y += cardHeight + 40
  }

  if (include.times) {
    const gap = 20
    const boxW = (W - PAD * 2 - gap * 2) / 3
    const boxH = 150
    const stepDefs = [
      { key: 'prayer', label: data.labels.prayer },
      { key: 'reading', label: data.labels.reading },
      { key: 'reflection', label: data.labels.reflection },
    ]
    stepDefs.forEach((step, i) => {
      const x = PAD + i * (boxW + gap)
      roundRect(ctx, x, y, boxW, boxH, 20); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill()
      ctx.font = font(800, 22); ctx.fillStyle = 'rgba(255,255,255,.45)'
      ctx.letterSpacing = '1.5px'
      ctx.fillText(step.label.toUpperCase(), x + 28, y + 28)
      ctx.letterSpacing = '0px'
      const mins = Math.round((data.minutes[step.key] ?? 0) / 60)
      ctx.font = font(800, 46); ctx.fillStyle = '#fff'
      ctx.fillText(String(mins), x + 28, y + 66)
      const numW = ctx.measureText(String(mins)).width
      ctx.font = font(700, 24); ctx.fillStyle = 'rgba(255,255,255,.5)'
      ctx.fillText('min', x + 28 + numW + 8, y + 84)
    })
    y += boxH + 40
  }

  if (include.times || include.whereInBible) {
    const rowH = 56
    const rows = []
    if (include.times) rows.push([data.labels.timeToday, `${Math.round(data.totalSeconds / 60)} min`])
    if (include.whereInBible) {
      rows.push([data.labels.weeksInGoal, String(data.weeksInGoal)])
      rows.push([data.labels.whereInBible, `${data.percentRead} · ${data.chapterShort || ''}`.trim().replace(/·\s*$/, '').trim()])
    }
    ctx.font = font(500, 32)
    rows.forEach(([label, value]) => {
      ctx.fillStyle = 'rgba(255,255,255,.55)'
      ctx.fillText(label, PAD, y + (rowH - 32) / 2)
      ctx.font = font(800, 32); ctx.fillStyle = '#fff'
      const vw = ctx.measureText(value).width
      ctx.fillText(value, W - PAD - vw, y + (rowH - 32) / 2)
      ctx.font = font(500, 32)
      y += rowH
    })
    y += 20
  }

  // Assinatura no rodapé — fica presa perto de bottomY, não onde `y`
  // parou (o cartão pode terminar bem antes disso com blocos desligados).
  const footerY = Math.min(bottomY - 130, Math.max(y + 40, bottomY - 130))
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(PAD, footerY); ctx.lineTo(W - PAD, footerY); ctx.stroke()

  const markY = footerY + 44
  const markSize = 88
  roundRect(ctx, PAD, markY, markSize, markSize, 30); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 4; roundRect(ctx, PAD, markY, markSize, markSize, 30); ctx.stroke()
  const cx = PAD + markSize / 2, cy = markY + markSize / 2
  ctx.fillStyle = '#A29A91'
  roundRect(ctx, cx - 3.5 - 7 - 22, cy - 24, 22, 48, 6); ctx.fill()
  roundRect(ctx, cx + 3.5 + 7, cy - 24, 22, 48, 6); ctx.fill()
  ctx.fillStyle = ACCENT
  roundRect(ctx, cx - 3.5, cy - 18, 7, 36, 4); ctx.fill()

  ctx.textBaseline = 'top'
  ctx.font = font(800, 38)
  ctx.fillStyle = '#fff'; ctx.fillText("Jesus'", PAD + markSize + 26, markY + 4)
  const jesusW = ctx.measureText("Jesus' ").width
  ctx.fillStyle = ACCENT; ctx.fillText('Corner', PAD + markSize + 26 + jesusW, markY + 4)
  ctx.font = font(600, 30); ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.fillText(HANDLE, PAD + markSize + 26, markY + 46)

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

// Mesmo mecanismo de home/verseShareImage.js (shareVerseImage) — arquivo
// primeiro (Instagram/WhatsApp etc. só aparecem no seletor nativo com um
// arquivo, não com texto solto).
export async function shareDayCompleteImage(blob, { title, text }) {
  if (!blob) return false
  const file = new File([blob], 'meu-dia.png', { type: 'image/png' })
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

// "Salvar imagem" (37c) — sem Web Share, um link com download força o
// navegador a salvar direto (funciona em qualquer navegador/PWA real,
// diferente do sandbox de um Artifact publicado).
export function downloadDayCompleteImage(blob) {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'meu-dia.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
