// Baixa Plus Jakarta Sans e Be Vietnam Pro do Google Fonts e as auto-hospeda
// em public/fonts/, gerando o CSS com os @font-face correspondentes.
//
// Motivo (LGPD): enquanto as fontes vêm do CDN do Google, cada carregamento
// do app envia o IP de TODO visitante para um terceiro, antes de qualquer
// consentimento e sem que isso conste na política. Auto-hospedar elimina esse
// operador do inventário de dados. Ver docs/lgpd.md.
//
// Rodar uma vez (precisa de internet):
//     node scripts/fetch-fonts.mjs
//
// Depois, trocar em src/index.css:
//     @import url('https://fonts.googleapis.com/...')   ← remover
//     @import url('/fonts/fonts.css');                  ← colocar
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'public', 'fonts')

const FAMILIES = [
  'Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600',
  'Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400',
]

// User-Agent moderno faz o Google devolver woff2, que é o formato menor e
// suportado por todo navegador que o app já exige.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const url = `https://fonts.googleapis.com/css2?${FAMILIES.map(f => `family=${f}`).join('&')}&display=swap`
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text()

  const seen = new Map()
  let out = '/* Gerado por scripts/fetch-fonts.mjs — não editar à mão. */\n\n'
  let rest = css
  let count = 0

  for (const block of rest.split('@font-face').slice(1)) {
    const family = block.match(/font-family:\s*'([^']+)'/)?.[1]
    const style = block.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal'
    const weight = block.match(/font-weight:\s*([\d\s]+)/)?.[1]?.trim() ?? '400'
    const range = block.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim()
    const src = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1]
    if (!family || !src) continue

    const name = `${slug(family)}-${weight.replace(/\s+/g, '-')}-${style}-${seen.size}.woff2`
    if (!seen.has(src)) {
      const bin = Buffer.from(await (await fetch(src)).arrayBuffer())
      await writeFile(join(OUT_DIR, name), bin)
      seen.set(src, name)
      count++
    }

    out += `@font-face {\n  font-family: '${family}';\n  font-style: ${style};\n` +
           `  font-weight: ${weight};\n  font-display: swap;\n` +
           `  src: url('/fonts/${seen.get(src)}') format('woff2');\n` +
           (range ? `  unicode-range: ${range};\n` : '') + '}\n\n'
  }

  await writeFile(join(OUT_DIR, 'fonts.css'), out)
  console.log(`${count} arquivos .woff2 salvos em public/fonts/`)
  console.log('Agora troque o @import no topo de src/index.css por:')
  console.log("  @import url('/fonts/fonts.css');")
}

main().catch(err => { console.error(err); process.exit(1) })
