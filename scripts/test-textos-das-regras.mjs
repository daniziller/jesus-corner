// As regras que escrevem frases (hojeMath, meuPlanoMath) usam chaves de
// translations.js por tx(lang, 'chave'): toda chave usada precisa existir
// em português e em inglês, e o inglês não pode cair no português.
import { readFileSync } from 'node:fs'
import { STRINGS } from '../src/i18n/translations.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${label}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

const FILES = { 'src/hoje/hojeMath.js': 'hojeTx', 'src/meuPlano/meuPlanoMath.js': 'planoTx' }
for (const [file, ns] of Object.entries(FILES)) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const used = new Set()
  for (const m of src.matchAll(/\btx\(lang, '([A-Za-z0-9_]+)'/g)) used.add(m[1])
  for (const m of src.matchAll(/\btxN\(lang, '([A-Za-z0-9_]+)'/g)) { used.add(`${m[1]}One`); used.add(`${m[1]}Many`) }
  for (const m of src.matchAll(/labelKey: '([A-Za-z0-9_]+)'/g)) used.add(m[1])
  const missing = lang => [...used].filter(k => STRINGS[lang][ns]?.[k] == null)
  check(`${file}: chaves usadas existem em pt`, missing('pt'), [])
  check(`${file}: chaves usadas existem em en`, missing('en'), [])
  const pt = Object.keys(STRINGS.pt[ns]).sort(), en = Object.keys(STRINGS.en[ns]).sort()
  check(`${ns}: as mesmas chaves nos dois idiomas`, pt, en)
}

if (failures) { console.log(`\n${failures} falha(s).`); process.exit(1) }
console.log('\nAs frases das regras existem nos dois idiomas.')
