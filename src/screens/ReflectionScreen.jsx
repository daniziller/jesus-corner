// ReflectionScreen.jsx — Reflexão (pacote 36-37, handoff-passos-36-37/,
// quadros 37a com perguntas e 37b livre). Reescreve por inteiro a versão
// anterior (26c/29b, fases Reviver/Entender/Aplicar com cronômetro OU 3
// perguntas geradas + parágrafo final aprovado): o método (perguntas ou
// livre) agora é decidido em Meu Plano/Ajustar (35c,
// reflectionMethodStore.js) e só LIDO aqui — sem chip pra trocar dentro
// da execução, mesmo padrão de PrayerScreen.jsx (Bloco 1 do pacote). Sem
// fases/roteiro Reviver/Entender/Aplicar — o quadro não mostra.
//
// "questions" exige session.hasAI (é IA de verdade, gerada por
// requisição, não cacheada — ver aiChat/reflectionQuestionsStore.js);
// quem escolheu perguntas em 35c mas não tem o tier certo cai em livre
// (nunca uma tela quebrada) — o quadro não cobre esse caso, mas alguma
// tela precisa abrir.
import { useState, useEffect, useRef, useMemo } from 'react'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { fetchReflectionQuestionPair } from '../aiChat/reflectionQuestionsStore'
import { getNotes, saveNote, noteTextOf } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase, dailyApplicationKeyFor } from '../reflection/applicationPhraseStore'
import { dateKey } from '../utils/dateKey'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function verseSpan(start, end) {
  return start === end ? `${start}` : `${start}-${end}`
}

// Combina as duas perguntas geradas + respostas num texto corrido só —
// mesma chave de nota que o fluxo livre usa (reflection:{dia}, ver
// notesStore.js), pra "Suas anotações" (NotesScreen.jsx/37e) mostrar uma
// entrada por dia, questão ou livre, sem precisar de um formato à parte.
function combineQaText(questions, a1, a2) {
  const parts = []
  if (questions?.[0] && a1.trim()) parts.push(`${questions[0]}\n${a1.trim()}`)
  if (questions?.[1] && a2.trim()) parts.push(`${questions[1]}\n${a2.trim()}`)
  return parts.join('\n\n')
}

