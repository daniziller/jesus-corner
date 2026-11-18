// planClockMath.js — as contas do relógio do plano (pedido de 18/11): um
// relógio que conta PARA CIMA todo o tempo em que a pessoa está dentro do
// plano guiado, com pausa e play. Fica aqui, sem React, para os testes.
//
// Estado: { accumulated, startedAt } — `accumulated` são os segundos já
// contados antes da última retomada; `startedAt` (ms) é quando o relógio
// voltou a andar, ou null se está parado.

export function planSeconds(clock, now = Date.now()) {
  const base = clock?.accumulated ?? 0
  if (!clock?.startedAt) return base
  return base + Math.max(0, (now - clock.startedAt) / 1000)
}

export function resumeClock(clock, now = Date.now()) {
  if (clock.startedAt) return clock
  return { ...clock, startedAt: now }
}

export function pauseClock(clock, now = Date.now()) {
  if (!clock.startedAt) return clock
  return { accumulated: planSeconds(clock, now), startedAt: null }
}

// O que ficou guardado no aparelho só vale no mesmo dia: o plano de amanhã
// começa do zero.
export function restoreSaved(saved, today) {
  if (!saved || saved.date !== today || !Number.isFinite(saved.seconds) || saved.seconds < 0) return 0
  return saved.seconds
}

// "4:07", "12:30", "1:02:05" — conta para cima; passa a mostrar as horas
// só depois da primeira hora.
export function formatElapsed(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}

// Para o leitor de tela: só os minutos (muda de minuto em minuto, nunca
// anuncia segundos).
export function elapsedMinutes(totalSeconds) {
  return Math.floor(Math.max(0, totalSeconds) / 60)
}
