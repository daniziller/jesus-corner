// O fecho da leitura (api/_lib/readingSummaryCheck.js): cada momento
// precisa apontar para versículos que existem no trecho; os ruins saem e o
// resumo vale com 2 ou 3 momentos certos. E a tela não fica vazia quando o
// resumo falha.
import { readFileSync } from 'node:fs'
import { momentIsReal, pickMoments, summaryHasText } from '../api/_lib/readingSummaryCheck.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${label}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

const verses = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), `v${i + 1}`]))
const chapters = { 41: { verses: verses(57) }, 42: { verses: verses(38) } }
const m = (chapter, verseStart, verseEnd, extra = {}) => ({ label: 'Os sonhos', chapter, verseStart, verseEnd, text: 'Algo acontece.', ...extra })

check('momento dentro do trecho é real', momentIsReal(m(41, 1, 8), chapters, 41, 42), true)
check('capítulo fora do trecho não', momentIsReal(m(43, 1, 2), chapters, 41, 42), false)
check('versículo que não existe não', momentIsReal(m(42, 30, 40), chapters, 41, 42), false)
check('faixa invertida não', momentIsReal(m(41, 9, 3), chapters, 41, 42), false)
check('sem texto não', momentIsReal(m(41, 1, 2, { text: ' ' }), chapters, 41, 42), false)
check('número que veio como texto não', momentIsReal(m('41', 1, 2), chapters, 41, 42), false)

check('três certos: ficam os três', pickMoments([m(41, 1, 8), m(41, 9, 36), m(42, 1, 5)], chapters, 41, 42)?.length, 3)
check('quatro certos: ficam os três primeiros', pickMoments([m(41, 1, 8), m(41, 9, 36), m(42, 1, 5), m(42, 6, 9)], chapters, 41, 42)?.map(x => x.verseStart), [1, 9, 1])
check('um errado entre três: ficam os dois certos', pickMoments([m(41, 1, 8), m(42, 30, 40), m(42, 1, 5)], chapters, 41, 42)?.length, 2)
check('só um certo: descarta', pickMoments([m(41, 1, 8), m(43, 1, 2)], chapters, 41, 42), null)
check('sem momentos: descarta', pickMoments(undefined, chapters, 41, 42), null)

const full = { thesis: 'a', threadOfStory: 'b', aboutGod: 'c', characterName: 'José', aboutCharacter: 'd', prayer: 'e' }
check('fecho com todos os textos', summaryHasText(full), true)
check('fecho sem a oração não', summaryHasText({ ...full, prayer: '' }), false)

const endpoint = readFileSync(new URL('../api/generate-reading-summary.js', import.meta.url), 'utf8')
check('o servidor tenta duas vezes e usa a conferência nova', [/attempt <= 2/.test(endpoint), /pickMoments\(/.test(endpoint)], [true, true])
const tela = readFileSync(new URL('../src/screens/ReadingSummaryScreen.jsx', import.meta.url), 'utf8')
check('sem resumo, a tela avisa e deixa tentar de novo', [/summaryFailed && hasChapter/.test(tela), /L\('retry'\)/.test(tela), /setAttempt\(/.test(tela)], [true, true, true])
const { STRINGS } = await import('../src/i18n/translations.js')
check('os textos do aviso existem nos dois idiomas', [STRINGS.pt.readingSummary.failed, STRINGS.en.readingSummary.retry].every(Boolean), true)

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
