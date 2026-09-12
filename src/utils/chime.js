// Efeito sonoro curto de transição (pedido dela, 2026-09-12: "certificar
// que o efeito sonoro entre as etapas está funcionando") — usado quando
// uma etapa da Oração guiada (ACTS, PrayerScreen.jsx) esgota o tempo.
// Sintetizado na hora via Web Audio API (dois tons curtos subindo, ~660Hz
// e 880Hz) em vez de um arquivo de áudio — nada pra baixar, funciona
// offline, sem licenciamento. Silencioso e nunca trava a tela se o
// navegador bloquear áudio (alguns exigem outro gesto além do "play" que
// já iniciou o cronômetro) — o efeito é só um reforço, a vibração
// (navigator.vibrate, já existente) continua sendo o aviso principal.
let sharedCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  return sharedCtx
}

export function playStageChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const notes = [660, 880]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.14
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.24)
    })
  } catch (err) {
    console.error('[chime] failed to play stage chime:', err.message)
  }
}
