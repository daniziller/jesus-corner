import { useState, useEffect, useRef, useMemo } from 'react'
import ActsCard, { ACTS_DATA, phaseMinutesFor } from '../components/acts/ActsCard'
import PrayerRequests from '../components/prayer/PrayerRequests'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { getSavedPrayerMinutes, setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const DURATION_OPTIONS = [5, 10, 15, 20, 30]

// Fronteiras (em segundos, desde o início do cronômetro) de cada trecho do
// ACTS, a partir dos minutos por etapa do perfil de duração ativo (ver
// ACTS_DURATIONS — Leve ora 10min, Padrão/Intensivo oram 15min). Usado pra
// saber, a qualquer momento, em qual trecho o cronômetro está e disparar o
// aviso sonoro na troca.
function computePhaseBounds(phaseMinutes) {
  let acc = 0
  const bounds = ACTS_DATA.map((d, i) => {
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

export default function PrayerScreen({ session, authUser, onPrayerCompleted, onContinueSession }) {
  const { lang } = session
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [openCardId, setOpenCardId] = useState(null)
  // Duração total escolhida na hora — parte do que a pessoa já escolheu
  // antes (jc_prayer_minutes) ou, na primeira vez, do plano ativo. Trocar
  // aqui sobrescreve o padrão do plano até a pessoa escolher de novo.
  const [totalMinutes, setTotalMinutes] = useState(() => getSavedPrayerMinutes() ?? session.plan.prayerMinutes)
  const email = authUser?.email

  const phaseMinutes = useMemo(() => phaseMinutesFor(totalMinutes), [totalMinutes])
  const { bounds: PHASE_BOUNDS, totalSeconds: TOTAL_SECONDS } = useMemo(
    () => computePhaseBounds(phaseMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalMinutes]
  )

  const intervalRef = useRef(null)
  // Tempo é calculado por relógio (Date.now()), não por contagem de ticks —
  // assim, se o navegador atrasar/pausar o setInterval em segundo plano (tela
  // bloqueada, troca de aba), o cronômetro se recupera sozinho no tick
  // seguinte em vez de "perder" o tempo que passou de verdade.
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)
  const audioCtxRef = useRef(null)
  const announcedPhaseRef = useRef(-1)

  function computeElapsed() {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }

  // AudioContext só pode ser criado/retomado a partir de um gesto real do
  // usuário (política de autoplay dos navegadores) — por isso isso só é
  // chamado dentro do clique de "Iniciar", nunca de dentro do tick.
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
  }

  // Toque de aviso gerado na hora (sem depender de nenhum arquivo de áudio)
  // — uma sequência curta de tons. Duas notas pra troca de trecho, três pra
  // conclusão da oração inteira.
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

  // Wake Lock mantém a TELA ligada enquanto o cronômetro roda — é o jeito
  // real de "continuar rodando com o celular inativo": o navegador libera
  // temporizadores e som quando a tela apaga, então em vez disso evitamos
  // que ela apague durante a oração. O navegador libera o wake lock sozinho
  // quando a aba fica invisível, por isso ele é readquirido no
  // visibilitychange (ver useEffect abaixo).
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch (err) {
      console.error('[PrayerScreen] wake lock request failed:', err.message)
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
      setOpenCardId(ACTS_DATA[phaseIdx].id)
      if (wasAlreadyAnnounced) playChime([659, 880])
    }

    if (now >= TOTAL_SECONDS) {
      clearInterval(intervalRef.current)
      setRunning(false)
      releaseWakeLock()
      playChime([659, 880, 1047])
      incrementPrayerStat(email, 'timerCompletions').catch(err => {
        console.error('Failed to persist prayer stat', err)
      })
      onPrayerCompleted?.()
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
  }, [running, email])

  // Ao voltar pra tela (ex: desbloqueou o celular) recalcula na hora em vez
  // de esperar o próximo tick, e readquire o wake lock que o navegador
  // liberou sozinho ao ficar em segundo plano.
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
        setOpenCardId(ACTS_DATA[0].id)
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
    setSavedPrayerMinutes(minutes)
  }

  const btnLabel = running ? t('prayer.pause', undefined, lang)
    : remaining === 0 ? t('prayer.done', undefined, lang)
    : elapsed > 0 ? t('prayer.resume', undefined, lang)
    : t('prayer.start', undefined, lang)

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      {/* Header */}
      <div className="page-header"><h1 className="page-title">{t('prayer.pageTitle', undefined, lang)}</h1></div>

      {/* Hero */}
      <div style={styles.hero} data-tour="prayer-acts-card">
        <div style={styles.heroOrbBlue} />
        <div style={styles.heroOrbPink} />
        <span style={{ position: 'relative', marginBottom: 5 }}><AppIcon name="HandHeart" size={30} color="white" /></span>
        <span style={{ ...styles.heroTitle, position: 'relative' }}>{t('prayer.heroTitle', undefined, lang)}</span>
        <span style={{ ...styles.heroSub, position: 'relative' }}>{t('prayer.heroSub', undefined, lang)}</span>
      </div>

      <div style={styles.body}>
        <div className="dashboard-grid">

          {/* Coluna esquerda: timer + roteiro ACTS */}
          <div className="dashboard-col">
            <div style={styles.timer}>
              <span style={styles.timerLabel}>{t('prayer.timerLabel', undefined, lang)}</span>
              <span style={styles.timerDisplay}>{fmt(remaining)}</span>

              {/* Duração total — trocar aqui redivide as 4 etapas do ACTS
                  proporcionalmente (ver phaseMinutesFor) e reinicia o cronômetro. */}
              <span style={styles.durationLabel}>{t('prayer.durationLabel', undefined, lang)}</span>
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
                    background: remaining === 0 ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'var(--grad-vivid)',
                    boxShadow: remaining === 0 ? '0 8px 20px rgba(22,163,74,.35)' : 'var(--shadow-glow)',
                  }}
                  onClick={toggleRunning}
                >
                  {btnLabel}
                </button>
                <button style={{ ...styles.timerBtn, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.65)' }} onClick={resetTimer}>
                  {t('prayer.restart', undefined, lang)}
                </button>
              </div>
              {running && <p style={styles.wakeLockHint}>{t('prayer.wakeLockHint', undefined, lang)}</p>}

              {/* Oração terminada — próximo passo da rotina é a Leitura. */}
              {remaining === 0 && (
                <button style={styles.nextStepBtn} onClick={() => onContinueSession?.()}>
                  {t('prayer.goToReading', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
                </button>
              )}
            </div>

            {/* ACTS acordeão — o card do trecho atual abre sozinho conforme
                o cronômetro avança, com aviso sonoro na troca. */}
            <div className="block-grid">
              {ACTS_DATA.map((data, i) => (
                <ActsCard
                  key={data.id}
                  data={data}
                  minutes={phaseMinutes[i]}
                  open={openCardId === data.id}
                  onToggle={() => setOpenCardId(v => v === data.id ? null : data.id)}
                />
              ))}
            </div>
          </div>

          {/* Coluna direita: pedidos de oração */}
          <div className="dashboard-col">
            <PrayerRequests authUser={authUser} lang={lang} />
          </div>

        </div>
      </div>
    </div>
  )
}

const styles = {
  hero:        { minHeight: 150, margin: '10px 16px', borderRadius: 22, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 22px', boxShadow: '0 12px 28px rgba(76,29,149,.3)' },
  heroOrbBlue: { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#6366F1', filter: 'blur(60px)', opacity: 0.5, top: -60, left: -50 },
  heroOrbPink: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: '#EC4899', filter: 'blur(60px)', opacity: 0.3, bottom: -60, right: -40 },
  heroTitle:   { fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' },
  heroSub:     { fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.5, marginTop: 3 },
  body:        { padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  timer:       { background: '#141414', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timerLabel:  { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 2, textTransform: 'uppercase' },
  timerDisplay:{ fontSize: 40, fontWeight: 300, color: 'white', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' },
  timerBtn:    { padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, border: 'none', fontFamily: 'var(--font)', transition: 'transform .15s' },
  wakeLockHint:{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', textAlign: 'center', lineHeight: 1.5, marginTop: 2, maxWidth: 220 },
  durationLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  durationRow: { display: 'flex', gap: 6, background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 4 },
  durationBtn: { width: 34, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'rgba(255,255,255,.55)', background: 'transparent', transition: 'background .15s, color .15s' },
  durationBtnActive: { background: 'var(--grad-vivid)', color: 'white', boxShadow: '0 4px 12px rgba(249,115,22,.35)' },
  nextStepBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 24, padding: '10px 18px', marginTop: 2, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: 'linear-gradient(135deg,#F97316,#EA580C)', boxShadow: '0 8px 20px rgba(234,88,12,.35)' },
}
