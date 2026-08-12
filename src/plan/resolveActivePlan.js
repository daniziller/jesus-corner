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
import { sessionKeys } from '../utils/progress'

// title/paceId são os campos atuais de um plano por tema; `theme`/
// minutesPerSession são os nomes antigos (planos salvos antes da tela
// ganhar campo de título + ritmo separado do escopo) — os fallbacks abaixo
// evitam que um plano salvo nesse formato antigo pareça quebrado.
export function themePlanTitle(themePlan) {
  return themePlan.title ?? themePlan.theme ?? ''
}
export function themePlanReadingMinutes(themePlan) {
  if (themePlan.paceId) return (PLANS.find(p => p.id === themePlan.paceId) ?? PLANS.find(p => p.id === 'standard')).readingMinutes
  return themePlan.minutesPerSession ?? null
}

export function resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, planId) {
  if (activeAltPlan?.type === 'theme') {
    const themePlan = themePlans.find(p => p.id === activeAltPlan.planId)
    if (themePlan) {
      const title = themePlanTitle(themePlan)
      const sessions = themePlan.sessions.map(s => ({
        ...s,
        status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
      }))
      const doneCount = sessions.filter(s => s.status === 'done').length
      const percent = sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0
      // gradientKey/icon/status extras (além de id/name/nameEn/sessionsTotal,
      // os únicos campos que ReadingBlockView.jsx de fato lê) só existem pra
      // PlanBlockSection (PlanScreen.jsx) conseguir desenhar esse "bloco"
      // sintético igual aos blocos de verdade, na lista "Sessões do plano".
      const syntheticBlock = {
        id: `theme:${themePlan.id}`, name: title, nameEn: title,
        sessionsTotal: sessions.length, icon: 'Sparkles', gradientKey: 'purple', percent,
        status: doneCount === sessions.length ? 'done' : doneCount > 0 ? 'active' : 'todo',
      }
      return {
        kind: 'theme',
        icon: 'Sparkles',
        label: title,
        labelEn: title,
        readingMinutes: themePlanReadingMinutes(themePlan),
        doneCount,
        totalCount: sessions.length,
        percent,
        blocks: [syntheticBlock],
        sessionsByBlock: { [syntheticBlock.id]: sessions },
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
