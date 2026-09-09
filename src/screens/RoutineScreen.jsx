// RoutineScreen.jsx — "Meu Plano" (turno 35, Bloco 2, handoff-meu-plano-35/,
// telas 35a/35b: MESMA rota, dois estados — dia normal e estudo de IA
// ativo). Substitui por inteiro a versão antiga (redesign 1c/4b): a rotina
// de hoje agora nasce do modelo de passos com dias/minutos próprios do
// Bloco 1 (step_days/stepMinutesStore, ver AdjustPlanScreen.jsx).
//
// Trilhas independentes (handoff-app-completo, achado conferindo Hoje
// contra Meu Plano — 34b/34c venceram sobre o modelo antigo de 35b):
// Bíblia e Estudo têm dias próprios (stepDays.reading/stepDays.study) e
// podem coincidir no mesmo dia — leitura primeiro, estudo depois (mesma
// ordem de STEP_ORDER). Não existe mais "Estudo ativo substitui a Leitura
// no dia dela" nem "leitura pausa até o estudo acabar" — ver
// activeStudyStore.js.
//
// Bug real corrigido (2026-09-09, achado dela: "toggle do estudo estava
// desligado, mas como ele tinha os dias ativos, ele continuou"): `study`
// chegou a entrar em `activeSteps` sempre que havia um `activeStudyId`,
// MESMO com o toggle genérico desligado — a intenção original era só
// cobrir quem nunca tinha mexido no toggle, mas o código não checava
// isso, então desligar o toggle depois de escolher um estudo ativo não
// pausava nada. Regra dela, agora aplicada sem exceção: toggle desligado
// = passo pausado, ponto. `activeStudyId` continua decidindo o CONTEÚDO
// do passo Estudo (qual estudo, qual dia dele) quando ligado — só não
// liga o passo sozinho mais.
import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getStepDays, stepsScheduledForWeekday, computeStepWeekGoal, computeWeekPillStates } from '../routine/stepDaysStore'
import { WEEKDAY_ABBR3, WEEKDAY_FULL } from '../routine/weeklyDaysMath'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { STEP_ORDER, orderStepsWithOff, statusFor, buildRowMeta } from '../routine/planTodayRows'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { computeProjection } from '../plan/readingProjection'
import { getUseLearnedPace } from '../reading/readingPaceStore'

function joinNames(names, lang) {
  if (names.length <= 1) return names[0] ?? ''
  const sep = lang === 'en' ? ' and ' : ' e '
  return `${names.slice(0, -1).join(', ')}${sep}${names[names.length - 1]}`
}

