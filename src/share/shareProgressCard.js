// Gera um cartão de progresso (imagem PNG, formato vertical de Stories —
// 1080×1920) pra compartilhar em redes sociais: anel de % da Bíblia,
// streak e a melhor conquista já desbloqueada. Desenhado em <canvas> (não é
// print da UI) pra ter controle total de proporção/enquadramento/marca —
// ver conversa que motivou essa escolha em vez de um html2canvas rápido.
import { t } from '../i18n'
import { computeWeeklyRoutineStats, averageFullRoutineDays, isDayComplete, modulesForDay, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
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

// Anel dividido em fatias iguais — uma por passo LIGADO na rotina, cada
// fatia colorida (ROUTINE_STEP_COLORS) só quando aquele passo foi feito
// naquele dia. Mesmo desenho de RoutineDayRing.jsx (usado na Home/
// calendário), reimplementado em canvas em vez de SVG — geometria idêntica
// (fatias na mesma ordem/tamanho, mesmo vão entre elas), pra imagem nunca
// divergir do que a pessoa já vê dentro do app.
function drawDayRing(ctx, { cx, cy, r, strokeWidth, modules, done }) {
  const n = modules.length || 1
  const c = 2 * Math.PI * r
  const gapPx = n > 1 ? Math.min(3, c / n / 4) : 0
  const gapAngle = gapPx / r
  const slotAngle = (Math.PI * 2) / n

  ctx.save()
  ctx.lineCap = 'butt'
  ctx.lineWidth = strokeWidth

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#E5E5E5' // var(--g2) — trilho vazio
  ctx.stroke()

  modules.forEach((key, i) => {
    if (!done?.[key]) return
    const start = -Math.PI / 2 + i * slotAngle
    const end = start + slotAngle - gapAngle
    ctx.beginPath()
    ctx.arc(cx, cy, r, start, end)
    ctx.strokeStyle = ROUTINE_STEP_COLORS[key]
    ctx.stroke()
  })
  ctx.restore()
}

// Rotina da semana (segunda a domingo) — círculo com gradiente
// dourado→marrom só nos dias com todos os passos completos (a letra do dia
// dentro, branca), anel fatiado (drawDayRing acima) mostrando quais passos
// foram feitos naquele dia. Pensado pra fundo claro — por isso mora na
// zona clara do cartão, não sobre o gradiente.
function drawWeekRoutineRow(ctx, { days, lang, left, width, y, modules = DEFAULT_ROUTINE_MODULES }) {
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const colW = width / days.length
  const circleR = 26
  const ringR = circleR + 6
  // Ligar/desligar um passo em "Meu Plano" só vale a partir de hoje — dias
  // já passados continuam com o trio original (mesmo critério de
  // WeekRoutineRow em HomeScreen.jsx/routineStreak.js).
  const todayKeyStr = days.find(d => d.isToday)?.key ?? days[0]?.key

  days.forEach((day, i) => {
    const cx = left + colW * i + colW / 2
    const dayModules = modulesForDay(day.key, modules, todayKeyStr)
    const complete = !day.isFuture && isDayComplete(day, dayModules)

    if (!day.isFuture) drawDayRing(ctx, { cx, cy: y, r: ringR, strokeWidth: 3.5, modules: dayModules, done: day })

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
  })
}

// Legenda de qual cor é qual passo — sem ela, as fatias do anel não dizem
// sozinhas o que cada uma representa. Mesmas cores/rótulos/ordem do
// calendário — só os passos LIGADOS na rotina aparecem (mesmo filtro do
// legendário em HomeScreen.jsx).
function drawCalendarLegend(ctx, { cx, y, lang, modules = DEFAULT_ROUTINE_MODULES }) {
  const ALL = [
    { key: 'prayer', labelKey: 'home.routinePrayer' },
    { key: 'reading', labelKey: 'home.routineReading' },
    { key: 'study', labelKey: 'home.routineStudy' },
    { key: 'reflection', labelKey: 'home.routineReflection' },
  ]
  const items = ALL
    .filter(item => modules.includes(item.key))
    .map(item => ({ color: ROUTINE_STEP_COLORS[item.key], label: t(item.labelKey, undefined, lang) }))
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

export async function buildProgressCardBlob({ biblePercent, atPercent, ntPercent, streak, readingWeekStreak, achievements, lang, dailyRoutine, routineModules = DEFAULT_ROUTINE_MODULES }) {
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

  // Streak + constância + semanas seguidas lendo — três chips lado a lado
  // (mesmo trio do card de % na Home). Constância é a mesma métrica da aba
  // Rotina (averageFullRoutineDays: média de dias/semana com todos os
  // passos completos nas últimas 4 semanas); semanas lendo é uma métrica
  // separada, só sobre leitura (perdoa dias sem ler contanto que outro dia
  // da mesma semana tenha, ver computeReadingWeekStreak).
  const weeks = computeWeeklyRoutineStats(dailyRoutine ?? {}, routineModules, 4)
  const avgFullDays = averageFullRoutineDays(weeks)
  const avgLabel = avgFullDays.toFixed(1).replace(/\.0$/, '')

  const statsGap = 20
  const statsChipW = (CARD_W - 180 - statsGap * 2) / 3
  drawStatChip(ctx, {
    x: 90, y: statsTop, w: statsChipW, h: statsH,
    emoji: '🔥', value: `${streak}`, label: t('home.streakLabel', undefined, lang),
  })
  drawStatChip(ctx, {
    x: 90 + (statsChipW + statsGap), y: statsTop, w: statsChipW, h: statsH,
    emoji: '📊', value: avgLabel, label: t('home.shareCardConsistencyLabel', undefined, lang),
  })
  drawStatChip(ctx, {
    x: 90 + (statsChipW + statsGap) * 2, y: statsTop, w: statsChipW, h: statsH,
    emoji: '📅', value: `${readingWeekStreak ?? 0}`, label: t('home.readingWeekStreakLabel', undefined, lang),
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
  drawWeekRoutineRow(ctx, { days: weekDays, lang, left: 90, width: CARD_W - 180, y: dayCellsY, modules: routineModules })

  // Anel de cada dia (ver drawDayRing) tem raio circleR(26)+6=32 — legenda
  // com folga clara abaixo da borda dele.
  const legendY = dayCellsY + 32 + 46
  drawCalendarLegend(ctx, { cx, y: legendY, lang, modules: routineModules })

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

export async function shareProgressCard({ biblePercent, atPercent, ntPercent, streak, readingWeekStreak, achievements, lang, dailyRoutine, routineModules = DEFAULT_ROUTINE_MODULES }) {
  const blob = await buildProgressCardBlob({ biblePercent, atPercent, ntPercent, streak, readingWeekStreak, achievements, lang, dailyRoutine, routineModules })
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
