// Duração de sessão por passo (item 1 da seção 5 do redesign Bento) —
// registra segundos de Oração, Leitura e Reflexão por sessão concluída, na
// tabela session_seconds (migration 0049). Sem isso, "30b" (tempo com Deus,
// dividido em orando/lendo/refletindo), "31a" (tempo da semana) e as linhas
// "sessão média"/"horário que mais lê" não têm de onde vir.
//
// Uma LINHA por sessão, não um acumulador — dá pra somar por dia, por
// semana, por passo, e calcular médias/horário mais comum, tudo em cima do
// mesmo dado bruto. src/reading/readingTimeStore.js (reading_seconds, migration
// 0044) continua existindo à parte como atalho de leitura acumulada desde
// sempre; Bloco 3/4 decide se o cronômetro de leitura passa a gravar aqui
// também em vez de (ou além de) lá.
//
// As funções de agregação (sem I/O) vivem em sessionDurationMath.js, pra dar
// pra testar com `node` puro sem sessão Supabase — ver
// scripts/test-session-duration.mjs.
import { insertRow, selectRows } from '../backend/guestTableStore'

export { totalsByStep, totalsByDay, totalsForDay, averageSessionSeconds } from './sessionDurationMath'

const TABLE = 'session_seconds'
const PASSOS = ['prayer', 'reading', 'reflection']

// dateStr no formato YYYY-MM-DD (mesmo formato de `date` no Postgres) —
// default é hoje no fuso local do aparelho, que é o que importa pra "esta
// semana"/"hoje" nas telas.
function todayStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Registra uma sessão concluída. `segundos` <= 0 é ignorado (sessão vazia,
// ex: alguém que abriu e fechou sem fazer nada) — a checagem >0 também
// existe no banco (constraint), isto é só pra não gastar uma chamada de
// rede à toa.
export async function logSessionSeconds(passo, segundos, dateStr = todayStr()) {
  if (!PASSOS.includes(passo)) throw new Error(`passo inválido: ${passo}`)
  const n = Math.round(segundos)
  if (n <= 0) return null
  return insertRow(TABLE, { passo, segundos: n, data: dateStr })
}

// Todas as linhas do usuário (autenticado ou convidado) — base para as
// funções de agregação de sessionDurationMath.js. Exportada também pra quem
// precisar de um corte diferente dos já prontos (ex: um período custom).
export async function getAllSessions() {
  return selectRows(TABLE)
}
