// useStepClockInPlan.js — liga o relógio regressivo de um passo (Oração,
// Reflexão) ao relógio do plano (ver PlanClockContext.js):
//
// - dentro do plano, o passo começa a contar quando aparece na frente, se o
//   plano está andando;
// - pausar o plano pausa o passo; o play do plano retoma o passo que já
//   tinha começado (mesmo com a pessoa em outra tela do plano);
// - sair do plano pausa o passo;
// - passo concluído (`doneRef.current` true) nunca volta a contar sozinho.
//
// Fora do plano não faz nada: cada tela segue com o próprio comportamento.
import { useEffect, useRef } from 'react'
import { usePlanClockLink } from './PlanClockContext'

export function useStepClockInPlan({ active, start, pause, doneRef }) {
  const plan = usePlanClockLink()
  const startedRef = useRef(false)
  const wasInPlanRef = useRef(false)

  useEffect(() => {
    if (!plan.inPlan) {
      if (wasInPlanRef.current) { wasInPlanRef.current = false; pause() }
      return
    }
    wasInPlanRef.current = true
    if (!plan.running) { pause(); return }
    if (doneRef.current) return
    if (active || startedRef.current) { startedRef.current = true; start() }
  }, [plan.inPlan, plan.running, active]) // eslint-disable-line react-hooks/exhaustive-deps

  return plan
}
