import { useState, useEffect, useRef, useCallback } from 'react'

// Motor de cronômetro único — antes reimplementado 3 vezes (Oração,
// Reflexão, e um terceiro, mais simples e sem wake lock, em Leitura).
// Baseado no padrão de diff de wall-clock que Oração/Reflexão já usavam
// (mais preciso que o tick de 1s que Leitura tinha — não perde tempo se o
// tick atrasar, e detecta corretamente tempo passado com a aba em
// background quando ela volta a ficar visível).
//
// "Sair do app pausa" (comportamento já estabelecido nas 3 telas antigas):
// diferente do resto do app, este cronômetro NÃO se recupera sozinho ao
// voltar — sumir da aba pausa de verdade, só retoma com um toque.
//
// `onTick(elapsedSeconds)` é opcional — chamado a cada 250ms enquanto
// rodando, pra quem precisa de lógica extra por cima (ex.: PrayerScreen
// detectando quando uma etapa ACTS zera, pra tocar o chime). O hook em si
// não sabe nada sobre "etapas" — isso continua sendo responsabilidade de
// cada tela.
export function useStepTimer({ onTick } = {}) {
  const [running, setRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  const computeElapsed = useCallback(() => {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }, [])

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.error('[useStepTimer] wake lock request failed:', err.message)
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  const pause = useCallback(() => {
    accumulatedRef.current = computeElapsed()
    startedAtRef.current = null
    setRunning(false)
    releaseWakeLock()
    clearInterval(intervalRef.current)
  }, [computeElapsed])

  const start = useCallback(() => {
    startedAtRef.current = Date.now()
    setRunning(true)
    requestWakeLock()
  }, [])

  const toggle = useCallback(() => {
    if (running) pause()
    else start()
  }, [running, pause, start])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const now = computeElapsed()
        setElapsedSeconds(now)
        onTickRef.current?.(now)
      }, 250)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, computeElapsed])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden' && running) pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [running, pause])

  useEffect(() => () => releaseWakeLock(), [])

  // computeElapsed também é exposto pra quem precisa do valor exato NA
  // HORA (ex.: redistribuir tempo entre etapas ao pular uma) em vez do
  // `elapsedSeconds` do estado, que só atualiza a cada 250ms.
  return { running, elapsedSeconds, start, pause, toggle, computeElapsed }
}
