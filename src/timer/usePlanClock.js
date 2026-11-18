// usePlanClock.js — o motor do relógio do plano (ver planClockMath.js).
// Mora no App: começa quando a pessoa entra no plano guiado, pausa quando
// ela sai dele (e volta de onde parou se ela continuar o plano no mesmo
// dia), e zera no Dia concluído. Como os relógios dos passos, sair do app
// pausa de verdade — só volta com um toque.
//
// O tempo fica guardado no aparelho a cada pausa, para não se perder se o
// app for fechado no meio do plano.
import { useState, useRef, useCallback, useEffect } from 'react'
import { planSeconds, resumeClock, pauseClock, restoreSaved } from './planClockMath'
import { dateKey } from '../utils/dateKey'

const KEY = 'jc_plan_clock'

function readSaved() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
function writeSaved(seconds) {
  try { localStorage.setItem(KEY, JSON.stringify({ date: dateKey(), seconds: Math.round(seconds) })) } catch { /* sem armazenamento: só não guarda */ }
}
function clearSaved() {
  try { localStorage.removeItem(KEY) } catch { /* idem */ }
}

export function usePlanClock() {
  const clockRef = useRef({ accumulated: 0, startedAt: null, date: null })
  const [running, setRunning] = useState(false)

  const computeSeconds = useCallback(() => planSeconds(clockRef.current), [])

  const resume = useCallback(() => {
    const today = dateKey()
    // Outro dia (ou a primeira vez desde que o app abriu): retoma o que
    // ficou guardado hoje, ou começa do zero.
    if (clockRef.current.date !== today) clockRef.current = { accumulated: restoreSaved(readSaved(), today), startedAt: null, date: today }
    clockRef.current = { ...resumeClock(clockRef.current), date: today }
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    if (!clockRef.current.startedAt) return
    clockRef.current = { ...pauseClock(clockRef.current), date: clockRef.current.date }
    writeSaved(clockRef.current.accumulated)
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    clockRef.current = { accumulated: 0, startedAt: null, date: dateKey() }
    clearSaved()
    setRunning(false)
  }, [])

  const toggle = useCallback(() => {
    if (clockRef.current.startedAt) pause()
    else resume()
  }, [pause, resume])

  useEffect(() => {
    function onVisibility() { if (document.visibilityState === 'hidden') pause() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [pause])

  return { running, computeSeconds, resume, pause, reset, toggle }
}
