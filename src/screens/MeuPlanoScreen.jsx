// MeuPlanoScreen.jsx — a aba Meu Plano (handoff-meu-plano-47, P1–P5):
// UMA rota, UM componente, cinco estados que saem dos dados (passos de
// hoje, o que foi feito, estudo ativo) — nunca de uma flag. Substitui
// RoutineScreen.jsx (35a/35b).
//
// A tela mostra uma coisa para fazer: o passo de agora, num cartão preto,
// com o único botão laranja da tela — que abre o passo e emenda os
// seguintes (onStartGuided → startGuidedRoutine em App.jsx, comportamento
// que já existia e não muda). O que foi feito vira uma linha; o que vem
// depois fica pequeno. Nenhuma linha de passo é tocável. Só os passos de
// hoje são renderizados (passo desligado ou fora do dia não existe aqui).
//
// Todo cálculo está em src/meuPlano/meuPlanoMath.js (puro, testado).
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { formatToday } from './HomeScreen'
import { getStepDays, computeStepWeekGoal } from '../routine/stepDaysStore'
import { getPrayerMethod } from '../prayer/prayerMethodStore'
import { getReflectionMethod } from '../reflection/reflectionMethodStore'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { totalsForDay } from '../metrics/sessionDurationMath'
import { computeProjection } from '../plan/readingProjection'
import { loadActiveStudy, loadStudiesSummary } from '../meuPlano/activeStudy'
import { dateKey } from '../utils/dateKey'
import { dayMonthLong } from '../gamification/format'
import BarraDoDia from '../components/passos/BarraDoDia'
import {
  computeMeuPlano, resolveMinutes, stepsCountText, barRightText, buttonLabel, nowCardLabel, nowCardMinutes, nowCardAria,
  doneLine, stepDescription, tomorrowCard, seuPlanoLine, studiesLine, stepName, minLabel, isStudyOnlyDay, doneTitle, weekCountSentence, STEP_ORDER, studyReturnDate,
} from '../meuPlano/meuPlanoMath'

const FONT = 'var(--font-bento)'

