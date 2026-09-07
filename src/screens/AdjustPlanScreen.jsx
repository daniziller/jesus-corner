// AdjustPlanScreen.jsx — "Ajustar meu plano" (turno 35, Bloco 1 do pacote
// handoff-meu-plano-35/, tela 35c). Substitui por inteiro a versão antiga
// (redesign 1d/5a): agora os 4 passos (Oração/Leitura/Estudo/Reflexão) têm
// interruptor + minutos + método (quando aplicável) próprios, cada um com
// seus PRÓPRIOS dias da semana (não um "ritmo da semana" só pra rotina
// inteira) — ver HANDOFF-35-meu-plano.md, 35c. "Onde começar/ordem/ritmo"
// da leitura e "estudo atual/banco/dias" do estudo saíram pra telas
// próprias (35i/35j, "Organizar a leitura"/"Organizar o estudo") — esta
// tela responde só "quais passos" e "quanto tempo".
//
// Regra dos passos (HANDOFF): pelo menos um entre Leitura e Estudo fica
// ligado — desligar o último não é silencioso, mostra `lastOffWarning` por
// alguns segundos em vez de travar sem explicação. Minutos vão de 5 a 60,
// de 5 em 5 (nunca 0 — diferente do 0-desliga do stepMinutesStore.js
// genérico; aqui quem liga/desliga é o interruptor, os minutos ficam
// guardados mesmo com o passo desligado, pra voltar do jeito que estava).
import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekdayChipRow from '../components/WeekdayChipRow'
import { splitBold } from '../utils/boldSubstring'
import { getStepDays, setStepDays as persistStepDays, countMarkedWeekdays, markedWeekdayUnion } from '../routine/stepDaysStore'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath'
import { getPrayerMethod, setPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod, setReflectionMethod } from '../reflection/reflectionMethodStore'
import { getBibleOrderMode, getCustomBookOrder, resolveBookOrder, resolveNextChapter } from '../reading/bibleOrderStore'
import { getReadingClockPrefs, setReadingClockPrefs as persistClockPrefs } from '../reading/readingClockPrefsStore'
import { getMyReminderSchedule } from '../notifications/pushStore'
import { computeProjection } from '../plan/readingProjection'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'

const DEFAULT_STUDY_MINUTES = 15
const STEP_DEFAULT_MIN = { prayer: 10, reading: 15, study: DEFAULT_STUDY_MINUTES, reflection: 5 }
const MIN_MINUTES = 5
const MAX_MINUTES = 60
const STEP_ORDER = ['prayer', 'reading', 'study', 'reflection']

function fmt1(n, lang) {
  const s = (Math.round(n * 10) / 10).toFixed(1)
  return lang === 'en' ? s : s.replace('.', ',')
}

function renderBold(text, boldPart) {
  return splitBold(text, boldPart).map((part, i) =>
    typeof part === 'string' ? <span key={i}>{part}</span> : <strong key={i} style={{ fontWeight: 800, color: 'var(--bento-sand-icon)' }}>{part.bold}</strong>
  )
}

