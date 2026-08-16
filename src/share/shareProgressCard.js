// Gera um cartão de progresso (imagem PNG, formato vertical de Stories —
// 1080×1920) pra compartilhar em redes sociais: anel de % da Bíblia,
// streak e a melhor conquista já desbloqueada. Desenhado em <canvas> (não é
// print da UI) pra ter controle total de proporção/enquadramento/marca —
// ver conversa que motivou essa escolha em vez de um html2canvas rápido.
import { t } from '../i18n'
import { computeWeeklyRoutineStats, averageFullRoutineDays } from '../routine/routineStreak'
import { computeCurrentWeekDays, WEEKDAY_LETTERS, WEEK_RING_COLORS } from '../routine/weekRings'

const CARD_W = 1080
const CARD_H = 1920
const GOLD = '#C99A4A' // mesmo --gold do design system — acento claro sobre fundo escuro

// Da mais "impressionante" pra menos, pra escolher UMA conquista pra
// destacar no cartão (mostrar as 22 não caberia/não faria sentido aqui).
// Cobre todos os ids de src/utils/achievements.js.
const BADGE_PRIORITY = [
  'whole-bible', 'block-8', 'block-7', 'block-6', 'block-5', 'block-4', 'block-3', 'block-2', 'block-1',
  'half-bible', 'streak-30', 'thirty-books', 'ten-books', 'streak-7', 'first-book',
  'five-answered-prayers', 'ten-prayer-timers', 'five-prayer-requests', 'first-answered-prayer',
  'first-prayer-timer', 'first-prayer-request', 'first-session',
]

