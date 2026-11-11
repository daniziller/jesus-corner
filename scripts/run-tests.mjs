// Roda todos os scripts/test-*.mjs em sequência e falha se qualquer um
// falhar — `npm test`. Cada script continua rodando sozinho também
// (`node scripts/test-x.mjs`), como sempre.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(dir).filter(f => /^test-.*\.mjs$/.test(f)).sort()
const failed = []
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: 'pipe', encoding: 'utf8' })
  const ok = r.status === 0
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${f}`)
  if (!ok) {
    failed.push(f)
    console.log(r.stdout.split('\n').filter(l => l.startsWith('FALHOU')).join('\n'))
    console.log(r.stderr)
  }
}
console.log(`\n${files.length - failed.length}/${files.length} scripts de teste passaram.`)
if (failed.length) process.exit(1)
