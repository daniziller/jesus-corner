import { useState, useEffect } from 'react'
import { getAllSessions, totalsForDay } from '../metrics/sessionDurationStore'
import { dateKey } from '../utils/dateKey'

// Segundos já registrados HOJE, somando oração+leitura+reflexão, ANTES do
// passo em andamento (que ainda não foi gravado — só grava ao terminar,
// ver logSessionSeconds). Cada tela soma isso ao próprio `elapsedSeconds`
// ao vivo pra mostrar o "tempo total do plano" crescendo em tempo real.
// totalsForDay já existia em sessionDurationMath.js, só não tinha nenhum
// lugar chamando — usado hoje só pra agregados semanais (Home) ou gerais
// (Métricas), nunca pro dia corrente ao vivo.
export function usePlanTotalToday() {
  const [priorSeconds, setPriorSeconds] = useState(0)
  useEffect(() => {
    getAllSessions()
      .then(rows => {
        const t = totalsForDay(rows, dateKey())
        setPriorSeconds(t.prayer + t.reading + t.reflection)
      })
      .catch(err => console.error('[usePlanTotalToday] failed to load sessions', err))
  }, [])
  return priorSeconds
}
