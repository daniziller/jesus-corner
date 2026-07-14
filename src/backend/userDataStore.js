// Núcleo do backend real: uma linha por usuário na tabela `user_data` (ver
// supabase/migrations/0001_user_data.sql), guardando tudo que antes vivia
// espalhado em stores de localStorage (progresso, streak, notas, pedidos de
// oração, estatísticas de oração, progresso de estudos, plano escolhido).
//
// As 7 stores antigas (progressStore, streakStore, notesStore, prayerStore,
// prayerStatsStore, studiesProgressStore, planStore) viram wrappers finos em
// cima de fetchRow()/updateRow() — mantendo os mesmos nomes de função que já
// eram usados pelas telas, só que agora assíncronos (retornam Promise).
//
// RLS no banco garante que cada usuário só lê/escreve a própria linha, então
// as funções aqui sempre operam sobre "quem estiver autenticado agora" — os
// parâmetros `email` que sobrevivem nas stores antigas existem só pra manter
// a mesma assinatura de chamada das telas, sem uso real.
import { supabase } from '../lib/supabaseClient'

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Busca a linha inteira do usuário autenticado. Retorna null se ninguém
// estiver logado (ex: chamada durante logout) ou se a linha ainda não tiver
// sido criada pelo trigger (corrida rara logo após o signup).
export async function fetchRow() {
  const userId = await getUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[userDataStore] fetchRow failed:', error.message)
    return null
  }
  return data
}

// Serializa ciclos de "lê a linha, muda um campo, escreve a linha de volta"
// (usados por progressStore/dailyRoutineStore/notesStore/etc. pra fazer
// merge incremental num array ou objeto). Sem isso, duas chamadas em
// sequência rápida (ex: marcar várias sessões de leitura seguidas)se
// sobrepõem: a segunda lê o banco antes da escrita da primeira terminar e,
// ao escrever de volta o que leu, apaga silenciosamente o que a primeira
// tinha acabado de salvar. Colocar cada ciclo numa fila garante que a
// leitura de uma chamada só aconteça depois da escrita da anterior.
let writeQueue = Promise.resolve()

export function withRowLock(operation) {
  const result = writeQueue.then(operation, operation)
  writeQueue = result.then(() => undefined, () => undefined)
  return result
}

// Atualiza só os campos passados em `patch`, devolvendo a linha inteira já
// atualizada (ou null se a escrita falhar/ninguém estiver logado).
export async function updateRow(patch) {
  const userId = await getUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('user_data')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .maybeSingle()
  if (error) {
    console.error('[userDataStore] updateRow failed:', error.message)
    return null
  }
  return data
}
