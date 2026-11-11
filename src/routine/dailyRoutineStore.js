// Rotina diária (Oração, Leitura, Reflexão) — um mapa data → passos
// concluídos, guardado em user_data.daily_routine. Mesmo padrão "lê o blob
// inteiro, escreve o blob inteiro de volta" das outras stores desse
// backend (ver src/backend/userDataStore.js).
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { dateKey } from '../utils/dateKey'

export async function getDailyRoutine() {
  const row = await fetchRow()
  return row?.daily_routine ?? {}
}

// Marca (ou desmarca) um passo de HOJE ('prayer' | 'reading' | 'reflection')
// como concluído. `planId` fica gravado junto na entrada do dia — é o que
// permite avaliar "dia completo" pelos módulos do plano que estava ativo
// naquele dia específico, mesmo que a pessoa troque de plano depois (ver
// isDayComplete em src/routine/routineStreak.js). Devolve o mapa inteiro já
// atualizado, pra quem chamou poder atualizar o estado local sem precisar
// de um novo fetch.
export function setStepDone(step, done = true, planId) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const current = row?.daily_routine ?? {}
    const key = dateKey()
    const today = { ...current[key], planId }
    // `${step}At` — hora em que o passo foi concluído (ISO). Só pra exibir
    // "10 min · às 6:42" no cartão de passo feito (quadro 4b); nenhuma
    // conta de constância/streak lê essa chave (todas olham só `day[step]`).
    if (done) { today[step] = true; today[`${step}At`] = new Date().toISOString() }
    else { delete today[step]; delete today[`${step}At`] }
    const next = { ...current, [key]: today }
    const updated = await updateRow({ daily_routine: next })
    return updated?.daily_routine ?? next
  })
}

// Passo aberto e interrompido (handoff-meu-plano-47, HANDOFF §3.4/§10):
// `${step}Progress` = { startedAt: ISO, elapsedSeconds } na entrada de
// HOJE — gravado ao abrir o passo pelo Meu Plano e atualizado quando o
// relógio pausa (ver markStepOpened/efeito dos relógios em App.jsx). É o
// que faz o botão dizer "Continuar a leitura" e o cartão mostrar o que
// falta. Nenhuma conta de constância lê esta chave (todas olham só
// `day[step]`), e ela some sozinha com a virada do dia, como `${step}At`.
export function setStepProgress(step, patch) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const current = row?.daily_routine ?? {}
    const key = dateKey()
    const today = { ...current[key] }
    today[`${step}Progress`] = { ...(today[`${step}Progress`] ?? {}), ...patch }
    const next = { ...current, [key]: today }
    const updated = await updateRow({ daily_routine: next })
    return updated?.daily_routine ?? next
  })
}

// Quais textos de um plano por tema a pessoa escolheu ler HOJE (ver
// src/themePlans/themeTexts.js/PlanScreen.jsx) — mesmo mapa data → entrada
// do dia de setStepDone acima, só que guardando `themePicks` em vez de um
// passo concluído. Reseta sozinho a cada dia novo (chave de hoje some do
// mapa), mesmo comportamento de prayer/reading/reflection. `keys` vazio
// (ou chamado de novo com uma lista diferente) sobrescreve a escolha do
// dia — não existe "acumular" escolhas dentro do mesmo dia.
export function setThemePicks(planId, keys) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const current = row?.daily_routine ?? {}
    const key = dateKey()
    const today = { ...current[key], themePicks: { planId, keys } }
    const next = { ...current, [key]: today }
    const updated = await updateRow({ daily_routine: next })
    return updated?.daily_routine ?? next
  })
}
