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

// Exportada (Bloco 2 do redesign) pra que as tabelas novas fora de
// user_data (session_seconds, chapters_read — ver src/backend/
// guestTableStore.js) saibam se há sessão real sem duplicar a chamada.
export async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// Convidado (redesign 1g/etapa 7) — "deixar a pessoa ler antes de
// cadastrar". Sem sessão nenhuma, fetchRow/updateRow abaixo passam a
// operar sobre uma linha guardada no localStorage em vez da tabela
// user_data — MESMO FORMATO de linha (completed_keys, plan_id,
// daily_routine, notes, etc.), então as 18 stores que já são wrappers finos
// em cima dessas duas funções (progressStore, planStore, dailyRoutineStore,
// notesStore, highlightsStore, prayerStore...) funcionam pra convidado sem
// precisar de NENHUMA mudança nelas — só estas duas funções precisam saber
// que existe um "modo sem conta". No cadastro, migrateGuestRow() copia essa
// linha local pra dentro da conta recém-criada e apaga o local (ver
// App.jsx/AuthScreen.jsx).
const GUEST_KEY = 'jc_guest_data'

function getGuestRow() {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setGuestRow(row) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(row)) } catch { /* privado/cota cheia — segue sem persistir */ }
  return row
}

// Exportado só pro bootstrap do App.jsx saber, de forma síncrona, se este
// dispositivo já tem progresso de convidado (decide se mostra a pergunta de
// ritmo — OnboardingFlow — ou já retoma direto no meio do app).
export function hasGuestRow() {
  return getGuestRow() !== null
}

// Copia a linha local do convidado pra dentro da conta que acabou de ser
// criada/logada, e apaga o local — chamado depois de QUALQUER autenticação
// real bem-sucedida (login ou cadastro, ver App.jsx/SignupScreen.jsx). Só
// migra de verdade quando já existe uma sessão real (getUserId() != null);
// chamado sem sessão (ex: o próprio boot do modo convidado) não faz nada,
// então é seguro chamar sem se preocupar em distinguir os dois casos.
//
// `freshAccount` decide COMO migrar, e existe pra corrigir um bug real:
// antes, esta função sempre sobrescrevia a linha da conta inteira com a do
// convidado ("local vence" sempre) — inofensivo logo após um cadastro (a
// conta é nova, não tem nada pra perder), mas destrutivo no login: alguém
// com uma conta ANTIGA que testa o app sem entrar, num aparelho novo, e só
// depois faz login, teria o próprio progresso trocado pelas poucas migalhas
// do convidado. A regra certa (já documentada em guestTableStore.js pras
// tabelas irmãs session_seconds/chapters_read) é "servidor vence" pros
// campos que competem entre si — completed_keys e weekly_days acima de
// tudo.
//   - freshAccount = true (cadastro, ou o redirect de confirmação de
//     e-mail que fecha o mesmo cadastro por fora — ver os dois pontos de
//     chamada): a conta acabou de nascer, não existe conflito de verdade,
//     copia a linha do convidado inteira, sem checar nada.
//   - freshAccount = false (padrão, login): só preenche campos que a conta
//     AINDA NÃO TINHA (nulo, ou array/objeto vazio) — nunca troca um valor
//     que a conta já tinha antes de logar neste aparelho.
// Limitação conhecida e aceitável: o primeiro login via Google/Apple de
// alguém que NUNCA tinha conta também cria a conta na hora, mas passa pelo
// caminho de login (freshAccount=false) — campos com valor-padrão
// não-vazio (plan_id='standard', weekly_days de seg a sex) podem não herdar
// a escolha exata do convidado nesse caso específico; completed_keys/
// daily_routine/notes (o que realmente importa) continuam migrando normal,
// porque começam vazios em qualquer conta nova.
export async function migrateGuestRow({ freshAccount = false } = {}) {
  const guest = getGuestRow()
  if (!guest) return
  const userId = await getUserId()
  if (!userId) return
  const { updated_at, ...guestPatch } = guest
  let patch = guestPatch
  if (!freshAccount) {
    const serverRow = await fetchRow()
    patch = {}
    for (const [key, guestValue] of Object.entries(guestPatch)) {
      const serverValue = serverRow?.[key]
      const isEmpty = serverValue == null
        || (Array.isArray(serverValue) && serverValue.length === 0)
        || (typeof serverValue === 'object' && !Array.isArray(serverValue) && Object.keys(serverValue).length === 0)
      if (isEmpty) patch[key] = guestValue
    }
  }
  if (Object.keys(patch).length > 0) await updateRow(patch)
  try { localStorage.removeItem(GUEST_KEY) } catch { /* ignora */ }
}

// Busca a linha inteira do usuário autenticado — ou, sem sessão, a linha
// local de convidado (ver acima). null só quando realmente não há nada (nem
// conta, nem progresso de convidado ainda) ou a linha real ainda não foi
// criada pelo trigger (corrida rara logo após o signup).
export async function fetchRow() {
  const userId = await getUserId()
  if (!userId) return getGuestRow()
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
// atualizada — ou, sem sessão, faz o mesmo merge incremental na linha local
// de convidado (ver fetchRow acima).
export async function updateRow(patch) {
  const userId = await getUserId()
  if (!userId) {
    const current = getGuestRow() ?? {}
    return setGuestRow({ ...current, ...patch, updated_at: new Date().toISOString() })
  }
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
