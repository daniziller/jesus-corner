// StudyDayScreen.jsx — "O dia do estudo, aberto" (41d, turno 41,
// handoff-estudos-41/). A tela mais importante da área: trecho → ensino →
// versículo-âncora → pergunta + resposta, tela única com rolagem.
//
// `day` é sempre o dia ATUAL do estudo (o primeiro sem completedAt — ver
// currentDayOf em estudosStore.js), resolvido por quem chama (App.jsx) a
// partir de `study.sessions`. Ensino/versículo-âncora/pergunta são
// gerados por IA na primeira vez que o dia é aberto (api/generate-study-
// day.js) e guardados no próprio dia (`day.teaching` já vindo preenchido
// pula a geração — nunca regenera num reabrir).
//
// Segurar um versículo do trecho abre uma folha de ações — versão mais
// enxuta da de ReadingBlockView.jsx/VerseActionsSheet (marcar com cor,
// copiar, compartilhar), sem seleção de múltiplos versículos por arrasto
// nem "Perguntar à IA": aqui é só o texto de apoio do estudo, a leitura
// funda com IA já mora na Bíblia de verdade (39e) — decisão de escopo pra
// não duplicar ~200 linhas de mecanismo por uma tela secundária.
import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { generateStudyDayContent, updateStudyDay, saveStudyDayDraft, completeStudyDay } from '../studies/studyDayStore'
import { saveHighlight } from '../highlights/highlightsStore'
import { DEFAULT_HIGHLIGHT_COLOR, HIGHLIGHT_COLORS } from '../data/highlightColors'
import { renderVerseShareImage, shareVerseImage } from '../home/verseShareImage'
import { dateKey } from '../utils/dateKey'

const FONT = 'var(--font-bento)'
const READING_FONT = "'Be Vietnam Pro', var(--font-bento)"
const HOLD_MS = 450

