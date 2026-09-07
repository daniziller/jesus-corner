// RoutineScreen.jsx — "Meu Plano" (turno 35, Bloco 2, handoff-meu-plano-35/,
// telas 35a/35b: MESMA rota, dois estados — dia normal e estudo de IA
// ativo). Substitui por inteiro a versão antiga (redesign 1c/4b): a rotina
// de hoje agora nasce do modelo de passos com dias/minutos próprios do
// Bloco 1 (step_days/stepMinutesStore, ver AdjustPlanScreen.jsx).
//
// Regra de substituição (35b) — decidida comparando os dois quadros lado a
// lado (mesmo dia de exemplo, terça, dia de leitura em 35a): quando há um
// Estudo ATIVO (session.activeStudyId), ele troca de lugar com a Leitura
// EM QUALQUER DIA que ela apareceria — não é o dia próprio do Estudo
// (stepDays.study) que manda aqui. stepDays.study só governa o modelo
// "independente" (Estudo como passo comum, coexistindo com Leitura em dias
// separados, sem um estudo específico "ativo") — ver HANDOFF-35-meu-
// plano.md, "Dias por trilha — regra geral" vs. a seção de 35b.
import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getStepDays, stepsScheduledForWeekday, computeStepWeekGoal, computeWeekPillStates } from '../routine/stepDaysStore'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getActiveStudy } from '../studies/activeStudyStore'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { computeProjection } from '../plan/readingProjection'
import { getUseLearnedPace } from '../reading/readingPaceStore'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'

const STEP_ORDER = ['prayer', 'reading', 'study', 'reflection']

function joinNames(names, lang) {
  if (names.length <= 1) return names[0] ?? ''
  const sep = lang === 'en' ? ' and ' : ' e '
  return `${names.slice(0, -1).join(', ')}${sep}${names[names.length - 1]}`
}

