// Modo mãos-livres ("on the go") — conduz a rotina do dia inteira só por
// áudio: Oração → Leitura (capítulo lido em voz alta) → Reflexão, com os
// cronômetros rodando e a voz anunciando cada transição de etapa. Pensado
// pra ouvir dirigindo, caminhando ou treinando, sem olhar/tocar na tela.
//
// - Voz: Web Speech API do próprio aparelho (ver src/audio/speech.js).
// - Só os passos que a pessoa ligou em "Meu Plano" (session.routineModules),
//   e só prayer/reading/reflection — Estudo guiado/indutivo não entra no
//   fluxo de áudio nesta versão.
// - Durações de Oração/Reflexão: as mesmas salvas nas telas dedicadas
//   (jc_prayer_minutes / jc_reflection_minutes), divididas em etapas pelo
//   mesmo phaseMinutesFor do ACTS / roteiro de Reflexão.
// - Reaproveita o padrão de wake lock do PrayerScreen (mantém a tela ligada
//   enquanto roda).
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { ACTS_DATA, phaseMinutesFor as actsPhaseMinutes } from '../components/acts/ActsCard'
import { REFLECTION_DATA, phaseMinutesFor as reflPhaseMinutes } from '../data/reflectionGuide'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import {
  isSpeechSupported, speakSequence, say, stopSpeaking, primeSpeech, splitIntoChunks,
  pauseSpeech, resumeSpeech,
} from '../audio/premiumSpeech'

const STEP_ORDER = ['prayer', 'reading', 'reflection']
const STEP_ICON = { prayer: 'HandHeart', reading: 'BookOpen', reflection: 'PenLine' }
const TRANSITION_SECONDS = 5

// Fronteiras (segundos desde o início) de cada etapa, a partir dos minutos
// por etapa — mesma conta do PrayerScreen/ReflectionScreen.
function phaseBounds(phaseMinutes) {
  let acc = 0
  return phaseMinutes.map(m => {
    const start = acc
    acc += m * 60
    return start
  })
}
function phaseIndexAt(bounds, elapsed) {
  let idx = 0
  for (let i = 0; i < bounds.length; i++) if (elapsed >= bounds[i]) idx = i
  return idx
}