// "6:20" mm:ss sem zero à esquerda no minuto — mesmo formato de
// ReadingBlockView.jsx (formatClock local lá também, não exportado).
function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const sec = Math.floor(totalSeconds % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function getSpeechRecognition() {
  return typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
}

export default function StudyDayScreen({ session, authUser, study, day, dayIndex, totalDays, onBack, onOpenBiblePassage, onStudyUpdated, onCompleted, onSavedForLater }) {
  const { lang } = session
  const L = (k, vars) => t(`studyDay.${k}`, vars, lang)

  const [chapters, setChapters] = useState(null)
  const [generating, setGenerating] = useState(!day.teaching)
  const [genError, setGenError] = useState('')
  const [answer, setAnswer] = useState(day.answer ?? day.draft ?? '')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [savingForLater, setSavingForLater] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [listening, setListening] = useState(false)
  const [heldVerse, setHeldVerse] = useState(null) // { chapter, verse, text } | null
  const [savedAnchor, setSavedAnchor] = useState(false)
  const [sharingAnchor, setSharingAnchor] = useState(false)
  const [copiedVerse, setCopiedVerse] = useState(false)

  const holdTimerRef = useRef(null)
  const answerAtMountRef = useRef(day.answer ?? day.draft ?? '')

  // Relógio da SESSÃO (visita atual) — só conta pra cima, nunca expira,
  // sem barra de progresso (regra 4 §4). Pausa quando a aba não está
  // visível (mesmo padrão de ReadingBlockView.jsx) pra não somar tempo
  // parado. Acumulado é somado ao total do dia só ao sair (Salvar/
  // Concluir), nunca aqui — ver saveStudyDayDraft/completeStudyDay.
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') setElapsedSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const versionId = getSelectedVersionId(lang)
    const bookKey = lang === 'en' ? day.bookEn : day.book
    fetchBookText(versionId, bookKey).then(setChapters).catch(err => console.error('Failed to load Bible text for study day', err))
  }, [day.book, day.bookEn, lang])

  // Ensino/versículo-âncora/pergunta — gerado uma vez, guardado com o dia.
  useEffect(() => {
    if (day.teaching) { setGenerating(false); return }
    let cancelled = false
    setGenerating(true)
    setGenError('')
    generateStudyDayContent({ book: day.book, bookEn: day.bookEn, chStart: day.chStart, chEnd: day.chEnd, scope: study.scope || study.overview || study.title, lang })
      .then(async result => {
        if (cancelled) return
        try {
          const updated = await updateStudyDay(authUser.email, study.id, day.id, result)
          onStudyUpdated?.(updated)
        } catch (err) {
          console.error('Failed to save generated study day content', err)
        }
      })
      .catch(err => { if (!cancelled) { console.error('Failed to generate study day content', err); setGenError(L('genError')) } })
      .finally(() => { if (!cancelled) setGenerating(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id])

  // Rascunho salvo automaticamente (regra 4 §4) — não soma tempo aqui
  // (só ao sair), evita gravar a cada tecla.
  useEffect(() => {
    if (answer === answerAtMountRef.current) return
    const handle = setTimeout(() => {
      saveStudyDayDraft(authUser.email, study.id, day.id, answer, 0)
        .then(updated => onStudyUpdated?.(updated))
        .catch(err => console.error('Failed to autosave study day draft', err))
    }, 1200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer])

  const chapterList = Array.from({ length: day.chEnd - day.chStart + 1 }, (_, i) => day.chStart + i)
  const canDictate = !!getSpeechRecognition()

  function toggleDictation() {
    const Recognition = getSpeechRecognition()
    if (!Recognition) return
    if (listening) { setListening(false); return }
    const recognition = new Recognition()
    recognition.lang = lang === 'en' ? 'en-US' : 'pt-BR'
    recognition.interimResults = false
    recognition.onresult = e => {
      const heard = e.results?.[0]?.[0]?.transcript ?? ''
      if (heard) setAnswer(prev => (prev ? `${prev} ${heard}` : heard))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  async function handleSaveForLater() {
    if (savingForLater) return
    setSavingForLater(true)
    try {
      const updated = await saveStudyDayDraft(authUser.email, study.id, day.id, answer, elapsedSeconds)
      onStudyUpdated?.(updated)
      onSavedForLater?.()
    } catch (err) {
      console.error('Failed to save study day for later', err)
    } finally {
      setSavingForLater(false)
    }
  }

  async function handleComplete() {
    if (completing) return
    if (!answer.trim() && !confirmSkip) { setConfirmSkip(true); return }
    setCompleting(true)
    try {
      const updated = await completeStudyDay(authUser.email, study.id, day.id, { answer, skippedQuestion: !answer.trim(), elapsedSeconds })
      onStudyUpdated?.(updated)
      // `isLastDay` calculado aqui (não relido de `aiStudies` em App.jsx)
      // — mesmo motivo do bug de "página errada" achado antes: o estado
      // ainda não assentou neste mesmo instante.
      onCompleted?.(study.id, day.id, dayIndex === totalDays - 1)
    } catch (err) {
      console.error('Failed to complete study day', err)
    } finally {
      setCompleting(false)
    }
  }

  function startHold(chapterNum, verseNum, verseText) {
    holdTimerRef.current = setTimeout(() => setHeldVerse({ chapter: chapterNum, verse: verseNum, text: verseText }), HOLD_MS)
  }
  function cancelHold() {
    clearTimeout(holdTimerRef.current)
  }

  async function handleMarkHeldVerse(colorId) {
    if (!heldVerse) return
    try {
      await saveHighlight(authUser.email, {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        book: day.book, bookEn: day.bookEn, chapter: heldVerse.chapter, verses: [heldVerse.verse],
        text: '', color: colorId, createdAt: new Date().toISOString(), date: dateKey(), sessionMode: 'browse',
      })
    } catch (err) {
      console.error('Failed to mark verse from study day', err)
    } finally {
      setHeldVerse(null)
    }
  }

  async function handleCopyHeldVerse() {
    if (!heldVerse) return
    try {
      await navigator.clipboard?.writeText(`"${heldVerse.text}" — ${day.book} ${heldVerse.chapter}:${heldVerse.verse}`)
      setCopiedVerse(true)
      setTimeout(() => setCopiedVerse(false), 1600)
    } catch (err) {
      console.error('Failed to copy verse', err)
    }
  }

  async function handleShareHeldVerse() {
    if (!heldVerse) return
    try {
      const blob = await renderVerseShareImage({ text: heldVerse.text, ref: `${day.book} ${heldVerse.chapter}:${heldVerse.verse}`, brandText: "Jesus' Corner" })
      await shareVerseImage(blob, { title: L('verseTitle'), text: `"${heldVerse.text}"` })
    } catch (err) {
      console.error('Failed to share verse from study day', err)
    } finally {
      setHeldVerse(null)
    }
  }

  async function handleSaveAnchor() {
    if (savedAnchor || !day.anchorVerse) return
    setSavedAnchor(true)
    try {
      await saveHighlight(authUser.email, {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        book: day.book, bookEn: day.bookEn, chapter: day.anchorVerse.chapter, verses: [day.anchorVerse.verse],
        text: '', color: DEFAULT_HIGHLIGHT_COLOR, createdAt: new Date().toISOString(), date: dateKey(), sessionMode: 'browse',
      })
    } catch (err) {
      console.error('Failed to save anchor verse', err)
    }
  }

  async function handleShareAnchor() {
    if (sharingAnchor || !day.anchorVerse) return
    setSharingAnchor(true)
    try {
      const blob = await renderVerseShareImage({ text: day.anchorVerse.text, ref: `${day.book} ${day.anchorVerse.chapter}:${day.anchorVerse.verse}`, brandText: "Jesus' Corner" }).catch(() => null)
      await shareVerseImage(blob, { title: L('verseTitle'), text: `"${day.anchorVerse.text}"` })
    } finally {
      setSharingAnchor(false)
    }
  }

  const passageLabel = day.chStart === day.chEnd ? `${day.book} ${day.chStart}` : `${day.book} ${day.chStart}–${day.chEnd}`

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{L('headerTitle', { theme: study.title, n: dayIndex + 1, total: totalDays })}</p>
          <p style={s.headerSub}>{L('headerSub')}</p>
        </div>
        <span style={s.timeChip}>
          <span style={s.timeDot} />
          {formatClock(elapsedSeconds)}
        </span>
      </div>

      <div style={s.trackRow}>
        {Array.from({ length: totalDays }, (_, i) => (
          <span key={i} style={{ ...s.trackBar, background: i < dayIndex ? 'var(--bento-ink)' : i === dayIndex ? 'var(--bento-accent)' : 'rgba(0,0,0,.12)' }} />
        ))}
      </div>

      <div style={s.body}>
        {/* O trecho de hoje (branco). */}
        <div style={s.card}>
          <div style={s.cardHeadRow}>
            <p style={s.cardLabel}>{L('passageLabel')}</p>
            <button style={s.openBibleLink} onClick={() => onOpenBiblePassage?.(day.book, chapterList[0])}>{L('openBibleLink')}</button>
          </div>
          <p style={s.passageTitle}>{passageLabel}</p>
          {!chapters ? (
            <p style={s.loadingText}>{L('loadingPassage')}</p>
          ) : (
            <p style={s.passageText}>
              {chapterList.map(ch => {
                const verses = chapters[String(ch)]?.verses ?? {}
                return Object.keys(verses).map(Number).sort((a, b) => a - b).map(v => (
                  <span
                    key={`${ch}:${v}`}
                    style={{ ...s.verseSpan, ...(heldVerse?.chapter === ch && heldVerse?.verse === v ? s.verseSpanHeld : {}) }}
                    onTouchStart={() => startHold(ch, v, verses[String(v)])}
                    onTouchEnd={cancelHold}
                    onTouchMove={cancelHold}
                    onMouseDown={() => startHold(ch, v, verses[String(v)])}
                    onMouseUp={cancelHold}
                    onMouseLeave={cancelHold}
                  >
                    <sup style={s.verseNum}>{v}</sup> {verses[String(v)]}{' '}
                  </span>
                ))
              })}
            </p>
          )}
        </div>

        {/* O que este trecho diz (preto). */}
        <div style={s.darkCard}>
          <div style={s.darkLabelRow}>
            <span style={s.diamond} />
            <p style={s.darkLabel}>{L('teachingLabel')}</p>
          </div>
          {generating ? (
            <p style={s.teachingLoading}>{L('generatingTeaching')}</p>
          ) : genError ? (
            <p style={s.teachingLoading}>{genError}</p>
          ) : (
            day.teaching?.body.split('\n\n').map((p, i) => <p key={i} style={s.teachingPara}>{p}</p>)
          )}
        </div>

        {/* Guarde esta (areia). */}
        {day.anchorVerse && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('anchorLabel')}</p>
            <p style={s.anchorText}>&ldquo;{day.anchorVerse.text}&rdquo;</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.sandBtn} onClick={handleSaveAnchor}>{L(savedAnchor ? 'savedToLibrary' : 'saveToLibrary')}</button>
              <button style={s.sandBtn} onClick={handleShareAnchor} disabled={sharingAnchor}>{L('shareAction')}</button>
            </div>
          </div>
        )}

        {/* A pergunta do dia N (branco). */}
        <div style={s.card}>
          <p style={s.questionLabel}>{L('questionLabel', { n: dayIndex + 1 })}</p>
          <p style={s.questionText}>{generating ? '' : day.question}</p>
          <div style={{ position: 'relative' }}>
            <textarea
              style={s.answerInput}
              value={answer}
              onChange={e => { setAnswer(e.target.value); setConfirmSkip(false) }}
              placeholder={L('answerPlaceholder')}
              rows={4}
            />
            {canDictate && (
              <button type="button" style={{ ...s.dictateBtn, ...(listening ? s.dictateBtnOn : {}) }} onClick={toggleDictation} aria-label={L('dictateAction')}>
                <AppIcon name="AudioLines" size={15} color={listening ? 'var(--bento-ink)' : 'var(--bento-t3)'} />
              </button>
            )}
          </div>
          <p style={s.privacyNote}>{L('privacyNote')}</p>
        </div>

        {confirmSkip && <p style={s.skipHint}>{L('skipHint')}</p>}
      </div>

      <div style={s.footer}>
        <button style={{ ...s.completeBtn, opacity: completing ? .6 : 1 }} onClick={handleComplete} disabled={completing}>
          {L(confirmSkip ? 'completeSkipBtn' : 'completeBtn', { n: dayIndex + 1 })}
        </button>
        <button style={s.laterBtn} onClick={handleSaveForLater} disabled={savingForLater}>{L('saveForLaterBtn')}</button>
      </div>

      {heldVerse && (
        <div style={s.verseSheetBackdrop} onClick={() => setHeldVerse(null)}>
          <div style={s.verseSheet} onClick={e => e.stopPropagation()}>
            <div style={s.verseSheetHandleWrap}><div style={s.verseSheetHandle} /></div>
            <p style={s.verseSheetTitle}>{day.book} {heldVerse.chapter}:{heldVerse.verse}</p>
            <div style={s.verseSheetColorRow}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.id} type="button" style={{ ...s.verseSheetColorSwatch, background: c.swatch }} onClick={() => handleMarkHeldVerse(c.id)} aria-label={c.id} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.verseSheetActionBtn} onClick={handleCopyHeldVerse}>{copiedVerse ? L('copied') : L('copyAction')}</button>
              <button style={s.verseSheetActionBtn} onClick={handleShareHeldVerse}>{L('shareAction')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  timeChip: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 99, background: 'var(--bento-card)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },
  timeDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--bento-accent)' },

  trackRow: { flexShrink: 0, display: 'flex', gap: 4, padding: '12px 20px 0' },
  trackBar: { flex: 1, height: 5, borderRadius: 3 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  openBibleLink: { fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  passageTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: '0 0 12px' },
  loadingText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  passageText: { fontFamily: READING_FONT, fontWeight: 400, fontSize: 15, lineHeight: 1.62, color: 'var(--bento-ink)', margin: 0 },
  verseSpan: { borderRadius: 4 },
  verseSpanHeld: { background: 'rgba(240,102,43,.16)' },
  verseNum: { fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#A29A91' },

  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  teachingLoading: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  teachingPara: { fontFamily: READING_FONT, fontWeight: 400, fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,.82)', margin: '0 0 12px' },

  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '18px 20px' },
  sandLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 10px' },
  anchorText: { fontFamily: READING_FONT, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: 'var(--bento-sand-ink-strong)', margin: '0 0 16px' },
  sandBtn: { flex: 1, height: 42, borderRadius: 14, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  questionLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 8px' },
  questionText: { fontFamily: FONT, fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: '0 0 14px', minHeight: 22 },
  // #F5F1EC — token "campo claro" do HANDOFF-41 (§Tokens), literal (não
  // existe como --bento-* nomeado; mesmo valor exato pedido pro campo de
  // resposta de 41d).
  answerInput: { width: '100%', border: 'none', outline: 'none', background: '#F5F1EC', borderRadius: 16, padding: '14px 50px 14px 16px', fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'none', minHeight: 100, boxSizing: 'border-box' },
  dictateBtn: { position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  dictateBtnOn: { background: 'var(--bento-accent)' },
  privacyNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t4)', margin: '10px 0 0' },

  skipHint: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', textAlign: 'center', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 20px calc(20px + var(--safe-bottom))' },
  completeBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  laterBtn: { height: 48, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.6)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  verseSheetBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' },
  verseSheet: { width: '100%', background: 'var(--bento-bg)', borderRadius: '24px 24px 0 0', padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 14 },
  verseSheetHandleWrap: { display: 'flex', justifyContent: 'center', padding: '4px 0' },
  verseSheetHandle: { width: 36, height: 4, borderRadius: 2, background: 'var(--bento-line)' },
  verseSheetTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', margin: 0, textAlign: 'center' },
  verseSheetColorRow: { display: 'flex', justifyContent: 'center', gap: 12 },
  verseSheetColorSwatch: { width: 34, height: 34, borderRadius: '50%', border: '2px solid rgba(0,0,0,.06)', cursor: 'pointer' },
  verseSheetActionBtn: { flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
}
