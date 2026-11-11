// ReflectionScreen.jsx — Reflexão. Dois jeitos, decididos em Meu Plano/
// Ajustar (reflectionMethodStore.js) e só LIDOS aqui:
//
//   · com perguntas (S4, handoff-passos-pedidos-53-54 §5): UMA pergunta por
//     vez no cartão preto, com o campo dentro. As perguntas são as de
//     sempre — duas geradas do trecho, opcionais, e a terceira, fixa, que
//     vira a frase do dia. Embaixo, as que faltam ("Depois") ou, na
//     última, as anteriores ("Já respondidas", tocáveis). "Trocar" troca
//     só a pergunta atual. Cabeçalho com o relógio e a barra do dia.
//   · livre (37b, handoff-passos-36-37): uma folha em branco — não mudou.
//
// "Com perguntas" exige session.hasAI (as perguntas são geradas por
// requisição, não guardadas — ver aiChat/reflectionQuestionsStore.js);
// quem escolheu perguntas mas não tem o plano certo cai em livre.
//
// Privacidade: o que se escreve vai para a Biblioteca da própria pessoa
// (notesStore) — a nota do dia e a frase de aplicação. Nada daqui vai a
// grupo nenhum.
import { useState, useEffect, useMemo, useRef } from 'react'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { fetchReflectionQuestionPair } from '../aiChat/reflectionQuestionsStore'
import { getNotes, saveNote, noteTextOf } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase, dailyApplicationKeyFor } from '../reflection/applicationPhraseStore'
import { dateKey } from '../utils/dateKey'
import { logSessionSeconds } from '../metrics/sessionDurationStore'
import { useStepTimer } from '../timer/useStepTimer'
import { usePlanTotalToday } from '../timer/usePlanTotalToday'
import { resolveMinutes } from '../meuPlano/meuPlanoMath'
import { dayBarSegments, dayBarAria, stepSubtitle } from '../passos/passosMath'
import { reflectionQuestions, reflectionView, passageCard, combineQaText } from '../passos/reflexaoMath'
import { useKeyboardInset } from '../passos/useKeyboardInset'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import StepTimerCard from '../components/timer/StepTimerCard'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'
import RelogioDoPasso from '../components/passos/RelogioDoPasso'
import CartaoPergunta from '../components/passos/CartaoPergunta'
import ListaDePerguntas from '../components/passos/ListaDePerguntas'
import RodapeDoPasso from '../components/passos/RodapeDoPasso'

function verseSpan(start, end) {
  return start === end ? `${start}` : `${start}-${end}`
}