export default function AdjustPlanScreen({ session, completedSet, stepMinutes, onSaveStepMinutes, onToggleRoutineModule, bookChapterCounts, onNavigate, onBack }) {
  const { lang, plan, routineModules, activeStudyId } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)
  const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
  const fullNames = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt

  const enabled = useMemo(() => new Set(routineModules ?? []), [routineModules])
  // Math.max com MIN_MINUTES — contas de antes desta tela podiam ter 0 min
  // salvo em prayer/reflection (era assim que o passo "desligava" no modelo
  // velho); aqui quem desliga é o interruptor, minutos nunca aparecem em 0.
  const minutes = {
    prayer: Math.max(MIN_MINUTES, stepMinutes?.prayer ?? plan.prayerMinutes ?? STEP_DEFAULT_MIN.prayer),
    reading: Math.max(MIN_MINUTES, stepMinutes?.reading ?? plan.readingMinutes ?? STEP_DEFAULT_MIN.reading),
    study: Math.max(MIN_MINUTES, stepMinutes?.study ?? STEP_DEFAULT_MIN.study),
    reflection: Math.max(MIN_MINUTES, stepMinutes?.reflection ?? plan.reflectionMinutes ?? STEP_DEFAULT_MIN.reflection),
  }
  const totalMin = STEP_ORDER.filter(k => enabled.has(k)).reduce((s, k) => s + (minutes[k] ?? 0), 0)

  const [prayerMethod, setPrayerMethodState] = useState(getPrayerMethod)
  const [reflectionMethod, setReflectionMethodState] = useState(getReflectionMethod)
  const [stepDays, setStepDaysState] = useState(null)
  const [bibleOrderMode, setBibleOrderModeState] = useState('canonical')
  const [readingPosition, setReadingPosition] = useState(null)
  const [clockPrefs, setClockPrefsState] = useState(null)
  const [reminder, setReminder] = useState(null)
  const [activeStudyTitle, setActiveStudyTitle] = useState(null)
  const [activeStudyProgress, setActiveStudyProgress] = useState(null)
  const [warning, setWarning] = useState('')
  const warningTimeoutRef = useRef(null)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => setStepDaysState(null))
    getReadingClockPrefs().then(setClockPrefsState).catch(() => {})
    getMyReminderSchedule().then(setReminder).catch(() => setReminder(null))
    Promise.all([getBibleOrderMode(), getCustomBookOrder()]).then(([mode, custom]) => {
      setBibleOrderModeState(mode)
      const order = resolveBookOrder(mode, custom)
      setReadingPosition(resolveNextChapter(completedSet, order, bookChapterCounts))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeStudyId) { setActiveStudyTitle(null); setActiveStudyProgress(null); return }
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, completedStudySet]) => {
      const study = [...STUDIES, ...ai, ...inductive].find(s => s.id === activeStudyId)
      if (!study) return
      setActiveStudyTitle(study.title ?? study.titleEn ?? '')
      const total = study.sessions?.length ?? 0
      const done = (study.sessions ?? []).filter(s => isStudySessionDone(completedStudySet, study.id, s.id)).length
      setActiveStudyProgress({ done: Math.min(done + 1, total), total })
    }).catch(() => {})
  }, [activeStudyId])

  function warn(key) {
    setWarning(L(key))
    window.clearTimeout(warningTimeoutRef.current)
    warningTimeoutRef.current = window.setTimeout(() => setWarning(''), 4000)
  }

  function toggleStep(key, on) {
    if (!on && key === 'reading' && !enabled.has('study')) { warn('lastOffWarning'); return }
    if (!on && key === 'study' && !enabled.has('reading')) { warn('lastOffWarning'); return }
    onToggleRoutineModule?.(key, on)
  }

  function bumpMinutes(key, delta) {
    const next = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, (minutes[key] ?? STEP_DEFAULT_MIN[key]) + delta))
    onSaveStepMinutes?.({ [key]: next })
  }

  function saveStepDaysFor(key, days) {
    setStepDaysState(prev => ({ ...(prev ?? {}), [key]: days }))
    persistStepDays({ [key]: days }).catch(err => console.error('Failed to persist step days', err))
  }

  const activeSteps = STEP_ORDER.filter(k => enabled.has(k))
  const markedCount = stepDays ? countMarkedWeekdays(stepDays, activeSteps) : 0
  const restDayIdx = stepDays ? markedWeekdayUnion(stepDays, activeSteps).map((v, i) => (v ? -1 : i)).filter(i => i !== -1) : []

  function restDaysLine() {
    if (!stepDays) return ''
    if (restDayIdx.length === 0) return L('restDaysNone')
    if (restDayIdx.length === 1) {
      const name = fullNames[restDayIdx[0]]
      return L('restDaySingle', { day: name.charAt(0).toUpperCase() + name.slice(1) })
    }
    const names = restDayIdx.map(i => fullNames[i]).join(', ')
    return L('restDaysMultiple', { days: names.charAt(0).toUpperCase() + names.slice(1) })
  }

  // Projeção — usa só os dias de LEITURA (a Bíblia contínua nunca conta
  // dias de estudo, mesmo com ele ligado), mesma regra de 35i/HANDOFF
  // "Regras de dados/backend".
  const proj = stepDays
    ? computeProjection({ completedSet, readingMinutesPerDay: minutes.reading, weeklyDays: stepDays.reading, lang })
    : null

  const orderLabel = bibleOrderMode === 'chronological' ? L('orderChronological') : bibleOrderMode === 'custom' ? L('orderCustom') : L('orderCanonical')
  const readingDaysCount = stepDays ? stepDays.reading.filter(Boolean).length : 0
  const readingDaysAbbr = stepDays ? abbr.filter((_, i) => stepDays.reading[i]).join(', ') : ''
  const readingSummary = readingPosition
    ? `${readingPosition.book} ${readingPosition.chapter} · ${orderLabel} · ${readingDaysAbbr}`
    : `${orderLabel} · ${readingDaysAbbr}`

  const studyDaysAbbr = stepDays ? abbr.filter((_, i) => stepDays.study[i]).join(', ') : ''
  const studySummary = activeStudyTitle
    ? `${activeStudyTitle} · ${L('dayXofY', { n: activeStudyProgress?.done ?? 1, total: activeStudyProgress?.total ?? 1 })} · ${studyDaysAbbr}`
    : L('noActiveStudySub')

  function reminderLabel() {
    if (!reminder) return L('dailyReminderOff')
    const time = `${String(reminder.hour ?? 7).padStart(2, '0')}:${String(reminder.minute ?? 0).padStart(2, '0')}`
    return L('dailyReminderScheduled', { time })
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={styles.headerTitle}>{L('adjustTitle')}</p>
      </div>

      <div style={styles.body}>
        {/* Passos do plano — os 4 passos vivem juntos num card só, cada um
            com interruptor + (quando ligado) método/stepper/atalho. */}
        <div style={styles.card}>
          <div style={styles.stepsHead}>
            <p style={styles.sectionLabel}>{L('adjustStepsLabel')}</p>
            <div style={styles.totalPill}>
              <span style={styles.totalPillNum}>{L('minutesCount', { min: totalMin })}</span>
              <span style={styles.totalPillUnit}>{L('perDay')}</span>
            </div>
          </div>
          <p style={styles.stepsHint}>{L('adjustStepsHint')}</p>

          {STEP_ORDER.map((key, i) => {
            const on = enabled.has(key)
            const title = key === 'reading' ? L('stepReadingTitle') : t(`home.routine${key[0].toUpperCase()}${key.slice(1)}`, undefined, lang)
            const sub = key === 'prayer' ? L('prayerSequenceSub')
              : key === 'reflection' ? L('reflectionSequenceSub')
              : key === 'reading' ? readingSummary
              : studySummary
            return (
              <div key={key}>
                <div style={styles.stepRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.stepTitle}>{title}</p>
                    <p style={styles.stepSub}>{sub}</p>
                  </div>
                  <button
                    role="switch" aria-checked={on}
                    onClick={() => toggleStep(key, !on)}
                    style={{ ...styles.switch, background: on ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: on ? 'flex-end' : 'flex-start' }}
                  >
                    <span style={styles.switchThumb} />
                  </button>
                </div>

                {on && key === 'prayer' && (
                  <div style={styles.methodRow}>
                    <button
                      style={{ ...styles.methodBtn, ...(prayerMethod === 'acts' ? styles.methodBtnOn : {}) }}
                      onClick={() => { setPrayerMethodState('acts'); setPrayerMethod('acts') }}
                    >
                      <span style={{ ...styles.methodTitle, color: prayerMethod === 'acts' ? '#fff' : 'var(--bento-ink)' }}>{L('methodActs')}</span>
                      <span style={{ ...styles.methodSub, color: prayerMethod === 'acts' ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{L('methodActsSub')}</span>
                    </button>
                    <button
                      style={{ ...styles.methodBtn, ...(prayerMethod === 'free' ? styles.methodBtnOn : {}) }}
                      onClick={() => { setPrayerMethodState('free'); setPrayerMethod('free') }}
                    >
                      <span style={{ ...styles.methodTitle, color: prayerMethod === 'free' ? '#fff' : 'var(--bento-ink)' }}>{L('methodFree')}</span>
                      <span style={{ ...styles.methodSub, color: prayerMethod === 'free' ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{L('methodFreeSubPrayer')}</span>
                    </button>
                  </div>
                )}
                {on && key === 'reflection' && (
                  <div style={styles.methodRow}>
                    <button
                      style={{ ...styles.methodBtn, ...(reflectionMethod === 'questions' ? styles.methodBtnOn : {}) }}
                      onClick={() => { setReflectionMethodState('questions'); setReflectionMethod('questions') }}
                    >
                      <span style={{ ...styles.methodTitle, color: reflectionMethod === 'questions' ? '#fff' : 'var(--bento-ink)' }}>{L('methodQuestions')}</span>
                      <span style={{ ...styles.methodSub, color: reflectionMethod === 'questions' ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{L('methodQuestionsSub')}</span>
                    </button>
                    <button
                      style={{ ...styles.methodBtn, ...(reflectionMethod === 'free' ? styles.methodBtnOn : {}) }}
                      onClick={() => { setReflectionMethodState('free'); setReflectionMethod('free') }}
                    >
                      <span style={{ ...styles.methodTitle, color: reflectionMethod === 'free' ? '#fff' : 'var(--bento-ink)' }}>{L('methodFree')}</span>
                      <span style={{ ...styles.methodSub, color: reflectionMethod === 'free' ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{L('methodFreeSubReflection')}</span>
                    </button>
                  </div>
                )}

                {on && (
                  <div style={styles.minutesRow}>
                    {key === 'prayer' && prayerMethod === 'acts' ? (
                      <p style={styles.perEtapa}>{L('methodPerEtapa', { n: fmt1(minutes.prayer / 4, lang) })}</p>
                    ) : key === 'reflection' ? (
                      <p style={styles.perEtapa}>{reflectionMethod === 'questions' ? L('reflectionQuestionsNote') : L('reflectionFreeNote')}</p>
                    ) : <span />}
                    <div style={styles.stepper}>
                      <button style={styles.stepBtn} onClick={() => bumpMinutes(key, -MIN_MINUTES)} disabled={minutes[key] <= MIN_MINUTES} aria-label="-">
                        <AppIcon name="Minus" size={12} strokeWidth={2.4} color="var(--bento-ink)" />
                      </button>
                      <div style={styles.stepValue}><span style={styles.stepValueNum}>{minutes[key]}</span><span style={styles.stepValueUnit}>{t('routine.min', undefined, lang)}</span></div>
                      <button style={styles.stepBtnDark} onClick={() => bumpMinutes(key, MIN_MINUTES)} disabled={minutes[key] >= MAX_MINUTES} aria-label="+">
                        <AppIcon name="Plus" size={12} strokeWidth={2.4} color="var(--bento-accent)" />
                      </button>
                    </div>
                  </div>
                )}

                {on && key === 'reading' && (
                  <button style={styles.organizeBtn} onClick={() => onNavigate?.('readingOrganize')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.organizeTitle}>{L('organizeReadingBtn')}</p>
                      <p style={styles.organizeSub}>{L('organizeReadingSub')}</p>
                    </div>
                    <span style={styles.organizeChevron}>›</span>
                  </button>
                )}
                {on && key === 'study' && (
                  <button style={styles.organizeBtn} onClick={() => onNavigate?.('studyOrganize')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.organizeTitle}>{L('organizeStudyBtn')}</p>
                      <p style={styles.organizeSub}>{L('organizeStudySub')}</p>
                    </div>
                    <span style={styles.organizeChevron}>›</span>
                  </button>
                )}

                {i < STEP_ORDER.length - 1 && <div style={styles.divider} />}
              </div>
            )
          })}
          {warning && <p style={styles.warningText}>{warning}</p>}
        </div>

        {/* Dias da semana — uma fileira por passo ATIVO, cada um com seus
            próprios dias (HANDOFF: "Oração e Reflexão aparecem aqui como
            qualquer outro passo"). */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          <div style={styles.stepsHead}>
            <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('weekDaysTitle')}</p>
            <p style={styles.weekDaysCount}>{L('weekDaysMarkedCount', { n: markedCount })}</p>
          </div>
          <p style={{ ...styles.stepsHint, color: 'var(--bento-sand-ink-mid)' }}>{L('weekDaysHint')}</p>

          {stepDays && activeSteps.map(key => (
            <div key={key} style={styles.dayBlock}>
              <p style={styles.dayBlockLabel}>
                {t(`home.routine${key[0].toUpperCase()}${key.slice(1)}`, undefined, lang)} · {L('stepDaysCount', { n: stepDays[key].filter(Boolean).length })}
              </p>
              <WeekdayChipRow days={stepDays[key]} onChange={days => saveStepDaysFor(key, days)} lang={lang} />
            </div>
          ))}

          <p style={styles.sandFooter}>{restDaysLine()} — {L('weekDaysFooterSuffix')}</p>
        </div>

        {/* Cronômetro (35f/35g usam essas 3 preferências no Bloco 3). */}
        {clockPrefs && (
          <div style={styles.card}>
            <p style={styles.sectionLabel}>{L('cronometerTitle')}</p>
            {[
              { key: 'showOnReading', title: 'showOnReadingTitle', sub: 'showOnReadingSub' },
              { key: 'warnAtZero', title: 'warnAtZeroTitle', sub: 'warnAtZeroSub' },
              { key: 'askToContinue', title: 'askContinueTitle', sub: 'askContinueSub' },
            ].map((row, i, arr) => (
              <div key={row.key}>
                <div style={styles.stepRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.stepTitle}>{L(row.title)}</p>
                    <p style={styles.stepSub}>{L(row.sub)}</p>
                  </div>
                  <button
                    role="switch" aria-checked={clockPrefs[row.key]}
                    onClick={() => {
                      const next = { ...clockPrefs, [row.key]: !clockPrefs[row.key] }
                      setClockPrefsState(next)
                      persistClockPrefs({ [row.key]: next[row.key] }).catch(err => console.error('Failed to persist clock prefs', err))
                    }}
                    style={{ ...styles.switch, background: clockPrefs[row.key] ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: clockPrefs[row.key] ? 'flex-end' : 'flex-start' }}
                  >
                    <span style={styles.switchThumb} />
                  </button>
                </div>
                {i < arr.length - 1 && <div style={styles.divider} />}
              </div>
            ))}
          </div>
        )}

        <button style={styles.reminderRow} onClick={() => onNavigate?.('profile')}>
          <span style={styles.reminderIcon}><AppIcon name="Bell" size={16} color="var(--bento-t3)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.reminderTitle}>{L('dailyReminderTitle')}</p>
            <p style={styles.reminderSub}>{reminderLabel()}</p>
          </div>
          <span style={styles.organizeChevron}>›</span>
        </button>

        {proj?.finishDateLabel && (
          <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
            <p style={styles.projText}>
              {L('adjustProjectionLead', { n: readingDaysCount })}{' '}
              {renderBold(L('adjustProjectionTail', { date: proj.finishDateLabel }), proj.finishDateLabel)}
            </p>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.saveBtn} onClick={onBack}>{L('savePlan')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px' },
  backBtn: {
    width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: {
    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    padding: '0 20px calc(20px + var(--safe-bottom))',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  stepsHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'var(--bento-t4)', margin: 0,
  },
  totalPill: { flexShrink: 0, height: 28, borderRadius: 10, background: 'var(--bento-ink)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4 },
  totalPillNum: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  totalPillUnit: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.55)' },
  stepsHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 16px' },

  stepRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' },
  stepTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  stepSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  switch: { width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },

  methodRow: { display: 'flex', gap: 8, marginBottom: 12 },
  methodBtn: { flex: 1, minWidth: 0, height: 56, borderRadius: 16, border: 'none', background: 'var(--bento-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  methodBtnOn: { background: 'var(--bento-ink)' },
  methodTitle: { fontSize: 13.5, fontWeight: 800, lineHeight: 1 },
  methodSub: { fontSize: 10.5, fontWeight: 500, lineHeight: 1 },

  minutesRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  perEtapa: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  stepper: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepBtnDark: { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  stepValue: { width: 54, textAlign: 'center', whiteSpace: 'nowrap' },
  stepValueNum: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)' },
  stepValueUnit: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 600, color: 'var(--bento-t4)', marginLeft: 2 },

  organizeBtn: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-line)', padding: '0 16px', cursor: 'pointer', textAlign: 'left', marginBottom: 12 },
  organizeTitle: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', margin: 0, lineHeight: 1.15 },
  organizeSub: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0', lineHeight: 1.2 },
  organizeChevron: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  divider: { height: 1, background: 'var(--bento-line)', margin: '2px 0 12px' },
  warningText: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-accent)', margin: '4px 0 0', lineHeight: 1.3 },

  weekDaysCount: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand-icon)', margin: 0, flexShrink: 0 },
  dayBlock: { marginBottom: 14 },
  dayBlockLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 8px' },
  sandFooter: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-sand-ink-mid)', margin: '4px 0 0' },

  reminderRow: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 24, background: 'var(--bento-card-soft)', padding: '16px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  reminderIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  reminderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  projText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink-mid)', margin: 0 },

  footer: { flexShrink: 0, padding: '16px 20px calc(22px + var(--safe-bottom))' },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer',
  },
}
