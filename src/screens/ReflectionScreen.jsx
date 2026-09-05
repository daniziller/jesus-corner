import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import ReflectionGuideCard from '../components/reflection/ReflectionGuideCard'
import { REFLECTION_DATA, phaseMinutesFor } from '../data/reflectionGuide'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getNotes, saveNote, noteTextOf } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { formatVerseRanges } from '../utils/verseRanges'
import { dateKey } from '../utils/dateKey'
import {
  getReflectionQuestionsEnabled, fetchReflectionQuestions, composeReflectionDraft, saveApprovedReflection,
} from '../aiChat/reflectionQuestionsStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import RoutineStepSwitcher from '../components/RoutineStepSwitcher'
import GuidedFlowBanner from '../components/GuidedFlowBanner'

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

export default function ReflectionScreen({ session, authUser, onReflectionCompleted, hasPreviousReadingSession, lastReadChapterInfo, onBackToReading, onNavigate, onContinueSession, onExitGuided, onAiFlowChange }) {
  const { lang } = session
  const guided = session.guided?.step === 'reflection' ? session.guided : null

  // Reflexão com perguntas geradas (10d, reskin Bento) — substitui o fluxo
  // inteiro de fases com cronômetro abaixo quando elegível: precisa de IA
  // (session.hasAI), do interruptor ligado (10f, ainda não implementado —
  // desligado por padrão, ver reflectionQuestionsStore.js) e de um
  // capítulo real pra ancorar as perguntas (lastReadChapterInfo, resolvido
  // em App.jsx — session.todaySession já pode ter avançado pro PRÓXIMO
  // capítulo a essa altura). Decidido uma vez na montagem; se a busca das
  // perguntas falhar depois (rede, offline, capítulo sem texto), cai pro
  // fluxo antigo sozinho — nunca uma parede (mesmo espírito de 10c em
  // ReadingBlockView.jsx).
  const aiEligible = session.hasAI && getReflectionQuestionsEnabled() && !!lastReadChapterInfo
    && (typeof navigator === 'undefined' || navigator.onLine)
  const [aiPhase, setAiPhase] = useState(aiEligible ? 'active' : 'fallback')
  const [aiQuestions, setAiQuestions] = useState(null)
  // Avisa o App quando o fluxo 10d está na tela — ele é uma tela Bento
  // inteira (sem cabeçalho nem barra, como o quadro), ao contrário da
  // Reflexão guiada antiga logo abaixo.
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
  const [noteText, setNoteText] = useState('')
  const [hasSavedNote, setHasSavedNote] = useState(false)
  // Frase de aplicação do dia — campo separado da anotação geral, ligado
  // especificamente ao 3o passo da etapa "Aplicar" ("escreva uma frase
  // curta pra lembrar disso ao longo do dia"). Mesmo esquema de chave por
  // dia da anotação geral, só com prefixo diferente.
  const [applicationPhrase, setApplicationPhrase] = useState('')
  // Frase nova ≠ da fixada na Home — em vez de um window.confirm bloqueante
  // (feio no PWA instalado), guarda o texto aqui e mostra uma confirmação
  // inline logo abaixo do campo (ver confirmPinUpdate / pinConfirmCard).
  const [pendingPin, setPendingPin] = useState(null)
  // Reflexão não tem "sessão" própria como a leitura (Sessão 1, 2...) — é
  // uma prática diária, então a chave da anotação é o dia (dateKey, local,
  // não UTC — ver utils/dateKey.js), uma por dia.
  const noteKey = `reflection:${dateKey()}`
  const applicationPhraseKey = `application:${dateKey()}`
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

  // Carrega a anotação do dia + a frase de aplicação — mesmo padrão de
  // ReadingBlockView.jsx (NotesPanel), reaproveitando o mesmo notesStore,
  // só com chaves por dia em vez de por passagem.
  useEffect(() => {
    if (!authUser?.email) { setNoteText(''); setHasSavedNote(false); setApplicationPhrase(''); return }
    getNotes(authUser.email).then(map => {
      setNoteText(noteTextOf(map[noteKey]))
      setHasSavedNote(Boolean(noteTextOf(map[noteKey])))
      setApplicationPhrase(noteTextOf(map[applicationPhraseKey]))
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
  // diante, só troca se a pessoa confirmar (senão continuaria fixando
  // sozinho toda vez, e ela pode querer manter uma frase antiga em
  // destaque por mais de um dia).
  async function handleSaveApplicationPhrase(text) {
    setApplicationPhrase(text)
    try {
      // Título da sessão de leitura do dia, gravado junto — é o que deixa
      // ApplicationPhrasesScreen.jsx mostrar "escrita lendo X", sem
      // precisar tentar adivinhar isso depois só a partir da data.
      await saveNote(authUser?.email, applicationPhraseKey, text, { sessionTitle: session.todaySession?.title ?? null })
      if (!text.trim()) return
      const currentPinned = await getPinnedApplicationPhrase(authUser?.email)
      if (!currentPinned) {
        await setPinnedApplicationPhrase(authUser?.email, text)
      } else if (currentPinned !== text) {
        // Pede confirmação inline (ver pendingPin / confirmPinUpdate) em
        // vez de trocar o card da Home sem avisar.
        setPendingPin(text)
      }
    } catch (err) {
      console.error('Failed to persist application phrase', err)
    }
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

  // Etapa em destaque — mesmo padrão do PrayerScreen (segue openCardId, que
  // já reage à troca de trecho durante o cronômetro em tick()); antes de
  // começar, mostra a 1a etapa como "próxima".
  const currentPhaseIdx = openCardId != null ? REFLECTION_DATA.findIndex(d => d.id === openCardId) : 0
  const currentPhase = REFLECTION_DATA[currentPhaseIdx]
  // Fim da etapa em destaque (início da próxima, ou o total se for a
  // última) — pro relógio de "tempo restante NESTA etapa", separado do
  // relógio grande acima (restante da reflexão inteira).
  const phaseEndSeconds = PHASE_BOUNDS[currentPhaseIdx + 1]?.start ?? TOTAL_SECONDS
  const phaseRemaining = Math.max(0, Math.round(phaseEndSeconds - elapsed))

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

  // Rotina de hoje inteira concluída (só os passos que o plano da pessoa
  // realmente tem — ver mesmo filtro em RoutineScreen.jsx) — mostra um
  // atalho pra aba Progresso embaixo de tudo. Lido direto de
  // session.todayRoutine (não do cronômetro local desta tela), então
  // aparece tanto assim que o 3o passo termina quanto ao reabrir esta tela
  // depois, já com os três feitos.
  const allStepsDone = session.routineModules.every(m => session.todayRoutine?.[m])

  // Tela própria (10d), inteira — não um card dentro do hero/cronômetro de
  // baixo (ver decisão registrada no topo do arquivo). Só chega aqui
  // depois de TODOS os hooks já terem rodado.
  if (aiPhase === 'active') {
    return (
      <AiReflectionFlow
        lang={lang}
        chapterInfo={lastReadChapterInfo}
        questions={aiQuestions}
        minutes={totalMinutes}
        onPeekReading={hasPreviousReadingSession ? onBackToReading : null}
        onApprove={async (qa, paragraph) => {
          await saveNote(authUser?.email, noteKey, paragraph)
          saveApprovedReflection({ book: lastReadChapterInfo.book, chapter: lastReadChapterInfo.chStart, qa, paragraph })
          onReflectionCompleted?.()
        }}
      />
    )
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>

      <GuidedFlowBanner guided={guided} lang={lang} onExit={onExitGuided} />

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroOrbPurple} />
        <div style={styles.heroOrbFuchsia} />
        <span style={{ position: 'relative', marginBottom: 5 }}><AppIcon name="PenLine" size={30} color="white" /></span>
        <span style={{ ...styles.heroTitle, position: 'relative' }}>{t('reflection.heroTitle', undefined, lang)}</span>
        <span style={{ ...styles.heroSub, position: 'relative' }}>{t('reflection.heroSub', undefined, lang)}</span>
      </div>

      <div style={styles.body}>
        {/* Só aparece vindo de "Ir para Reflexão" logo depois de marcar uma
            sessão como lida (ver App.jsx/lastReadSession) — some sozinho
            quando a Reflexão de hoje é concluída, ou se a tela foi aberta
            direto pela aba, sem sessão recente pra voltar. */}
        {hasPreviousReadingSession && (
          <button style={styles.backToReadingBtn} onClick={onBackToReading}>
            <AppIcon name="ArrowLeft" size={13} color="#6B21A8" />
            {t('reflection.backToReading', undefined, lang)}
          </button>
        )}
        <div style={styles.timer}>
          <span style={styles.timerLabel}>{t('reflection.timerLabel', undefined, lang)}</span>
          <span style={styles.timerDisplay}>{fmt(remaining)}</span>

          {/* Etapa do roteiro em destaque — muda sozinha conforme o
              cronômetro avança de trecho (mesmo padrão do ACTS em
              PrayerScreen.jsx), com o relógio da etapa embutido ao lado. */}
          <div style={{ ...styles.currentPhaseBadge, borderColor: currentPhase.borderColor }}>
            <span style={{ ...styles.currentPhaseDot, background: currentPhase.dotColor }}>{currentPhase.letter}</span>
            <span style={styles.currentPhaseLabel}>
              {t('reflection.currentPhase', { n: currentPhaseIdx + 1, total: REFLECTION_DATA.length }, lang)}
              <strong style={{ color: currentPhase.dotColor }}> {currentPhase.title[lang]}</strong>
            </span>
            <span style={styles.phaseRemaining} title={t('reflection.phaseRemaining', undefined, lang)}>
              <AppIcon name="Timer" size={11} />
              {fmt(phaseRemaining)}
            </span>
          </div>

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
                background: remaining === 0 ? 'linear-gradient(135deg,#22C55E,var(--gr))' : 'var(--grad-primary)',
                boxShadow: remaining === 0 ? '0 8px 20px rgba(22,163,74,.35)' : 'var(--shadow-glow)',
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

        <RoutineStepSwitcher
          session={session}
          activeStep="reflection"
          onGoPrayer={() => onNavigate?.('prayer')}
          onGoReading={() => onContinueSession?.()}
          onGoStudy={() => onNavigate?.('studies')}
        />

        {/* Roteiro acordeão — o card da etapa atual abre sozinho conforme o
            cronômetro avança, com aviso sonoro na troca (mesmo padrão do ACTS). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REFLECTION_DATA.map((data, i) => (
            <Fragment key={data.id}>
              <ReflectionGuideCard
                data={data}
                minutes={phaseMinutes[i]}
                open={openCardId === data.id}
                onToggle={() => setOpenCardId(v => v === data.id ? null : data.id)}
              />
              {/* Campo separado da anotação geral, colado no passo
                  "Aplicar" (id 'A') — é ali que o roteiro pede uma frase
                  curta pra lembrar a aplicação do dia. */}
              {data.id === 'A' && (
                <>
                  <ApplicationPhraseField lang={lang} value={applicationPhrase} onSave={handleSaveApplicationPhrase} />
                  {pendingPin && (
                    <div style={styles.pinConfirmCard}>
                      <p style={styles.pinConfirmText}>{t('reflection.updateHomeCardConfirm', undefined, lang)}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.pinConfirmYes} onClick={() => confirmPinUpdate(true)}>
                          {t('reflection.updateHomeCardYes', undefined, lang)}
                        </button>
                        <button style={styles.pinConfirmNo} onClick={() => confirmPinUpdate(false)}>
                          {t('reflection.updateHomeCardNo', undefined, lang)}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Fragment>
          ))}
        </div>

        {/* Textos marcados hoje durante a sessão de leitura — só aparece se
            tiver algum (ver useEffect acima); só leitura, editar continua
            em Notas ou na própria leitura. */}
        {todayHighlights.length > 0 && (
          <div style={styles.notesPanel}>
            <p style={styles.notesLabel}>
              <AppIcon name="Highlighter" size={12} color="var(--gold)" style={{ verticalAlign: 'middle', marginRight: 5 }} />
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

        {/* Anotação do dia — uma por dia (não por etapa), guardada no mesmo
            backend das anotações de leitura (ver notesStore.js). */}
        <NotesPanel value={noteText} hasSavedNote={hasSavedNote} onSave={handleSaveNote} lang={lang} />

        {/* Oração + Leitura + Reflexão de hoje, todas concluídas (ver
            allStepsDone acima) — atalho pra ver o progresso, fechando o
            ciclo da rotina do dia. */}
        {allStepsDone && (
          <div style={styles.routineCompleteCard}>
            <p style={styles.routineCompleteTitle}>{t('reflection.routineCompleteTitle', undefined, lang)}</p>
            {guided && <p style={styles.guidedAutoHint}>{t('guided.finishingAuto', undefined, lang)}</p>}
            <button style={styles.nextStepBtn} onClick={() => onNavigate?.('stats')}>
              {t('reflection.goToProgress', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Reflexão com perguntas geradas (10d, reskin Bento) — tela própria,
// substitui o cronômetro em fases inteiro (ver decisão no topo do
// arquivo). Três fases internas: 'answering' (uma pergunta de cada vez),
// 'composing' (aguardando a IA juntar as respostas) e 'review' (parágrafo
// pronto, editável, a pessoa aprova antes de salvar).
function AiReflectionFlow({ lang, chapterInfo, questions, minutes, onPeekReading, onApprove }) {
  const L = (k, vars) => t(`reflectAi.${k}`, vars, lang)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(['', '', ''])
  const [phase, setPhase] = useState('answering') // 'answering' | 'composing' | 'review' | 'error'
  const [paragraph, setParagraph] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const loading = !questions
  const currentQuestion = questions?.[index]
  const bookLabel = chapterInfo ? (lang === 'en' ? chapterInfo.bookEn : chapterInfo.book) : ''
  const chapterLabel = chapterInfo?.chStart

  function setAnswer(text) {
    setAnswers(prev => prev.map((a, i) => (i === index ? text : a)))
  }

  function fillDontKnow() {
    if (answers[index].trim()) return
    setAnswer(t('reflectAi.dontKnowFilled', undefined, lang))
  }

  // "Outra pergunta" (mockup 10d) — pula esta pergunta sem exigir resposta,
  // mesmo destino de terminar as 3 normalmente. Não gera uma pergunta NOVA
  // (as perguntas são cacheadas/compartilhadas — ver
  // generate-reflection-questions.js), é um "pula esta" simplificado.
  async function goNext() {
    if (index < 2) { setIndex(i => i + 1); return }
    // Última pergunta — compõe o parágrafo com as respostas que existem
    // (pergunta pulada = string vazia, não entra na composição).
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

  async function approve() {
    if (saving) return
    setSaving(true)
    try {
      const qa = questions
        .map((q, i) => ({ question: q, answer: answers[i].trim() }))
        .filter(pair => pair.answer)
      await onApprove(qa, paragraph)
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'review') {
    return (
      <div style={rStyles.screen}>
        <div style={rStyles.header}>
          <span style={rStyles.headerIcon}><AppIcon name="Check" size={16} color="var(--bento-ink)" /></span>
          <div>
            <p style={rStyles.headerTitle}>{L('reviewTitle')}</p>
            <p style={rStyles.headerSub}>{L('reviewHint')}</p>
          </div>
        </div>
        <div style={rStyles.body}>
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
      <div style={rStyles.header}>
        <span style={rStyles.headerIcon}><AppIcon name="Check" size={16} color="var(--bento-ink)" /></span>
        <div>
          <p style={rStyles.headerTitle}>{bookLabel} {chapterLabel} {L('chapterDoneSuffix')}</p>
          <p style={rStyles.headerSub}>{minutes ? L('remainingWithMin', { n: minutes }) : L('remainingLabel')}</p>
        </div>
      </div>

      <div style={rStyles.body}>
        <div style={rStyles.darkCard}>
          <div style={rStyles.aiLabelRow}>
            <span style={rStyles.aiDiamond} />
            <p style={rStyles.aiLabel}>{L('questionOf', { n: index + 1, total: 3 })}</p>
          </div>
          {loading || phase === 'composing'
            ? <p style={rStyles.questionText}>{phase === 'composing' ? L('composing') : ''}</p>
            : <p style={rStyles.questionText}>{currentQuestion}</p>}
          <p style={rStyles.privacyLine}>{L('privacyLine')}</p>
        </div>

        <div style={rStyles.answerCard}>
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
            <button style={rStyles.chip} onClick={goNext} disabled={loading || phase === 'composing'}>
              {L('anotherQuestionChip')}
            </button>
          </div>
        </div>

        <div style={rStyles.hintCard}>
          <span style={rStyles.hintDiamond} />
          <p style={rStyles.hintText}>{L('composeHint')}</p>
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

const rStyles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  headerIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '3px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  darkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22 },
  aiLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  aiDiamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  aiLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  questionText: { fontFamily: 'var(--font-bento)', fontSize: 24, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.8px', color: '#fff', textWrap: 'pretty', margin: '0 0 12px', minHeight: '1.25em' },
  privacyLine: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.45)', margin: 0 },
  // Ocupa o que sobra da tela, com os chips colados no pé (quadro 10d).
  answerCard: { flex: 1, minHeight: 0, borderRadius: 24, background: 'var(--bento-card)', padding: 20, display: 'flex', flexDirection: 'column' },
  answerTextarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: 'var(--bento-ink)' },
  chipRow: { marginTop: 'auto', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 7 },
  chip: { border: 'none', background: 'var(--bento-line)', borderRadius: 99, padding: '9px 12px', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: 'var(--bento-t3)', cursor: 'pointer' },
  hintCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  hintDiamond: { width: 9, height: 9, background: 'var(--bento-sand-icon)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  hintText: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--re, #DC2626)', margin: 0, textAlign: 'center' },
  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  peekBtn: { flexShrink: 0, width: 52, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  primaryBtn: { height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
  textBtn: { border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-t4)', textAlign: 'center', cursor: 'pointer' },
  reviewCard: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  reviewTextarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-ink)' },
}

// Campo de UMA linha (não textarea) — é uma frase curta, não um texto
// corrido como a anotação geral (ver NotesPanel logo abaixo). Salva na
// mesma chave por dia (application:{dateKey}), separada de reflection:
// {dateKey} de propósito, pra não misturar as duas.
function ApplicationPhraseField({ value, onSave, lang }) {
  const [text, setText] = useState(value)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => { setText(value) }, [value])

  function handleSave() {
    onSave(text)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <div style={styles.phraseCard}>
      <p style={styles.phraseLabel}>
        <AppIcon name="Sparkles" size={12} color="#A21CAF" style={{ verticalAlign: 'middle', marginRight: 5 }} />
        {t('reflection.applicationPhraseLabel', undefined, lang)}
      </p>
      <p style={styles.fieldHint}>{t('reflection.applicationPhraseHint', undefined, lang)}</p>
      <input
        type="text"
        style={styles.phraseInput}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('reflection.applicationPhrasePlaceholder', undefined, lang)}
        maxLength={140}
      />
      <button style={styles.phraseSaveBtn} onClick={handleSave}>
        {justSaved ? t('reflection.savedNote', undefined, lang) : t('reflection.saveApplicationPhrase', undefined, lang)}
      </button>
    </div>
  )
}

// Mesmo padrão do NotesPanel de ReadingBlockView.jsx — deliberadamente
// duplicado (não importado de lá) pra não acoplar as duas telas, mesmo
// espírito do resto do cronômetro nesta tela (ver comentário no topo do
// arquivo).
function NotesPanel({ value, hasSavedNote, onSave, lang }) {
  const [text, setText] = useState(value)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => { setText(value) }, [value])

  function handleSave() {
    onSave(text)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <div style={styles.notesPanel}>
      {/* Nada de display:flex aqui — um <p> flex com o texto solto (sem
          span próprio) vira item flex "anônimo" com min-width:auto por
          padrão, então ele recusa encolher/quebrar linha e a última
          palavra vaza pra fora do card (mais visível ainda com o zoom
          1.15 sempre ligado no app, ver .app-content-inner no index.css).
          Bolinha de "salvo" como inline-block resolve sem esse problema. */}
      <p style={styles.notesLabel}>
        <AppIcon name="PenLine" size={12} color="var(--or)" style={{ verticalAlign: 'middle', marginRight: 5 }} />
        {t('reflection.notesLabel', undefined, lang)}
        {hasSavedNote && <span style={styles.notesSavedDot} />}
      </p>
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
  backToReadingBtn: { display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: '0.5px solid rgba(107,33,168,.3)', background: '#F3E8FF', borderRadius: 10, padding: '7px 12px', fontSize: 11.5, fontWeight: 700, color: '#6B21A8', cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: 4 },
  hero:        { minHeight: 150, margin: '10px 16px', borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--bk-hero)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 22px', boxShadow: '0 12px 28px rgba(0,0,0,.25)' },
  heroOrbPurple: { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(60px)', opacity: 0.5, top: -60, left: -50 },
  heroOrbFuchsia: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(60px)', opacity: 0.3, bottom: -60, right: -40 },
  heroTitle:   { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' },
  heroSub:     { fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.72)', textAlign: 'center', lineHeight: 1.5, marginTop: 3 },
  body:        { padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  timer:       { background: 'var(--bk-hero)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timerLabel:  { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: 1.8, textTransform: 'uppercase' },
  timerDisplay:{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 300, color: 'white', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' },
  currentPhaseBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', border: '1px solid', borderRadius: 24, padding: '6px 14px 6px 6px' },
  currentPhaseDot:   { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 },
  // minWidth:0 — mesmo ajuste de PrayerScreen.jsx (ver comentário lá):
  // sem isso, o texto desse item flex recusa quebrar linha e vaza pra
  // fora do card em telas estreitas.
  currentPhaseLabel: { fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', minWidth: 0 },
  phaseRemaining:    { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.72)', fontVariantNumeric: 'tabular-nums', paddingLeft: 8, marginLeft: 2, borderLeft: '1px solid rgba(255,255,255,.15)', flexShrink: 0 },
  timerBtn:    { padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, border: 'none', fontFamily: 'var(--font)', transition: 'transform .15s' },
  wakeLockHint:{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.62)', textAlign: 'center', lineHeight: 1.5, marginTop: 2, maxWidth: 220 },
  durationLabel: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: 1.3, textTransform: 'uppercase', marginTop: 2 },
  durationRow: { display: 'flex', gap: 6, background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 4 },
  durationBtn: { width: 34, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'rgba(255,255,255,.55)', background: 'transparent', transition: 'background .15s, color .15s' },
  durationBtnActive: { background: 'var(--grad-primary)', color: 'white', boxShadow: '0 4px 12px rgba(157,67,0,.35)' },
  phraseCard:  { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 16, padding: 13 },
  phraseLabel: { fontSize: 10, fontWeight: 700, color: '#A21CAF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  phraseInput: { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', marginBottom: 10, background: 'white' },
  phraseSaveBtn:{ width: '100%', background: '#A21CAF', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  pinConfirmCard: { background: 'white', border: '0.5px solid rgba(192,38,211,.4)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  pinConfirmText: { fontSize: 12, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.4 },
  pinConfirmYes: { flex: 1, background: '#A21CAF', border: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  pinConfirmNo: { flex: 1, background: 'var(--g1)', border: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)' },
  notesPanel:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  notesLabel:  { fontSize: 10, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  fieldHint:   { fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginBottom: 9, lineHeight: 1.4 },
  notesSavedDot: { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', marginLeft: 6, verticalAlign: 'middle' },
  markedTextItem: { background: 'var(--olt)', border: '0.5px solid var(--gold-soft)', borderRadius: 13, padding: 11 },
  markedTextRef:  { fontSize: 10.5, fontWeight: 700, color: 'var(--brand-deep)', marginBottom: 3 },
  markedTextBody: { fontSize: 12, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  notesTextarea:{ width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--g1)' },
  notesSaveBtn:{ width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },

  routineCompleteCard:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: 14, textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  routineCompleteTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 10 },
  guidedAutoHint: { fontSize: 11, fontWeight: 600, color: 'var(--g5)', marginBottom: 10 },
  nextStepBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', borderRadius: 24, padding: '10px 18px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-premium)' },
}
