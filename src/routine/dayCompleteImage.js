// dayCompleteImage.js — a imagem exportável do dia concluído (37c/37d,
// pacote 36-37). Mesmo espírito de home/verseShareImage.js (canvas 2D →
// blob PNG → navigator.share com arquivo; desenho da marca duplicado de
// propósito, telas pequenas assim não valem o acoplamento de
// compartilhar) — mas aqui é A MESMA função que desenha tanto o cartão
// reduzido do editor da imagem (DayShareScreen.jsx, aberto por
// "Compartilhar meu dia" no dia concluído — o "painel" É a imagem, não uma
// versão à parte que depois vira imagem) quanto o arquivo final 1080×1920.
import { computeSlices, fillPath, markerAngle, point, MARKER_RADIUS, CENTER } from '../gamification/wheelGeometry.js'
import { blockById } from '../data/gamificationBlocks.js'

const W = 1080
const H = 1920
const PAD = 84
const INK = '#1A1714'
const ACCENT = '#F0662B'
const HANDLE = '@jesuscorner'

const SLICES = computeSlices('livros')

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

// O cartão escuro (escolhido em 17/11): a data, "32 minutos com Deus.",
// a frase do dia num cartão laranja, a roda da Bíblia com o livro de hoje
// e, ao lado, o livro em andamento e os dias da semana, e a barra dos
// passos com os minutos. Cada parte desligada no editor sai sem deixar
// buraco.
//
// data: { dayNumber, dateLabel (já formatado), name, phrase (ou null),
//   minutes: {prayer,reading,reflection} (segundos), totalSeconds,
//   titleWithName/titleWithoutName (sem tempo: "Diego leu Gênesis 41
//   hoje."), percentRead ("4,2%"), reads ({ livro: capítulos lidos }),
//   currentBook (nome canônico do livro de hoje, ou null),
//   book: { label, lidos, total, blocoId } | null, week: { feitos, meta } | null,
//   labels: { day, minutes ("32 minutos"), withGod, phraseSub, ofBible,
//     bookCount ("41 de 50"), sealLeft, weekValue ("1 de 4"), daysThisWeek,
//     prayer, reading, reflection, min } }. `labels` já chega traduzida de
//   DayShareScreen.jsx — nenhum texto fica preso em português aqui.
// include: { phrase, times, whereInBible, name } — chips do editor.
const CARD = 'rgba(255,255,255,.07)'
const SOFT = 'rgba(255,255,255,.55)'

function cssColor(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch { return fallback }
}