export default function ReflectionScreen({ session, authUser, stepMinutes, lastReadChapterInfo, onReflectionCompleted, onNavigate, onContinueSession, onExitGuided, onBack }) {
  const { lang } = session
  const guided = session.guided?.step === 'reflection'
  const L = (k, vars) => t(`reflection.${k}`, vars, lang)
  const email = authUser?.email
  const method = useMemo(getReflectionMethod, [])
  const effectiveMethod = method === 'questions' && session.hasAI ? 'questions' : 'free'
  const totalMinutes = stepMinutes?.reflection ?? session.plan.reflectionMinutes
  const TOTAL_SECONDS = totalMinutes * 60

  // "passo N de M" — mesma lógica de PrayerScreen.jsx (session.
  // todaysSteps, sempre mostrado, dentro ou fora do modo guiado).
  const todaysSteps = session.todaysSteps ?? ['reflection']
  const stepIdx = Math.max(0, todaysSteps.indexOf('reflection'))

  const hasChapter = !!lastReadChapterInfo?.book
  const chapterLabel = hasChapter ? `${lastReadChapterInfo.book} ${verseSpan(lastReadChapterInfo.chStart, lastReadChapterInfo.chEnd)}` : ''

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const wakeLockRef = useRef(null)

  function computeElapsed() {
    if (!startedAtRef.current) return accumulatedRef.current
    return accumulatedRef.current + (Date.now() - startedAtRef.current) / 1000
  }
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.error('[ReflectionScreen] wake lock request failed:', err.message)
    }
  }
  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }
  function pause() {
    accumulatedRef.current = computeElapsed()
    startedAtRef.current = null
    setRunning(false)
    releaseWakeLock()
    clearInterval(intervalRef.current)
  }
  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setElapsed(computeElapsed()), 250)
    else clearInterval(intervalRef.current)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  // "Sair do app pausa" — mesmo tratamento de PrayerScreen.jsx (o resto do
  // app se recupera sozinho via wall-clock; aqui, como na Oração, some da
  // tela é pausa de verdade, só retoma com um toque.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden' && running) pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  useEffect(() => () => releaseWakeLock(), [])
  function toggleRunning() {
    if (running) { pause(); return }
    startedAtRef.current = Date.now()
    setRunning(true)
    requestWakeLock()
  }
  const remaining = Math.round(TOTAL_SECONDS - elapsed)
  const overtime = remaining < 0
  const progress = Math.min(1, elapsed / TOTAL_SECONDS)

  // "Você acabou de ler" — o texto BÍBLICO do primeiro trecho marcado
  // hoje durante a sessão guiada (não a nota pessoal do highlight — ver
  // PrayerRequestCard/ReadingSummaryScreen.jsx pro mesmo padrão de buscar
  // o texto real a partir de book+chapter+verses de um highlight).
  const [todayQuote, setTodayQuote] = useState(null)
  useEffect(() => {
    if (!email) return
    getHighlights(email).then(async list => {
      const today = list.find(h => !h.hidden && h.date === dateKey() && h.sessionMode === 'session')
      if (!today) { setTodayQuote(null); return }
      const versionId = getSelectedVersionId(lang)
      const bookKey = lang === 'en' ? (today.bookEn || today.book) : today.book
      const chapters = await fetchBookText(versionId, bookKey).catch(() => null)
      const chapterData = chapters?.[String(today.chapter)]
      const sorted = [...today.verses].sort((a, b) => a - b)
      const quote = sorted.map(v => chapterData?.verses?.[String(v)]).filter(Boolean).join(' ')
      setTodayQuote(quote || null)
    }).catch(() => setTodayQuote(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const noteKey = `reflection:${dateKey()}`

  // ── Perguntas (37a) ────────────────────────────────────────────────
  const [questions, setQuestions] = useState(null)
  const [questionsError, setQuestionsError] = useState('')
  const [q1Text, setQ1Text] = useState('')
  const [q2Text, setQ2Text] = useState('')
  const [swapping, setSwapping] = useState(false)

  async function loadQuestions(avoid) {
    setQuestionsError('')
    try {
      const qs = await fetchReflectionQuestionPair({
        book: lastReadChapterInfo.book, bookEn: lastReadChapterInfo.bookEn,
        chStart: lastReadChapterInfo.chStart, chEnd: lastReadChapterInfo.chEnd,
        lang, avoidQuestions: avoid,
      })
      setQuestions(qs)
    } catch (err) {
      setQuestionsError(err.message === 'daily_limit_reached' ? t('aiChat.dailyLimitReached', undefined, lang) : L('questionsError'))
    }
  }
  useEffect(() => {
    if (effectiveMethod !== 'questions' || !hasChapter) return
    loadQuestions([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMethod, hasChapter])

  function saveQaNote(nextQ1, nextQ2) {
    saveNote(email, noteKey, combineQaText(questions, nextQ1, nextQ2)).catch(err => console.error('Failed to persist reflection note', err))
  }
  function handleQ1Change(text) { setQ1Text(text); saveQaNote(text, q2Text) }
  function handleQ2Change(text) { setQ2Text(text); saveQaNote(q1Text, text) }

  // "Trocar perguntas" troca só as duas primeiras — nunca a 3ª (fixa) —
  // e limpa as respostas de 1/2 (não fazem mais sentido pras perguntas
  // novas); a nota combinada acompanha (fica vazia até responder de novo).
  async function swapQuestions() {
    if (swapping) return
    setSwapping(true)
    await loadQuestions(questions ?? [])
    setSwapping(false)
    setQ1Text(''); setQ2Text('')
    saveNote(email, noteKey, '').catch(() => {})
  }

  // ── Pergunta 3 — sempre a mesma, vira a frase de aplicação ─────────
  const applicationPhraseKey = dailyApplicationKeyFor()
  const [q3Text, setQ3Text] = useState('')
  const [pendingPin, setPendingPin] = useState(null)
  useEffect(() => {
    if (!email) return
    getNotes(email).then(map => setQ3Text(noteTextOf(map[applicationPhraseKey]))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  // A frase do dia sempre grava no histórico; virar a frase FIXADA no
  // card do Início é outra decisão — a 1a frase de todas fixa sozinha
  // (nada pra comparar ainda), da 2a em diante só troca com confirmação
  // (mesmo mecanismo do antigo ApplicationStepCard.jsx, apagado nesta
  // reescrita — o banner de confirmação não aparece no PNG de 37a, mas é
  // comportamento já estabelecido, não uma tela nova; ver pendingPin).
  async function handleQ3Change(text) {
    setQ3Text(text)
    try {
      await saveNote(email, applicationPhraseKey, text)
      if (!text.trim()) return
      const currentPinned = await getPinnedApplicationPhrase(email)
      if (!currentPinned) await setPinnedApplicationPhrase(email, text)
      else if (currentPinned !== text) setPendingPin(text)
    } catch (err) {
      console.error('Failed to persist application phrase', err)
    }
  }
  async function confirmPinUpdate(accept) {
    const text = pendingPin
    setPendingPin(null)
    if (!accept || !text) return
    try { await setPinnedApplicationPhrase(email, text) } catch (err) { console.error('Failed to pin application phrase', err) }
  }

  // ── Livre (37b) ─────────────────────────────────────────────────────
  const [freeText, setFreeText] = useState('')
  useEffect(() => {
    if (!email || effectiveMethod !== 'free') return
    getNotes(email).then(map => setFreeText(noteTextOf(map[noteKey]))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, effectiveMethod])
  function handleFreeChange(text) {
    setFreeText(text)
    saveNote(email, noteKey, text).catch(err => console.error('Failed to persist reflection note', err))
  }

  function finishDay() {
    pause()
    logSessionSeconds('reflection', elapsed).catch(err => console.error('Failed to log reflection session seconds', err))
    onReflectionCompleted?.()
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={guided ? onExitGuided : onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('pageTitle')}</p>
          <p style={styles.subtitle}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })} · {effectiveMethod === 'questions' ? L('methodSuffixQuestions') : L('methodSuffixFree')}</p>
        </div>
        {effectiveMethod === 'questions' && (
          <button style={styles.clockPill} onClick={toggleRunning}>
            <AppIcon name="Timer" size={13} strokeWidth={2.4} color="var(--bento-accent)" />
            <span style={{ color: overtime ? 'var(--bento-t3)' : '#fff' }}>{fmt(Math.abs(remaining))}</span>
          </button>
        )}
      </div>

      {effectiveMethod === 'questions' && (
        <div style={styles.wholeTrack}>
          <div style={{ ...styles.wholeFill, width: `${progress * 100}%` }} />
        </div>
      )}

      <div style={styles.body}>
        {effectiveMethod === 'questions' ? (
          <>
            {hasChapter && (
              <div style={styles.justReadCard}>
                <div style={styles.justReadHeader}>
                  <p style={styles.justReadLabel}>{L('justReadLabel')}</p>
                  <p style={styles.justReadRef}>{chapterLabel}</p>
                </div>
                {todayQuote && (
                  <p style={styles.justReadQuote}>{L('justReadMarkedText', { quote: todayQuote })}</p>
                )}
              </div>
            )}

            {questionsError && <p style={styles.errorText}>{questionsError}</p>}

            {questions && (
              <>
                <div style={styles.q1Card}>
                  <div style={styles.q1Header}>
                    <p style={styles.q1Label}>{L('question1Of3')}</p>
                    <p style={styles.optionalTag}>{L('optionalTag')}</p>
                  </div>
                  <p style={styles.q1Text}>{questions[0]}</p>
                  <textarea
                    style={styles.q1Textarea}
                    placeholder={L('writePlaceholder')}
                    value={q1Text}
                    onChange={e => handleQ1Change(e.target.value)}
                  />
                </div>

                <div style={styles.q2Card}>
                  <span style={styles.q2Number}>2</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.q2Text}>{questions[1]}</p>
                    <textarea
                      style={styles.q2Textarea}
                      placeholder={L('writePlaceholder')}
                      value={q2Text}
                      onChange={e => handleQ2Change(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div style={styles.q3Card}>
              <div style={styles.q3Header}>
                <p style={styles.q3Label}><span style={styles.q3Diamond} />{L('question3Label')}</p>
                <p style={styles.q3Sub}>{L('question3Sub')}</p>
              </div>
              <p style={styles.q3Question}>{L('question3Fixed')}</p>
              <textarea
                style={styles.q3Textarea}
                placeholder={L('question3Placeholder')}
                value={q3Text}
                onChange={e => handleQ3Change(e.target.value)}
              />
              {pendingPin && (
                <div style={styles.pinConfirmCard}>
                  <p style={styles.pinConfirmText}>{L('pinConfirmText')}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={styles.pinConfirmYes} onClick={() => confirmPinUpdate(true)}>{L('pinConfirmYes')}</button>
                    <button style={styles.pinConfirmNo} onClick={() => confirmPinUpdate(false)}>{L('pinConfirmNo')}</button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.privacyCard}>
              <span style={styles.privacyIcon}><AppIcon name="BookMarked" size={15} strokeWidth={2} color="var(--bento-t4)" /></span>
              <p style={styles.privacyText}>{L('privacyNote')}</p>
            </div>
          </>
        ) : (
          <>
            <div style={styles.freeCard}>
              <p style={styles.freeLabel}>{L('freeTimeLabel')}</p>
              <p style={{ ...styles.freeClock, color: overtime ? 'var(--bento-t3)' : '#fff' }}>{fmt(Math.abs(remaining))}</p>
              <button style={styles.freeSub} onClick={toggleRunning}>
                {running ? L('freeTimeSub', { n: totalMinutes }) : L('freeTimeSubPaused', { n: totalMinutes })}
              </button>
              <div style={styles.freeTrack}>
                <div style={{ ...styles.freeFill, width: `${progress * 100}%` }} />
              </div>
            </div>

            <div style={styles.freeWriteCard}>
              <div style={styles.freeWriteHeader}>
                <p style={styles.freeWriteLabel}>{hasChapter ? L('freeChapterToday', { chapter: chapterLabel }) : L('todayOnly')}</p>
                <p style={styles.optionalTag}>{L('optionalTag')}</p>
              </div>
              <textarea
                style={styles.freeWriteTextarea}
                placeholder={L('freeWritePlaceholder')}
                value={freeText}
                onChange={e => handleFreeChange(e.target.value)}
              />
            </div>

            <div style={styles.privacyCard}>
              <span style={styles.privacyIcon}><AppIcon name="BookMarked" size={15} strokeWidth={2} color="var(--bento-t4)" /></span>
              <p style={styles.privacyText}>{L('freePrivacyNote')}</p>
            </div>
          </>
        )}
      </div>

      <div style={styles.footer}>
        {effectiveMethod === 'questions' && (
          <button style={styles.skipBtn} onClick={swapQuestions} disabled={swapping}>{swapping ? L('swapping') : L('swapQuestionsBtn')}</button>
        )}
        <button style={{ ...styles.nextBtn, ...(effectiveMethod === 'free' ? { flex: 1 } : {}) }} onClick={finishDay}>
          <span>{L('finishDayBtn')}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },
  clockPill: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' },

  wholeTrack: { flexShrink: 0, height: 4, background: 'var(--bento-line)', margin: '0 20px' },
  wholeFill: { height: '100%', background: 'var(--bento-accent)', borderRadius: 99 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  justReadCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 18px' },
  justReadHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  justReadLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: 0 },
  justReadRef: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  justReadQuote: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  errorText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: 0 },

  q1Card: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  q1Header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  q1Label: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  optionalTag: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },
  q1Text: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-.4px', color: '#fff', margin: '0 0 14px' },
  q1Textarea: { width: '100%', minHeight: 84, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'rgba(255,255,255,.08)', padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: '#fff', resize: 'vertical' },

  q2Card: { display: 'flex', gap: 14, borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  q2Number: { flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-t3)' },
  q2Text: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-ink)', margin: '2px 0 10px' },
  q2Textarea: { width: '100%', minHeight: 60, boxSizing: 'border-box', border: 'none', borderRadius: 12, background: 'var(--bento-line)', padding: '10px 12px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', resize: 'vertical' },

  q3Card: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px' },
  q3Header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  q3Label: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: 0 },
  q3Diamond: { width: 7, height: 7, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  q3Sub: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-sand-ink)', margin: 0 },
  q3Question: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.35, color: 'var(--bento-sand-ink-strong)', margin: '0 0 10px' },
  q3Textarea: { width: '100%', minHeight: 60, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-card)', padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', resize: 'vertical' },

  pinConfirmCard: { marginTop: 10, borderRadius: 14, background: 'var(--bento-card)', padding: '12px 14px' },
  pinConfirmText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-ink)', margin: '0 0 8px' },
  pinConfirmYes: { height: 34, padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--bento-accent)', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },
  pinConfirmNo: { height: 34, padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--bento-line)', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t2)' },

  privacyCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  privacyIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  privacyText: { flex: 1, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  freeCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  freeLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 10px' },
  freeClock: { fontFamily: FONT, fontSize: 52, fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' },
  freeSub: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' },
  freeTrack: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,.14)' },
  freeFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },

  freeWriteCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  freeWriteHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  freeWriteLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  freeWriteTextarea: { width: '100%', minHeight: 190, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '14px', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'vertical' },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  skipBtn: { flexShrink: 0, height: 54, padding: '0 18px', borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  nextBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
