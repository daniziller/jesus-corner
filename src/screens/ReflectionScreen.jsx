// ReflectionScreen.jsx — Reflexão, passo 3 de 3 (reskin Bento, quadros
// 26c/29b). Dois fluxos possíveis, cabeçalho igual nos dois (bate com
// Oração/Leitura — nota do quadro 21b "é 10d com o cabeçalho de passo"):
// com IA (session.hasAI + interruptor 10f ligado + capítulo real ancorando
// as perguntas) ou manual (roteiro Reviver/Entender/Aplicar de sempre,
// reskinado aqui pela primeira vez — não tinha quadro próprio, mas 0%
// identidade antiga é regra do redesign inteiro, então segue o MESMO
// padrão visual de PrayerScreen.jsx: cartão de método+relógio, fileiras de
// etapa, painel "para hoje"). Os dois terminam no mesmo último passo — a
// frase de aplicação refeita (29b, ApplicationStepCard.jsx).
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import ApplicationStepCard from '../components/reflection/ApplicationStepCard'
import { REFLECTION_DATA, phaseMinutesFor } from '../data/reflectionGuide'
import {
  getPinnedApplicationPhrase, setPinnedApplicationPhrase, dailyApplicationKeyFor,
} from '../reflection/applicationPhraseStore'
import { getNotes, saveNote, noteTextOf, noteReminderRequestedOf } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { dateKey } from '../utils/dateKey'
import {
  getReflectionQuestionsEnabled, fetchReflectionQuestions, composeReflectionDraft, saveApprovedReflection,
} from '../aiChat/reflectionQuestionsStore'
import { useSpeechToText, isSpeechToTextSupported } from '../utils/useSpeechToText'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import TimePerStepSheet from '../components/TimePerStepSheet'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'

// Mesmo mecanismo de cronômetro por fases do PrayerScreen.jsx (ACTS), a
// partir dos minutos por etapa do perfil de duração ativo. Ver
// PrayerScreen.jsx pros comentários completos sobre wake lock / relógio
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

