// Gera todos os ícones do app a partir do símbolo da marca nova (quadros
// 16a–16c do design_handoff_jesus_corner/Jesus Corner Redesign.dc.html) e os
// instala em web/PWA, iOS e Android. A geometria vem de
// src/brand/brandSymbol.js — a MESMA que o componente BrandMark.jsx desenha
// na interface, então os PNGs nunca divergem da tela.
//
// Renderiza HTML/CSS no Chromium (Playwright) em vez de desenhar à mão: é o
// mesmo motor que mostra a marca no app.
//
// Rodar (na raiz do repositório): node brand/render-icons.mjs
// Precisa do Playwright com Chromium (npx playwright install chromium).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brandSymbolShapes, brandSymbolColors, defaultLineCount, PLATE_PADDING_RATIO, BRAND_COLORS } from '../src/brand/brandSymbol.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
let chromium
try { ({ chromium } = await import('playwright')) }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')) }

// tile: raio do quadro 16b (22/72); 'none' pro iOS (o sistema recorta).
function symbolHtml(size, { variant = 'default', lines, plate = false, tileRadius, bookScale = 1, background = 'transparent' } = {}) {
  const inner = plate ? Math.round(size / (1 + 2 * PLATE_PADDING_RATIO)) : size
  const pad = (size - inner) / 2
  const colors = brandSymbolColors(variant)
  const shapes = brandSymbolShapes(inner, { lines: lines ?? defaultLineCount(inner), tileRadius })
  const tile = shapes[0]
  const rects = shapes.map(sh => {
    const fill = sh.kind === 'tile' ? colors.tile : sh.kind === 'page' ? colors.page : sh.kind === 'line' ? colors.line : colors.spine
    if (sh.kind === 'tile' && bookScale !== 1) return '' // fundo tratado fora quando o livro é reescalado (maskable/adaptive)
    return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${Math.min(sh.r, sh.w / 2, sh.h / 2)}" fill="${fill}"/>`
  }).join('')
  const bg = bookScale !== 1 && colors.tile !== 'transparent' ? `<rect x="0" y="0" width="${inner}" height="${inner}" fill="${colors.tile}"/>` : ''
  const cx = inner / 2
  return `<div id="t" style="width:${size}px;height:${size}px;background:${background}">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${plate ? `<rect x="0" y="0" width="${size}" height="${size}" rx="${tile.r + pad}" fill="${BRAND_COLORS.paper}"/>` : ''}
      <g transform="translate(${pad} ${pad})">${bg}<g transform="translate(${cx} ${cx}) scale(${bookScale}) translate(${-cx} ${-cx})">${rects}</g></g>
    </svg></div>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 })
const written = []
async function png(outPath, size, opts = {}, { opaque = false } = {}) {
  await page.setViewportSize({ width: Math.max(size, 100), height: Math.max(size, 100) })
  await page.setContent(`<body style="margin:0;background:transparent">${symbolHtml(size, opts)}</body>`)
  const abs = path.join(root, outPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await page.locator('#t').screenshot({ path: abs, omitBackground: !opaque })
  written.push(outPath)
}
// Tile cheio com o raio do quadro (22/72 do lado).
const R = size => Math.round(size * 22 / 72)

// ── 1. Web / PWA (público) ─────────────────────────────────────────────────
await png('brand/icon-512.png', 512, { tileRadius: R(512) })
await png('brand/icon-192.png', 192, { tileRadius: R(192) })
await png('brand/favicon-48.png', 48, { tileRadius: R(48) })
await png('brand/favicon-32.png', 32, { tileRadius: R(32) })
// Maskable: o Android recorta num círculo de 80% do lado — o tile sangra até
// a borda e o livro é reduzido pra caber inteiro na zona segura.
await png('brand/icon-maskable-512.png', 512, { tileRadius: 0, bookScale: 0.66, background: BRAND_COLORS.ink }, { opaque: true })
// iOS: quadrado, opaco, sem cantos (o sistema aplica a máscara dele).
await png('brand/icon-ios-1024.png', 1024, { tileRadius: 0 }, { opaque: true })
// Variações do quadro 16c/13a.
await png('brand/icon-plate-512.png', 512, { plate: true })
await png('brand/icon-inverse-512.png', 512, { variant: 'inverse', tileRadius: R(512) })
await png('brand/icon-mono-512.png', 512, { variant: 'mono', tileRadius: R(512) })
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon-32.png', 'favicon-48.png']) {
  fs.copyFileSync(path.join(root, 'brand', f), path.join(root, 'public/icons', f)); written.push(`public/icons/${f}`)
}

// ── 2. iOS ─────────────────────────────────────────────────────────────────
fs.copyFileSync(path.join(root, 'brand/icon-ios-1024.png'), path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))
written.push('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
// Splash: fundo #EDE8E2 (o creme da identidade) com o símbolo de 160 no centro.
async function splash(outPath, S, n) {
  await page.setViewportSize({ width: S, height: S })
  await page.setContent(`<body style="margin:0"><div id="s" style="width:${S}px;height:${S}px;background:${BRAND_COLORS.paper};display:flex;align-items:center;justify-content:center">${symbolHtml(n, { tileRadius: R(n) })}</div></body>`)
  const abs = path.join(root, outPath); fs.mkdirSync(path.dirname(abs), { recursive: true })
  await page.locator('#s').screenshot({ path: abs }); written.push(outPath)
}
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  await splash(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, 2732, 160)
}

// ── 3. Android TWA ─────────────────────────────────────────────────────────
const RES = 'android-twa/app/src/main/res'
for (const [dpi, n] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  await png(`${RES}/mipmap-${dpi}/ic_launcher.png`, n, { tileRadius: R(n) })
}
// Adaptive icon: camada de frente só com o livro (transparente), reduzido
// pra zona segura de 66/108; o fundo é a cor sólida do XML.
for (const [dpi, n] of [['mdpi', 82], ['hdpi', 123], ['xhdpi', 164], ['xxhdpi', 246], ['xxxhdpi', 328]]) {
  await png(`${RES}/mipmap-${dpi}/ic_maskable.png`, n, { variant: 'foreground', bookScale: 0.52 })
}
// Notificação: silhueta branca em transparente (o sistema aplica o tint).
for (const [dpi, n] of [['mdpi', 24], ['hdpi', 36], ['xhdpi', 48], ['xxhdpi', 72], ['xxxhdpi', 96]]) {
  await png(`${RES}/drawable-${dpi}/ic_notification_icon.png`, n, { variant: 'white', bookScale: 0.86, lines: 0 })
}
for (const [dpi, S] of [['mdpi', 300], ['hdpi', 450], ['xhdpi', 600], ['xxhdpi', 900], ['xxxhdpi', 1200]]) {
  await splash(`${RES}/drawable-${dpi}/splash.png`, S, Math.round(S * 0.46))
}

await browser.close()
console.log(`${written.length} arquivos escritos:`); for (const w of written) console.log('  ', w)