const fmt = s => {
  const m = Math.floor(Math.max(0, s) / 60).toString().padStart(2, '0')
  const sec = (Math.max(0, s) % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function HandsFreeScreen({ session, onExit, onMarkRoutineStep, onFinishReading, onNavigate }) {
  const { lang, routineModules, todaySession, plan } = session
  const L = k => t(`handsFree.${k}`, undefined, lang)

  const steps = useMemo(
    () => STEP_ORDER.filter(s => (routineModules ?? []).includes(s)),
    [routineModules],
  )

  // 'intro' | 'running' | 'done' | 'unsupported'
  const [screen, setScreen] = useState(isSpeechSupported() ? 'intro' : 'unsupported')
  const [stepIdx, setStepIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [statusLine, setStatusLine] = useState('')
  const [elapsed, setElapsed] = useState(0)        // p/ prayer e reflection
  const [totalSecs, setTotalSecs] = useState(0)
  const [readProgress, setReadProgress] = useState(0) // 0..1 p/ reading

  const runningRef = useRef(false)
  const wakeLockRef = useRef(null)
  const speakCtlRef = useRef(null)
  const tickRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumRef = useRef(0)
  const announcedPhaseRef = useRef(-1)
  const advanceGuardRef = useRef(false)

  runningRef.current = running
  const currentStep = steps[stepIdx]

  // ── wake lock (mantém a tela ligada) ──
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch { /* sem wake lock, segue mesmo assim */ }
  }, [])
  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {})
    wakeLockRef.current = null
  }, [])
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible' && runningRef.current) requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [requestWakeLock])

  // Limpa tudo ao desmontar.
  useEffect(() => () => {
    clearInterval(tickRef.current)
    stopSpeaking()
    releaseWakeLock()
  }, [releaseWakeLock])

  const stopSpeakNow = useCallback(() => {
    speakCtlRef.current?.stop?.()
    speakCtlRef.current = null
    stopSpeaking()
  }, [])

  // ── avança pro próximo passo (ou termina) ──
  const advance = useCallback(() => {
    if (advanceGuardRef.current) return
    advanceGuardRef.current = true
    clearInterval(tickRef.current)
    stopSpeakNow()
    setStepIdx(prev => {
      const next = prev + 1
      if (next >= steps.length) {
        setScreen('done')
        setRunning(false)
        releaseWakeLock()
        say(L('allDone'), { lang })
        return prev
      }
      // pequena transição falada antes de começar o próximo
      const nextStep = steps[next]
      setStatusLine(L('nextStep').replace('{step}', L(`step_${nextStep}`)))
      setElapsed(0); setTotalSecs(0); setReadProgress(0)
      announcedPhaseRef.current = -1
      const ctl = say(`${L('nextStep').replace('{step}', L(`step_${nextStep}`))}`, { lang })
      speakCtlRef.current = ctl
      setTimeout(() => {
        advanceGuardRef.current = false
        if (runningRef.current) runStep(next)
      }, TRANSITION_SECONDS * 1000)
      return next
    })
  }, [steps, lang, releaseWakeLock, stopSpeakNow]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── roda um passo pelo índice ──
  const runStep = useCallback((idx) => {
    const step = steps[idx]
    if (!step) return
    advanceGuardRef.current = false
    if (step === 'prayer') return runTimerStep('prayer')
    if (step === 'reflection') return runTimerStep('reflection')
    if (step === 'reading') return runReadingStep()
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── passo com cronômetro (Oração / Reflexão) ──
  function runTimerStep(kind) {
    const data = kind === 'prayer' ? ACTS_DATA : REFLECTION_DATA
    const savedMin = kind === 'prayer'
      ? (getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 10)
      : (getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 8)
    const perPhase = kind === 'prayer' ? actsPhaseMinutes(savedMin) : reflPhaseMinutes(savedMin)
    const bounds = phaseBounds(perPhase)
    const total = perPhase.reduce((a, b) => a + b, 0) * 60

    setTotalSecs(total)
    setElapsed(0)
    accumRef.current = 0
    startedAtRef.current = Date.now()
    announcedPhaseRef.current = -1

    const intro = kind === 'prayer' ? L('prayerIntro') : L('reflectionIntro')
    const firstPhase = data[0].title[lang] ?? data[0].title.pt
    speakCtlRef.current = say(`${intro} ${L('firstPhase').replace('{phase}', firstPhase)}`, { lang })
    setStatusLine(`${L(`step_${kind === 'prayer' ? 'prayer' : 'reflection'}`)} · ${firstPhase}`)

    clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      if (!runningRef.current) return
      const now = Math.min(accumRef.current + (Date.now() - startedAtRef.current) / 1000, total)
      setElapsed(now)

      const pi = phaseIndexAt(bounds, now)
      if (pi !== announcedPhaseRef.current) {
        const wasAnnounced = announcedPhaseRef.current !== -1
        announcedPhaseRef.current = pi
        const phaseTitle = data[pi].title[lang] ?? data[pi].title.pt
        setStatusLine(`${L(`step_${kind === 'prayer' ? 'prayer' : 'reflection'}`)} · ${phaseTitle}`)
        if (wasAnnounced) speakCtlRef.current = say(L('nextPhase').replace('{phase}', phaseTitle), { lang })
      }

      if (now >= total) {
        clearInterval(tickRef.current)
        onMarkRoutineStep?.(kind)
        speakCtlRef.current = say(kind === 'prayer' ? L('prayerDone') : L('reflectionDone'), { lang })
        setTimeout(() => { if (runningRef.current) advance() }, 2600)
      }
    }, 500)
  }

  // ── passo de leitura (capítulo lido em voz alta) ──
  async function runReadingStep() {
    setStatusLine(L('step_reading'))
    setReadProgress(0)

    const rs = todaySession
    // Sem sessão de leitura de hoje (plano por tema sem escolha, ou dia de
    // reflexão de livro) — anuncia e segue.
    if (!rs || rs.needsThemePick || rs.type === 'reflection' || rs.chStart == null) {
      speakCtlRef.current = say(L('readingSkipped'), { lang })
      setTimeout(() => { if (runningRef.current) advance() }, 3000)
      return
    }

    const bookName = lang === 'en' ? (rs.bookEn || rs.book) : rs.book
    let chunks = []
    try {
      const versionId = getSelectedVersionId(lang)
      const bookKey = lang === 'en' ? rs.bookEn : rs.book
      const chapters = await fetchBookText(versionId, bookKey)
      for (let ch = rs.chStart; ch <= rs.chEnd; ch++) {
        const verses = chapters?.[String(ch)]?.verses ?? {}
        chunks.push(L('chapterLabel').replace('{book}', bookName).replace('{n}', ch))
        for (const vn of Object.keys(verses).map(Number).sort((a, b) => a - b)) {
          for (const c of splitIntoChunks(verses[String(vn)])) chunks.push(c)
        }
      }
    } catch {
      speakCtlRef.current = say(L('readingError'), { lang })
      setTimeout(() => { if (runningRef.current) advance() }, 3000)
      return
    }

    const total = chunks.length || 1
    speakCtlRef.current = say(L('readingIntro').replace('{title}', lang === 'en' ? (rs.titleEn || bookName) : (rs.title || bookName)), { lang })

    // espera o intro terminar, então lê
    await speakCtlRef.current.done
    if (!runningRef.current) return

    const ctl = speakSequence(chunks, {
      lang,
      onChunk: i => setReadProgress((i + 1) / total),
      onDone: () => {
        onFinishReading?.()
        onMarkRoutineStep?.('reading')
        speakCtlRef.current = say(L('readingDone'), { lang })
        setTimeout(() => { if (runningRef.current) advance() }, 2600)
      },
    })
    speakCtlRef.current = ctl
  }

  // ── controles ──
  function handleStart() {
    primeSpeech() // destrava o áudio no iOS (precisa ser dentro do gesto)
    setScreen('running')
    setRunning(true)
    setStepIdx(0)
    requestWakeLock()
    const first = steps[0]
    speakCtlRef.current = say(`${L('welcome')} ${L('firstStep').replace('{step}', L(`step_${first}`))}`, { lang })
    setTimeout(() => { if (runningRef.current) runStep(0) }, 2600)
  }

  function togglePause() {
    setRunning(prev => {
      const next = !prev
      if (!next) {
        // pausar
        accumRef.current = Math.min(accumRef.current + (Date.now() - (startedAtRef.current ?? Date.now())) / 1000, totalSecs || Infinity)
        startedAtRef.current = null
        pauseSpeech()
        releaseWakeLock()
      } else {
        // retomar
        startedAtRef.current = Date.now()
        resumeSpeech()
        requestWakeLock()
      }
      return next
    })
  }

  function handleExit() {
    clearInterval(tickRef.current)
    stopSpeakNow()
    releaseWakeLock()
    onExit?.()
  }

  function skipStep() {
    if (runningRef.current) advance()
  }

  // ─────────────────────────────── render ───────────────────────────────
  if (screen === 'unsupported') {
    return (
      <div style={styles.wrap}>
        <div style={styles.center}>
          <AppIcon name="HelpCircle" size={34} color="rgba(255,255,255,.7)" />
          <p style={styles.bigLabel}>{L('unsupportedTitle')}</p>
          <p style={styles.sub}>{L('unsupportedBody')}</p>
          <button style={styles.exitBtn} onClick={handleExit}>{L('back')}</button>
        </div>
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div style={styles.wrap}>
        <div style={styles.center}>
          <p style={styles.bigLabel}>{L('noSteps')}</p>
          <button style={styles.primaryBtn} onClick={() => onNavigate?.('routine')}>{L('openMyPlan')}</button>
          <button style={styles.exitBtn} onClick={handleExit}>{L('back')}</button>
        </div>
      </div>
    )
  }

  if (screen === 'intro') {
    const totalMin = steps.reduce((sum, s) => {
      if (s === 'prayer') return sum + (getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 10)
      if (s === 'reflection') return sum + (getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 8)
      return sum + (plan.readingMinutes ?? 10)
    }, 0)
    return (
      <div style={styles.wrap}>
        <div style={styles.center}>
          <span style={styles.introIcon}><AppIcon name="HandHeart" size={30} color="white" /></span>
          <p style={styles.bigLabel}>{L('introTitle')}</p>
          <p style={styles.sub}>{L('introBody')}</p>
          <div style={styles.stepPreviewRow}>
            {steps.map(s => (
              <span key={s} style={{ ...styles.stepChip, borderColor: ROUTINE_STEP_COLORS[s] }}>
                <AppIcon name={STEP_ICON[s]} size={14} color="white" /> {L(`step_${s}`)}
              </span>
            ))}
          </div>
          <p style={styles.est}>{L('estTotal').replace('{min}', totalMin)}</p>
          <button style={styles.primaryBtn} onClick={handleStart}>
            <AppIcon name="BookOpen" size={16} color="white" /> {L('start')}
          </button>
          <button style={styles.exitBtn} onClick={handleExit}>{L('back')}</button>
          <p style={styles.tip}>{L('headphonesTip')}</p>
        </div>
      </div>
    )
  }

  if (screen === 'done') {
    return (
      <div style={styles.wrap}>
        <div style={styles.center}>
          <span style={styles.doneIcon}><AppIcon name="Check" size={34} color="white" /></span>
          <p style={styles.bigLabel}>{L('doneTitle')}</p>
          <p style={styles.sub}>{L('doneBody')}</p>
          <button style={styles.primaryBtn} onClick={() => onNavigate?.('stats')}>{L('seeProgress')}</button>
          <button style={styles.exitBtn} onClick={handleExit}>{L('finish')}</button>
        </div>
      </div>
    )
  }

  // running
  const showTimer = currentStep === 'prayer' || currentStep === 'reflection'
  const pct = currentStep === 'reading' ? Math.round(readProgress * 100)
    : totalSecs ? Math.round((elapsed / totalSecs) * 100) : 0

  return (
    <div style={styles.wrap}>
      <button style={styles.closeBtn} onClick={handleExit} aria-label={L('back')}>
        <AppIcon name="X" size={20} color="rgba(255,255,255,.75)" />
      </button>

      <div style={styles.center}>
        <div style={styles.stepDots}>
          {steps.map((s, i) => (
            <span key={s} style={{
              ...styles.stepDot,
              background: i < stepIdx ? ROUTINE_STEP_COLORS[s]
                : i === stepIdx ? 'white' : 'rgba(255,255,255,.25)',
            }} />
          ))}
        </div>

        <span style={{ ...styles.runIcon, background: ROUTINE_STEP_COLORS[currentStep] }}>
          <AppIcon name={STEP_ICON[currentStep]} size={30} color="white" />
        </span>
        <p style={styles.runStep}>{L(`step_${currentStep}`)}</p>
        <p style={styles.runStatus}>{statusLine}</p>

        {showTimer && (
          <p style={styles.timer}>{fmt(Math.round(totalSecs - elapsed))}</p>
        )}

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        </div>

        <div style={styles.controls}>
          <button style={styles.ctrlBtn} onClick={togglePause}>
            <AppIcon name={running ? 'Timer' : 'BookOpen'} size={18} color="white" />
            {running ? L('pause') : L('resume')}
          </button>
          <button style={styles.ctrlBtnGhost} onClick={skipStep}>
            <AppIcon name="ChevronRight" size={16} color="rgba(255,255,255,.8)" />
            {L('skipStep')}
          </button>
        </div>

        <p style={styles.tip}>{running ? L('runningTip') : L('pausedTip')}</p>
      </div>
    </div>
  )
}