export default function RoutineScreen({ session, completedSet, stepMinutes, onContinueSession, onOpenActiveStudy, onNavigate, onStartGuided }) {
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
  const [reflectionMethod, setReflectionMethodState] = useState('questions')
  const [activeStudy, setActiveStudy] = useState(null) // { title, passage, dayDone, dayTotal, trailDone, trailTotal }
  const [useLearnedPace, setUseLearnedPaceState] = useState(false)
  const [myStudiesSummary, setMyStudiesSummary] = useState(null)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    setPrayerMethodState(getPrayerMethod())
    setReflectionMethodState(getReflectionMethod())
    getUseLearnedPace().then(setUseLearnedPaceState).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeStudyId) { setActiveStudy(null); return }
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
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
  const todaysSteps = stepDays ? stepsScheduledForWeekday(stepDays, activeSteps, todayIdx) : []

  function minutesForStep(key) {
    return minutes[key]
  }
  const totalMin = todaysSteps.reduce((s, k) => s + (minutesForStep(k) ?? 0), 0)
  const doneCount = todaysSteps.filter(k => todayRoutine[k]).length
  const currentKey = todaysSteps.find(k => !todayRoutine[k]) ?? null

  const stepTitle = k => t(`home.routine${k[0].toUpperCase()}${k.slice(1)}`, undefined, lang)
  const weekdayName = fullNames[todayIdx]

  // Atualização 35a/35b (atualizacao-35-meu-plano/) — lista com todos os
  // passos LIGADOS pelo toggle (`activeSteps`), não só os de hoje: os
  // ligados que não caem hoje vão pro fim, esmaecidos ("Dia off"). Um passo
  // com o toggle desligado nem entra — desaparece de vez, os outros sobem
  // (achado dela, 2026-09-09). Ordem/status/"de onde vem a meta" são
  // lógica pura, testada à parte em src/routine/planTodayRows.js — aqui só
  // se traduz pro texto final.
  const { orderedKeys, offSteps } = orderStepsWithOff(todaysSteps, activeSteps)
  const noPlanReading = hasNoPlan && !activeStudyId

  // Linha "meta" de cada passo na lista — lógica compartilhada com
  // HomeScreen.jsx (planTodayRows.js/buildRowMeta), pra "Meu Plano" e "Seu
  // plano de hoje" nunca mostrarem frases diferentes pro mesmo passo/estado.
  function metaFor(key, status) {
    return buildRowMeta(key, status, {
      activeStudyId, hasNoPlan, reflectionMethod, prayerMethod,
      todayRoutine, todaySession, activeStudy, todaysSteps, lang, stepTitle,
    }, L)
  }

  // Detalhe da linha do botão único do dia ("Agora: Leitura · Gênesis 41 ·
  // 15 min") — só Leitura e Estudo (com estudo ativo) têm uma referência
  // própria pra mostrar; Oração e Reflexão ficam só com o nome + minutos.
  function ctaDetailFor(key) {
    if (key === 'reading') return noPlanReading ? null : (todaySession?.title ?? null)
    if (key === 'study' && activeStudyId) return activeStudy?.passage || null
    return null
  }

  // Linha abaixo do botão único do dia — "Agora: Leitura · Gênesis 41 · 15
  // min" quando já fez algo hoje (continuando), ou "Começa pela Oração ·
  // ACTS, quatro etapas de 2,5 min" quando é o primeiro passo do dia
  // (36a/pacote 36-37) — só Oração tem "método" pra nomear; os outros
  // passos ficam só com o nome (+ referência, quando existe).
  function ctaSubtitle(key) {
    const detail = ctaDetailFor(key)
    const min = minutesForStep(key)
    if (doneCount > 0) {
      return `${L('nowPrefix')}: ${stepTitle(key)}${detail ? ` · ${detail}` : ''} · ${L('minShort', { n: min })}`
    }
    if (key === 'prayer') {
      const stageMin = (Math.round((min / 4) * 10) / 10).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })
      const methodDetail = prayerMethod === 'acts'
        ? L('startsWithPrayerActs', { method: L('methodActs'), min: stageMin })
        : L('startsWithPrayerFree', { method: L('methodFree'), min })
      return L('startsWithStep', { step: stepTitle(key), detail: methodDetail })
    }
    return detail ? L('startsWithStep', { step: stepTitle(key), detail }) : L('startsWithStepPlain', { step: stepTitle(key) })
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
    if (todaysSteps.length === 0) return L('restDayToday')
    const names = todaysSteps.map(k => stepTitle(k).toLowerCase())
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
          <button style={styles.createBtn} onClick={() => onNavigate?.('createAiStudy')}>
            <span style={styles.createDiamond} />
            {L('create')}
          </button>
        </div>

        {/* Bloco da rotina (atualização 35a/35b) — resumo do dia + lista
            única com TODOS os passos canônicos + um botão só pro dia. */}
        <div style={styles.routineBlock}>
          <div style={styles.routineHead}>
            <p style={styles.routineHeadLabel}>{L('planTodayLabel')}</p>
            <div style={styles.totalPill}>
              <span style={styles.totalPillNum}>{L('minutesCount', { min: totalMin })}</span>
              <span style={styles.totalPillUnit}>{L('noTotalSuffix')}</span>
            </div>
          </div>

          <div style={styles.stepsList}>
            {orderedKeys.map((k, i) => {
              const status = statusFor(k, { offSteps, todayRoutine, currentKey })
              const isStudyNow = status === 'now' && k === 'study' && activeStudyId
              // 35b: o nome da linha continua "Estudo" (nunca vira a
              // referência) — mesmo padrão de Leitura, que também não troca
              // "Leitura" pelo capítulo. A referência mora na meta
              // (buildRowMeta → "Ansiedade · dia 2 de 7") e no botão único
              // do dia (ctaDetailFor → "Agora: Estudo · Filipenses 4:4-9").
              const title = stepTitle(k)
              const meta = metaFor(k, status)
              const trail = isStudyNow && activeStudy?.dayTotal > 1 ? { done: activeStudy.dayDone, total: activeStudy.dayTotal } : null
              const rowStyle = {
                ...styles.stepRow,
                cursor: status === 'done' ? 'pointer' : 'default',
                ...(i < orderedKeys.length - 1 ? { borderBottom: '1px solid var(--bento-line)' } : null),
              }
              // Nenhum passo tem botão de ação próprio (README) — a única
              // exceção é reabrir um passo JÁ FEITO pra rever, como sempre
              // (não é "recomeçar a cadeia", só consulta).
              const RowTag = status === 'done' ? 'button' : 'div'
              return (
                <RowTag key={k} style={rowStyle} {...(status === 'done' ? { onClick: () => openDoneStep(k) } : null)}>
                  <span style={{
                    ...styles.stepIconBase,
                    ...(status === 'done' ? styles.stepIconDone : status === 'now' ? styles.stepIconNow : status === 'off' ? styles.stepIconOff : styles.stepIconPending),
                  }}>
                    {status === 'done' && <AppIcon name="Check" size={15} strokeWidth={2.6} color="var(--bento-sand)" />}
                    {status === 'now' && <AppIcon name="Play" size={13} color="var(--bento-ink)" fill="var(--bento-ink)" />}
                    {status === 'pending' && <span style={styles.stepDot} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.stepNameRow}>
                      <p style={{ ...styles.stepName, ...(status === 'off' ? styles.stepNameOff : null) }}>{title}</p>
                      {status === 'now' && <span style={styles.nowPill}>{L('nowPill')}</span>}
                    </div>
                    {meta && <p style={styles.stepMeta}>{meta}</p>}
                    {trail && (
                      <div style={styles.stepTrailRow}>
                        {Array.from({ length: trail.total }, (_, ti) => (
                          <span key={ti} style={{ ...styles.stepTrailSeg, background: ti < trail.done ? 'var(--bento-accent)' : 'var(--bento-line)' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={styles.stepMinCol}>
                    {status === 'off'
                      ? <span style={styles.stepMinOff}>—</span>
                      : <span style={styles.stepMinNum}>{minutesForStep(k)}<span style={styles.stepMinUnit}> {L('min')}</span></span>}
                  </div>
                </RowTag>
              )
            })}
          </div>

          {/* Um botão só pro dia — abre o passo da vez e emenda os
              seguintes na ordem (nenhum passo tem botão próprio). */}
          {currentKey && (
            <button style={styles.startCta} onClick={() => startStep(currentKey)}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={styles.startCtaTitle}>{doneCount > 0 ? L('continuePlanBtn') : L('startPlanBtn')}</p>
                <p style={styles.startCtaSub}>{ctaSubtitle(currentKey)}</p>
              </div>
              <span style={styles.startCtaArrow}><AppIcon name="ArrowRight" size={18} color="var(--bento-ink)" /></span>
            </button>
          )}

          <button style={styles.adjustBtn} onClick={() => onNavigate?.('adjustPlan')}>
            <AppIcon name="SlidersHorizontal" size={14} strokeWidth={2.2} color="var(--bento-ink)" />
            {L('adjustTitle')}
          </button>
        </div>

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
            <p style={styles.myPlanHint}>{todayStepsLine()}{todaysSteps.length > 0 ? ` ${restDaysLine()}` : ''}</p>

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
          <button style={styles.myStudiesCard} onClick={() => onNavigate?.('addStudy')}>
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

  // Lista única dos passos (substitui a faixa de tempos + os 3 cartões
  // soltos do modelo antigo — atualizacao-35-meu-plano/README.md).
  stepsList: { borderRadius: 24, background: 'var(--bento-card)', overflow: 'hidden' },
  stepRow: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', background: 'none', padding: '16px 18px', fontFamily: 'var(--font-bento)', textAlign: 'left', cursor: 'default' },
  stepIconBase: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  stepIconDone: { background: 'var(--bento-sand-icon)' },
  stepIconNow: { background: 'var(--bento-accent)' },
  stepIconPending: { background: 'var(--bento-line)' },
  stepIconOff: { border: '2px dashed var(--bento-divider)' },
  stepDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--bento-t5)' },
  stepNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 },
  stepName: { fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1.2, margin: 0 },
  stepNameOff: { color: 'var(--bento-t3)' },
  nowPill: { flexShrink: 0, height: 20, padding: '0 8px', borderRadius: 99, background: 'rgba(240,102,43,.18)', display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-now-text)' },
  stepMeta: { fontSize: 11, fontWeight: 500, color: 'var(--bento-t2)', lineHeight: 1.3, margin: 0 },
  stepTrailRow: { display: 'flex', gap: 3, marginTop: 7 },
  stepTrailSeg: { flex: 1, height: 4, borderRadius: 99 },
  stepMinCol: { flexShrink: 0, textAlign: 'right' },
  stepMinNum: { fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  stepMinUnit: { fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)' },
  stepMinOff: { fontSize: 15, fontWeight: 800, color: 'var(--bento-t5)' },

  // Botão único do dia — abre o passo da vez, emenda os seguintes.
  startCta: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', background: 'var(--bento-ink)', borderRadius: 24, padding: '18px 18px 18px 20px', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  startCtaTitle: { fontSize: 18, fontWeight: 800, letterSpacing: '-.4px', color: '#fff', lineHeight: 1.2, margin: '0 0 4px' },
  startCtaSub: { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', lineHeight: 1.3, margin: 0 },
  startCtaArrow: { width: 44, height: 44, flexShrink: 0, borderRadius: 15, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  adjustBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 42, borderRadius: 15,
    border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer',
  },

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
