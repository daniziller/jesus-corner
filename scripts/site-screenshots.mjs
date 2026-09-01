// Captura os screenshots do app usados no site de marketing
// (jesus-corner-site/public/screenshot-*.png).
//
// Por que semi-manual: o app inteiro exige login (Supabase) + assinatura
// ativa, e o Claude Code não pode digitar senha nem criar conta. Então
// este script só abre um Chrome do tamanho de celular apontando pro app —
// VOCÊ loga e navega até cada tela — e captura no arquivo certo quando
// você aperta a tecla correspondente.
//
// Uso:
//   node scripts/site-screenshots.mjs [url]
//   (url padrão: http://localhost:5173 — rode `npm run dev` do app antes)
//
// No terminal, com o Chrome aberto e você já logado:
//   l  -> screenshot "leitura"  (tela de leitura de um capítulo)
//   p  -> screenshot "progresso" (aba Progresso)
//   r  -> screenshot "rotina"    (aba Meu Plano)
//   e  -> alterna o sufixo de idioma (grava como -en ou sem sufixo)
//   s  -> mostra o estado atual (idioma)
//   q  -> sai
//
// Rode uma vez com o app em português (sem sufixo) e outra com o app em
// inglês (aperte `e` antes de capturar) — mesma dimensão dos arquivos
// atuais: 780x1688 (390x844 @2x).

import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import readline from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../../jesus-corner-site/public')
const URL = process.argv[2] || 'http://localhost:5173'

const SHOTS = { l: 'leitura', p: 'progresso', r: 'rotina' }

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'domcontentloaded' })

let lang = 'pt' // sufixo: pt = '', en = '-en'

console.log(`\n  Chrome aberto em ${URL} (390x844 @2x).`)
console.log('  Logue e navegue até a tela desejada, depois use as teclas:')
console.log('    l = leitura   p = progresso   r = rotina')
console.log('    e = alternar idioma (atual: pt)   s = status   q = sair\n')

readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) process.stdin.setRawMode(true)

process.stdin.on('keypress', async (str, key) => {
  const k = (key?.name || str || '').toLowerCase()

  if (k === 'q' || (key?.ctrl && k === 'c')) {
    await browser.close()
    process.exit(0)
  }

  if (k === 'e') {
    lang = lang === 'pt' ? 'en' : 'pt'
    console.log(`  idioma -> ${lang} (arquivos ${lang === 'en' ? 'com -en' : 'sem sufixo'})`)
    return
  }

  if (k === 's') {
    console.log(`  idioma atual: ${lang} | saída: ${OUT_DIR}`)
    return
  }

  const name = SHOTS[k]
  if (!name) return

  const suffix = lang === 'en' ? '-en' : ''
  const file = resolve(OUT_DIR, `screenshot-${name}${suffix}.png`)
  try {
    await page.screenshot({ path: file })
    console.log(`  ✓ ${file}`)
  } catch (err) {
    console.log(`  ✗ falhou: ${err.message}`)
  }
})
