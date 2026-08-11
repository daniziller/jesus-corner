import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import ReflectionGuideCard from '../components/reflection/ReflectionGuideCard'
import { REFLECTION_DATA, phaseMinutesFor } from '../data/reflectionGuide'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getNotes, saveNote, noteTextOf } from '../notes/notesStore'
import { dateKey } from '../utils/dateKey'
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

export default function ReflectionScreen({ session, authUser, onReflectionCompleted }) {
  const { lang } = session
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
      await saveNote(authUser?.email, applicationPhraseKey, text)
      if (!text.trim()) return
      const currentPinned = await getPinnedApplicationPhrase(authUser?.email)
      if (!currentPinned) {
        await setPinnedApplicationPhrase(authUser?.email, text)
      } else if (currentPinned !== text && window.confirm(t('reflection.updateHomeCardConfirm', undefined, lang))) {
        await setPinnedApplicationPhrase(authUser?.email, text)
      }
    } catch (err) {
      console.error('Failed to persist application phrase', err)
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

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      {/* Header */}

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
                <ApplicationPhraseField lang={lang} value={applicationPhrase} onSave={handleSaveApplicationPhrase} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Anotação do dia — uma por dia (não por etapa), guardada no mesmo
            backend das anotações de leitura (ver notesStore.js). */}
        <NotesPanel value={noteText} hasSavedNote={hasSavedNote} onSave={handleSaveNote} lang={lang} />
      </div>
    </div>
  )
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
      <p style={styles.phraseLabel}>{t('reflection.applicationPhraseLabel', undefined, lang)}</p>
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
        {t('reflection.notesLabel', undefined, lang)}
        {hasSavedNote && <span style={styles.notesSavedDot} />}
      </p>
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
  hero:        { minHeight: 150, margin: '10px 16px', borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--bk-hero)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 22px', boxShadow: '0 12px 28px rgba(0,0,0,.25)' },
  heroOrbPurple: { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(60px)', opacity: 0.5, top: -60, left: -50 },
  heroOrbFuchsia: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(60px)', opacity: 0.3, bottom: -60, right: -40 },
  heroTitle:   { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' },
  heroSub:     { fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.5, marginTop: 3 },
  body:        { padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  timer:       { background: 'var(--bk-hero)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timerLabel:  { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 2, textTransform: 'uppercase' },
  timerDisplay:{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 300, color: 'white', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' },
  currentPhaseBadge: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', border: '1px solid', borderRadius: 24, padding: '6px 14px 6px 6px' },
  currentPhaseDot:   { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 },
  // minWidth:0 — mesmo ajuste de PrayerScreen.jsx (ver comentário lá):
  // sem isso, o texto desse item flex recusa quebrar linha e vaza pra
  // fora do card em telas estreitas.
  currentPhaseLabel: { fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.6)', minWidth: 0 },
  phaseRemaining:    { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', fontVariantNumeric: 'tabular-nums', paddingLeft: 8, marginLeft: 2, borderLeft: '1px solid rgba(255,255,255,.15)', flexShrink: 0 },
  timerBtn:    { padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, border: 'none', fontFamily: 'var(--font)', transition: 'transform .15s' },
  wakeLockHint:{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', textAlign: 'center', lineHeight: 1.5, marginTop: 2, maxWidth: 220 },
  durationLabel: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  durationRow: { display: 'flex', gap: 6, background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 4 },
  durationBtn: { width: 34, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'rgba(255,255,255,.55)', background: 'transparent', transition: 'background .15s, color .15s' },
  durationBtnActive: { background: 'var(--grad-primary)', color: 'white', boxShadow: '0 4px 12px rgba(249,115,22,.35)' },
  phraseCard:  { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 16, padding: 13 },
  phraseLabel: { fontSize: 9.5, fontWeight: 700, color: '#A21CAF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  phraseInput: { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', marginBottom: 10, background: 'white' },
  phraseSaveBtn:{ width: '100%', background: '#A21CAF', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  notesPanel:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  notesLabel:  { fontSize: 9.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  notesSavedDot: { display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', marginLeft: 6, verticalAlign: 'middle' },
  notesTextarea:{ width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: 10, background: 'var(--g1)' },
  notesSaveBtn:{ width: '100%', background: 'var(--grad-primary)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
}