const styles = {
  wrap: { position: 'relative', height: '100%', background: 'var(--bk-hero)', color: 'white', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  center: { minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: '52px 24px 110px' },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 },
  introIcon: { width: 64, height: 64, borderRadius: 20, background: 'var(--grad-vivid)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' },
  doneIcon: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#22C55E,var(--gr))', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  runIcon: { width: 76, height: 76, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.35)' },
  bigLabel: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' },
  sub: { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.72)', lineHeight: 1.5, maxWidth: 320 },
  est: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)' },
  tip: { fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, maxWidth: 300, marginTop: 4 },
  stepPreviewRow: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  stepChip: { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px solid', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700 },
  stepDots: { display: 'flex', gap: 8, marginBottom: 4 },
  stepDot: { width: 8, height: 8, borderRadius: '50%' },
  runStep: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 },
  runStatus: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', minHeight: 18 },
  timer: { fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, letterSpacing: 3, fontVariantNumeric: 'tabular-nums', margin: '2px 0' },
  progressTrack: { width: '100%', maxWidth: 320, height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'white', borderRadius: 99, transition: 'width .5s ease' },
  controls: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  ctrlBtn: { display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 24, padding: '12px 22px', background: 'var(--grad-primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' },
  ctrlBtnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 24, padding: '12px 18px', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 26, padding: '14px 28px', background: 'var(--grad-primary)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)', marginTop: 6 },
  exitBtn: { border: 'none', background: 'none', color: 'rgba(255,255,255,.6)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 8 },
}
