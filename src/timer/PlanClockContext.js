// PlanClockContext.js — o relógio do plano visto pelos passos. Dentro do
// plano guiado, o relógio de cada passo (Oração, Leitura, Reflexão) anda
// junto com o do plano: pausar um pausa os dois, e o play retoma os dois.
// Fora do plano, `inPlan` é false e cada passo segue sozinho, como antes.
import { createContext, useContext } from 'react'

export const PlanClockContext = createContext({ inPlan: false, running: false, toggle: () => {} })

export function usePlanClockLink() {
  return useContext(PlanClockContext)
}
