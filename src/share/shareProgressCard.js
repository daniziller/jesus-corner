// Gera um cartão de progresso (imagem PNG, formato vertical de Stories —
// 1080×1920) pra compartilhar em redes sociais: anel de % da Bíblia,
// streak e a melhor conquista já desbloqueada. Desenhado em <canvas> (não é
// print da UI) pra ter controle total de proporção/enquadramento/marca —
// ver conversa que motivou essa escolha em vez de um html2canvas rápido.
import { t } from '../i18n'

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

export async function buildProgressCardBlob({ biblePercent, streak, achievements, lang }) {
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

  // Wordmark
  if (logo) ctx.drawImage(logo, 80, 92, 76, 76)
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
  const cy = 660
  const r = 260
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
  ctx.font = '700 32px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  ctx.fillText(t('home.bibleReadLabel', undefined, lang).toUpperCase(), cx, cy + r + 68)

  // Streak
  ctx.font = '800 54px "Plus Jakarta Sans"'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(`🔥 ${streak} ${t('home.streakLabel', undefined, lang)}`, cx, cy + r + 156)

  // Melhor conquista desbloqueada
  const badge = pickBestBadge(achievements)
  if (badge) {
    const boxY = cy + r + 250
    const boxH = 210
    ctx.fillStyle = 'rgba(255,255,255,.14)'
    roundRect(ctx, 90, boxY, CARD_W - 180, boxH, 28)
    ctx.fill()
    ctx.font = '700 28px "Be Vietnam Pro"'
    ctx.fillStyle = GOLD
    ctx.fillText(t('home.shareCardAchievementUnlocked', undefined, lang).toUpperCase(), cx, boxY + 56)
    ctx.font = '800 46px "Plus Jakarta Sans"'
    ctx.fillStyle = '#FFFFFF'
    wrapText(ctx, badge.title, cx, boxY + 128, CARD_W - 260, 54)
  }

  // Tagline + domínio
  ctx.font = '600 32px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  wrapText(ctx, t('auth.tagline', undefined, lang), cx, CARD_H - 170, CARD_W - 220, 42)

  ctx.font = '700 28px "Be Vietnam Pro"'
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.fillText('jesuscorner.app', cx, CARD_H - 68)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95))
}

// Gera o cartão e compartilha (Web Share API, quando dá pra compartilhar
// arquivo) ou baixa direto (desktop/navegadores sem suporte). Devolve
// 'shared' | 'downloaded' — quem chama decide o que fazer com isso (hoje,
// nada; só existe pra facilitar teste/depuração).
export async function shareProgressCard({ biblePercent, streak, achievements, lang }) {
  const blob = await buildProgressCardBlob({ biblePercent, streak, achievements, lang })
  if (!blob) throw new Error('blob_failed')
  const file = new File([blob], 'jesus-corner-progresso.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: t('home.shareCardShareText', undefined, lang) })
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
