// O fecho da leitura (api/_lib/readingSummaryCheck.js): cada momento
// precisa apontar para versículos que existem no trecho; os ruins saem e o
// resumo vale com 2 ou 3 momentos certos. E a tela não fica vazia quando o
// resumo falha.
import { readFileSync } from 'node:fs'
import { momentIsReal, pickMoments, summaryHasText, verificationReport } from '../api/_lib/readingSummaryCheck.js'
import { describeAiFailure } from '../api/_lib/aiErrorReport.js'
import { generateText, Output } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { z } from 'zod'

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
check('sem resumo, a tela avisa e deixa tentar de novo', [/summaryFailed && canSummarize/.test(tela), /L\('retry'\)/.test(tela), /setAttempt\(/.test(tela)], [true, true, true])
check('no grátis o resumo nem é pedido (é gerado: só no Premium)', [/const canSummarize = hasChapter && !!session\.hasAI/.test(tela), /if \(!canSummarize\) return\n\s*let cancelled = false\n\s*setSummaryFailed\(false\)\n\s*fetchReadingSummary/.test(tela)], [true, true])
const { STRINGS } = await import('../src/i18n/translations.js')
check('os textos do aviso existem nos dois idiomas', [STRINGS.pt.readingSummary.failed, STRINGS.en.readingSummary.retry].every(Boolean), true)

// ── O que vai para o registro quando falha ────────────────────────────
check('relatório da conferência: quantos vieram e o problema de cada um', verificationReport({ ...full, moments: [m(41, 1, 8), m(42, 30, 40), m(43, 1, 2)] }, chapters, 41, 42), '3 momento(s); momento 2: versículo 42:39 não existe; momento 3: capítulo 43 fora do trecho 41–42')
check('relatório da conferência: campos vazios', verificationReport({ moments: [] }, chapters, 41, 42), '0 momento(s); campos vazios: thesis, threadOfStory, aboutGod, characterName, aboutCharacter, prayer')

// Um erro de formato de verdade, saído da biblioteca da IA com um modelo de mentira.
const schema = z.object({ moments: z.array(z.object({ verseStart: z.number().int().min(1) })).length(3), prayer: z.string() })
const segredo = 'TEXTO GERADO QUE NAO PODE IR PARA O REGISTRO'
const modelo = new MockLanguageModelV3({ doGenerate: async () => ({ content: [{ type: 'text', text: JSON.stringify({ moments: [{ verseStart: 0 }, { verseStart: 2 }], nota: segredo }) }], finishReason: { unified: 'stop', raw: 'stop' }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [] }) })
let relato = ''
try { await generateText({ model: modelo, output: Output.object({ schema }), prompt: 'x' }) } catch (err) { relato = describeAiFailure(err) }
check('erro de formato: diz qual regra falhou', [relato.startsWith('formato: '), /moments\.0\.verseStart/.test(relato), /moments: .*exactly 3/.test(relato), /prayer: /.test(relato)], [true, true, true, true])
check('erro de formato: o texto gerado não vai para o registro', relato.includes(segredo) || relato.includes('verseStart":0'), false)
const quebrado = new MockLanguageModelV3({ doGenerate: async () => ({ content: [{ type: 'text', text: 'isto não é json' }], finishReason: { unified: 'stop', raw: 'stop' }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [] }) })
let relato2 = ''
try { await generateText({ model: quebrado, output: Output.object({ schema }), prompt: 'x' }) } catch (err) { relato2 = describeAiFailure(err) }
check('resposta que não é JSON', [relato2.startsWith('formato: '), relato2.includes('isto não é json')], [true, false])
check('outro erro (rede): nome e mensagem', describeAiFailure(Object.assign(new Error('fetch failed'), { name: 'TypeError' })), 'TypeError: fetch failed')

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
