// Gera um cartão de progresso (imagem PNG, formato vertical de Stories —
// 1080×1920) pra compartilhar em redes sociais: anel de % da Bíblia,
// streak e a melhor conquista já desbloqueada. Desenhado em <canvas> (não é
// print da UI) pra ter controle total de proporção/enquadramento/marca —
// ver conversa que motivou essa escolha em vez de um html2canvas rápido.
import { t } from '../i18n'
import { computeWeeklyRoutineStats, averageFullRoutineDays, isDayComplete } from '../routine/routineStreak'
import { computeCurrentWeekDays, WEEKDAY_LETTERS } from '../routine/weekRings'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'

const CARD_W = 1080
const CARD_H = 1920
const GOLD = '#C99A4A'  // mesmo --gold — acento claro sobre fundo escuro (zona do gradiente)
const BROWN = '#9D4300' // mesmo --or — acento sobre fundo claro (zona clara)

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

// Rotina da semana (segunda a domingo) — mesma lógica de cores do
// calendário de histórico (RoutineCalendar.jsx, "mesma lógica de cores do
// calendário", ver conversa): círculo com gradiente dourado→marrom só nos
// dias com os 3 passos completos (a letra do dia dentro, branca), 3
// pontinhos ROUTINE_STEP_COLORS embaixo. Pensado pra fundo claro — por
// isso mora na zona clara do cartão, não sobre o gradiente.
function drawWeekRoutineRow(ctx, { days, lang, left, width, y }) {
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const colW = width / days.length
  const circleR = 26
  const dotR = 5
  const dotGap = 8

  days.forEach((day, i) => {
    const cx = left + colW * i + colW / 2
    const complete = !day.isFuture && isDayComplete(day)

    ctx.beginPath()
    ctx.arc(cx, y, circleR, 0, Math.PI * 2)
    if (complete) {
      const g = ctx.createLinearGradient(cx - circleR, y - circleR, cx + circleR, y + circleR)
      g.addColorStop(0, GOLD)
      g.addColorStop(1, BROWN)
      ctx.fillStyle = g
      ctx.fill()
    } else if (day.isToday) {
      ctx.fillStyle = '#F5E9DE' // var(--olt) — mesmo destaque do "hoje" da Home
      ctx.fill()
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 24px "Be Vietnam Pro"'
    ctx.fillStyle = complete ? '#FFFFFF' : (day.isToday ? BROWN : '#737373')
    ctx.fillText(letters[i], cx, y + 2)

    const dotsW = dotR * 2 * 3 + dotGap * 2
    let dx = cx - dotsW / 2 + dotR
    const dotY = y + circleR + 18;
    [
      !day.isFuture && day.prayer ? ROUTINE_STEP_COLORS.prayer : '#E5E5E5',
      !day.isFuture && day.reading ? ROUTINE_STEP_COLORS.reading : '#E5E5E5',
      !day.isFuture && day.reflection ? ROUTINE_STEP_COLORS.reflection : '#E5E5E5',
    ].forEach(color => {
      ctx.beginPath()
      ctx.arc(dx, dotY, dotR, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      dx += dotR * 2 + dotGap
    })
  })
}

// Legenda de qual cor é qual passo — sem ela, os 3 pontinhos não dizem
// sozinhos o que cada um representa. Mesmas cores/rótulos do calendário.
function drawCalendarLegend(ctx, { cx, y, lang }) {
  const items = [
    { color: ROUTINE_STEP_COLORS.prayer, label: t('home.routinePrayer', undefined, lang) },
    { color: ROUTINE_STEP_COLORS.reading, label: t('home.routineReading', undefined, lang) },
    { color: ROUTINE_STEP_COLORS.reflection, label: t('home.routineReflection', undefined, lang) },
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
    ctx.fillStyle = item.color
    ctx.fill()
    ctx.fillStyle = '#404040'
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

  // O cartão tem duas zonas: gradiente escuro (marca/anel/streak — mesmo
  // conteúdo do card de % da Home) e, a partir de `splitY`, uma zona clara
  // (mesmo fundo --card-bg dos cards comuns do app) pra rotina da semana —
  // as cores do calendário (ROUTINE_STEP_COLORS, gradiente dourado→marrom)
  // são pensadas pra fundo claro, --or e preto quase somem sobre o
  // gradiente escuro. `splitY` é calculado a partir do conteúdo real da
  // zona escura (anel + chips + barras AT/NT), não um valor fixo.
  const cx = CARD_W / 2
  const cy = 610
  const r = 250
  const statsTop = cy + r + 90
  const statsH = 172
  const barsTop = statsTop + statsH + 60
  const splitY = barsTop + 50 + 60

  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#9D4300')
  bg.addColorStop(1, '#B5005D')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, splitY)
  ctx.fillStyle = '#F6F3F2' // mesmo --card-bg
  ctx.fillRect(0, splitY, CARD_W, CARD_H - splitY)

  // Glow decorativo, mesmo espírito dos orbs do hero — só dentro da zona
  // escura, senão vira um borrão claro sem função sobre o fundo já claro.
  ctx.save()
  ctx.filter = 'blur(90px)'
  ctx.fillStyle = 'rgba(255,255,255,.16)'
  ctx.beginPath(); ctx.arc(CARD_W * 0.88, splitY * 0.06, 220, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.10)'
  ctx.beginPath(); ctx.arc(CARD_W * 0.08, splitY * 0.94, 260, 0, Math.PI * 2); ctx.fill()
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

  // Barras AT/NT — ainda na zona escura, mesmo lugar de dentro do card de
  // % na Home (só a rotina da semana, com as cores do calendário, é que
  // precisa da zona clara abaixo).
  drawBarRow(ctx, { label: 'AT', pct: atPercent, x: 90, y: barsTop, width: CARD_W - 180 })
  drawBarRow(ctx, { label: 'NT', pct: ntPercent, x: 90, y: barsTop + 50, width: CARD_W - 180 })

  // ── Zona clara (a partir de splitY) ──────────────────────────────────
  // Rotina da semana — mesma lógica de cores do calendário de histórico.
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const routineLabelY = splitY + 50
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 26px "Be Vietnam Pro"'
  ctx.fillStyle = '#737373' // var(--g5) — mesmo tom do rótulo na Home
  ctx.fillText(t('home.weekRingsTitle', undefined, lang).toUpperCase(), cx, routineLabelY)

  const dayCellsY = routineLabelY + 54
  drawWeekRoutineRow(ctx, { days: weekDays, lang, left: 90, width: CARD_W - 180, y: dayCellsY })

  // Pontinhos ficam em `dayCellsY + circleR(26) + 18` (ver
  // drawWeekRoutineRow) — legenda com folga clara abaixo disso.
  const legendY = dayCellsY + 26 + 18 + 5 + 36
  drawCalendarLegend(ctx, { cx, y: legendY, lang })

  // Melhor conquista desbloqueada — mesmo tratamento visual dos cards de
  // destaque em fundo claro (--card-highlight-bg/border), não mais o card
  // translúcido branco (pensado pra fundo escuro).
  const badge = pickBestBadge(achievements)
  let contentBottom = legendY + 36
  if (badge) {
    const boxY = legendY + 44
    const boxH = 160
    const boxG = ctx.createLinearGradient(90, boxY, CARD_W - 90, boxY + boxH)
    boxG.addColorStop(0, '#FFF3E8')
    boxG.addColorStop(1, '#FFE0BE')
    ctx.fillStyle = boxG
    roundRect(ctx, 90, boxY, CARD_W - 180, boxH, 28)
    ctx.fill()
    ctx.strokeStyle = 'rgba(157,67,0,.25)'
    ctx.lineWidth = 1.5
    roundRect(ctx, 90, boxY, CARD_W - 180, boxH, 28)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '700 22px "Be Vietnam Pro"'
    ctx.fillStyle = BROWN
    ctx.fillText(t('home.shareCardAchievementUnlocked', undefined, lang).toUpperCase(), cx, boxY + 42)
    ctx.font = '800 36px "Plus Jakarta Sans"'
    ctx.fillStyle = '#121212'
    wrapText(ctx, badge.title, cx, boxY + 98, CARD_W - 260, 44)
    contentBottom = boxY + boxH
  }

  // Rodapé: tagline + Instagram (pedido explícito — a marca precisa
  // aparecer de um jeito que dê pra achar a conta, não só o site).
  // Ancorado em contentBottom (não em CARD_H fixo) — o badge (opcional) e
  // o tamanho da rotina da semana mudam quanto espaço o conteúdo ocupa; um
  // rodapé fixo já colidiu uma vez com o badge quando o conteúdo cresceu
  // (bug visto: tagline em cima de "Pentateuch").
  const footerTop = contentBottom + 50
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 28px "Be Vietnam Pro"'
  ctx.fillStyle = '#404040' // var(--g6)
  wrapText(ctx, t('auth.tagline', undefined, lang), cx, footerTop + 16, CARD_W - 220, 36)

  const igY = footerTop + 92
  const igHandle = t('profile.instagramSub', undefined, lang)
  ctx.font = '800 32px "Plus Jakarta Sans"'
  const igHandleW = ctx.measureText(igHandle).width
  const igIconSize = 32
  const igGap = 12
  const igTotalW = igIconSize + igGap + igHandleW
  drawInstagramIcon(ctx, cx - igTotalW / 2 + igIconSize / 2, igY, igIconSize, BROWN)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = BROWN
  ctx.fillText(igHandle, cx - igTotalW / 2 + igIconSize + igGap, igY + 2)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 24px "Be Vietnam Pro"'
  ctx.fillStyle = '#A3A3A3' // var(--g4)
  ctx.fillText('jesuscorner.app', cx, footerTop + 138)

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
