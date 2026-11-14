// "Reiniciar a leitura do zero" — testa src/reading/reiniciarMath.js.
// Roda com: node scripts/test-reiniciar.mjs
import { RESTART_EXTRAS, restartPatch, withoutReadingAchievements, confirmWordMatches } from '../src/reading/reiniciarMath.js'
import { ALL_ACHIEVEMENT_IDS } from '../src/data/achievements.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label}`)
  }
}

const ganha = { earnedAt: '2026-05-01T12:00:00.000Z', seen: true, dateKnown: true }
const linha = {
  completed_keys: ['Gênesis:1', 'Gênesis:2', 'Gênesis:reflection'],
  reading_plan_position: { start: { book: 'Salmos', chapter: 23 }, free: { book: 'João', chapter: 3 } },
  book_seals: { Jonas: { completedAt: '2026-04-01T12:00:00.000Z', dateKnown: true, readings: 1 } },
  achievements: { 'leitura:1': ganha, 'livros:1': ganha, 'bloco:pentateuco': ganha, 'constancia:2': ganha, 'tempo:1': ganha, 'oracao:1': ganha },
  highlights: [{ id: 'h1' }],
  notes: { a: { text: 'nota' } },
}

check('as escolhas além dos capítulos: selos, conquistas de leitura e datas', RESTART_EXTRAS, ['seals', 'achievements', 'dates'])

// Sempre: capítulos lidos e o plano de volta ao começo — e mais nada.
check('sem escolher nada a mais: só os capítulos lidos zeram e o plano volta ao começo', restartPatch(linha, {}), { completed_keys: [], reading_plan_position: null })
check('…selos e conquistas nem entram no que é gravado', Object.keys(restartPatch(linha)).sort(), ['completed_keys', 'reading_plan_position'])
check('notas e marcações nunca entram, com tudo escolhido', Object.keys(restartPatch(linha, { seals: true, achievements: true, dates: true })).sort(), ['achievements', 'book_seals', 'completed_keys', 'reading_plan_position'])

// Selos.
check('com "selos": os selos dos livros saem', restartPatch(linha, { seals: true }).book_seals, {})
check('…e as conquistas ficam como estão', 'achievements' in restartPatch(linha, { seals: true }), false)

// Conquistas de leitura.
check('com "conquistas": saem as de leitura, livros completos e blocos; constância, tempo e oração ficam', Object.keys(restartPatch(linha, { achievements: true }).achievements).sort(), ['constancia:2', 'oracao:1', 'tempo:1'])
check('…e as que ficam não mudam (data e "já vista")', restartPatch(linha, { achievements: true }).achievements['tempo:1'], ganha)
check('…sem mexer nos selos', 'book_seals' in restartPatch(linha, { achievements: true }), false)
check('conta sem conquista nenhuma: nada a tirar', [withoutReadingAchievements(undefined), withoutReadingAchievements({})], [{}, {}])
const todas = Object.fromEntries(ALL_ACHIEVEMENT_IDS.map(id => [id, ganha]))
const restam = Object.keys(withoutReadingAchievements(todas))
check('de todas as conquistas do app, sobram só as de constância, tempo e oração', [...new Set(restam.map(id => id.split(':')[0]))].sort(), ['constancia', 'oracao', 'tempo'])
check('…e nenhuma de leitura, livros ou bloco escapa', restam.some(id => /^(leitura|livros|bloco):/.test(id)), false)

// As datas das leituras não moram em user_data (são apagadas à parte).
check('"datas" não muda o que é gravado na linha', restartPatch(linha, { dates: true }), restartPatch(linha, {}))
check('a linha de origem não é alterada', [linha.completed_keys.length, Object.keys(linha.achievements).length, Object.keys(linha.book_seals).length], [3, 6, 1])

// A palavra de confirmação (contas sem senha).
check('a palavra confirma com maiúsculas, minúsculas e espaços em volta', [confirmWordMatches('REINICIAR', 'REINICIAR'), confirmWordMatches('  reiniciar ', 'REINICIAR'), confirmWordMatches('Restart', 'RESTART')], [true, true, true])
check('palavra errada, incompleta ou vazia não confirma', [confirmWordMatches('REINICIA', 'REINICIAR'), confirmWordMatches('', 'REINICIAR'), confirmWordMatches(null, 'REINICIAR'), confirmWordMatches('REINICIAR JÁ', 'REINICIAR')], [false, false, false, false])

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de reiniciarMath passaram.')
