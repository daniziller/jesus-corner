import { useState, useEffect, useRef, useMemo } from 'react'
import ReflectionGuideCard from '../components/reflection/ReflectionGuideCard'
import { REFLECTION_DATA, phaseMinutesFor } from '../data/reflectionGuide'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// Inclui 8 porque é o padrão do plano Leve (session.plan.reflectionMinutes)
// — sem ele, quem estivesse no Leve abriria a tela sem nenhum botão aceso.
const DURATION_OPTIONS = [5, 8, 10, 15, 20, 30]

// Mesmo mecanismo de cronômetro por fases do PrayerScreen.jsx (ACTS), a
// partir dos minutos por etapa do perfil de duração ativo (ver
// REFLECTION_DURATIONS — Leve reflete 8min, Padrão 10min, Intensivo 15min).
// Ver PrayerScreen.jsx pros comentários completos sobre wake lock / relógio
// real / aviso sonoro — a lógica aqui é a mesma, deliberadamente duplicada
// em vez de compartilhada, pra não acoplar duas telas que evoluem por
// razões diferentes (uma é oração, a outra é reflexão sobre a leitura do dia).
function computePhaseBounds(phaseMinutes) {
  let acc = 0
  const bounds = REFLECTION_DATA.map((d, i) => {
    const start = acc
    acc += phaseMinutes[i] * 60
    return { id: d.id, start }
  })
  return { bounds, totalSeconds: acc }
}

function phaseIndexAt(bounds, elapsedSeconds) {
  let idx = 0
  for (let i = 0; i < bounds.length; i++) {
    if (elapsedSeconds >= bounds[i].start) idx = i
  }
  return idx
}

