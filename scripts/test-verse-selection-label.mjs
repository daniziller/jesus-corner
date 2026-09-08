import { verseSelectionLabel } from '../src/bible/verseSelectionLabel.js'

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FALHOU: ${msg} — esperado "${expected}", recebido "${actual}"`)
    process.exitCode = 1
  } else {
    console.log(`OK: ${msg} = "${actual}"`)
  }
}

assertEqual(verseSelectionLabel(1, 'pt'), 'Um versículo selecionado', '1 versículo (pt)')
assertEqual(verseSelectionLabel(3, 'pt'), 'Três versículos selecionados', '3 versículos (pt)')
assertEqual(verseSelectionLabel(2, 'pt'), 'Dois versículos selecionados', '2 versículos (pt)')
assertEqual(verseSelectionLabel(12, 'pt'), 'Doze versículos selecionados', '12 versículos (pt)')
assertEqual(verseSelectionLabel(15, 'pt'), '15 versículos selecionados', '15 versículos (pt, além de 12 cai em dígito)')
assertEqual(verseSelectionLabel(1, 'en'), 'One verse selected', '1 verse (en)')
assertEqual(verseSelectionLabel(3, 'en'), 'Three verses selected', '3 verses (en)')

if (!process.exitCode) console.log('\nTodos os testes de verseSelectionLabel passaram.')