// `active`: a tela está na frente (ela fica montada, escondida, depois da
// primeira visita — ver reflectionVisitedRef em App.jsx). `questionsApi` e
// `initialQuestion` só existem para a pré-visualização de desenvolvimento.
export default function ReflectionScreen({ session, authUser, stepMinutes, active = true, lastReadChapterInfo, onReflectionCompleted, onExitGuided, onBack, onApplicationChanged, timerControlsRef, onTimerRunningChange, questionsApi = fetchReflectionQuestionPair, initialQuestion = 0 }) {
  const { lang } = session
  const guided = session.guided?.step === 'reflection'
  const L = (k, vars) => t(`reflection.${k}`, vars, lang)
  const email = authUser?.email
  const method = useMemo(getReflectionMethod, [])
  const effectiveMethod = method === 'questions' && session.hasAI ? 'questions' : 'free'
  const withQuestions = effectiveMethod === 'questions'
  const totalMinutes = stepMinutes?.reflection ?? session.plan.reflectionMinutes
  const TOTAL_SECONDS = totalMinutes * 60

  const hasChapter = !!lastReadChapterInfo?.book
  const chapterLabel = hasChapter ? `${lastReadChapterInfo.book} ${verseSpan(lastReadChapterInfo.chStart, lastReadChapterInfo.chEnd)}` : ''

  const { running, elapsedSeconds: elapsed, start, toggle: toggleRunning, pause, computeElapsed } = useStepTimer()
  const planPriorSeconds = usePlanTotalToday()
  const planSeconds = planPriorSeconds + elapsed

  // Com perguntas: o relógio começa a contar quando a tela aparece — o
  // cabeçalho novo não tem botão de iniciar, só a pílula, que pausa e
  // retoma. Uma vez só: quem pausa (ou sai do app, que pausa) retoma pelo
  // toque.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!withQuestions || !active || autoStartedRef.current) return
    autoStartedRef.current = true
    start()
  }, [withQuestions, active, start])

  // O cartão areia do trecho (S4): o texto BÍBLICO do primeiro trecho
  // marcado hoje na leitura do plano ou, sem marcação, o primeiro
  // versículo do que a pessoa acabou de ler (num dia de estudo, o trecho
  // do estudo — é ele que chega em lastReadChapterInfo).
  const [passage, setPassage] = useState(null)
  useEffect(() => {
    if (!withQuestions) return undefined
    let cancelled = false
    async function load() {
      const versionId = getSelectedVersionId(lang)
      const list = email ? await getHighlights(email).catch(() => []) : []
      const today = list.find(h => !h.hidden && h.date === dateKey() && h.sessionMode === 'session')
      if (today) {
        const bookKey = lang === 'en' ? (today.bookEn || today.book) : today.book
        const chapters = await fetchBookText(versionId, bookKey).catch(() => null)
        const chapterData = chapters?.[String(today.chapter)]
        const quote = [...today.verses].sort((a, b) => a - b).map(v => chapterData?.verses?.[String(v)]).filter(Boolean).join(' ')
        if (quote) return { reference: `${today.book} ${today.chapter}`, text: quote, marked: true }
      }
      if (!hasChapter) return null
      const bookKey = lang === 'en' ? (lastReadChapterInfo.bookEn || lastReadChapterInfo.book) : lastReadChapterInfo.book
      const chapters = await fetchBookText(versionId, bookKey).catch(() => null)
      const first = chapters?.[String(lastReadChapterInfo.chStart)]?.verses?.['1']
      return first ? { reference: chapterLabel, text: first, marked: false } : null
    }
    load().then(p => { if (!cancelled) setPassage(p) }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, withQuestions])

  const noteKey = `reflection:${dateKey()}`

  // Só grava o que a pessoa mexeu NESTA visita: as respostas das perguntas
  // geradas não voltam da nota ao reabrir a tela (as perguntas são outras),
  // e gravar um campo intocado vazio apagaria a nota do dia da Biblioteca.
  const qaTouchedRef = useRef(false)
  const q3TouchedRef = useRef(false)

  // ── As duas perguntas geradas ───────────────────────────────────────
  const [questions, setQuestions] = useState(null)
  const [questionsError, setQuestionsError] = useState('')
  const [q1Text, setQ1Text] = useState('')
  const [q2Text, setQ2Text] = useState('')
  const [swapping, setSwapping] = useState(false)
  // Todas as perguntas que já apareceram hoje — "Trocar" pede perguntas
  // diferentes de todas elas.
  const seenQuestionsRef = useRef([])

  function questionsErrorText(err) {
    return err.message === 'daily_limit_reached' ? t('aiChat.dailyLimitReached', undefined, lang) : L('questionsError')
  }
  function fetchPair() {
    return questionsApi({
      book: lastReadChapterInfo.book, bookEn: lastReadChapterInfo.bookEn,
      chStart: lastReadChapterInfo.chStart, chEnd: lastReadChapterInfo.chEnd,
      lang, avoidQuestions: seenQuestionsRef.current,
    }).then(pair => { seenQuestionsRef.current = [...seenQuestionsRef.current, ...pair]; return pair })
  }
  useEffect(() => {
    if (!withQuestions || !hasChapter) return
    setQuestionsError('')
    fetchPair().then(setQuestions).catch(err => setQuestionsError(questionsErrorText(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withQuestions, hasChapter])

  // ── A pergunta fixa — sempre a mesma, vira a frase de aplicação ─────
  const applicationPhraseKey = dailyApplicationKeyFor()
  const [q3Text, setQ3Text] = useState('')
  const [pendingPin, setPendingPin] = useState(null)
  useEffect(() => {
    if (!email) return
    getNotes(email).then(map => { if (!q3TouchedRef.current) setQ3Text(noteTextOf(map[applicationPhraseKey])) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  // ── Uma pergunta por vez (S4) ───────────────────────────────────────
  const list = reflectionQuestions(questions, L('question3Fixed'))
  const answers = questions ? [q1Text, q2Text, q3Text] : [q3Text]
  const [current, setCurrent] = useState(initialQuestion)
  // Enquanto as perguntas geradas não chegam, a tela espera na primeira.
  const loadingQuestions = withQuestions && hasChapter && !questions && !questionsError
  const view = reflectionView({ questions: list, current, answers, todaysSteps: session.todaysSteps, dayEntry: session.todayRoutine })

  function setAnswer(text) {
    if (list[view.index].fixed) { q3TouchedRef.current = true; setQ3Text(text); return }
    qaTouchedRef.current = true
    if (view.index === 0) setQ1Text(text)
    else setQ2Text(text)
  }

  // "Trocar" — troca só a pergunta atual (nunca a fixa) por uma nova do
  // mesmo trecho, e limpa a resposta dela, que não serve mais.
  async function swapCurrent() {
    if (swapping || !questions) return
    const idx = view.index
    setSwapping(true)
    setQuestionsError('')
    try {
      const pair = await fetchPair()
      setQuestions(prev => prev.map((q, i) => (i === idx ? (pair[idx] ?? pair[0]) : q)))
      qaTouchedRef.current = true
      if (idx === 0) setQ1Text('')
      else setQ2Text('')
    } catch (err) {
      setQuestionsError(questionsErrorText(err))
    }
    setSwapping(false)
  }

  // Grava o texto cru na Biblioteca — a nota do dia (as perguntas geradas
  // respondidas, ou a folha livre) e a frase de aplicação de hoje. Sem
  // mexer na frase fixada no Início (ver finishQuestions).
  // `keepExisting` (livre: rede de segurança de Voltar/Terminar o dia)
  // nunca grava texto VAZIO — saveNote apaga a chave quando o texto é
  // vazio (varredura 2026-10-25: reabrir a Reflexão depois de um reload e
  // tocar Voltar apagava a nota do dia da Biblioteca). O "Salvar"
  // explícito da folha livre continua podendo limpar de propósito.
  async function saveNoteText({ keepExisting = false } = {}) {
    try {
      if (withQuestions) {
        if (qaTouchedRef.current) await saveNote(email, noteKey, combineQaText(questions, [q1Text, q2Text]))
        if (q3TouchedRef.current) await saveNote(email, applicationPhraseKey, q3Text)
      } else {
        if (!keepExisting || freeText.trim()) await saveNote(email, noteKey, freeText)
      }
    } catch (err) {
      console.error('Failed to persist reflection note', err)
    }
  }

  // Com perguntas, o texto é salvo ao pausar e ao avançar (S4).
  const wasRunningRef = useRef(false)
  useEffect(() => {
    if (withQuestions && wasRunningRef.current && !running) saveNoteText()
    wasRunningRef.current = running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const bodyRef = useRef(null)
  function goToQuestion(idx) {
    saveNoteText()
    setCurrent(idx)
    bodyRef.current?.scrollTo?.(0, 0)
  }

  async function confirmPinUpdate(accept) {
    const text = pendingPin
    setPendingPin(null)
    if (!accept || !text) return
    try {
      await setPinnedApplicationPhrase(email, text)
      // Bug real (2026-09-14, "salvei a aplicação do dia, mas não trocou")
      // — sem isto a Home nunca sabia que a frase fixada mudou.
      onApplicationChanged?.()
    } catch (err) { console.error('Failed to pin application phrase', err) }
  }

  // ── Livre (37b) ─────────────────────────────────────────────────────
  const [freeText, setFreeText] = useState('')
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved'
  useEffect(() => {
    if (!email || effectiveMethod !== 'free') return
    getNotes(email).then(map => setFreeText(noteTextOf(map[noteKey]))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, effectiveMethod])
  function handleFreeChange(text) { setFreeText(text) }
  // Botão "Salvar" explícito da folha livre.
  async function persistAnswers() {
    setSaveState('saving')
    await saveNoteText()
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1800)
  }

  // finishingRef: o save é assíncrono e os botões continuavam ativos —
  // dois toques gravavam os segundos 2x e fechavam o passo 2x
  // (varredura 2026-10-25).
  const finishingRef = useRef(false)
  async function finishDay() {
    if (finishingRef.current) return
    finishingRef.current = true
    pause()
    try {
      await saveNoteText({ keepExisting: true })
      logSessionSeconds('reflection', elapsed).catch(err => console.error('Failed to log reflection session seconds', err))
      onReflectionCompleted?.()
    } finally {
      finishingRef.current = false
    }
  }

  // Com perguntas, o botão laranja da última pergunta. A frase de hoje
  // vira a frase fixada no Início pela regra de sempre: a primeira de
  // todas fixa sozinha; havendo outra fixada, pergunta antes de trocar
  // (pendingPin) — e só quando a frase foi escrita nesta visita. Campo
  // vazio: a frase anterior permanece.
  const checkingPinRef = useRef(false)
  async function finishQuestions() {
    if (checkingPinRef.current || finishingRef.current) return
    if (q3Text.trim() && q3TouchedRef.current) {
      checkingPinRef.current = true
      try {
        const currentPinned = await getPinnedApplicationPhrase(email)
        if (!currentPinned) { await setPinnedApplicationPhrase(email, q3Text); onApplicationChanged?.() }
        else if (currentPinned !== q3Text) { saveNoteText(); setPendingPin(q3Text); return }
      } catch (err) {
        console.error('Failed to persist application phrase', err)
      } finally {
        checkingPinRef.current = false
      }
    }
    finishDay()
  }
  async function answerPin(accept) {
    await confirmPinUpdate(accept)
    finishDay()
  }

  // Pedido dela (2026-10-22): mesmo pill flutuante global de PrayerScreen.jsx
  // (ver comentário lá) — Reflexão também fica sempre montada
  // (reflectionVisitedRef em App.jsx), só faltava expor os controles.
  if (timerControlsRef) {
    timerControlsRef.current = { toggle: toggleRunning, finish: finishDay, computeElapsed, totalSeconds: TOTAL_SECONDS, label: L('pageTitle') }
  }
  useEffect(() => { onTimerRunningChange?.(running) }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sair sem terminar o dia (Voltar) também não pode perder o que foi
  // escrito — mesma rede de segurança de finishDay, sem esperar a volta
  // do servidor antes de navegar (saveNoteText roda em paralelo).
  function handleBack() {
    saveNoteText({ keepExisting: true })
    // onExitGuided só zera o fluxo, não navega — a seta parecia morta no
    // 1º toque em modo guiado (varredura 2026-10-25).
    if (guided) onExitGuided?.()
    onBack?.()
  }

  // O teclado passa por cima da página: o fundo da tela sobe com ele, e o
  // rodapé e o campo ficam à vista.
  const keyboardInset = useKeyboardInset()

  if (withQuestions) {
    const card = passageCard(passage ?? {})
    return (
      <div style={{ ...styles.screen, paddingBottom: keyboardInset, boxSizing: 'border-box' }}>
        <CabecalhoDoPasso
          title="Reflexão" subtitle={stepSubtitle(session.todaysSteps, 'reflection', 'com perguntas')}
          onBack={handleBack} backLabel={t('a11y.goBack', undefined, lang)}
          clock={<RelogioDoPasso totalSeconds={TOTAL_SECONDS} elapsedSeconds={elapsed} running={running} onToggle={toggleRunning} />}
          segments={dayBarSegments({ todaysSteps: session.todaysSteps, minutes: resolveMinutes(stepMinutes, session.plan), dayEntry: session.todayRoutine, current: 'reflection' })}
          barLabel={dayBarAria(session.todaysSteps, 'reflection')}
        />

        <div ref={bodyRef} style={styles.questionsBody}>
          {card && (
            <div style={styles.passageCard}>
              <p style={styles.passageLabel}>{card.label}</p>
              <p style={styles.passageText}>{card.text}</p>
            </div>
          )}

          {questionsError && <p style={styles.errorText} role="status">{questionsError}</p>}

          {loadingQuestions ? (
            <>
              <CartaoPergunta label="Pergunta 1 de 3" markers={[true, false, false]} question="Preparando as perguntas deste trecho…" />
              <ListaDePerguntas list={{ title: 'Depois', rows: [{ index: 2, n: 3, text: L('question3Fixed'), sub: 'Vira a sua frase do dia', tappable: false }] }} />
            </>
          ) : (
            <>
              <CartaoPergunta
                key={view.index}
                label={view.label} markers={view.markers} question={view.question} placeholder={view.placeholder}
                value={answers[view.index]} onChange={setAnswer}
              />
              {pendingPin ? (
                <div style={styles.pinCard} role="status">
                  <p style={styles.pinText}>{L('pinConfirmText')}</p>
                </div>
              ) : view.list && (
                <ListaDePerguntas list={view.list} onOpen={goToQuestion} />
              )}
            </>
          )}

          <p style={styles.privacyLine}>Fica na sua Biblioteca. Nada vai ao grupo sem você compartilhar.</p>
        </div>

        {pendingPin ? (
          <RodapeDoPasso
            secondary={{ label: L('pinConfirmNo'), onClick: () => answerPin(false) }}
            primary={{ label: L('pinConfirmYes'), onClick: () => answerPin(true) }}
          />
        ) : (
          <RodapeDoPasso
            secondary={view.secondary && !loadingQuestions ? { label: swapping ? 'Trocando…' : view.secondary, onClick: swapCurrent, disabled: swapping } : null}
            primary={loadingQuestions
              ? { label: 'Próxima pergunta', disabled: true }
              : { label: view.primary, onClick: view.last ? finishQuestions : () => goToQuestion(view.index + 1) }}
          />
        )}
      </div>
    )
  }

  // ── Livre (37b) — sem mudança ─────────────────────────────────────────
  // "passo N de M" — sempre os passos de HOJE (session.todaysSteps),
  // dentro ou fora do modo guiado.
  const todaysSteps = session.todaysSteps ?? ['reflection']
  const stepIdx = Math.max(0, todaysSteps.indexOf('reflection'))
  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('pageTitle')}</p>
          <p style={styles.subtitle}>{L('stepOf', { n: stepIdx + 1, total: todaysSteps.length })} · {L('methodSuffixFree')}</p>
        </div>
      </div>

      <div style={styles.body}>
        {/* Livre — sem etapas, mesmo cronômetro compartilhado. */}
        <StepTimerCard
          lang={lang} steps={null}
          planSeconds={planSeconds} etapaSeconds={elapsed}
          etapaDurationSeconds={TOTAL_SECONDS}
          running={running} onToggle={toggleRunning} onStop={finishDay}
        />

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
          <div style={styles.saveRow}>
            <button type="button" style={{ ...styles.saveBtn, ...(saveState === 'saved' ? styles.saveBtnSaved : {}) }} onClick={persistAnswers} disabled={saveState === 'saving'}>
              {saveState === 'saved' && <AppIcon name="Check" size={13} strokeWidth={3} color="var(--bento-ink)" />}
              <span>{saveState === 'saved' ? L('savedAnswersBtn') : saveState === 'saving' ? t('groups.loading', undefined, lang) : L('saveAnswersBtn')}</span>
            </button>
          </div>
        </div>

        <div style={styles.privacyCard}>
          <span style={styles.privacyIcon}><AppIcon name="BookMarked" size={15} strokeWidth={2} color="var(--bento-t4)" /></span>
          <p style={styles.privacyText}>{L('freePrivacyNote')}</p>
        </div>
      </div>

      <div style={styles.footer}>
        <button style={{ ...styles.nextBtn, flex: 1 }} onClick={finishDay}>
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

  // Com perguntas (S4): o corpo rola entre o cabeçalho e o rodapé presos.
  questionsBody: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 },
  passageCard: { flexShrink: 0, borderRadius: 20, background: 'var(--bento-sand)', padding: '13px 16px' },
  passageLabel: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 7px' },
  // Um trecho marcado pode ter vários versículos: o cartão mostra até
  // quatro linhas, pra pergunta não sair da tela.
  passageText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  errorText: { flexShrink: 0, fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 2px' },
  pinCard: { flexShrink: 0, borderRadius: 24, background: 'var(--bento-card)', padding: '15px 16px' },
  pinText: { fontFamily: FONT, fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: 0 },
  privacyLine: { flexShrink: 0, fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: '0 2px', textAlign: 'center' },

  // Livre (37b).
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },
  optionalTag: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },

  saveRow: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 },
  saveBtn: { height: 36, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-t2)' },
  saveBtnSaved: { background: 'var(--bento-accent)', color: 'var(--bento-ink)' },

  privacyCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  privacyIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  privacyText: { flex: 1, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  freeWriteCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px' },
  freeWriteHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  freeWriteLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  freeWriteTextarea: { width: '100%', minHeight: 190, boxSizing: 'border-box', border: 'none', borderRadius: 14, background: 'var(--bento-line)', padding: '14px', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'vertical' },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  nextBtn: { flex: 1, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
