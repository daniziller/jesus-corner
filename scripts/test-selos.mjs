// Testa a parte pura dos selos de livro (handoff-gamificacao-43-46, etapa
// 5): src/gamification/sealDetails.js e o estado do selo. Roda com:
// node scripts/test-selos.mjs
import { readingSpanDays, readingSecondsOf, firstHighlightOf, countBookNotes, representsPhrase, daysLabel, summarizeSeal, sealState, readingTimeSentence } from '../src/gamification/sealDetails.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) { console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); failures++ }
  else console.log(`OK: ${label}`)
}

const iso = d => new Date(2025, 7, d, 10).toISOString()
const rows = [25, 26, 27, 28].map((d, i) => ({ livro: 'Jonas', capitulo: i + 1, created_at: iso(d) }))
check('4 capítulos em 4 dias', readingSpanDays('Jonas', 4, rows), 4)
check('tudo no mesmo dia = 1 dia', readingSpanDays('Jonas', 4, rows.map(r => ({ ...r, created_at: iso(28) }))), 1)
check('capítulo sem data → null', readingSpanDays('Jonas', 4, rows.slice(1)), null)
check('segundos de leitura só do livro e do passo reading', readingSecondsOf('Jonas', [{ livro: 'Jonas', passo: 'reading', segundos: 3000 }, { livro: 'Jonas', passo: 'reading', segundos: 120 }, { livro: 'Gênesis', passo: 'reading', segundos: 999 }, { livro: null, passo: 'prayer', segundos: 50 }]), 3120)
check('primeira marcação do livro, ignorando escondidas', firstHighlightOf('Jonas', [{ book: 'Jonas', chapter: 3, verses: [1], createdAt: '2025-08-27' }, { book: 'Jonas', chapter: 2, verses: [2], createdAt: '2025-08-26', hidden: true }, { book: 'Jonas', chapter: 2, verses: [2], createdAt: '2025-08-26T12:00' }]).chapter, 2)
check('sem marcação → null', firstHighlightOf('Jonas', []), null)
check('notas do livro', countBookNotes('Jonas', { 'Jonas:1-2': {}, 'Jonas:3-4': {}, 'Jonas:reflection': {}, 'João:1-1': {}, 'reflection:2025-08-28': {} }), 2)
check('frase: primeiro livro', representsPhrase({ livrosCompletos: 1, blocoCompletadoNome: null }), 'O selo entrou na sua estante — e é o seu primeiro livro inteiro.')
check('frase: n-ésimo livro', representsPhrase({ livrosCompletos: 12, blocoCompletadoNome: null }), 'O selo entrou na sua estante — é o seu 12º livro.')
check('frase: completou bloco', representsPhrase({ livrosCompletos: 12, blocoCompletadoNome: 'Profetas menores' }), 'O selo entrou na sua estante — com ele você completou Profetas menores.')
check('dias no singular', [daysLabel(1), daysLabel(4), daysLabel(null)], ['1 dia', '4 dias', null])
const sum = summarizeSeal('Jonas', { seal: { completedAt: iso(28), dateKnown: true, readings: 5 }, chapterRows: rows, sessionRows: [{ livro: 'Jonas', passo: 'reading', segundos: 3120 }] })
check('resumo do selo', [sum.sigla, sum.posicao, sum.blocoNome, sum.readings, sum.daysLabel, sum.timeLabel], ['Jn', 32, 'Profetas menores', 3, '4 dias', '52 min'])
check('frase de tempo de leitura', [readingTimeSentence(3120), readingTimeSentence(60), readingTimeSentence(3600), readingTimeSentence(7200), readingTimeSentence(7500)], ['52 minutos de leitura', '1 minuto de leitura', '1 hora de leitura', '2 horas de leitura', '2 h 05 de leitura'])
check('estado do selo', [sealState(4, 4), sealState(1, 4), sealState(0, 4)], ['completo', 'andamento', 'nao'])

if (failures > 0) { console.error(`\n${failures} verificação(ões) falharam.`); process.exit(1) }
console.log('\nTodos os testes dos selos (parte pura) passaram.')
