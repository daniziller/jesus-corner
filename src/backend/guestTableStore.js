// Convidado (redesign 1g/etapa 7), agora pras duas tabelas NOVAS do Bloco 2
// que não vivem dentro da linha de user_data: session_seconds e
// chapters_read (ver migration 0049). fetchRow/updateRow (userDataStore.js)
// já resolvem isso pra colunas de user_data com uma linha local; aqui é o
// mesmo princípio pra tabelas de MUITAS linhas — guarda um array por chave
// no localStorage enquanto não há conta, e migra pro Supabase real (com
// upsert/on-conflict-ignore, nunca sobrescrevendo) na primeira autenticação.
//
// Diferença importante em relação a migrateGuestRow(): as duas tabelas daqui
// são fatos que não competem entre si (uma sessão de oração de 90s no
// aparelho de convidado e outra de 200s já na conta não são "a mesma
// informação" disputando um valor — são duas sessões, as duas ficam).
// chapters_read tem UNIQUE(user_id, livro, capitulo), então marcar o mesmo
// capítulo nos dois lados também não duplica. Por isso o merge aqui é
// sempre aditivo, independente da regra "servidor vence" que vale pra
// completed_keys/weekly_days (campos que SIM competem, ver migrateGuestRow
// em userDataStore.js).
import { supabase } from '../lib/supabaseClient'
import { getUserId } from './userDataStore'

function guestKey(table) {
  return `jc_guest_table_${table}`
}

function readGuestRows(table) {
  try {
    const raw = localStorage.getItem(guestKey(table))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeGuestRows(table, rows) {
  try { localStorage.setItem(guestKey(table), JSON.stringify(rows)) } catch { /* privado/cota cheia — segue sem persistir */ }
}

// Adiciona uma linha (sem user_id — quem lê já sabe de quem é) à tabela real
// se houver sessão, ou ao array local de convidado caso contrário. Retorna a
// linha gravada (com id/created_at do servidor quando há conta).
export async function insertRow(table, row) {
  const userId = await getUserId()
  if (!userId) {
    const stored = { ...row, _localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
    writeGuestRows(table, [...readGuestRows(table), stored])
    return stored
  }
  const { data, error } = await supabase.from(table).insert({ ...row, user_id: userId }).select().single()
  if (error) throw error
  return data
}

// Lê todas as linhas da tabela real (autenticado) ou do array local
// (convidado) — usado pelos cálculos que precisam da lista inteira (ex:
// total de segundos por passo, capítulos marcados manualmente).
export async function selectRows(table) {
  const userId = await getUserId()
  if (!userId) return readGuestRows(table)
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

// Copia as linhas de convidado de UMA tabela pra dentro da conta recém-
// autenticada, e apaga o local — chamada por migrateGuestExtraTables()
// abaixo, junto com migrateGuestRow() (ver App.jsx). `ignoreDuplicates`
// evita erro em chapters_read quando o mesmo capítulo já foi marcado nos
// dois lados (violaria o UNIQUE(user_id, livro, capitulo)).
async function migrateGuestTable(table, { ignoreDuplicates = false } = {}) {
  const guestRows = readGuestRows(table)
  if (guestRows.length === 0) return
  const userId = await getUserId()
  if (!userId) return
  const rows = guestRows.map(({ _localId, ...rest }) => ({ ...rest, user_id: userId }))
  const { error } = await supabase.from(table).upsert(rows, ignoreDuplicates ? { onConflict: 'user_id,livro,capitulo', ignoreDuplicates: true } : undefined)
  if (error) throw error
  writeGuestRows(table, [])
}

// Chamada nos mesmos dois pontos de migrateGuestRow() (ver App.jsx) — migra
// as tabelas novas do Bloco 2 junto com a linha de user_data.
export async function migrateGuestExtraTables() {
  await migrateGuestTable('session_seconds')
  await migrateGuestTable('chapters_read', { ignoreDuplicates: true })
}
