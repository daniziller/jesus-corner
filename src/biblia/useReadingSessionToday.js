// useReadingSessionToday.js — a "sessão de hoje" do cartão preto da raiz
// da aba Bíblia (handoff-biblia-52 §2.5): o trecho do plano quando a
// Leitura cai hoje e ainda não foi feita. Os dias por passo são os mesmos
// do Meu Plano (stepDaysStore); a decisão é de readingSessionToday
// (bibliaMath.js).
//
// Devolve undefined enquanto os dias carregam (o cartão fica em
// esqueleto), null sem sessão hoje, ou o trecho ("Gênesis 41"). Se os
// dias não puderem ser lidos, mostra a sessão — o que a tela sempre fez.
import { useEffect, useState } from 'react'
import { getStepDays } from '../routine/stepDaysStore'
import { dateKey } from '../utils/dateKey'
import { readingSessionToday } from './bibliaMath'

export function useReadingSessionToday(session) {
  const [stepDays, setStepDays] = useState(undefined)
  useEffect(() => {
    let alive = true
    getStepDays().then(d => { if (alive) setStepDays(d) }).catch(err => {
      console.error('[bíblia] dias do plano', err)
      if (alive) setStepDays(null)
    })
    return () => { alive = false }
  }, [])

  const { routineModules, dailyRoutine, currentBlock, hasNoPlan } = session
  const passage = !hasNoPlan && currentBlock?.book && currentBlock?.chapter ? `${currentBlock.book} ${currentBlock.chapter}` : ''
  if (stepDays === undefined) return undefined
  if (stepDays === null) return passage || null
  const today = new Date()
  return readingSessionToday({ routineModules, stepDays, todayIdx: (today.getDay() + 6) % 7, dayEntry: dailyRoutine?.[dateKey(today)], passage })
}