function pickBestBadge(achievements) {
  const unlocked = new Map((achievements ?? []).filter(a => a.unlocked).map(a => [a.id, a]))
  for (const id of BADGE_PRIORITY) {
    if (unlocked.has(id)) return unlocked.get(id)
  }
  return null
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Fontes da marca são self-hosted (ver index.html/docs/lgpd.md) — já
// carregadas pelo resto da UI, mas o canvas só desenha com o glyph certo se
// elas já estiverem prontas no registro do documento nesse momento.
async function ensureFontsReady() {
  try { await document.fonts?.ready } catch { /* navegador sem document.fonts — segue com a fonte padrão */ }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Número + "%" lado a lado (mesmo tratamento visual do anel da Home/
// Progresso), centralizados como bloco único — as duas partes têm tamanhos
// de fonte diferentes, então precisa medir e posicionar manualmente em vez
// de só usar textAlign:'center' num texto só.
function drawPercent(ctx, cx, cy, percent) {
  const numText = `${percent}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '800 128px "Plus Jakarta Sans"'
  const numW = ctx.measureText(numText).width
  ctx.font = '800 46px "Plus Jakarta Sans"'
  const pctW = ctx.measureText('%').width
  const gap = 10
  const startX = cx - (numW + gap + pctW) / 2

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '800 128px "Plus Jakarta Sans"'
  ctx.fillText(numText, startX, cy + 44)
  ctx.font = '800 46px "Plus Jakarta Sans"'
  ctx.fillText('%', startX + numW + gap, cy + 44)
}

// Chip de estatística (streak / constância) — emoji, número grande, rótulo.
function drawStatChip(ctx, { x, y, w, h, emoji, value, label }) {
  ctx.fillStyle = 'rgba(255,255,255,.14)'
  roundRect(ctx, x, y, w, h, 24)
  ctx.fill()

  const cx = x + w / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '46px sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(emoji, cx, y + 60)
  ctx.font = '800 44px "Plus Jakarta Sans"'
  ctx.fillText(value, cx, y + 114)
  ctx.font = '700 23px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  ctx.fillText(label, cx, y + h - 18)
}

// Anéis da semana (segunda a domingo) — mesmo desenho do WeekRings/
// DayRingCluster em HomeScreen.jsx ("use o card mesmo", ver conversa):
// 3 anéis concêntricos por dia (oração·leitura·reflexão, de fora pra
// dentro), dia atual com uma trilha pontilhada de destaque, dias futuros
// sempre vazios (mesmo tratamento de "não feito" — ainda não podem ter
// acontecido).
function drawDayRingCluster(ctx, { day, cx, cy, size }) {
  const strokeW = size * 0.09
  const gap = size * 0.045
  const rOuter = size / 2 - strokeW / 2
  const rMid = rOuter - strokeW - gap
  const rInner = rMid - strokeW - gap
  const track = 'rgba(255,255,255,.18)'

  const ring = (r, done, color) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = done ? color : track
    ctx.lineWidth = strokeW
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  if (day.isToday) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, rOuter + strokeW / 2 + size * 0.045, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,.4)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2.5, 4])
    ctx.stroke()
    ctx.restore()
  }
  ring(rOuter, !day.isFuture && day.prayer, WEEK_RING_COLORS.prayer)
  ring(rMid, !day.isFuture && day.reading, WEEK_RING_COLORS.reading)
  ring(rInner, !day.isFuture && day.reflection, WEEK_RING_COLORS.reflection)
}

function drawWeekRings(ctx, { days, lang, left, width, y, size }) {
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const colW = width / days.length
  days.forEach((day, i) => {
    const cx = left + colW * i + colW / 2
    drawDayRingCluster(ctx, { day, cx, cy: y, size })
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '700 22px "Be Vietnam Pro"'
    ctx.fillStyle = day.isToday ? '#FFFFFF' : 'rgba(255,255,255,.55)'
    ctx.fillText(letters[i], cx, y + size / 2 + 34)
  })
}

// Legenda de qual cor é qual passo — sem ela, os 3 anéis (de fora pra
// dentro) não dizem sozinhos o que cada um representa.
function drawRingLegend(ctx, { cx, y, lang }) {
  const items = [
    { key: 'prayer', label: t('home.routinePrayer', undefined, lang) },
    { key: 'reading', label: t('home.routineReading', undefined, lang) },
    { key: 'reflection', label: t('home.routineReflection', undefined, lang) },
  ]
  const dotR = 6
  const gapAfterDot = 10
  const gapBetween = 26
  ctx.font = '700 24px "Be Vietnam Pro"'
  const widths = items.map(item => dotR * 2 + gapAfterDot + ctx.measureText(item.label).width)
  const totalW = widths.reduce((a, b) => a + b, 0) + gapBetween * (items.length - 1)

  let x = cx - totalW / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  items.forEach((item, i) => {
    ctx.beginPath()
    ctx.arc(x + dotR, y, dotR, 0, Math.PI * 2)
    ctx.fillStyle = WEEK_RING_COLORS[item.key]
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.8)'
    ctx.fillText(item.label, x + dotR * 2 + gapAfterDot, y + 1)
    x += widths[i] + gapBetween
  })
}

// Barra AT/NT — sigla curta, trilha fina, % à direita (mesmo BarRow da
// Home, desenhado).
function drawBarRow(ctx, { label, pct, x, y, width }) {
  const barH = 8
  const labelW = 56
  const pctW = 70
  const barX = x + labelW
  const barW = width - labelW - pctW

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = '700 24px "Be Vietnam Pro"'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(label, x, y)

  ctx.fillStyle = 'rgba(255,255,255,.25)'
  roundRect(ctx, barX, y - barH / 2, barW, barH, barH / 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, barX, y - barH / 2, barW * Math.min(pct, 100) / 100, barH, barH / 2)
  ctx.fill()

  ctx.textAlign = 'right'
  ctx.fillText(`${pct}%`, x + width, y)
}

// Ícone do Instagram — mesmo desenho (traço, sem preenchimento) do
// componente Instagram custom em src/icons/AppIcon.jsx, feito à mão porque
// a versão instalada do lucide-react não tem esse ícone.
function drawInstagramIcon(ctx, cx, cy, size, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, size * 0.09)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.24)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + size * 0.29, cy - size * 0.29, size * 0.045, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  const lines = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const startY = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight))
}

export async function buildProgressCardBlob({ biblePercent, atPercent, ntPercent, streak, achievements, lang, dailyRoutine }) {
  await ensureFontsReady()
  const logo = await loadImage('/icons/icon-192.png').catch(() => null)

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')

  // Fundo — mesmo gradiente do card de % (--grad-vivid) usado na Home/Progresso.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#9D4300')
  bg.addColorStop(1, '#B5005D')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Glow decorativo, mesmo espírito dos orbs do hero.
  ctx.save()
  ctx.filter = 'blur(90px)'
  ctx.fillStyle = 'rgba(255,255,255,.16)'
  ctx.beginPath(); ctx.arc(CARD_W * 0.88, CARD_H * 0.1, 220, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.10)'
  ctx.beginPath(); ctx.arc(CARD_W * 0.08, CARD_H * 0.9, 260, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Wordmark — o ícone (icon-192.png) tem fundo marrom sólido, quase
  // idêntico ao início do gradiente do card (#9D4300); sem um contraste
  // próprio ele "sumia" ali em cima. Fundo branco atrás resolve pra
  // qualquer posição do gradiente.
  if (logo) {
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, 76, 88, 84, 84, 20)
    ctx.fill()
    ctx.drawImage(logo, 84, 96, 68, 68)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = '800 46px "Plus Jakarta Sans"'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText("JESUS'", 180, 130)
  const jesusW = ctx.measureText("JESUS' ").width
  ctx.fillStyle = GOLD
  ctx.fillText('CORNER', 180 + jesusW, 130)

  // Anel de progresso
  const cx = CARD_W / 2
  const cy = 610
  const r = 250
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,.25)'
  ctx.lineWidth = 34
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(biblePercent, 100) / 100)
  ctx.stroke()
  drawPercent(ctx, cx, cy, biblePercent)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 30px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  ctx.fillText(t('home.bibleReadLabel', undefined, lang).toUpperCase(), cx, cy + r + 58)

  // Streak + constância — dois chips lado a lado. Constância é a mesma
  // métrica da aba Rotina (averageFullRoutineDays: média de dias/semana
  // com os 3 passos completos nas últimas 4 semanas), não só o streak
  // (que zera fácil e não conta o padrão de uso ao longo do tempo).
  const weeks = computeWeeklyRoutineStats(dailyRoutine ?? {}, 4)
  const avgFullDays = averageFullRoutineDays(weeks)
  const avgLabel = avgFullDays.toFixed(1).replace(/\.0$/, '')

  const statsTop = cy + r + 90
  const statsH = 172
  const statsGap = 26
  const statsChipW = (CARD_W - 180 - statsGap) / 2
  drawStatChip(ctx, {
    x: 90, y: statsTop, w: statsChipW, h: statsH,
    emoji: '🔥', value: `${streak}`, label: t('home.streakLabel', undefined, lang),
  })
  drawStatChip(ctx, {
    x: 90 + statsChipW + statsGap, y: statsTop, w: statsChipW, h: statsH,
    emoji: '📊', value: avgLabel, label: t('home.shareCardConsistencyLabel', undefined, lang),
  })

  // Anéis da semana (segunda a domingo) — mesma função de src/routine/
  // weekRings.js usada na Home, pra nunca divergir o que aparece nos dois
  // lugares.
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const routineLabelY = statsTop + statsH + 56
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 26px "Be Vietnam Pro"'
  ctx.fillStyle = GOLD
  ctx.fillText(t('home.weekRingsTitle', undefined, lang).toUpperCase(), cx, routineLabelY)

  const ringsY = routineLabelY + 62
  const ringSize = 72
  drawWeekRings(ctx, { days: weekDays, lang, left: 90, width: CARD_W - 180, y: ringsY, size: ringSize })

  // Pontinhos alinhados sob os anéis ficam em `ringsY + ringSize/2 + 34`
  // (ver drawWeekRings) — a legenda precisa de folga clara abaixo disso,
  // senão sobrepõe o texto (bug já visto: "W"/"T"/"F" colados em cima de
  // "Prayer"/"Reading"/"Reflection").
  const legendY = ringsY + ringSize / 2 + 34 + 56
  drawRingLegend(ctx, { cx, y: legendY, lang })

  // Barras AT/NT
  const barsTop = legendY + 60
  drawBarRow(ctx, { label: 'AT', pct: atPercent, x: 90, y: barsTop, width: CARD_W - 180 })
  drawBarRow(ctx, { label: 'NT', pct: ntPercent, x: 90, y: barsTop + 54, width: CARD_W - 180 })

  // Melhor conquista desbloqueada
  const badge = pickBestBadge(achievements)
  let contentBottom = barsTop + 54
  if (badge) {
    const boxY = contentBottom + 60
    const boxH = 190
    ctx.fillStyle = 'rgba(255,255,255,.14)'
    roundRect(ctx, 90, boxY, CARD_W - 180, boxH, 28)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '700 25px "Be Vietnam Pro"'
    ctx.fillStyle = GOLD
    ctx.fillText(t('home.shareCardAchievementUnlocked', undefined, lang).toUpperCase(), cx, boxY + 50)
    ctx.font = '800 40px "Plus Jakarta Sans"'
    ctx.fillStyle = '#FFFFFF'
    wrapText(ctx, badge.title, cx, boxY + 114, CARD_W - 260, 48)
    contentBottom = boxY + boxH
  }

  // Rodapé: tagline + Instagram (pedido explícito — a marca precisa
  // aparecer de um jeito que dê pra achar a conta, não só o site).
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 30px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  wrapText(ctx, t('auth.tagline', undefined, lang), cx, CARD_H - 210, CARD_W - 220, 40)

  const igY = CARD_H - 120
  const igHandle = t('profile.instagramSub', undefined, lang)
  ctx.font = '800 34px "Plus Jakarta Sans"'
  const igHandleW = ctx.measureText(igHandle).width
  const igIconSize = 34
  const igGap = 12
  const igTotalW = igIconSize + igGap + igHandleW
  drawInstagramIcon(ctx, cx - igTotalW / 2 + igIconSize / 2, igY, igIconSize, '#FFFFFF')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(igHandle, cx - igTotalW / 2 + igIconSize + igGap, igY + 2)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 26px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.fillText('jesuscorner.app', cx, CARD_H - 56)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95))
}

// Gera o cartão e compartilha (Web Share API, quando dá pra compartilhar
// arquivo) ou baixa direto (desktop/navegadores sem suporte). Devolve
// 'shared' | 'downloaded' — quem chama decide o que fazer com isso (hoje,
// nada; só existe pra facilitar teste/depuração).
const INSTAGRAM_URL = 'https://www.instagram.com/jesuscorner.app/'

export async function shareProgressCard({ biblePercent, atPercent, ntPercent, streak, achievements, lang, dailyRoutine }) {
  const blob = await buildProgressCardBlob({ biblePercent, atPercent, ntPercent, streak, achievements, lang, dailyRoutine })
  if (!blob) throw new Error('blob_failed')
  const file = new File([blob], 'jesus-corner-progresso.png', { type: 'image/png' })

  // O link do Instagram não dá pra "gravar" clicável dentro do PNG (imagem
  // achatada não carrega link nenhum) — a forma real de anexar um link é
  // via texto que acompanha o compartilhamento. Nem todo app de destino
  // mostra esse texto (o Instagram Stories em si, por exemplo, ignora —
  // mostra só a imagem), mas WhatsApp/Twitter/etc. costumam exibir como
  // legenda, e o handle já fica visível na própria imagem de qualquer jeito.
  const shareText = `${t('home.shareCardShareText', undefined, lang)}\n${INSTAGRAM_URL}`

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: shareText, url: INSTAGRAM_URL })
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'jesus-corner-progresso.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