export default function RoutineScreen({ session, completedSet, stepMinutes, onContinueSession, onOpenActiveStudy, onNavigate, onStartGuided, onResumeFixedPlan }) {
  const { lang, plan, routineModules, activeStudyId, dailyRoutine, todayRoutine, todaySession, currentBlock, biblePercent, chaptersRead, totalChapters, hasNoPlan } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)
  const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
  const fullNames = WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt
  const today = new Date()
  const todayIdx = (today.getDay() + 6) % 7

  const enabled = useMemo(() => new Set(routineModules ?? []), [routineModules])
  const minutes = {
    prayer: stepMinutes?.prayer ?? plan.prayerMinutes ?? 10,
    reading: stepMinutes?.reading ?? plan.readingMinutes ?? 15,
    study: stepMinutes?.study ?? 15,
    reflection: stepMinutes?.reflection ?? plan.reflectionMinutes ?? 5,
  }

  const [stepDays, setStepDaysState] = useState(null)
  const [prayerMethod, setPrayerMethodState] = useState('acts')
  const [pausedStudy, setPausedStudy] = useState(null)
  const [activeStudy, setActiveStudy] = useState(null) // { title, passage, dayDone, dayTotal, trailDone, trailTotal }
  const [useLearnedPace, setUseLearnedPaceState] = useState(false)
  const [myStudiesSummary, setMyStudiesSummary] = useState(null)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    setPrayerMethodState(getPrayerMethod())
    getUseLearnedPace().then(setUseLearnedPaceState).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeStudyId) { setActiveStudy(null); setPausedStudy(null); return }
    Promise.all([getActiveStudy(), getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([active, ai, inductive, doneSet]) => {
      setPausedStudy(active)
      const study = [...STUDIES, ...ai, ...inductive].find(s => s.id === activeStudyId)
      if (!study) return
      const total = study.sessions?.length ?? 0
      const done = (study.sessions ?? []).filter(s => isStudySessionDone(doneSet, study.id, s.id)).length
      const current = (study.sessions ?? [])[Math.min(done, total - 1)]
      setActiveStudy({
        title: study.title ?? study.titleEn ?? '',
        passage: current ? (lang === 'en' ? (current.passageEn ?? current.passage) : current.passage) : '',
        dayDone: done, dayTotal: total,
      })
    }).catch(() => {})
  }, [activeStudyId, lang])

  useEffect(() => {
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
      const all = [...STUDIES, ...ai, ...inductive]
      let completedCount = 0
      for (const s of all) {
        const total = s.sessions?.length ?? 0
        const done = (s.sessions ?? []).filter(sess => isStudySessionDone(doneSet, s.id, sess.id)).length
        if (total > 0 && done === total) completedCount++
      }
      const savedCount = Math.max(0, all.length - completedCount - (activeStudyId ? 1 : 0))
      setMyStudiesSummary({ saved: savedCount, completed: completedCount })
    }).catch(() => {})
  }, [activeStudyId])

  const activeSteps = STEP_ORDER.filter(k => enabled.has(k))
  const scheduledToday = stepDays ? stepsScheduledForWeekday(stepDays, activeSteps, todayIdx) : []
  // Regra de substituição (ver comentário do topo do arquivo).
  const todaysSteps = activeStudyId
    ? [...new Set(scheduledToday.map(k => (k === 'reading' ? 'study' : k)))]
    : scheduledToday

  function minutesForStep(key) {
    if (key === 'study' && activeStudyId) return minutes.reading
    return minutes[key]
  }
  const totalMin = todaysSteps.reduce((s, k) => s + (minutesForStep(k) ?? 0), 0)
  const doneCount = todaysSteps.filter(k => todayRoutine[k]).length
  const currentKey = todaysSteps.find(k => !todayRoutine[k]) ?? null

  const stepTitle = k => t(`home.routine${k[0].toUpperCase()}${k.slice(1)}`, undefined, lang)
  const weekdayName = fullNames[todayIdx]

  function doneSubFor(key) {
    const at = todayRoutine[`${key}At`]
    const d = at ? new Date(at) : null
    const mins = minutesForStep(key)
    const methodPrefix = key === 'prayer' ? `${prayerMethod === 'acts' ? L('methodActs') : L('methodFree')} · ` : ''
    if (!d || Number.isNaN(d.getTime())) return `${methodPrefix}${L('doneSub', { n: mins })}`
    const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${methodPrefix}${L('doneSubAt', { n: mins, time })}`
  }

  function pendingSubFor(key) {
    const idx = todaysSteps.indexOf(key)
    const prev = todaysSteps[idx - 1]
    const after = prev ? L(`after${prev[0].toUpperCase()}${prev.slice(1)}`) : null
    return after ? L('pendingSub', { n: minutesForStep(key), after }) : L('minShort', { n: minutesForStep(key) })
  }

  // Passo ATUAL (ainda não feito) — encadeia a partir dele (ver
  // startGuidedRoutine em App.jsx), exceto Estudo, que não faz parte da
  // rotina guiada (mesma exceção de sempre: sem cronômetro/avanço automático).
  function startStep(k) {
    if (k === 'study') { onOpenActiveStudy?.(); return }
    if (onStartGuided) { onStartGuided(); return }
    if (k === 'reading') { onContinueSession?.(); return }
    onNavigate?.(k)
  }

  // Passo JÁ FEITO — abre pra rever, sem entrar no modo guiado (mesmo
  // comportamento de sempre: reabrir não é "recomeçar a cadeia").
  function openDoneStep(k) {
    if (k === 'study') { onOpenActiveStudy?.(); return }
    if (k === 'reading') { onContinueSession?.(); return }
    onNavigate?.(k)
  }

  // Cabeçalho — "{dia} · {n} de {total} passos feito(s)".
  const headerSubtitle = `${weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)} · ${L(doneCount === 1 ? 'dayStepsDoneOne' : 'dayStepsDoneMany', { n: doneCount, total: todaysSteps.length })}`

  // "Sua semana" (dentro do cartão "Seu plano") — grade de 7 dias por
  // passo ATIVO (não só os de hoje), mostrando o padrão da semana inteira.
  function restDaysLine() {
    if (!stepDays) return ''
    const union = Array.from({ length: 7 }, (_, i) => stepsScheduledForWeekday(stepDays, activeSteps, i).length > 0)
    const restIdx = union.map((v, i) => (v ? -1 : i)).filter(i => i !== -1)
    if (restIdx.length === 0) return L('noRestDayToday')
    if (restIdx.length === 1) {
      const name = fullNames[restIdx[0]]
      const capName = name.charAt(0).toUpperCase() + name.slice(1)
      return restIdx[0] === todayIdx ? L('restDayToday') : L('restDayIsRest', { day: capName })
    }
    const names = restIdx.map(i => fullNames[i])
    const joined = joinNames(names, lang)
    return L('restDaysAreRest', { days: joined.charAt(0).toUpperCase() + joined.slice(1) })
  }

  function todayStepsLine() {
    if (scheduledToday.length === 0) return L('restDayToday')
    const names = scheduledToday.map(k => stepTitle(k).toLowerCase())
    return L('todayIsLabel', { weekday: weekdayName, steps: joinNames(names, lang) })
  }

  const proj = stepDays
    ? computeProjection({ completedSet, readingMinutesPerDay: minutes.reading, weeklyDays: stepDays.reading, lang })
    : null

  // Esta semana (meta = dias cumpridos ÷ dias com algo marcado — mesmo
  // número da pílula de 35c e da grade acima).
  const weekGoal = stepDays ? computeStepWeekGoal(dailyRoutine, stepDays, activeSteps, today) : { doneCount: 0, markedCount: 0 }
  const pillStates = stepDays ? computeWeekPillStates(dailyRoutine, stepDays, activeSteps, today) : []

  return (
    <div style={styles.screen}>
      <div style={styles.body}>
        <div style={styles.header}>
          <div>
            <p style={styles.title}>{L('title')}</p>
            <p style={styles.subtitle}>{headerSubtitle}</p>
          </div>
          <button style={styles.createBtn} onClick={() => onNavigate?.('createStudy')}>
            <span style={styles.createDiamond} />
            {L('create')}
          </button>
        </div>

        {/* Bloco da rotina — resumo de tempos + os passos, um bloco só. */}
        <div style={styles.routineBlock}>
          <div style={styles.routineHead}>
            <p style={styles.routineHeadLabel}>{L('planTodayLabel')}</p>
            <div style={styles.totalPill}>
              <span style={styles.totalPillNum}>{L('minutesCount', { min: totalMin })}</span>
              <span style={styles.totalPillUnit}>{L('noTotalSuffix')}</span>
            </div>
          </div>

          {todaysSteps.length > 0 && (
            <div style={styles.timeStrip}>
              {todaysSteps.map((k, i) => (
                <div key={k} style={{ ...styles.timeCol, borderLeft: i > 0 ? '1px solid var(--bento-line)' : 'none' }}>
                  <p style={styles.timeColLabel}>{stepTitle(k)}</p>
                  <p style={styles.timeColMin}><span style={styles.timeColNum}>{minutesForStep(k)}</span> {t('routine.min', undefined, lang)}</p>
                </div>
              ))}
            </div>
          )}

          <button style={styles.adjustBtn} onClick={() => onNavigate?.('adjustPlan')}>
            <AppIcon name="SlidersHorizontal" size={14} strokeWidth={2.2} color="var(--bento-ink)" />
            {L('adjustTitle')}
          </button>

          {todaysSteps.length === 0 && (
            <p style={styles.restNote}>{L('restDayToday')}</p>
          )}

          {todaysSteps.map(k => {
            const done = !!todayRoutine[k]
            const isCurrent = k === currentKey
            const noPlanReading = hasNoPlan && k === 'reading' && !activeStudyId
            if (done) {
              return (
                <button key={k} style={styles.doneCard} onClick={() => openDoneStep(k)}>
                  <span style={styles.doneIcon}><AppIcon name="Check" size={15} color="var(--bento-sand)" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.doneTitle}>{stepTitle(k)}</p>
                    <p style={styles.doneSub}>{doneSubFor(k)}</p>
                  </div>
                </button>
              )
            }
            if (isCurrent) {
              const isStudyNow = k === 'study' && activeStudyId
              const title = isStudyNow ? (activeStudy?.passage || stepTitle(k)) : stepTitle(k)
              const subtitle = noPlanReading
                ? L('noPlanReadingSub')
                : k === 'reading' ? L('readingResumeSubtitle', { title: todaySession?.title ?? '' })
                : k === 'reflection' && activeStudyId ? L('studyQuestionNote')
                : null
              return (
                <div key={k} style={styles.currentCard}>
                  <div style={styles.currentHead}>
                    <div style={styles.currentHeadLeft}>
                      {isStudyNow && <span style={styles.studyDiamond} />}
                      <p style={styles.currentLabel}>{L('nowStepOf', { i: todaysSteps.indexOf(k) + 1, total: todaysSteps.length })}</p>
                    </div>
                    {!noPlanReading && <span style={styles.currentTime}>{L('minShort', { n: minutesForStep(k) })}</span>}
                  </div>
                  {isStudyNow && (
                    <p style={styles.studyDayLine}>{L('studyDayOf', { n: (activeStudy?.dayDone ?? 0) + 1, total: activeStudy?.dayTotal ?? 1 })}</p>
                  )}
                  <p style={styles.currentTitle}>{title}</p>
                  {isStudyNow ? (
                    <p style={styles.currentSubtitle}>{activeStudy?.title}</p>
                  ) : subtitle && <p style={styles.currentSubtitle}>{subtitle}</p>}
                  {isStudyNow && activeStudy?.dayTotal > 1 && (
                    <div style={styles.studyBarRow}>
                      {Array.from({ length: activeStudy.dayTotal }, (_, i) => (
                        <span key={i} style={{ ...styles.studyBarSeg, background: i < activeStudy.dayDone ? 'var(--bento-accent)' : 'rgba(255,255,255,.14)' }} />
                      ))}
                    </div>
                  )}
                  <button style={styles.currentBtn} onClick={() => startStep(k)}>
                    <span style={styles.currentBtnText}>{noPlanReading ? L('noPlanReadingBtn') : L(k === 'study' ? 'start_study' : `start_${k}`)}</span>
                    <span style={styles.currentBtnArrow}>→</span>
                  </button>
                </div>
              )
            }
            return (
              <div key={k} style={styles.pendingCard}>
                <span style={styles.pendingDot} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.pendingTitle}>{stepTitle(k)}</p>
                  <p style={styles.pendingSub}>{noPlanReading ? L('noPlanReadingSub') : pendingSubFor(k)}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Estudo pausando o plano principal (35b) — "Retomar já" acaba o
            estudo num toque só, sem diálogo de confirmação (o próprio toque
            já é a confirmação — HANDOFF: "sem diálogo de culpa"). */}
        {activeStudyId && pausedStudy?.pausedAtBook && (
          <button style={styles.pausedCard} onClick={onResumeFixedPlan}>
            <span style={styles.pausedIcon}><AppIcon name="Pause" size={14} color="var(--bento-t3)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.pausedTitle}>{L('pausedTitleChapter', { book: pausedStudy.pausedAtBook, chapter: pausedStudy.pausedAtChapter })}</p>
              <p style={styles.pausedSub}>{L('pausedResumeDate', { date: formatWeekdayDate(pausedStudy.resumesAt, lang) })}</p>
            </div>
            <span style={styles.pausedResumeLabel}>{L('pausedResume')}</span>
          </button>
        )}

        {!activeStudyId && (
          <button style={styles.handsFreeCard} onClick={() => onNavigate?.('handsFree')}>
            <span style={styles.handsFreeIcon}><AppIcon name="AudioLines" size={16} color="var(--bento-accent)" /></span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={styles.handsFreeTitle}>{L('handsFreeTitle')}</span>
              <span style={styles.handsFreeSub}>{L('handsFreeSub')}</span>
            </span>
            <span style={styles.handsFreeChevron}>›</span>
          </button>
        )}

        {!activeStudyId && !hasNoPlan && (
          <div style={styles.card}>
            <div style={styles.myPlanHead}>
              <p style={styles.sectionLabel}>{L('myPlanLabel')}</p>
              <p style={styles.myPlanRight}>{L('bibleWholeLabel')}</p>
            </div>
            <p style={styles.myPlanPosition}>{L('bookPositionLabel', { book: currentBlock.book, chapter: currentBlock.chapter, total: currentBlock.bookChapters })}</p>
            <p style={styles.myPlanBlock}>{L('blockChaptersLabel', { block: currentBlock.name, done: chaptersRead, total: totalChapters })}</p>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.min(100, biblePercent)}%` }} /></div>

            <div style={styles.myPlanDivider} />

            <div style={styles.myPlanHead}>
              <p style={styles.sectionLabel}>{L('weekGridLabel')}</p>
              <button style={styles.changeLink} onClick={() => onNavigate?.('adjustPlan')}>{L('changeDays')}</button>
            </div>
            <div style={styles.weekGrid}>
              <div style={styles.weekGridHeadRow}>
                <span style={styles.weekGridRowLabel} />
                {abbr.map((d, i) => <span key={i} style={{ ...styles.weekGridDayLabel, color: i === todayIdx ? 'var(--bento-accent)' : 'var(--bento-t4)' }}>{d.charAt(0)}</span>)}
              </div>
              {activeSteps.map(k => (
                <div key={k} style={styles.weekGridRow}>
                  <span style={styles.weekGridRowLabel}>{stepTitle(k)}</span>
                  {Array.from({ length: 7 }, (_, i) => {
                    const on = stepDays?.[k]?.[i]
                    const isToday = i === todayIdx
                    return (
                      <span key={i} style={{
                        ...styles.weekGridDot,
                        background: !on ? 'var(--bento-t6)' : isToday ? 'var(--bento-accent)' : 'var(--bento-ink)',
                      }} />
                    )
                  })}
                </div>
              ))}
            </div>
            <p style={styles.myPlanHint}>{todayStepsLine()}{scheduledToday.length > 0 ? ` ${restDaysLine()}` : ''}</p>

            <div style={styles.myPlanDivider} />

            {proj?.finishDateLabel ? (
              <>
                <p style={styles.finishTitle}>{L('finishesOn', { date: proj.finishDateLabel })}</p>
                <p style={styles.finishSub}>
                  {useLearnedPace && proj.chaptersPerDay
                    ? L(proj.chaptersPerDay === 1 ? 'paceLearnedNoteOne' : 'paceLearnedNoteMany', { chapters: proj.chaptersPerDay })
                    : L('paceFixedNote')}
                </p>
              </>
            ) : (
              <p style={styles.finishSub}>{L('noReadingDaysNote')}</p>
            )}
          </div>
        )}

        <div style={styles.weekCard}>
          <div style={styles.weekHead}>
            <p style={styles.weekLabel}>{L('weekSectionLabel')}</p>
            <p style={styles.weekCount}>
              <span style={styles.weekCountStrong}>{L(weekGoal.doneCount === 1 ? 'weekCompletedOfOne' : 'weekCompletedOfMany', { n: weekGoal.doneCount })}</span>{' '}
              {L('weekCompletedOfSuffix', { total: weekGoal.markedCount })}
            </p>
          </div>
          <div style={styles.weekBarRow}>
            {pillStates.map((state, i) => (
              <span key={i} style={{
                ...styles.weekBarSeg,
                ...(state === 'done' ? styles.weekBarDone : state === 'today' ? styles.weekBarToday : state === 'rest' ? styles.weekBarRest : styles.weekBarOther),
              }} />
            ))}
          </div>
        </div>

        {!activeStudyId && (
          <button style={styles.myStudiesCard} onClick={() => onNavigate?.('studies')}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={styles.myStudiesTitle}>{L('myStudiesCard')}</p>
              <p style={styles.myStudiesSub}>
                {myStudiesSummary && (myStudiesSummary.saved > 0 || myStudiesSummary.completed > 0)
                  ? `${L(myStudiesSummary.saved === 1 ? 'savedCountOne' : 'savedCountMany', { n: myStudiesSummary.saved })} · ${L(myStudiesSummary.completed === 1 ? 'completedCountOne' : 'completedCountMany', { n: myStudiesSummary.completed })}`
                  : L('noStudiesYet')}
              </p>
            </div>
            <span style={styles.handsFreeChevron}>›</span>
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '22px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 },

  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  createBtn: {
    height: 34, flexShrink: 0, padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, lineHeight: 1, color: '#fff', cursor: 'pointer',
  },
  createDiamond: { width: 7, height: 7, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5, flexShrink: 0 },

  routineBlock: { borderRadius: 30, background: 'rgba(0,0,0,.045)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  routineHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 0' },
  routineHeadLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  totalPill: { height: 28, borderRadius: 10, background: 'var(--bento-ink)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  totalPillNum: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  totalPillUnit: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.55)' },

  timeStrip: { borderRadius: 20, background: 'var(--bento-card)', padding: '16px 0', display: 'flex' },
  timeCol: { flex: 1, minWidth: 0, textAlign: 'center', padding: '0 4px' },
  timeColLabel: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  timeColMin: { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)', margin: 0 },
  timeColNum: { fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--bento-ink)' },

  adjustBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 42, borderRadius: 15,
    border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  restNote: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', margin: '4px 0' },

  doneCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-sand)', border: 'none', borderRadius: 24, padding: '18px 20px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  doneIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 15.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', lineHeight: 1.2, margin: '0 0 3px' },
  doneSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-label)', lineHeight: 1.2, margin: 0 },

  currentCard: { background: 'var(--bento-ink)', borderRadius: 28, padding: 24, color: 'white' },
  currentHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' },
  currentHeadLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  currentLabel: { fontSize: 11, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  currentTime: { fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.5)' },
  currentTitle: { fontSize: 27, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 6px' },
  currentSubtitle: { fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.55)', margin: '0 0 20px' },
  currentBtn: { height: 52, width: '100%', borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  currentBtnText: { fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  currentBtnArrow: { fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1 },
  studyDiamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  studyDayLine: { fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 8px' },
  studyBarRow: { display: 'flex', gap: 4, margin: '0 0 18px' },
  studyBarSeg: { flex: 1, height: 5, borderRadius: 99 },

  pausedCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', background: 'var(--bento-card)', borderRadius: 24, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-bento)' },
  pausedIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pausedTitle: { fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1.2, margin: '0 0 3px' },
  pausedSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.2, margin: 0 },
  pausedResumeLabel: { flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)' },

  pendingCard: { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.6)', borderRadius: 24, padding: '18px 20px' },
  pendingDot: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--bento-pending-border)', boxSizing: 'border-box' },
  pendingTitle: { fontSize: 15.5, fontWeight: 800, color: 'var(--bento-t3)', lineHeight: 1.2, margin: '0 0 3px' },
  pendingSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-t4-soft)', lineHeight: 1.2, margin: 0 },

  handsFreeCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-card)', borderRadius: 24, padding: '18px 20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  handsFreeIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  handsFreeTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  handsFreeSub: { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  handsFreeChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flexShrink: 0 },

  card: { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  myPlanHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  myPlanRight: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', margin: 0 },
  myPlanPosition: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  myPlanBlock: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 12px' },
  progressTrack: { height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  myPlanDivider: { height: 1, background: 'var(--bento-line)', margin: '18px 0 14px' },
  changeLink: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-accent)' },

  weekGrid: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 },
  weekGridHeadRow: { display: 'flex', alignItems: 'center', gap: 4 },
  weekGridRow: { display: 'flex', alignItems: 'center', gap: 4 },
  weekGridRowLabel: { width: 56, flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)' },
  weekGridDayLabel: { flex: 1, textAlign: 'center', fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 700 },
  weekGridDot: { flex: 1, height: 10, margin: '0 auto', borderRadius: '50%', maxWidth: 10, display: 'block' },
  myPlanHint: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },
  finishTitle: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 3px' },
  finishSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  weekCard: { background: 'var(--bento-card)', borderRadius: 24, padding: '18px 20px' },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 14px' },
  weekLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  weekCount: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', margin: 0 },
  weekCountStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
  weekBarRow: { display: 'flex', gap: 6 },
  weekBarSeg: { flex: 1, height: 12, borderRadius: 99, boxSizing: 'border-box' },
  weekBarDone: { background: 'var(--bento-accent)' },
  weekBarToday: { border: '2px dashed var(--bento-accent)' },
  weekBarOther: { background: 'var(--bento-line)' },
  weekBarRest: { background: 'rgba(0,0,0,.04)' },

  myStudiesCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-card)', borderRadius: 24, padding: '18px 20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  myStudiesTitle: { fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1.2, margin: '0 0 3px' },
  myStudiesSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.2, margin: 0 },
}
