import { formatCopyText } from '../src/bible/formatCopyText.js'

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FALHOU: ${msg} — esperado "${expected}", recebido "${actual}"`)
    process.exitCode = 1
  } else {
    console.log(`OK: ${msg} = "${actual}"`)
  }
}

const text = 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum'
const ref = 'Salmos 23:4'

assertEqual(
  formatCopyText('full', text, ref, 'NVT'),
  '"Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum" — Salmos 23:4 (NVT)',
  'texto e referência',
)
assertEqual(formatCopyText('textOnly', text, ref, 'NVT'), '"Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum"', 'só o texto')
assertEqual(formatCopyText('refOnly', text, ref, 'NVT'), 'Salmos 23:4 (NVT)', 'só a referência')
assertEqual(formatCopyText('refOnly', text, ref, ''), 'Salmos 23:4', 'só a referência, sem versão disponível')

if (!process.exitCode) console.log('\nTodos os testes de formatCopyText passaram.')
