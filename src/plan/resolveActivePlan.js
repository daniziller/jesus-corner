// "Plano ativo" pra fins de Home/Rotina/Plano — por padrão é sempre o plano
// fixo (Leve/Padrão/Intensivo/Livre, dono de planId/blocks/sessionsByBlock,
// que também é o que a aba Bíblia e o Progresso sempre mostram). Quando a
// pessoa escolhe um plano por tema ou o cronológico (activeAltPlan, ver
// src/plan/activePlanStore.js), só a "sessão de hoje" (e a lista "Sessões
// do plano" em PlanScreen.jsx) passam a vir de lá — blocks/sessionsByBlock
// do fixo (parâmetros desta função) continuam intactos, então Bíblia/
// Progresso nunca mudam de estrutura por causa disso.
//
// Usado tanto por App.jsx (buildSession/continueToday) quanto por
// PlanScreen.jsx (lista "Sessões do plano", que reflete sempre o plano
// ativo no momento, não só o fixo) — extraído pra cá pra não duplicar essa
// lógica nos dois lugares.
import { PLANS } from '../data/bibleBlocks'
import { deriveChronoProgress } from '../data/chronologicalPlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'

// title/theme são os campos atuais/antigos do título de um plano por tema —
// planos salvos antes da tela ganhar campo de título separado do escopo
// usavam `theme`; o fallback evita que pareçam quebrados.
export function themePlanTitle(themePlan) {
  return themePlan.title ?? themePlan.theme ?? ''
}

// {done, total, totalMinutes} de um plano por tema — usado nas listas de
// PlanScreen.jsx/ThemePlanScreen.jsx. Planos com `passages` (formato atual,
// sem ritmo) derivam os textos via deriveThemeTexts e somam `minutes` real
// de cada um; planos bem antigos (só `sessions`, sem `passages`) caem no
// fallback de contagem simples, sem total de minutos (não dá pra saber sem
// re-buscar o texto).
export function themePlanProgress(themePlan, completedSet) {
  const texts = themePlan.passages ? deriveThemeTexts(themePlan.passages) : (themePlan.sessions ?? [])
  const done = texts.filter(s => sessionKeys(s).every(k => completedSet.has(k))).length
  const totalMinutes = themePlan.passages ? texts.reduce((sum, s) => sum + (s.minutes ?? 0), 0) : null
  return { done, total: texts.length, totalMinutes }
}

// todayThemePicks — `{ planId, keys }` do que a pessoa escolheu ler hoje
// (ver src/routine/dailyRoutineStore.js/setThemePicks), ou undefined/null
// se nada foi escolhido ainda hoje. Só usado pelo branch 'theme' abaixo.
export function resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, planId, todayThemePicks) {
  if (activeAltPlan?.type === 'theme') {
    const themePlan = themePlans.find(p => p.id === activeAltPlan.planId)
    if (themePlan) {
      const title = themePlanTitle(themePlan)
      // Planos com `passages` (formato atual) derivam os textos na hora —
      // já vêm com `words`/`minutes` calculados (ver
      // src/themePlans/themeTexts.js). Planos bem antigos, sem `passages`,
      // caem no fallback das sessões estáticas de sempre (sem escolha
      // diária nem tempo por texto — mesma limitação já aceita em
      // PlanScreen.jsx pro card ativo desses planos).
      const rawTexts = themePlan.passages ? deriveThemeTexts(themePlan.passages) : (themePlan.sessions ?? [])
      const texts = rawTexts.map(s => ({
        ...s,
        status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
      }))
      const doneCount = texts.filter(s => s.status === 'done').length
      const percent = texts.length ? Math.round((doneCount / texts.length) * 100) : 0
      // gradientKey/icon/status extras (além de id/name/nameEn/sessionsTotal,
      // os únicos campos que ReadingBlockView.jsx de fato lê) só existem pra
      // PlanBlockSection (PlanScreen.jsx) conseguir desenhar esse "bloco"
      // sintético igual aos blocos de verdade, na lista "Sessões do plano".
      const syntheticBlock = {
        id: `theme:${themePlan.id}`, name: title, nameEn: title,
        sessionsTotal: texts.length, icon: 'Sparkles', gradientKey: 'purple', percent,
        status: doneCount === texts.length ? 'done' : doneCount > 0 ? 'active' : 'todo',
      }

      // Escolha de HOJE — soma `minutes` só dos textos escolhidos que ainda
      // não foram lidos. `hasTodayPick` distingue "ninguém escolheu nada
      // ainda" (soma 0, mas precisa MOSTRAR o convite pra escolher) de
      // "escolheu e já terminou tudo que escolheu" (soma 0 porque já leu —
      // não deveria pedir pra escolher de novo). Planos antigos sem
      // `passages` nunca pedem escolha (não têm textos com `minutes`).
      const hasTodayPick = Boolean(themePlan.passages) && todayThemePicks?.planId === themePlan.id && (todayThemePicks.keys?.length ?? 0) > 0
      let readingMinutes = null
      if (hasTodayPick) {
        const pickedSet = new Set(todayThemePicks.keys)
        readingMinutes = texts
          .filter(s => s.status !== 'done' && pickedSet.has(themeTextKey(s)))
          .reduce((sum, s) => sum + (s.minutes ?? 0), 0)
      }
      const needsThemePick = Boolean(themePlan.passages) && doneCount < texts.length && !hasTodayPick

      return {
        kind: 'theme',
        icon: 'Sparkles',
        label: title,
        labelEn: title,
        readingMinutes,
        needsThemePick,
        doneCount,
        totalCount: texts.length,
        percent,
        blocks: [syntheticBlock],
        sessionsByBlock: { [syntheticBlock.id]: texts },
      }
    }
    // Plano referenciado não existe mais (deletado) — cai no fallback fixo.
  }

  if (activeAltPlan?.type === 'chrono') {
    const chrono = deriveChronoProgress(completedSet, activeAltPlan.paceId)
    const pace = PLANS.find(p => p.id === activeAltPlan.paceId) ?? PLANS.find(p => p.id === 'standard')
    const doneCount = chrono.blocks.reduce((s, b) => s + b.sessionsDone, 0)
    const totalCount = chrono.blocks.reduce((s, b) => s + b.sessionsTotal, 0)
    return {
      kind: 'chrono',
      icon: 'Hourglass',
      label: pace.label,
      labelEn: pace.labelEn,
      readingMinutes: pace.readingMinutes,
      doneCount,
      totalCount,
      percent: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
      blocks: chrono.blocks,
      sessionsByBlock: chrono.sessionsByBlock,
    }
  }

  const planRaw = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')
  const doneCount = blocks.reduce((s, b) => s + b.sessionsDone, 0)
  const totalCount = blocks.reduce((s, b) => s + b.sessionsTotal, 0)
  return {
    kind: 'fixed',
    icon: planRaw.icon,
    label: planRaw.label,
    labelEn: planRaw.labelEn,
    readingMinutes: planRaw.readingMinutes,
    doneCount,
    totalCount,
    percent: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    blocks,
    sessionsByBlock,
  }
}