export default function MeuPlanoScreen({ session, completedSet, stepMinutes, onStartGuided, onNavigate, onOpenSeuPlano, onEndStudy }) {
  const { lang, plan, routineModules, activeStudyId, dailyRoutine, currentBlock, hasNoPlan, lastReadPosition } = session
  const [stepDays, setStepDays] = useState(null)
  const [methods, setMethods] = useState({ prayer: 'acts', reflection: 'questions' })
  const [activeStudy, setActiveStudy] = useState(null)
  const [studies, setStudies] = useState(null)
  const [readingSecondsToday, setReadingSecondsToday] = useState(0)
  const [tick, setTick] = useState(0) // virada de dia / volta ao primeiro plano

  useEffect(() => {
    let alive = true
    getStepDays().then(d => { if (alive) setStepDays(d) }).catch(err => console.error('[meu plano] dias', err))
    setMethods({ prayer: getPrayerMethod(), reflection: getReflectionMethod() })
    getAllSessions().then(rows => { if (alive) setReadingSecondsToday(totalsForDay(rows, dateKey()).reading) }).catch(() => {})
    loadStudiesSummary(activeStudyId).then(s => { if (alive) setStudies(s) }).catch(() => {})
    return () => { alive = false }
  }, [activeStudyId, tick])

  useEffect(() => {
    let alive = true
    loadActiveStudy(activeStudyId, lang).then(s => { if (alive) setActiveStudy(s) }).catch(() => {})
    return () => { alive = false }
  }, [activeStudyId, lang])

  // Virou o dia com o app aberto: recalcula ao voltar pro primeiro plano.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setTick(k => k + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const today = new Date()
  const todayIdx = (today.getDay() + 6) % 7
  const minutes = useMemo(() => resolveMinutes(stepMinutes, plan), [stepMinutes, plan])
  const dayEntry = dailyRoutine?.[dateKey(today)]
  const state = useMemo(
    () => computeMeuPlano({ routineModules, stepDays, minutes, dayEntry, todayIdx, extraElapsed: { reading: readingSecondsToday } }),
    [routineModules, stepDays, minutes, dayEntry, todayIdx, readingSecondsToday],
  )
  const loading = stepDays === null

  const readingPassage = !hasNoPlan && currentBlock?.book && currentBlock?.chapter ? `${currentBlock.book} ${currentBlock.chapter}` : ''
  const ctx = {
    prayerMethod: methods.prayer, reflectionMethod: methods.reflection, readingPassage,
    study: activeStudy, studyToday: isStudyOnlyDay(state),
  }
  const tomorrow = tomorrowCard({ routineModules, stepDays, minutes, todayIdx })
  const proj = stepDays ? computeProjection({ completedSet, readingMinutesPerDay: minutes.reading, weeklyDays: stepDays.reading, lang }) : null
  const readingDays = stepDays ? stepDays.reading.filter(Boolean).length : 0
  const planName = t('routine.bibleWholeLabel', undefined, lang)
  // P3: "{Dia} já conta para a sua semana: {feitos} de {meta} dias" — a
  // mesma conta de meta semanal que o app já usa (dias com algo marcado).
  const weekGoal = stepDays ? computeStepWeekGoal(dailyRoutine, stepDays, STEP_ORDER.filter(k => (routineModules ?? []).includes(k)), today) : null

  // P5 — cartão de pausa da leitura: só em dia de estudo (estudo no
  // caminho e leitura fora dele), com estudo ativo e plano de leitura.
  const studyOnly = isStudyOnlyDay(state)
  const pause = studyOnly && activeStudy && !hasNoPlan && currentBlock?.book
    ? {
        title: `${currentBlock.book} pausado em ${currentBlock.chapter}`,
        returnDate: stepDays ? studyReturnDate(today, stepDays.study, activeStudy.dayTotal - activeStudy.dayDone, !!dayEntry?.study) : null,
      }
    : null
  function resumeReading() {
    if (!window.confirm(`Retomar ${currentBlock.book} agora? O estudo fica salvo na Biblioteca.`)) return
    onEndStudy?.()
  }

  // Trecho da linha de passo feito: a leitura mostra o capítulo LIDO
  // (lastReadPosition), não o próximo (que é o do cartão "Seu plano").
  function passageFor(key) {
    if (key === 'reading') return lastReadPosition?.book && lastReadPosition?.chapter ? `${lastReadPosition.book} ${lastReadPosition.chapter}` : readingPassage
    if (key === 'study') return activeStudy?.reference ?? ''
    return ''
  }

  return (
    <div style={s.screen}>
      <div style={s.scroll}>
        <div style={s.header}>
          <div>
            <p style={s.title}>Meu plano</p>
            <p style={s.date}>{formatToday(lang)}</p>
          </div>
          <button type="button" style={s.adjustBtn} onClick={() => onNavigate?.('adjustPlan')}>
            <AppIcon name="SlidersHorizontal" size={15} strokeWidth={2.2} color="var(--bento-ink)" />
            Ajustar
          </button>
        </div>

        <div style={s.body}>
          {loading ? (
            <>
              <div className="rb-context-skeleton" style={{ ...s.skeleton, height: 6 }} />
              <div className="rb-context-skeleton" style={{ ...s.skeleton, height: 16, width: '40%' }} />
              <div className="rb-context-skeleton" style={{ ...s.skeleton, height: 236, borderRadius: 26 }} />
              <div className="rb-context-skeleton" style={{ ...s.skeleton, height: 16, width: '60%' }} />
            </>
          ) : (
            <>
              {state.kind !== 'rest' && (
                <div>
                  <BarraDoDia segments={state.steps} height={6} role="progressbar" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.doneCount} aria-label={stepsCountText(state.doneCount, state.total)} />
                  <div style={s.barText}>
                    <span style={s.barLeft}>{stepsCountText(state.doneCount, state.total)}</span>
                    <span style={s.barRight}>{barRightText(state)}</span>
                  </div>
                </div>
              )}

              {state.kind !== 'rest' && (
                <div style={s.path}>
                  {state.steps.map((st, i) => {
                    const last = i === state.steps.length - 1
                    return (
                      <div key={st.key} style={s.row}>
                        <div style={s.rail}>
                          {st.status === 'done' && <span style={{ ...s.node, background: 'var(--bento-sand-icon)' }}><AppIcon name="Check" size={13} strokeWidth={2.6} color="#fff" /></span>}
                          {st.status === 'now' && <span style={{ ...s.node, background: 'var(--bento-accent)' }}><span style={s.nowDot} /></span>}
                          {st.status === 'upcoming' && <span style={{ ...s.node, background: '#fff', boxShadow: 'inset 0 0 0 1.5px var(--bento-t6)' }} />}
                          {!last && <span style={s.wire} />}
                        </div>
                        <div style={{ ...s.content, paddingBottom: last ? 0 : 14 }}>
                          {st.status === 'done' && (
                            <div style={s.lineRow}>
                              <span style={s.doneName}>{stepName(st.key)}</span>
                              <span style={s.doneMeta}>{doneLine(st, passageFor(st.key))}</span>
                              <span style={s.doneMin}>{minLabel(st.minutes)}</span>
                            </div>
                          )}
                          {st.status === 'upcoming' && (
                            <div style={s.lineRow}>
                              <span style={s.upName}>{stepName(st.key)}</span>
                              <span style={s.upMeta}>{stepDescription(st.key, 'upcoming', ctx)}</span>
                              <span style={s.upMin}>{minLabel(st.minutes)}</span>
                            </div>
                          )}
                          {st.status === 'now' && (
                            <div style={s.card} role="group" aria-label={nowCardAria(state)}>
                              <div style={s.cardTop}>
                                <span style={s.cardLabel}>{nowCardLabel(state)}</span>
                                <span style={s.cardMin}>{minLabel(nowCardMinutes(st))}</span>
                              </div>
                              <p style={s.cardName}>{stepName(st.key)}</p>
                              <p style={{ ...s.cardDesc, marginBottom: st.key === 'study' && activeStudy ? 12 : 16 }}>{stepDescription(st.key, 'now', ctx)}</p>
                              {st.key === 'study' && activeStudy && activeStudy.dayTotal > 0 && (
                                <div style={s.trail} aria-hidden="true">
                                  {Array.from({ length: activeStudy.dayTotal }, (_, d) => (
                                    <span key={d} style={{ ...s.trailDash, background: d < activeStudy.dayDone ? 'var(--bento-accent)' : d === activeStudy.dayDone ? 'rgba(240,102,43,.4)' : 'rgba(255,255,255,.14)' }} />
                                  ))}
                                </div>
                              )}
                              <button type="button" style={s.cta} onClick={() => onStartGuided?.()}>
                                <span>{buttonLabel(state)}</span>
                                <AppIcon name="ArrowRight" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
                              </button>
                              <button type="button" style={s.listen} onClick={() => onNavigate?.('handsFree')}>
                                <AppIcon name="AudioLines" size={14} strokeWidth={2} color="rgba(255,255,255,.7)" />
                                <span>Prefiro só ouvir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {state.kind === 'done' && (
                <div style={{ ...s.bigCard, marginTop: 6 }}>
                  <p style={{ ...s.bigLabel, color: 'var(--bento-sand-icon)' }}>PLANO DE HOJE COMPLETO</p>
                  <p style={s.doneTitle}>{doneTitle(state.total)}</p>
                  {weekGoal && <p style={s.bigText}>{weekCountSentence(todayIdx, weekGoal.doneCount, weekGoal.markedCount)}</p>}
                  <button type="button" style={s.secondary} onClick={() => onNavigate?.('journey')}>Ler mais, por conta própria</button>
                </div>
              )}

              {state.kind === 'rest' && (
                <div style={{ ...s.bigCard, padding: '20px 18px 16px' }}>
                  <p style={s.bigLabel}>HOJE É DESCANSO</p>
                  <p style={s.restTitle}>Nada marcado para hoje.</p>
                  <p style={{ ...s.bigText, marginBottom: 16 }}>Descanso faz parte do plano. A sua semana não perde nada por isso.</p>
                  <button type="button" style={s.secondary} onClick={() => onNavigate?.(hasNoPlan ? 'adjustPlan' : 'journey')}>Quero ler hoje mesmo assim</button>
                </div>
              )}

              {pause && (
                <div style={{ ...s.pauseCard, marginTop: state.kind === 'during' || state.kind === 'before' ? 6 : 0 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.pauseTitle}>{pause.title}</span>
                    {pause.returnDate && <span style={s.pauseSub}>Volta em {dayMonthLong(pause.returnDate.toISOString())}, quando o estudo terminar</span>}
                  </span>
                  <button type="button" style={s.resumeBtn} onClick={resumeReading}>Retomar já</button>
                </div>
              )}

              {tomorrow && (
                <div style={{ ...s.tomorrow, marginTop: !pause && (state.kind === 'during' || state.kind === 'before') ? 6 : 0 }}>
                  <p style={s.tomorrowLabel}>{tomorrow.label}</p>
                  <p style={s.tomorrowText}>{tomorrow.text}</p>
                </div>
              )}

              {!studyOnly && (
                <button type="button" style={s.planRow} onClick={() => onOpenSeuPlano?.()}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.planLabel}>SEU PLANO</span>
                    <span style={s.planTitle}>{planName}{readingPassage ? ` · ${readingPassage} de ${currentBlock.bookChapters}` : ''}</span>
                    <span style={s.planLine}>{seuPlanoLine(readingDays, proj?.finishDateLabel ?? null)}</span>
                  </span>
                  <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
                </button>
              )}

              <div style={s.studiesCard}>
                <button type="button" style={{ ...s.studiesRow, height: 56, borderBottom: '1px solid var(--bento-line)' }} onClick={() => onNavigate?.('addStudy')}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.studiesTitle}>Meus estudos</span>
                    {studies && <span style={s.studiesSub}>{studiesLine(studies.saved, studies.completed)}</span>}
                  </span>
                  <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
                </button>
                <button type="button" style={{ ...s.studiesRow, height: 52 }} onClick={() => onNavigate?.('createAiStudy')}>
                  <span style={s.diamond} aria-hidden="true" />
                  <span style={{ ...s.studiesTitle, flex: 1 }}>Criar um estudo</span>
                  <AppIcon name="ChevronRight" size={14} strokeWidth={2} color="var(--bento-t5)" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  scroll: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(var(--nav-height) + 16px)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 20px 0' },
  title: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  date: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  adjustBtn: { height: 34, flexShrink: 0, padding: '0 12px', borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  body: { padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 },
  skeleton: { borderRadius: 99, background: 'var(--bento-line)' },
  barText: { display: 'flex', justifyContent: 'space-between', marginTop: 9 },
  barLeft: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)' },
  barRight: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)' },
  path: { paddingTop: 6 },
  row: { display: 'flex', gap: 14 },
  rail: { width: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  node: { width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nowDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--bento-ink)' },
  wire: { width: 2, flex: 1, background: 'var(--bento-t6)', margin: '4px 0' },
  content: { flex: 1, minWidth: 0 },
  lineRow: { display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 5 },
  doneName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-t2)' },
  doneMeta: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)' },
  doneMin: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t4)', flexShrink: 0 },
  upName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' },
  upMeta: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)' },
  upMin: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)', flexShrink: 0 },
  card: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 16px' },
  cardTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  cardMin: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.55)' },
  cardName: { fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px', color: '#fff', margin: '0 0 6px' },
  cardDesc: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.6)', margin: 0 },
  trail: { display: 'flex', gap: 4, marginBottom: 16 },
  trailDash: { flex: 1, height: 5, borderRadius: 99 },
  cta: { width: '100%', height: 52, borderRadius: 17, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  listen: { width: '100%', height: 40, margin: '6px 0 -6px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', cursor: 'pointer' },
  bigCard: { borderRadius: 26, background: 'var(--bento-card)', padding: '18px 18px 16px' },
  bigLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  doneTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  restTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  bigText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: '0 0 14px' },
  secondary: { width: '100%', height: 46, borderRadius: 15, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  pauseCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  pauseTitle: { display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' },
  pauseSub: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)', marginTop: 3 },
  resumeBtn: { flexShrink: 0, minHeight: 44, border: 'none', background: 'none', padding: '0 4px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-accent)', cursor: 'pointer' },
  tomorrow: { borderRadius: 24, background: 'var(--bento-sand)', padding: '15px 18px' },
  tomorrowLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 7px' },
  tomorrowText: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1.25, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  planRow: { width: '100%', borderRadius: 24, background: 'var(--bento-card)', border: 'none', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  planLabel: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', marginBottom: 8 },
  planTitle: { display: 'block', fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.3px', color: 'var(--bento-ink)', marginBottom: 4 },
  planLine: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)' },
  studiesCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px' },
  studiesRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  studiesTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' },
  studiesSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', marginTop: 2 },
  diamond: { width: 7, height: 7, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 1.5, flexShrink: 0, marginRight: 4 },
}
