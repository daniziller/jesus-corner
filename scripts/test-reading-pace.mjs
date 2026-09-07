// Turno 35, Bloco 1 — testa src/reading/readingPaceMath.js ("ritmo
// aprendido": mediana móvel de palavras/minuto, cold start). A gravação de
// sessão de verdade (readingPaceStore.js) só existe a partir do Bloco 3
// (35f) — aqui só a conta pura. Roda com:
// node scripts/test-reading-pace.mjs
import { estimateReadingPace, earlyReadingPace, chaptersPerSession, pushPaceSession, COLD_START_WORDS_PER_MINUTE } from '../src/reading/readingPaceMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

check('sem nenhuma sessão: cold start em 200 palavras/min', estimateReadingPace([]), { wordsPerMinute: COLD_START_WORDS_PER_MINUTE, isColdStart: true, sampleCount: 0 })
check('sem sessões, earlyReadingPace é null', earlyReadingPace([]), null)

const s = (wpm, activeSeconds = 300) => ({ wordsPerMinute: wpm, activeSeconds })
check('2 sessões só: ainda cold start (precisa de 3)', estimateReadingPace([s(150), s(160)]).isColdStart, true)
check('sessão curta demais (< 60s ativos) não conta', estimateReadingPace([s(150, 30), s(160), s(170), s(180)]).sampleCount, 3)

const threeSessions = [s(180), s(160), s(200)] // mediana = 180
const est3 = estimateReadingPace(threeSessions)
check('3 sessões utilizáveis: sai do cold start', est3.isColdStart, false)
check('3 sessões: mediana correta', est3.wordsPerMinute, 180)

const twelve = Array.from({ length: 14 }, (_, i) => s(100 + i * 10)) // 100..230
const est12 = estimateReadingPace(twelve)
check('mais de 12 sessões: usa só as 12 mais recentes (primeiras da lista)', est12.sampleCount, 12)

check('earlyReadingPace: mediana das 3 mais antigas', earlyReadingPace(threeSessions), 180)
const growing = [s(220), s(210), s(200), s(120), s(110), s(100)] // mais recentes primeiro
check('earlyReadingPace pega as ÚLTIMAS 3 da lista (mais antigas)', earlyReadingPace(growing), 110)

check('chaptersPerSession: 200 palavras/min, 15 min, 500 palavras/capítulo = 6 capítulos', chaptersPerSession(200, 15, 500), 6)
check('chaptersPerSession: sem tamanho médio de capítulo devolve 0', chaptersPerSession(200, 15, 0), 0)
check('chaptersPerSession: 100 palavras/min, 15 min, 1071 palavras/capítulo ≈ 1,4', chaptersPerSession(100, 15, 1071.4), 1.4)

check('pushPaceSession: entra na frente (mais recente primeiro)', pushPaceSession([s(100)], s(200))[0].wordsPerMinute, 200)
check('pushPaceSession: capa em 12', pushPaceSession(Array.from({ length: 12 }, () => s(100)), s(200)).length, 12)

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de readingPaceMath passaram.')