export default function ReflectionScreen({ session, onReflectionCompleted }) {
  const { lang } = session
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [openCardId, setOpenCardId] = useState(null)
  // Duração total escolhida na hora — parte do que a pessoa já escolheu
  // antes (jc_reflection_minutes) ou, na primeira vez, do plano ativo.
  const [totalMinutes, setTotalMinutes] = useState(() => getSavedReflectionMinutes() ?? session.plan.reflectionMinutes)

  const phaseMinutes = useMemo(() => phaseMinutesFor(totalMinutes), [totalMinutes])
  const { bounds: PHASE_BOUNDS, totalSeconds: TOTAL_SECONDS } = useMemo(
    () => computePhaseBounds(phaseMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalMinutes]
  )

  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)
  const audioCtxRef = useRef(null)
  const announcedPhaseRef = useRef(-1)

  function computeElapsed() {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }

  function playChime(freqs) {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = now + i * 0.16
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.42)
    })
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch (err) {
      console.error('[ReflectionScreen] wake lock request failed:', err.message)
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  function tick() {
    const now = Math.min(computeElapsed(), TOTAL_SECONDS)
    setElapsed(now)

    const phaseIdx = phaseIndexAt(PHASE_BOUNDS, now)
    if (phaseIdx !== announcedPhaseRef.current) {
      const wasAlreadyAnnounced = announcedPhaseRef.current !== -1
      announcedPhaseRef.current = phaseIdx
      setOpenCardId(REFLECTION_DATA[phaseIdx].id)
      if (wasAlreadyAnnounced) playChime([659, 880])
    }

    if (now >= TOTAL_SECONDS) {
      clearInterval(intervalRef.current)
      setRunning(false)
      releaseWakeLock()
      playChime([659, 880, 1047])
      onReflectionCompleted?.()
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 250)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && running) {
        tick()
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  useEffect(() => () => releaseWakeLock(), [])

  const remaining = Math.max(0, Math.round(TOTAL_SECONDS - elapsed))

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function toggleRunning() {
    if (remaining <= 0) return
    if (running) {
      accumulatedRef.current = computeElapsed()
      startedAtRef.current = null
      setRunning(false)
      releaseWakeLock()
    } else {
      ensureAudioContext()
      startedAtRef.current = Date.now()
      setRunning(true)
      requestWakeLock()
      if (announcedPhaseRef.current === -1) {
        announcedPhaseRef.current = 0
        setOpenCardId(REFLECTION_DATA[0].id)
      }
    }
  }

  function resetTimer() {
    clearInterval(intervalRef.current)
    releaseWakeLock()
    setRunning(false)
    setElapsed(0)
    accumulatedRef.current = 0
    startedAtRef.current = null
    announcedPhaseRef.current = -1
    setOpenCardId(null)
  }

  // Troca a duração total escolhida — reinicia o cronômetro (os limites de
  // cada etapa mudam) e lembra a escolha pra próxima vez.
  function selectDuration(minutes) {
    if (minutes === totalMinutes) return
    resetTimer()
    setTotalMinutes(minutes)
    setSavedReflectionMinutes(minutes)
  }

  const btnLabel = running ? t('reflection.pause', undefined, lang)
    : remaining === 0 ? t('reflection.done', undefined, lang)
    : elapsed > 0 ? t('reflection.resume', undefined, lang)
    : t('reflection.start', undefined, lang)

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      {/* Header */}
      <div className="page-header"><h1 className="page-title">{t('reflection.pageTitle', undefined, lang)}</h1></div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroOrbPurple} />
        <div style={styles.heroOrbFuchsia} />
        <span style={{ position: 'relative', marginBottom: 5 }}><AppIcon name="PenLine" size={30} color="white" /></span>
        <span style={{ ...styles.heroTitle, position: 'relative' }}>{t('reflection.heroTitle', undefined, lang)}</span>
        <span style={{ ...styles.heroSub, position: 'relative' }}>{t('reflection.heroSub', undefined, lang)}</span>
      </div>

      <div style={styles.body}>
        <div style={styles.timer}>
          <span style={styles.timerLabel}>{t('reflection.timerLabel', undefined, lang)}</span>
          <span style={styles.timerDisplay}>{fmt(remaining)}</span>

          {/* Duração total — trocar aqui redivide as 3 etapas
              proporcionalmente (ver phaseMinutesFor) e reinicia o cronômetro. */}
          <span style={styles.durationLabel}>{t('reflection.durationLabel', undefined, lang)}</span>
          <div style={styles.durationRow}>
            {DURATION_OPTIONS.map(n => (
              <button
                key={n}
                style={{ ...styles.durationBtn, ...(n === totalMinutes ? styles.durationBtnActive : null) }}
                onClick={() => selectDuration(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{
                ...styles.timerBtn, color: 'white',
                background: remaining === 0 ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#A855F7,#7C3AED)',
                boxShadow: remaining === 0 ? '0 8px 20px rgba(22,163,74,.35)' : '0 8px 20px rgba(124,58,237,.35)',
              }}
              onClick={toggleRunning}
            >
              {btnLabel}
            </button>
            <button style={{ ...styles.timerBtn, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.65)' }} onClick={resetTimer}>
              {t('reflection.restart', undefined, lang)}
            </button>
          </div>
          {running && <p style={styles.wakeLockHint}>{t('reflection.wakeLockHint', undefined, lang)}</p>}
        </div>

        {/* Roteiro acordeão — o card da etapa atual abre sozinho conforme o
            cronômetro avança, com aviso sonoro na troca (mesmo padrão do ACTS). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REFLECTION_DATA.map((data, i) => (
            <ReflectionGuideCard
              key={data.id}
              data={data}
              minutes={phaseMinutes[i]}
              open={openCardId === data.id}
              onToggle={() => setOpenCardId(v => v === data.id ? null : data.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  hero:        { minHeight: 150, margin: '10px 16px', borderRadius: 22, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg,#3b0764 0%,#581c87 55%,#701a75 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 22px', boxShadow: '0 12px 28px rgba(88,28,135,.3)' },
  heroOrbPurple: { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#A855F7', filter: 'blur(60px)', opacity: 0.5, top: -60, left: -50 },
  heroOrbFuchsia: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: '#D946EF', filter: 'blur(60px)', opacity: 0.3, bottom: -60, right: -40 },
  heroTitle:   { fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' },
  heroSub:     { fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.5, marginTop: 3 },
  body:        { padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  timer:       { background: '#141414', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timerLabel:  { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 2, textTransform: 'uppercase' },
  timerDisplay:{ fontSize: 40, fontWeight: 300, color: 'white', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' },
  timerBtn:    { padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, border: 'none', fontFamily: 'var(--font)', transition: 'transform .15s' },
  wakeLockHint:{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', textAlign: 'center', lineHeight: 1.5, marginTop: 2, maxWidth: 220 },
  durationLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  durationRow: { display: 'flex', gap: 6, background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 4 },
  durationBtn: { width: 34, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'rgba(255,255,255,.55)', background: 'transparent', transition: 'background .15s, color .15s' },
  durationBtnActive: { background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,.35)' },
}
