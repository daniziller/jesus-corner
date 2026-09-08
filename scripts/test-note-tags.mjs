import { collectTagVocabulary } from '../src/notes/noteTags.js'

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a !== e) {
    console.error(`FALHOU: ${msg} — esperado ${e}, recebido ${a}`)
    process.exitCode = 1
  } else {
    console.log(`OK: ${msg} = ${a}`)
  }
}

assertEqual(collectTagVocabulary([]), [], 'sem marcações nenhuma')
assertEqual(
  collectTagVocabulary([{ tags: ['Medo', 'Consolo'] }, { tags: ['Salmos'] }, { tags: ['Medo'] }]),
  ['Consolo', 'Medo', 'Salmos'],
  'une e ordena sem repetir',
)
assertEqual(
  collectTagVocabulary([{ tags: ['Medo'], hidden: true }, { tags: ['Consolo'] }]),
  ['Consolo'],
  'ignora marcação escondida',
)
assertEqual(
  collectTagVocabulary([{ tags: [] }, {}]),
  [],
  'marcação sem etiqueta nenhuma não quebra',
)

if (!process.exitCode) console.log('\nTodos os testes de noteTags passaram.')