// A roda da Bíblia (mesma geometria de RodaDaBiblia.jsx, em canvas): o
// trilho de cada livro no tom do bloco, o lido na cor do bloco e o ponto
// laranja no livro de hoje.
function drawWheel(ctx, x, y, size, { reads, currentBook, center1, center2 }) {
  const k = size / 300
  ctx.save()
  ctx.translate(x, y); ctx.scale(k, k)
  for (const s of SLICES) {
    const block = blockById(s.blocoId)
    ctx.fillStyle = cssColor(`--bloco-${s.blocoId}-tom`, block?.tom ?? '#444')
    ctx.fill(new Path2D(s.trail))
    const fill = fillPath(s, reads?.[s.nome] ?? 0, 'livros')
    if (fill) { ctx.fillStyle = cssColor(`--bloco-${s.blocoId}`, block?.cor ?? '#888'); ctx.fill(new Path2D(fill)) }
  }
  const current = currentBook ? SLICES.find(s => s.nome === currentBook) : null
  if (current) {
    const [mx, my] = point(MARKER_RADIUS, markerAngle(current, reads?.[current.nome] ?? 0, 'livros'))
    ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = ACCENT; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke()
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  if (center1) { ctx.font = `800 46px Manrope, system-ui, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(center1, CENTER, CENTER + 8) }
  if (center2) { ctx.font = `600 15px Manrope, system-ui, sans-serif`; ctx.fillStyle = SOFT; ctx.fillText(center2, CENTER, CENTER + 32) }
  ctx.restore()
}

export async function renderDayCompleteImage(data, include) {
  if (typeof document === 'undefined') return null
  try { await document.fonts?.load?.('800 100px Manrope') } catch { /* segue com fallback */ }
  const font = (weight, size, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px Manrope, system-ui, sans-serif`
  const L = data.labels

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)

  // 12% de cima / 9% de baixo ficam sem informação (safe area do story).
  const topY = H * 0.12
  const bottomY = H * (1 - 0.09)
  const inner = W - PAD * 2
  let y = topY
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  // A data.
  ctx.font = font(800, 30); ctx.fillStyle = ACCENT; ctx.letterSpacing = '4px'
  ctx.fillText(`${L.day.toUpperCase()} ${data.dayNumber} · ${data.dateLabel.toUpperCase()}`, PAD, y)
  ctx.letterSpacing = '0px'
  y += 64

  // O título: o tempo com Deus; sem "Tempos", a frase de antes ("Diego leu
  // Gênesis 41 hoje.").
  ctx.fillStyle = '#fff'
  if (include.times) {
    ctx.font = font(800, 104); ctx.letterSpacing = '-4px'
    ctx.fillText(L.minutes, PAD - 4, y); y += 102
    ctx.fillText(L.withGod, PAD - 4, y); y += 102
    ctx.letterSpacing = '0px'
  } else {
    ctx.font = font(800, 84); ctx.letterSpacing = '-3px'
    for (const line of wrap(ctx, include.name && data.name ? data.titleWithName : data.titleWithoutName, inner)) { ctx.fillText(line, PAD - 3, y); y += 88 }
    ctx.letterSpacing = '0px'
  }
  y += 34

  // A frase do dia, no cartão laranja.
  if (include.phrase && data.phrase) {
    const pad = 46
    ctx.font = font(800, 60); ctx.letterSpacing = '-2px'
    const lines = wrap(ctx, data.phrase, inner - pad * 2)
    ctx.letterSpacing = '0px'
    const lineH = 67
    const sub = include.name && data.name ? `${L.phraseSub} · ${data.name}` : L.phraseSub
    const h = pad + 70 + lines.length * lineH + 24 + 34 + pad
    roundRect(ctx, PAD, y, inner, h, 56); ctx.fillStyle = ACCENT; ctx.fill()
    let py = y + pad
    ctx.font = font(800, 150); ctx.fillStyle = INK; ctx.fillText('“', PAD + pad - 6, py - 18)
    py += 70
    ctx.font = font(800, 60); ctx.letterSpacing = '-2px'; ctx.fillStyle = INK
    for (const line of lines) { ctx.fillText(line, PAD + pad, py); py += lineH }
    ctx.letterSpacing = '0px'
    py += 24
    ctx.font = font(600, 30); ctx.fillStyle = 'rgba(26,23,20,.6)'; ctx.fillText(sub, PAD + pad, py)
    y += h + 22
  } else if (include.name && data.name && include.times) {
    // Sem a frase, o nome fica embaixo do título.
    ctx.font = font(600, 34); ctx.fillStyle = SOFT; ctx.fillText(data.name, PAD, y - 12); y += 44
  }

  // A roda e, ao lado, o livro em andamento e os dias da semana.
  if (include.whereInBible) {
    const gap = 22
    const wheelBox = 382
    const rowH = data.book && data.week ? 428 : 382
    roundRect(ctx, PAD, y, wheelBox, rowH, 48); ctx.fillStyle = CARD; ctx.fill()
    drawWheel(ctx, PAD + 26, y + (rowH - 330) / 2, 330, { reads: data.reads, currentBook: data.currentBook, center1: data.percentRead, center2: L.ofBible })
    const rx = PAD + wheelBox + gap
    const rw = inner - wheelBox - gap
    let ry = y
    if (data.book) {
      const bh = data.week ? 248 : rowH
      roundRect(ctx, rx, ry, rw, bh, 40); ctx.fillStyle = CARD; ctx.fill()
      const block = blockById(data.book.blocoId)
      const cor = cssColor(`--bloco-${data.book.blocoId}`, block?.cor ?? ACCENT)
      ctx.font = font(800, 30); ctx.fillStyle = '#fff'; ctx.fillText(data.book.label, rx + 32, ry + 30)
      ctx.font = font(800, 50); ctx.letterSpacing = '-1.5px'; ctx.fillText(L.bookCount, rx + 32, ry + 78); ctx.letterSpacing = '0px'
      const barY = ry + 150
      roundRect(ctx, rx + 32, barY, rw - 64, 12, 6); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill()
      const ratio = Math.max(0, Math.min(1, data.book.lidos / data.book.total))
      if (ratio > 0) { roundRect(ctx, rx + 32, barY, Math.max(12, (rw - 64) * ratio), 12, 6); ctx.fillStyle = cor; ctx.fill() }
      if (L.sealLeft) { ctx.font = font(600, 25); ctx.fillStyle = SOFT; ctx.fillText(L.sealLeft, rx + 32, barY + 32) }
      ry += bh + gap
    }
    if (data.week) {
      const wh = data.book ? rowH - 248 - gap : rowH
      roundRect(ctx, rx, ry, rw, wh, 40); ctx.fillStyle = CARD; ctx.fill()
      ctx.font = font(800, 48); ctx.letterSpacing = '-1.5px'; ctx.fillStyle = '#fff'; ctx.fillText(L.weekValue, rx + 32, ry + 28); ctx.letterSpacing = '0px'
      ctx.font = font(600, 25); ctx.fillStyle = SOFT; ctx.fillText(L.daysThisWeek, rx + 32, ry + 92)
    }
    y += rowH + 22
  }

  // A barra dos passos, com o nome e os minutos de cada um.
  if (include.times) {
    const steps = [['prayer', L.prayer], ['reading', L.reading], ['reflection', L.reflection]]
      .map(([key, label]) => ({ key, label, secs: data.minutes?.[key] ?? 0 }))
      .filter(st => st.secs > 0)
    if (steps.length) {
      const pad = 38
      const h = 164
      roundRect(ctx, PAD, y, inner, h, 44); ctx.fillStyle = CARD; ctx.fill()
      const barW = inner - pad * 2
      const gap = 8
      const weights = steps.map(st => Math.max(1, Math.round(st.secs / 60)))
      const sum = weights.reduce((a, b) => a + b, 0)
      let bx = PAD + pad
      steps.forEach((st, i) => {
        const w = (barW - gap * (steps.length - 1)) * (weights[i] / sum)
        roundRect(ctx, bx, y + 30, w, 12, 6); ctx.fillStyle = ACCENT; ctx.fill()
        ctx.font = font(800, 27); ctx.fillStyle = '#fff'; ctx.fillText(st.label, bx, y + 64)
        ctx.font = font(600, 25); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText(`${weights[i]} ${L.min}`, bx, y + 102)
        bx += w + gap
      })
      y += h + 22
    }
  }

  // Assinatura no rodapé, presa perto de bottomY.
  const markSize = 72
  const markY = bottomY - markSize
  roundRect(ctx, PAD, markY, markSize, markSize, 24); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 4; roundRect(ctx, PAD, markY, markSize, markSize, 24); ctx.stroke()
  const cx = PAD + markSize / 2, cy = markY + markSize / 2
  ctx.fillStyle = '#A29A91'
  roundRect(ctx, cx - 3 - 6 - 18, cy - 20, 18, 40, 5); ctx.fill()
  roundRect(ctx, cx + 3 + 6, cy - 20, 18, 40, 5); ctx.fill()
  ctx.fillStyle = ACCENT
  roundRect(ctx, cx - 3, cy - 15, 6, 30, 3); ctx.fill()
  ctx.textBaseline = 'top'
  ctx.font = font(800, 36)
  ctx.fillStyle = '#fff'; ctx.fillText("Jesus'", PAD + markSize + 22, markY + 2)
  const jesusW = ctx.measureText("Jesus' ").width
  ctx.fillStyle = ACCENT; ctx.fillText('Corner', PAD + markSize + 22 + jesusW, markY + 2)
  ctx.font = font(600, 26); ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.fillText(HANDLE, PAD + markSize + 22, markY + 44)

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
