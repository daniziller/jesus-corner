import { chromium } from 'playwright'

const EMAIL = 'demo-screenshots-ana@jesuscorner.app'
const PASSWORD = 'DemoShots-2026-Ana!Xk9'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, acceptDownloads: true })
const errors = []
page.on('pageerror', err => errors.push(err.message))
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

await page.goto('https://app.jesuscorner.app', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.locator('text=/Já tenho conta|I already have an account/i').first().click()
await page.waitForTimeout(800)
await page.getByPlaceholder(/email/i).first().fill(EMAIL)
await page.locator('input[type="password"]').first().fill(PASSWORD)
await page.locator('button[type="submit"]').first().click()
await page.waitForTimeout(2500)

const shareBtn = page.locator('button[aria-label="Compartilhar progresso"], button[aria-label="Share progress"]').first()
console.log('share button found:', await shareBtn.count())

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  shareBtn.click(),
])
const path = '.debug-generated-card.png'
await download.saveAs(path)
console.log('saved to', path)

console.log('\n--- errors ---')
console.log(errors.length ? errors.join('\n') : '(none)')

await browser.close()
