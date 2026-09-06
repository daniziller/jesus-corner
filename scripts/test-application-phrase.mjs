// Testa applicationPhraseMath.js (weeklyApplicationStats) — quantas
// aplicações da semana atual foram escritas e cumpridas ("Cumpri", quadros
// 29a/30a). Roda com `node` puro (arquivo sem I/O, ver comentário no topo
// de applicationPhraseMath.js).
import { weeklyApplicationStats } from '../src/reflection/applicationPhraseMath.js'

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    console.error(`FAIL: ${label} — esperado ${e}, veio ${a}`)
    process.exitCode = 1
  } else {
    console.log(`ok: ${label}`)
  }
}

// Uma sexta-feira qualquer (2026-09-04 é uma sexta) — semana começa na
// segunda 2026-08-31.
const friday = new Date(2026, 8, 4)

// Nenhuma aplicação escrita ainda esta semana.
assertEqual(weeklyApplicationStats({}, friday), { written: 0, fulfilled: 0 }, 'semana vazia')

// Segunda e quarta escreveram; só segunda foi marcada "Cumpri".
const notes = {
  'application:2026-08-31': { text: 'Ligar pro meu irmão', fulfilled: true },
  'application:2026-09-02': { text: 'Esperar sem cobrar resposta', fulfilled: false },
  // Fora da semana atual (semana anterior) — não deve contar.
  'application:2026-08-24': { text: 'Antiga', fulfilled: true },
  // Formato antigo (string solta, sem fulfilled) — conta como escrita, não cumprida.
  'application:2026-09-01': 'Frase antiga sem objeto',
}
assertEqual(weeklyApplicationStats(notes, friday), { written: 3, fulfilled: 1 }, 'segunda+quarta+terça escritas, só segunda cumprida')

// Persona do ADENDO: "3 de 4 aplicações cumpridas nesta semana" (seg/qua/sex/dom marcados).
const personaNotes = {
  'application:2026-08-31': { text: 'a', fulfilled: true },
  'application:2026-09-02': { text: 'b', fulfilled: true },
  'application:2026-09-04': { text: 'c', fulfilled: true }, // hoje, sexta — já escrita mas ainda não é "de ontem"
  'application:2026-08-30': { text: 'domingo passado', fulfilled: false }, // fora da semana atual
}
assertEqual(weeklyApplicationStats(personaNotes, friday), { written: 3, fulfilled: 3 }, 'persona parcial (só até sexta, domingo ainda não chegou)')

if (process.exitCode) {
  console.error('\nFalhas encontradas.')
} else {
  console.log('\nTudo certo.')
}
