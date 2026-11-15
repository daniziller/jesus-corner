// A conferência da síntese da anotação (api/_lib/summaryCheck.js): a
// frase em destaque precisa ter uma palavra de conteúdo do texto da
// pessoa — pelo começo da palavra, sem acento, ignorando as de ligação.
import { highlightIsGrounded, foldWords } from '../api/_lib/summaryCheck.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${label}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

const texto = 'José esperou dois anos na prisão. O copeiro esqueceu dele, mas Deus não. Judá vendeu o irmão e depois se ofereceu como fiador de Benjamim.'
check('variação da mesma palavra conta ("esperou" × "espera")', highlightIsGrounded('a espera que forma', texto), true)
check('acento não atrapalha ("prisão" × "prisao")', highlightIsGrounded('o tempo na prisao', texto), true)
check('nome que ela usou conta', highlightIsGrounded('a mudança de Judá', texto), true)
check('só palavras de ligação não contam', highlightIsGrounded('para isso mesmo quando', texto), false)
check('assunto inventado não passa', highlightIsGrounded('a graça da comunhão eucarística', texto), false)
check('em inglês também', highlightIsGrounded('waiting on the Lord', 'I keep waiting and the Lord keeps showing up'), true)
check('frase vazia não passa', highlightIsGrounded('', texto), false)
check('palavras de ligação ficam de fora', foldWords('para isso mesmo quando José'), ['jose'])

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