export default function ReflectionScreen({ session, authUser, completedSet, stepMinutes, onSaveStepMinutes, onReflectionCompleted, hasPreviousReadingSession, lastReadChapterInfo, onBackToReading, onNavigate, onContinueSession, onExitGuided, onAiFlowChange }) {
  const { lang } = session
  const guided = session.guided?.step === 'reflection' ? session.guided : null

  // Reflexão com perguntas geradas (10d/26c) — substitui o roteiro manual
  // abaixo quando elegível: precisa de IA (session.hasAI), do interruptor
  // ligado (10f) e de um capítulo real pra ancorar as perguntas
  // (lastReadChapterInfo). Decidido uma vez na montagem; se a busca das
  // perguntas falhar depois (rede, offline, capítulo sem texto), cai pro
  // fluxo manual sozinho — nunca uma parede.
  const aiEligible = session.hasAI && getReflectionQuestionsEnabled() && !!lastReadChapterInfo
    && (typeof navigator === 'undefined' || navigator.onLine)
  const [aiPhase, setAiPhase] = useState(aiEligible ? 'active' : 'fallback')
  const [aiQuestions, setAiQuestions] = useState(null)
  useEffect(() => {
    onAiFlowChange?.(aiPhase === 'active')
    return () => onAiFlowChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPhase])

  useEffect(() => {
    if (aiPhase !== 'active' || aiQuestions || !lastReadChapterInfo) return
    let cancelled = false
    fetchReflectionQuestions({
      book: lastReadChapterInfo.book, bookEn: lastReadChapterInfo.bookEn,
      chStart: lastReadChapterInfo.chStart, chEnd: lastReadChapterInfo.chEnd, lang,
    })
      .then(qs => { if (!cancelled) setAiQuestions(qs) })
      .catch(() => { if (!cancelled) setAiPhase('fallback') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPhase])

  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [openCardId, setOpenCardId] = useState(null)
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [hasSavedNote, setHasSavedNote] = useState(false)
  // Frase de aplicação do dia (29b) — separada da anotação geral, ligada
  // ao último passo ("Aplicar"). Mesmo esquema de chave por dia, prefixo
  // diferente.
  const [applicationPhrase, setApplicationPhrase] = useState('')
  const [reminderRequested, setReminderRequested] = useState(false)
  // Frase nova ≠ da fixada na Home — confirmação inline (ver
  // confirmPinUpdate / ApplicationStepCard) em vez de um window.confirm
  // bloqueante.
  const [pendingPin, setPendingPin] = useState(null)
  const noteKey = `reflection:${dateKey()}`
  const applicationPhraseKey = dailyApplicationKeyFor()
  const totalMinutes = stepMinutes?.reflection ?? session.plan.reflectionMinutes

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

  // Carrega a anotação do dia + a frase de aplicação — mesmo padrão de
  // ReadingBlockView.jsx (NotesPanel), reaproveitando o mesmo notesStore,
  // só com chaves por dia em vez de por passagem.
  useEffect(() => {
    if (!authUser?.email) { setNoteText(''); setHasSavedNote(false); setApplicationPhrase(''); setReminderRequested(false); return }
    getNotes(authUser.email).then(map => {
      setNoteText(noteTextOf(map[noteKey]))
      setHasSavedNote(Boolean(noteTextOf(map[noteKey])))
      setApplicationPhrase(noteTextOf(map[applicationPhraseKey]))
      setReminderRequested(noteReminderRequestedOf(map[applicationPhraseKey]))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey, applicationPhraseKey, authUser?.email])

  // Textos marcados HOJE durante uma sessão guiada da Rotina (não
  // navegação livre — ver sessionMode em src/highlights/highlightsStore.js
  // e handleSaveHighlight em ReadingBlockView.jsx). Mostrados como
  // referência, só leitura — editar continua em Notas ou na própria
  // leitura.
  const [todayHighlights, setTodayHighlights] = useState([])
  useEffect(() => {
    if (!authUser?.email) { setTodayHighlights([]); return }
    getHighlights(authUser.email).then(list => {
      setTodayHighlights(list.filter(h => !h.hidden && h.date === dateKey() && h.sessionMode === 'session'))
    }).catch(err => console.error('Failed to load highlights', err))
  }, [authUser?.email])

  function handleSaveNote(text) {
    setNoteText(text)
    setHasSavedNote(Boolean(text.trim()))
    saveNote(authUser?.email, noteKey, text).catch(err => {
      console.error('Failed to persist reflection note', err)
    })
  }

  // A frase do dia sempre grava no histórico (application:{dia}); virar a
  // frase FIXADA no card da Home (application:pinned) é outra decisão: a
  // 1a frase de todas fixa sozinha (nada pra comparar ainda) — da 2a em
  // diante, só troca se a pessoa confirmar.
  async function handleSaveApplicationPhrase(text) {
    setApplicationPhrase(text)
    try {
      await saveNote(authUser?.email, applicationPhraseKey, text, { sessionTitle: session.todaySession?.title ?? null, reminderRequested })
      if (!text.trim()) return
      const currentPinned = await getPinnedApplicationPhrase(authUser?.email)
      if (!currentPinned) {
        await setPinnedApplicationPhrase(authUser?.email, text)
      } else if (currentPinned !== text) {
        setPendingPin(text)
      }
    } catch (err) {
      // Não bloqueia "Salvar e concluir o dia" por uma falha de rede — a
      // frase fica no estado local (setApplicationPhrase acima já rodou);
      // só a persistência que falhou, sem travar o fechamento do dia.
      console.error('Failed to persist application phrase', err)
    }
  }

  function handleToggleReminder(next) {
    setReminderRequested(next)
    saveNote(authUser?.email, applicationPhraseKey, applicationPhrase, { sessionTitle: session.todaySession?.title ?? null, reminderRequested: next }).catch(err => {
      console.error('Failed to persist reminder preference', err)
    })
  }

  async function confirmPinUpdate(accept) {
    const text = pendingPin
    setPendingPin(null)
    if (!accept || !text) return
    try {
      await setPinnedApplicationPhrase(authUser?.email, text)
    } catch (err) {
      console.error('Failed to pin application phrase', err)
    }
  }

  // "Me ajuda a escrever" (29b, só com IA) — reaproveita o endpoint que já
  // junta respostas num parágrafo (compose-reflection), aqui só como
  // ponto de partida pra frase: pega a 1a frase do parágrafo composto. No
  // fluxo manual não há perguntas/respostas reais — usa a anotação livre
  // do dia como contexto, quando existe; sem chapterInfo nem contexto
  // nenhum, o chip nem aparece (ver hasAI && aiContext em
  // ApplicationStepCard).
  const manualQaContext = noteText.trim() ? [{ question: t('reflection.notesLabel', undefined, lang), answer: noteText.trim() }] : null
  async function aiAssistApplication(qa) {
    if (!lastReadChapterInfo || !qa) return null
    const draft = await composeReflectionDraft({ book: lastReadChapterInfo.book, chapter: lastReadChapterInfo.chStart, lang, qa })
    const firstSentence = draft.split(/(?<=[.!?])\s/)[0] ?? draft
    return firstSentence.slice(0, 140)
  }

  // `aiSeconds` vem do fluxo de IA (que não usa o cronômetro do fluxo
  // manual, ver AiReflectionFlow abaixo) — sem ele, cai no `elapsed` do
  // cronômetro normal (fluxo manual). De qualquer jeito, uma linha em
  // session_seconds — mesma dependência de finishPrayer em PrayerScreen.
  function finishReflection(aiSeconds) {
    logSessionSeconds('reflection', aiSeconds ?? elapsed).catch(err => console.error('Failed to log reflection session seconds', err))
    onReflectionCompleted?.()
  }

  // Etapa em destaque — mesmo padrão do PrayerScreen (segue openCardId, que
  // já reage à troca de trecho durante o cronômetro em tick()); antes de
  // começar, mostra a 1a etapa como "próxima".
  const currentPhaseIdx = openCardId != null ? REFLECTION_DATA.findIndex(d => d.id === openCardId) : 0
  const realPhaseIdx = currentPhaseIdx
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

  function skipToNextPhase() {
    const nextBound = PHASE_BOUNDS[realPhaseIdx + 1]?.start ?? TOTAL_SECONDS
    accumulatedRef.current = nextBound
    if (running) startedAtRef.current = Date.now()
    tick()
  }

  const L = (k, vars) => t(`reflection.${k}`, vars, lang)

  // Rotina de hoje inteira concluída (só os passos que o plano da pessoa
  // realmente tem — ver mesmo filtro em RoutineScreen.jsx).
  const allStepsDone = session.routineModules.every(m => session.todayRoutine?.[m])

  // Tela própria (10d/26c) — cabeçalho igual ao de Oração/Leitura + as
  // perguntas geradas + o passo de aplicação no fim.
  if (aiPhase === 'active') {
    return (
      <AiReflectionFlow
        lang={lang} session={session} guided={guided}
        chapterInfo={lastReadChapterInfo}
        questions={aiQuestions}
        stepMinutes={stepMinutes}
        onOpenTimeSheet={() => setTimeSheetOpen(true)}
        onPeekReading={hasPreviousReadingSession ? onBackToReading : null}
        onExitGuided={onExitGuided}
        applicationPhrase={applicationPhrase}
        onSaveApplicationPhrase={handleSaveApplicationPhrase}
        pendingPin={pendingPin}
        onConfirmPin={confirmPinUpdate}
        reminderRequested={reminderRequested}
        onToggleReminder={handleToggleReminder}
        hasAI={session.hasAI}
        onAiAssist={aiAssistApplication}
        onApprove={async (qa, paragraph) => {
          await saveNote(authUser?.email, noteKey, paragraph)
          saveApprovedReflection({ book: lastReadChapterInfo.book, chapter: lastReadChapterInfo.chStart, qa, paragraph })
        }}
        onAllDone={finishReflection}
      />
    )
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={guided ? onExitGuided : () => onNavigate?.('home')} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        {guided ? (
          <div style={styles.stepChip}>
            <span style={styles.stepChipTitle}>{L('pageTitle')}</span>
            <span style={styles.stepChipSub}>{L('stepOf', { n: guided.idx + 1, total: guided.total })}</span>
          </div>
        ) : (
          <p style={styles.plainTitle}>{L('pageTitle')}</p>
        )}
        <div style={{ flex: 1 }} />
        <button style={styles.timePill} onClick={() => setTimeSheetOpen(true)}>
          <span style={styles.timePillText}>{t('routine.minShort', { n: totalMinutes }, lang)}</span>
          <AppIcon name="ChevronDown" size={11} strokeWidth={2.6} color="var(--bento-accent)" />
        </button>
      </div>

      <div style={styles.body}>
        {hasPreviousReadingSession && (
          <button style={styles.backToReadingBtn} onClick={onBackToReading}>
            <AppIcon name="ArrowLeft" size={13} color="var(--bento-ink)" />
            {t('reflection.backToReading', undefined, lang)}
          </button>
        )}

        {/* Método · duração total — mesmo padrão de PrayerScreen.jsx. */}
        <div style={styles.methodCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.methodLabel}>{t('routine.minShort', { n: totalMinutes }, lang)}</p>
            <div style={styles.segmentRow}>
              {REFLECTION_DATA.map((d, i) => (
                <div
                  key={d.id}
                  style={{
                    ...styles.segment,
                    background: i < realPhaseIdx ? 'var(--bento-sand-icon)' : i === realPhaseIdx ? 'var(--bento-accent)' : 'var(--bento-line)',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={styles.methodTime}>{fmt(remaining)}</p>
            <p style={styles.methodTimeLabel}>{t('prayer.remainingShort', undefined, lang)}</p>
          </div>
        </div>

        {REFLECTION_DATA.map((d, i) => {
          const state = i < realPhaseIdx ? 'done' : i === realPhaseIdx ? 'now' : 'later'
          const title = d.title[lang] ?? d.title.pt
          return (
            <Fragment key={d.id}>
              <button
                style={{
                  ...styles.phaseRow,
                  ...(state === 'done' ? styles.phaseRowDone : state === 'now' ? styles.phaseRowNow : styles.phaseRowLater),
                }}
                onClick={() => setOpenCardId(d.id)}
              >
                <div style={{
                  ...styles.phaseLetter,
                  background: state === 'done' ? 'var(--bento-sand-icon)' : state === 'now' ? 'var(--bento-accent)' : 'var(--bento-line)',
                  color: state === 'done' ? 'var(--bento-sand)' : state === 'now' ? 'var(--bento-ink)' : 'var(--bento-t4)',
                }}>
                  {d.letter}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ ...styles.phaseTitle, color: state === 'done' ? 'var(--bento-sand-ink-strong)' : state === 'now' ? '#fff' : 'var(--bento-t3)' }}>{title}</p>
                  <p style={{ ...styles.phaseSub, color: state === 'done' ? 'var(--bento-sand-label)' : state === 'now' ? 'rgba(255,255,255,.5)' : 'var(--bento-t5)' }}>
                    {state === 'done' ? t('prayer.phaseStatusDone', { n: phaseMinutes[i] }, lang) : state === 'now' ? t('prayer.phaseStatusNow', { n: phaseMinutes[i] }, lang) : t('prayer.phaseStatusLater', undefined, lang)}
                  </p>
                </div>
                {state === 'done' && <AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-sand-icon)" />}
                {state === 'now' && <span style={styles.phaseNowClock}>{fmt(Math.max(0, Math.round((PHASE_BOUNDS[i + 1]?.start ?? TOTAL_SECONDS) - elapsed)))}</span>}
                {state === 'later' && <span style={styles.phaseLaterMin}>{phaseMinutes[i]} min</span>}
              </button>

              {/* A etapa em foco expande o guia (R/E) ou o passo de
                  aplicação refeito (A, 29b) — sempre a etapa REAL do
                  cronômetro, não uma escolhida à parte (a Reflexão manual
                  não tem "espiar etapa futura" como a Oração). */}
              {state === 'now' && d.id !== 'A' && (
                <div style={styles.stagePanel}>
                  <p style={styles.stagePanelLabel}>{L('currentPhase', { n: i + 1, total: REFLECTION_DATA.length })} <strong>{title}</strong></p>
                  <p style={styles.stagePanelText}>{d.description?.[lang] ?? d.description?.pt ?? d.subtitle[lang] ?? d.subtitle.pt}</p>
                  {remaining > 0 && (
                    <div style={styles.stagePanelActions}>
                      <button style={styles.pauseBtn} onClick={toggleRunning}>
                        <AppIcon name={running ? 'Pause' : 'Play'} size={13} color="#fff" />
                        <span>{running ? t('prayer.pauseBtn', undefined, lang) : elapsed > 0 ? t('prayer.resumeBtn', undefined, lang) : t('prayer.startBtn', undefined, lang)}</span>
                      </button>
                      <button style={styles.nextPhaseBtn} onClick={skipToNextPhase}>
                        <span>{t('prayer.nextPhaseBtn', undefined, lang)}</span>
                        <AppIcon name="ArrowRight" size={13} strokeWidth={2.6} color="var(--bento-ink)" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {state === 'now' && d.id === 'A' && (
                <ApplicationStepCard
                  lang={lang} hasAI={session.hasAI}
                  value={applicationPhrase} onSave={handleSaveApplicationPhrase}
                  pendingPin={pendingPin} onConfirmPin={confirmPinUpdate}
                  reminderRequested={reminderRequested} onToggleReminder={handleToggleReminder}
                  aiContext={manualQaContext ? () => aiAssistApplication(manualQaContext) : null}
                  onFinish={finishReflection}
                />
              )}
            </Fragment>
          )
        })}

        <RoutineStepSwitcher
          session={session}
          activeStep="reflection"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoReading={() => onContinueSession?.()}
          onGoStudy={() => onNavigate?.('studies')}
        />

        {todayHighlights.length > 0 && (
          <div style={styles.notesPanel}>
            <p style={styles.notesLabel}>
              <AppIcon name="Highlighter" size={12} color="var(--bento-accent)" style={{ verticalAlign: 'middle', marginRight: 5 }} />
              {t('reflection.markedTextsLabel', undefined, lang)}
            </p>
            <p style={styles.fieldHint}>{t('reflection.markedTextsHint', undefined, lang)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayHighlights.map(h => (
                <div key={h.id} style={styles.markedTextItem}>
                  <p style={styles.markedTextRef}>
                    <AppIcon name="Highlighter" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {h.book} {h.chapter}:{formatVerseRanges(h.verses)}
                  </p>
                  <p style={styles.markedTextBody}>{h.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <NotesPanel value={noteText} hasSavedNote={hasSavedNote} onSave={handleSaveNote} lang={lang} />

        {allStepsDone && (
          <div style={styles.routineCompleteCard}>
            <p style={styles.routineCompleteTitle}>{t('reflection.routineCompleteTitle', undefined, lang)}</p>
            {guided && <p style={styles.guidedAutoHint}>{t('guided.finishingAuto', undefined, lang)}</p>}
            <button style={styles.nextStepBtn} onClick={() => onNavigate?.('metrics')}>
              {t('reflection.goToProgress', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
            </button>
          </div>
        )}
      </div>

      <TimePerStepSheet
        open={timeSheetOpen}
        onClose={() => setTimeSheetOpen(false)}
        initialMinutes={{ prayer: stepMinutes?.prayer ?? session.plan.prayerMinutes, reading: stepMinutes?.reading ?? session.plan.readingMinutes, reflection: stepMinutes?.reflection ?? session.plan.reflectionMinutes }}
        completedSet={completedSet}
        onSave={onSaveStepMinutes}
        lang={lang}
      />
    </div>
  )
}

// Reflexão com perguntas geradas (10d/26c) — cabeçalho de passo igual a
// Oração/Leitura, Escrever/Falar/Só pensar pra responder, "trocar" dentro
// do cartão da pergunta, chips na mesma linha da resposta, e o passo de
// aplicação (29b) no fim, antes de fechar o dia. Fases internas:
// 'answering' (uma pergunta de cada vez), 'composing' (aguardando a IA
// juntar as respostas), 'review' (parágrafo pronto, editável) e
// 'application' (a frase do dia, último passo de qualquer um dos dois
// fluxos).
function AiReflectionFlow({
  lang, session, guided, chapterInfo, questions, stepMinutes, onOpenTimeSheet, onPeekReading, onExitGuided,
  applicationPhrase, onSaveApplicationPhrase, pendingPin, onConfirmPin, reminderRequested, onToggleReminder,
  hasAI, onAiAssist, onApprove, onAllDone,
}) {
  const L = (k, vars) => t(`reflectAi.${k}`, vars, lang)
  // Este fluxo não tem cronômetro (é por perguntas, não por tempo) — pra
  // "Tempo com Deus" (30b) ainda ter de onde vir, mede o relógio de parede
  // desde que a tela abriu até "Concluir" (onFinish, mais abaixo), sem
  // pausar se a aba perder o foco: diferente do fluxo manual/Oração, aqui
  // não há botão de pausa, então o tempo de tela aberta É o tempo gasto.
  const startedAtRef = useRef(Date.now())
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(['', '', ''])
  const [phase, setPhase] = useState('answering') // 'answering' | 'composing' | 'review' | 'application' | 'error'
  const [paragraph, setParagraph] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [inputMode, setInputMode] = useState('write') // 'write' | 'speak' | 'think'

  const loading = !questions
  const currentQuestion = questions?.[index]
  const bookLabel = chapterInfo ? (lang === 'en' ? chapterInfo.bookEn : chapterInfo.book) : ''
  const chapterLabel = chapterInfo?.chStart

  function setAnswer(text) {
    setAnswers(prev => prev.map((a, i) => (i === index ? text : a)))
  }

  const speech = useSpeechToText({ lang, onResult: text => setAnswer((answers[index] ? answers[index] + ' ' : '') + text) })

  function chooseMode(mode) {
    setInputMode(mode)
    if (mode !== 'speak' && speech.listening) speech.stop()
    if (mode === 'speak') speech.start()
    if (mode === 'think') { setAnswer(''); goNext() }
  }

  // "trocar"/"Outra pergunta" (mockup 26c) — pula esta pergunta sem exigir
  // resposta, mesmo destino de terminar as 3 normalmente. Não gera uma
  // pergunta NOVA (as perguntas são cacheadas/compartilhadas), é um "pula
  // esta" simplificado.
  async function goNext() {
    if (speech.listening) speech.stop()
    if (index < 2) { setIndex(i => i + 1); return }
    const qa = questions
      .map((q, i) => ({ question: q, answer: answers[i].trim() }))
      .filter(pair => pair.answer)
    if (qa.length === 0) { setErrorMsg(L('errorGeneric')); return }
    setPhase('composing')
    setErrorMsg('')
    try {
      const draft = await composeReflectionDraft({ book: chapterInfo.book, chapter: chapterInfo.chStart, lang, qa })
      setParagraph(draft)
      setPhase('review')
    } catch (err) {
      setPhase('answering')
      setErrorMsg(
        err.message === 'subscription_required' ? L('errorSubscription')
        : err.message === 'daily_limit_reached' ? L('errorLimit')
        : L('errorGeneric')
      )
    }
  }

  function fillDontKnow() {
    if (answers[index].trim()) return
    setAnswer(t('reflectAi.dontKnowFilled', undefined, lang))
  }

  async function approve() {
    if (saving) return
    setSaving(true)
    try {
      const qa = questions
        .map((q, i) => ({ question: q, answer: answers[i].trim() }))
        .filter(pair => pair.answer)
      await onApprove(qa, paragraph)
      setPhase('application')
    } finally {
      setSaving(false)
    }
  }

  const qaForAssist = questions
    ? questions.map((q, i) => ({ question: q, answer: answers[i].trim() })).filter(p => p.answer)
    : null

  if (phase === 'application') {
    return (
      <div style={rStyles.screen}>
        <ReflectionStepHeader lang={lang} guided={guided} onExitGuided={onExitGuided} onOpenTimeSheet={onOpenTimeSheet} minutes={stepMinutes?.reflection ?? session.plan.reflectionMinutes} />
        <div style={rStyles.body}>
          <ApplicationStepCard
            lang={lang} hasAI={hasAI}
            value={applicationPhrase} onSave={onSaveApplicationPhrase}
            pendingPin={pendingPin} onConfirmPin={onConfirmPin}
            reminderRequested={reminderRequested} onToggleReminder={onToggleReminder}
            aiContext={qaForAssist?.length ? () => onAiAssist(qaForAssist) : null}
            onFinish={() => onAllDone(Math.round((Date.now() - startedAtRef.current) / 1000))}
          />
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div style={rStyles.screen}>
        <ReflectionStepHeader lang={lang} guided={guided} onExitGuided={onExitGuided} onOpenTimeSheet={onOpenTimeSheet} minutes={stepMinutes?.reflection ?? session.plan.reflectionMinutes} />
        <div style={rStyles.body}>
          <p style={rStyles.reviewTitle}>{L('reviewTitle')}</p>
          <p style={rStyles.reviewHint}>{L('reviewHint')}</p>
          <div style={rStyles.reviewCard}>
            <textarea
              style={rStyles.reviewTextarea}
              value={paragraph}
              onChange={e => setParagraph(e.target.value)}
              rows={7}
            />
          </div>
        </div>
        <div style={rStyles.footer}>
          <button style={rStyles.primaryBtn} onClick={approve} disabled={saving || !paragraph.trim()}>
            {saving ? t('notes.saving', undefined, lang) : L('approveAndSave')}
          </button>
          <button style={rStyles.textBtn} onClick={() => setPhase('answering')}>{L('backToQuestions')}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={rStyles.screen}>
      <ReflectionStepHeader lang={lang} guided={guided} onExitGuided={onExitGuided} onOpenTimeSheet={onOpenTimeSheet} minutes={stepMinutes?.reflection ?? session.plan.reflectionMinutes} />

      <div style={rStyles.modeRow}>
        <button style={{ ...rStyles.modeBtn, ...(inputMode === 'write' ? rStyles.modeBtnOn : {}) }} onClick={() => chooseMode('write')}>
          {t('reflection.inputModeWrite', undefined, lang)}
        </button>
        <button style={{ ...rStyles.modeBtnLight, ...(inputMode === 'speak' ? rStyles.modeBtnOn : {}) }} onClick={() => chooseMode('speak')} disabled={!isSpeechToTextSupported()}>
          <AppIcon name="AudioLines" size={13} color={inputMode === 'speak' ? '#fff' : 'var(--bento-t3)'} />
          {t('reflection.inputModeSpeak', undefined, lang)}
        </button>
        <button style={rStyles.modeBtnLight} onClick={() => chooseMode('think')}>
          {t('reflection.inputModeThink', undefined, lang)}
        </button>
      </div>

      <div style={rStyles.body}>
        <div style={rStyles.darkCard}>
          <div style={rStyles.aiLabelRow}>
            <span style={rStyles.aiDiamond} />
            <p style={rStyles.aiLabel}>{L('questionOf', { n: index + 1, total: 3 })} · {bookLabel} {chapterLabel}</p>
            <button style={rStyles.trocarBtn} onClick={goNext} disabled={loading || phase === 'composing'}>{L('trocarBtn')}</button>
          </div>
          {loading || phase === 'composing'
            ? <p style={rStyles.questionText}>{phase === 'composing' ? L('composing') : ''}</p>
            : <p style={rStyles.questionText}>{currentQuestion}</p>}
          <p style={rStyles.privacyLine}>{L('privacyLine')}</p>
        </div>

        <div style={rStyles.answerCard}>
          {speech.listening && <p style={rStyles.listeningHint}>{t('reflection.listeningHint', undefined, lang)}</p>}
          {speech.error && <p style={rStyles.errorText}>{t('reflection.speechUnsupported', undefined, lang)}</p>}
          <textarea
            style={rStyles.answerTextarea}
            value={answers[index]}
            onChange={e => setAnswer(e.target.value)}
            placeholder={L('inputPlaceholder')}
            rows={4}
            disabled={loading || phase === 'composing'}
          />
          <div style={rStyles.chipRow}>
            <button style={rStyles.chip} onClick={fillDontKnow} disabled={loading || phase === 'composing'}>
              {L('dontKnowChip')}
            </button>
          </div>
        </div>

        <div style={rStyles.dotsRow}>
          <div style={{ display: 'flex', gap: 5, flex: 'none' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ ...rStyles.dot, background: i <= index ? 'var(--bento-sand-icon)' : 'var(--bento-line)' }} />
            ))}
          </div>
          <span style={rStyles.dotsNote}>{L('questionsNote')}</span>
        </div>

        {errorMsg && <p style={rStyles.errorText}>{errorMsg}</p>}
      </div>

      <div style={rStyles.footer}>
        <div style={{ display: 'flex', gap: 10 }}>
          {onPeekReading && (
            <button style={rStyles.peekBtn} onClick={onPeekReading} aria-label={t('reflection.backToReading', undefined, lang)}>
              <AppIcon name="AlignLeft" size={16} color="var(--bento-ink)" />
            </button>
          )}
          <button style={{ ...rStyles.primaryBtn, flex: 1 }} onClick={goNext} disabled={loading || phase === 'composing'}>
            <span>{L('nextQuestion')}</span>
            <AppIcon name="ArrowRight" size={15} strokeWidth={2.4} color="var(--bento-accent)" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Cabeçalho de passo compartilhado por todas as sub-fases do fluxo com IA
// (answering/review/application) — igual ao de Oração/Leitura (nota do
// quadro 21b).
function ReflectionStepHeader({ lang, guided, onExitGuided, onOpenTimeSheet, minutes }) {
  return (
    <div style={rStyles.header}>
      <button onClick={onExitGuided} style={rStyles.headerBackBtn} aria-label={t('a11y.goBack', undefined, lang)}>
        <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
      </button>
      <div style={rStyles.stepChip}>
        <span style={rStyles.stepChipTitle}>{t('reflection.pageTitle', undefined, lang)}</span>
        {guided && <span style={rStyles.stepChipSub}>{t('reflection.stepOf', { n: guided.idx + 1, total: guided.total }, lang)}</span>}
      </div>
      <div style={{ flex: 1 }} />
      <button style={rStyles.timePill} onClick={onOpenTimeSheet}>
        <span style={rStyles.timePillText}>{t('routine.minShort', { n: minutes }, lang)}</span>
        <AppIcon name="ChevronDown" size={11} strokeWidth={2.6} color="var(--bento-accent)" />
      </button>
    </div>
  )
}

const rStyles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '20px 20px 14px' },
  headerBackBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepChip: { height: 34, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' },
  stepChipTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  stepChipSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)' },
  timePill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', cursor: 'pointer' },
  timePillText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },

  modeRow: { flex: 'none', padding: '0 20px 10px', display: 'flex', gap: 6 },
  modeBtn: { flex: 1, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', color: '#fff', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  modeBtnLight: { flex: 1, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-card)', color: 'var(--bento-t3)', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modeBtnOn: { background: 'var(--bento-ink)', color: '#fff' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  darkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22 },
  aiLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiDiamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  aiLabel: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trocarBtn: { flexShrink: 0, border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.4)', cursor: 'pointer' },
  questionText: { fontFamily: 'var(--font-bento)', fontSize: 23, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.8px', color: '#fff', textWrap: 'pretty', margin: '0 0 12px', minHeight: '1.25em' },
  privacyLine: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.45)', margin: 0 },
  answerCard: { flex: 1, minHeight: 0, borderRadius: 24, background: 'var(--bento-card)', padding: 20, display: 'flex', flexDirection: 'column' },
  listeningHint: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', margin: '0 0 8px' },
  answerTextarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: 'var(--bento-ink)' },
  chipRow: { marginTop: 'auto', paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 7 },
  chip: { border: 'none', background: 'var(--bento-line)', borderRadius: 99, padding: '9px 12px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: 'var(--bento-t3)', cursor: 'pointer' },
  dotsRow: { borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  dot: { width: 26, height: 5, borderRadius: 99 },
  dotsNote: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)' },
  errorText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: '#DC2626', margin: 0, textAlign: 'center' },
  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  peekBtn: { flexShrink: 0, width: 54, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  primaryBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  textBtn: { border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-t4)', textAlign: 'center', cursor: 'pointer' },
  reviewTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '4px 0 2px' },
  reviewHint: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 4px' },
  reviewCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  reviewTextarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-ink)' },
}

// Mesmo padrão do NotesPanel de ReadingBlockView.jsx — deliberadamente
// duplicado (não importado de lá) pra não acoplar as duas telas, mesmo
// espírito do resto do cronômetro nesta tela.
function NotesPanel({ value, hasSavedNote, onSave, lang }) {
  const [text, setText] = useState(value)
  const [justSaved, setJustSaved] = useState(false)
  const speech = useSpeechToText({ lang, onResult: t => setText(v => (v ? v + ' ' : '') + t) })

  useEffect(() => { setText(value) }, [value])

  function handleSave() {
    onSave(text)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <div style={styles.notesPanel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <p style={{ ...styles.notesLabel, marginBottom: 0, flex: 1 }}>
          <AppIcon name="PenLine" size={12} color="var(--bento-accent)" style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {t('reflection.notesLabel', undefined, lang)}
          {hasSavedNote && <span style={styles.notesSavedDot} />}
        </p>
        {isSpeechToTextSupported() && (
          <button
            style={{ ...styles.micBtn, background: speech.listening ? 'var(--bento-accent)' : 'var(--bento-line)' }}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-label={t('reflection.inputModeSpeak', undefined, lang)}
          >
            <AppIcon name="AudioLines" size={13} color={speech.listening ? 'var(--bento-ink)' : 'var(--bento-t3)'} />
          </button>
        )}
      </div>
      <p style={styles.fieldHint}>{t('reflection.notesHint', undefined, lang)}</p>
      <textarea
        style={styles.notesTextarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('reflection.notesPlaceholder', undefined, lang)}
        rows={4}
      />
      <button style={styles.notesSaveBtn} onClick={handleSave}>
        {justSaved ? t('reflection.savedNote', undefined, lang) : t('reflection.saveNote', undefined, lang)}
      </button>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepChip: { height: 34, borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' },
  stepChipTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  stepChipSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)' },
  plainTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px' },
  timePill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', cursor: 'pointer' },
  timePillText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 },
  backToReadingBtn: { display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: 'none', background: 'var(--bento-card)', borderRadius: 12, padding: '9px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer', fontFamily: 'var(--font-bento)' },

  methodCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  methodLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  segmentRow: { display: 'flex', gap: 3, height: 8 },
  segment: { flex: 1, borderRadius: 99, transition: 'background .3s' },
  methodTime: { fontFamily: 'var(--font-bento)', fontSize: 22, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--bento-ink)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' },
  methodTimeLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },

  phaseRow: { width: '100%', borderRadius: 20, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  phaseRowDone: { background: 'var(--bento-sand)' },
  phaseRowNow: { background: 'var(--bento-ink)', padding: '16px 18px' },
  phaseRowLater: { background: 'var(--bento-card)' },
  phaseLetter: { width: 32, height: 32, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 },
  phaseTitle: { fontSize: 14.5, fontWeight: 800, lineHeight: 1.2, margin: '0 0 2px' },
  phaseSub: { fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, margin: 0 },
  phaseNowClock: { fontSize: 15, fontWeight: 800, color: 'var(--bento-accent)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  phaseLaterMin: { fontSize: 12, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  stagePanel: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px', display: 'flex', flexDirection: 'column' },
  stagePanelLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  stagePanelText: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.9)', margin: 0 },
  stagePanelActions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 },
  pauseBtn: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: '#fff' },
  nextPhaseBtn: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)' },

  notesPanel: { borderRadius: 22, background: 'var(--bento-card)', padding: 16 },
  notesLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 3px' },
  micBtn: { flexShrink: 0, width: 26, height: 26, borderRadius: 9, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  fieldHint: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 10px', lineHeight: 1.4 },
  notesSavedDot: { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--bento-accent)', marginLeft: 6, verticalAlign: 'middle' },
  markedTextItem: { background: 'var(--bento-sand)', borderRadius: 14, padding: 11 },
  markedTextRef: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-sand-icon)', margin: '0 0 3px' },
  markedTextBody: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 },
  notesTextarea: { width: '100%', border: 'none', borderRadius: 14, padding: '10px 12px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--bento-line)' },
  notesSaveBtn: { width: '100%', background: 'var(--bento-ink)', border: 'none', borderRadius: 12, padding: 11, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' },

  routineCompleteCard: { borderRadius: 22, background: 'var(--bento-card)', padding: 16, textAlign: 'center' },
  routineCompleteTitle: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 10px' },
  guidedAutoHint: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', margin: '0 0 10px' },
  nextStepBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 14, padding: '11px 18px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: 'pointer', background: 'var(--bento-ink)' },
}
