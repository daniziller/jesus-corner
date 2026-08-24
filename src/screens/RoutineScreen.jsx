// RoutineScreen.jsx
// Aba "Meu Plano" — antes duas abas separadas (Rotina + Plano de leitura),
// unificadas numa só: no topo, 4 botões-push decidem o que entra na rotina
// diária (Oração/Leitura/Estudo guiado/Reflexão), TOTALMENTE independente
// de qual plano de leitura está configurado (ver session.routineModules/
// routineModulesStore.js) — desligar "Leitura" daqui não mexe no plano
// configurado, só tira ele da rotina do dia. Cada passo ligado revela,
// logo abaixo, sua própria configuração (duração pra Oração/Reflexão,
// ordem/ritmo/plano por tema pra Leitura, qual estudo seguir pro Estudo
// guiado).
import { useState, useEffect } from 'react'
import { PLANS, GRADIENT_MAP } from '../data/bibleBlocks'
import { STUDIES } from '../data/studies'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { ACCENT_MAP, GLOW_MAP } from '../utils/blockColors'
import { groupSessionsByBook } from '../utils/groupByBook'
import { resolveActivePlanSessions, themePlanTitle, themePlanProgress } from '../plan/resolveActivePlan'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys, computeTotalSessions } from '../utils/progress'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { computeWeeklyRoutineStats, averageFullRoutineDays } from '../routine/routineStreak'
import { getSavedPrayerMinutes, setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { STAT_THEMES } from '../utils/statThemes'
import RoutineCalendar from '../components/RoutineCalendar'
import RoutineDayRing from '../components/RoutineDayRing'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// Mesmas opções de cada tela dedicada (ver PrayerScreen.jsx/ReflectionScreen.jsx)
// — a Reflexão inclui 8 porque é o padrão do plano Leve.
const PRAYER_DURATION_OPTIONS = [5, 10, 15, 20, 30]
const REFLECTION_DURATION_OPTIONS = [5, 8, 10, 15, 20, 30]
// Sessão de Estudo guiado não tem cronômetro próprio (ver StudiesScreen.jsx)
// — usado só pra estimar o total de minutos do dia no card de topo, mesmo
// espírito do "~35 min" já citado no comentário de src/data/studies.js.
const STUDY_SESSION_MINUTES = 35

const MODULE_META = {
  prayer:     { icon: 'HandHeart',     labelKey: 'home.routinePrayer' },
  reading:    { icon: 'BookOpen',      labelKey: 'home.routineReading' },
  study:      { icon: 'GraduationCap', labelKey: 'home.routineStudy' },
  reflection: { icon: 'PenLine',       labelKey: 'home.routineReflection' },
}
const MODULE_ORDER = ['prayer', 'reading', 'study', 'reflection']

export default function RoutineScreen({
  session, authUser, blocks, sessionsByBlock, completedSet, themePlans, activeAltPlan, todayThemePicks,
  onNavigate, onContinueSession, onMarkRoutineStep, onToggleRoutineModule,
  onSelectActivePlan, onOpenThemePlan, onAddSessionsToRoutine, onStartThemeReading,
  onToggleSession, onOpenSession, onOpenChronoSession,
}) {
  const { lang, plan, activePlan, todayRoutine, todaySession, routineModules, activeStudyId } = session
  // Estudos criados por IA somam à lista estática pro seletor de "estudo
  // ativo" abaixo — mesmo formato de item, sem precisar de UI própria aqui
  // (a criação em si mora em StudiesScreen.jsx). Estudos indutivos formam
  // um segundo grupo à parte no seletor (ver JSX abaixo) — a pessoa
  // escolhe OU um estudo guiado OU um estudo indutivo como "o" estudo
  // ativo do dia, nunca os dois.
  const [aiStudies, setAiStudies] = useState([])
  const [inductiveStudies, setInductiveStudies] = useState([])
  useEffect(() => {
    if (!authUser) return
    getAiStudies(authUser.email).then(setAiStudies)
    getInductiveStudies(authUser.email).then(setInductiveStudies)
  }, [authUser?.email])
  const guidedStudies = [...STUDIES, ...aiStudies]
  const isOn = key => routineModules.includes(key)
  // Qual passo está expandido no card "Adicionar à minha rotina" — só um
  // por vez (accordion), começa tudo fechado.
  const [expandedModule, setExpandedModule] = useState(null)

  // ── Leitura: mesma resolução de plano ativo (fixo/tema/cronológico) que
  // antes morava só em PlanScreen.jsx — usada tanto pro resumo/checklist
  // aqui embaixo (quando "Leitura" está ligada) quanto pro card "sessão de
  // hoje". ──
  const activePlanData = resolveActivePlanSessions(activeAltPlan, themePlans, completedSet, blocks, sessionsByBlock, plan.id)
  const activeThemePlan = activeAltPlan?.type === 'theme' ? themePlans.find(p => p.id === activeAltPlan.planId) : null
  const recentThemePlans = [...themePlans]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 4)
  const [openBlockId, setOpenBlockId] = useState(() => activePlanData.blocks.find(b => b.status === 'active')?.id ?? activePlanData.blocks[0]?.id)
  useEffect(() => {
    setOpenBlockId(activePlanData.blocks.find(b => b.status === 'active')?.id ?? activePlanData.blocks[0]?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlanData.kind, activeAltPlan?.planId, activeAltPlan?.paceId])

  function openSession(blockId, sessionId) {
    if (activePlanData.kind === 'chrono') onOpenChronoSession?.(blockId)
    else if (activePlanData.kind === 'theme') onOpenThemePlan?.(activeAltPlan.planId)
    else onOpenSession?.(blockId, sessionId)
  }

  const currentOrder = activeAltPlan?.type === 'chrono' ? 'chrono' : 'standard'
  const currentPaceId = activeAltPlan?.type === 'chrono' ? activeAltPlan.paceId : plan.id
  function chooseOrder(order) {
    onSelectActivePlan?.(order === 'chrono' ? { type: 'chrono', paceId: currentPaceId } : { type: 'fixed', id: currentPaceId })
  }
  function choosePace(paceId) {
    onSelectActivePlan?.(currentOrder === 'chrono' ? { type: 'chrono', paceId } : { type: 'fixed', id: paceId })
  }
  function activateBiblePlan() {
    onSelectActivePlan?.({ type: 'fixed', id: currentPaceId })
  }
  function activateThemePlan() {
    const targetPlanId = activeThemePlan?.id ?? recentThemePlans[0]?.id
    if (!targetPlanId) return
    onSelectActivePlan?.({ type: 'theme', planId: targetPlanId })
  }
  const isAiPlan = activePlan.kind === 'theme'
  const doneSessions = blocks.reduce((s, b) => s + b.sessionsDone, 0)
  const totalSessions = computeTotalSessions(blocks)
  const readingCtaLabel = todaySession.needsThemePick
    ? t('themePlan.chooseTodayCta', undefined, lang)
    : todaySession.progress === 100 ? t('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? t('home.continueSession', undefined, lang)
    : t('home.startSession', undefined, lang)

  // ── Estudo: só escolhe QUAL estudo fica em destaque — a progressão
  // sessão a sessão de verdade (qual é "a sessão de hoje", marcar
  // concluída) mora em StudiesScreen.jsx, que já sabe calcular isso a
  // partir de studies_completed. Aqui só uma lista pra trocar/escolher.
  // Estudo indutivo entra na mesma busca (é só mais um "estudo", ver
  // kind==='inductive') mas não tem tempo estimado — não tem como saber
  // quanto tempo a pessoa vai levar escrevendo Observação/Interpretação/
  // Verdade Atemporal/Aplicação, então conta como "livre", igual à
  // Leitura sem meta de tempo (ver activePlan.readingMinutes == null). ──
  const activeStudy = [...guidedStudies, ...inductiveStudies].find(s => s.id === activeStudyId) ?? null
  const isInductiveActive = activeStudy?.kind === 'inductive'

  // ── Oração/Reflexão: duração escolhida, mesmo padrão de sempre. ──
  const [prayerMinutes, setPrayerMinutesState] = useState(() => getSavedPrayerMinutes() ?? plan.prayerMinutes)
  const [reflectionMinutes, setReflectionMinutesState] = useState(() => getSavedReflectionMinutes() ?? plan.reflectionMinutes)
  function choosePrayer(n) {
    setPrayerMinutesState(n)
    setSavedPrayerMinutes(n)
  }
  function chooseReflection(n) {
    setReflectionMinutesState(n)
    setSavedReflectionMinutes(n)
  }

  // Total do dia — só soma os passos LIGADOS agora (antes somava os 3 de
  // sempre, sem essa checagem, já que não dava pra desligar nenhum).
  // Estudo indutivo não entra na soma — sem tempo estimado, ver
  // isInductiveActive acima.
  const totalMinutes =
    (isOn('prayer') ? prayerMinutes : 0) +
    (isOn('reflection') ? reflectionMinutes : 0) +
    (isOn('study') && !isInductiveActive ? STUDY_SESSION_MINUTES : 0) +
    (isOn('reading') ? (activePlan.readingMinutes ?? 0) : 0)
  const readingIsFree = isOn('reading') && activePlan.readingMinutes == null
  const studyIsFree = isOn('study') && isInductiveActive

  // Linha do tempo de hoje — mesmo stepper de sempre, agora iterando só os
  // módulos ligados (routineModules), com Estudo guiado incluído.
  const allSteps = {
    prayer:     { key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer, title: t('home.routinePrayer', undefined, lang), done: !!todayRoutine.prayer, onClick: () => onNavigate?.('prayer'), onToggleCheck: () => onMarkRoutineStep?.('prayer', !todayRoutine.prayer) },
    reading:    { key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading, title: t('home.routineReading', undefined, lang), done: !!todayRoutine.reading, onClick: () => onContinueSession?.(), onToggleCheck: () => onMarkRoutineStep?.('reading', !todayRoutine.reading) },
    study:      { key: 'study', icon: 'GraduationCap', color: ROUTINE_STEP_COLORS.study, title: t('home.routineStudy', undefined, lang), done: !!todayRoutine.study, onClick: () => onNavigate?.('studies'), onToggleCheck: () => onMarkRoutineStep?.('study', !todayRoutine.study) },
    reflection: { key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection, title: t('home.routineReflection', undefined, lang), done: !!todayRoutine.reflection, onClick: () => onNavigate?.('reflection'), onToggleCheck: () => onMarkRoutineStep?.('reflection', !todayRoutine.reflection) },
  }
  const steps = MODULE_ORDER.filter(k => isOn(k)).map(k => allSteps[k])

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>

      <div style={styles.body}>
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('routine.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('routine.heroSub', undefined, lang)}</p>
        </div>

        {/* Tutorial do método (recolhido por padrão) — morava na Home,
            mudou pra cá (mesmo espírito de "como funciona" mas junto de
            onde a pessoa de fato configura a rotina). */}
        <TutorialCard lang={lang} />

        {/* Total do dia — vem primeiro agora (resumo antes do detalhe). */}
        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <span style={{ position: 'relative', ...styles.heroTotal }}>
            {totalMinutes}<span style={styles.heroTotalUnit}> min</span>
          </span>
          <span style={{ position: 'relative', ...styles.heroTotalLabel }}>
            {readingIsFree && studyIsFree ? `${totalMinutes} ${t('routine.totalLabelFreeBoth', undefined, lang)}`
              : studyIsFree ? `${totalMinutes} ${t('routine.totalLabelFreeStudy', undefined, lang)}`
              : readingIsFree ? `${totalMinutes} ${t('routine.totalLabelFree', undefined, lang)}`
              : t('routine.totalLabel', undefined, lang)}
          </span>

          {steps.length > 0 && (
            <div style={{ position: 'relative', ...styles.heroBreakdown }}>
              {steps.map(step => (
                <div key={step.key} style={styles.heroBreakdownItem}>
                  <AppIcon name={step.icon} size={13} color="rgba(255,255,255,.85)" />
                  <span style={styles.heroBreakdownN}>
                    {step.key === 'reading'
                      ? (activePlan.readingMinutes != null ? <>{activePlan.readingMinutes}<span style={styles.heroBreakdownUnit}> min</span></> : activePlan.label)
                      : step.key === 'study'
                        ? (isInductiveActive ? t('routine.studyInductiveFreeLabel', undefined, lang) : <>{STUDY_SESSION_MINUTES}<span style={styles.heroBreakdownUnit}> min</span></>)
                        : <>{step.key === 'prayer' ? prayerMinutes : reflectionMinutes}<span style={styles.heroBreakdownUnit}> min</span></>}
                  </span>
                  <span style={styles.heroBreakdownL}>{step.title}</span>
                </div>
              ))}
            </div>
          )}

          {steps[0] && (
            <button style={{ position: 'relative', ...styles.heroStartBtn }} onClick={steps[0].onClick}>
              {t('routine.start', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
            </button>
          )}
        </div>

        {/* Linha do tempo dos passos de hoje */}
        {steps.length > 0 && (
          <div style={styles.stepper}>
            {steps.map((step, i) => (
              <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < steps.length - 1 ? 1 : 'unset' }}>
                <div style={styles.stepNodeWrap}>
                  <span
                    role="button"
                    aria-label={t('home.routineMarkDone', undefined, lang)}
                    style={{ ...styles.stepNode, background: step.done ? step.color : 'var(--g1)', borderColor: step.done ? step.color : 'var(--g2)', cursor: 'pointer' }}
                    onClick={step.onToggleCheck}
                  >
                    <AppIcon name={step.done ? 'Check' : step.icon} size={17} color={step.done ? 'white' : 'var(--g4)'} />
                  </span>
                  <button onClick={step.onClick} style={styles.stepLabelBtn}>
                    <span style={styles.stepLabel}>{step.title}</span>
                    <span style={{ ...styles.stepTag, color: step.done ? step.color : 'var(--g4)' }}>
                      {step.done ? t('routine.stepDone', undefined, lang) : t('routine.stepPending', undefined, lang)}
                    </span>
                  </button>
                </div>
                {i < steps.length - 1 && (
                  <div style={styles.stepLineTrack}>
                    <div style={{ ...styles.stepLineFill, width: step.done ? '100%' : '0%', background: step.color }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Os 4 passos — cada linha liga/desliga o passo (independente de
            qual plano de leitura está configurado; desligar "Leitura" não
            muda o plano escolhido, só tira o passo da rotina do dia) e,
            quando ligado, expande ao tocar pra revelar a configuração
            daquele passo (duração, plano de leitura, ou estudo guiado
            ativo) — antes cada passo ligado tinha sua própria seção sempre
            aberta abaixo; agora tudo mora dentro deste card só, uma linha
            por passo. Passo desligado fica esmaecido e não expande — não
            tem o que configurar num passo que não faz parte da rotina
            agora. */}
        <div style={styles.moduleToggleCard}>
          <p style={styles.moduleToggleTitle}>{t('routine.addToRoutineTitle', undefined, lang)}</p>
          {MODULE_ORDER.map((key, i) => {
            const meta = MODULE_META[key]
            const on = isOn(key)
            const expanded = on && expandedModule === key
            return (
              <div key={key} style={i > 0 ? styles.moduleAccordionDivider : undefined}>
                <button
                  type="button"
                  style={{ ...styles.moduleToggleRow, ...(on ? {} : styles.moduleToggleRowOff) }}
                  onClick={() => on && setExpandedModule(v => (v === key ? null : key))}
                >
                  <span style={{ ...styles.moduleToggleIcon, background: on ? `${ROUTINE_STEP_COLORS[key]}1A` : 'var(--g1)' }}>
                    <AppIcon name={meta.icon} size={16} color={on ? ROUTINE_STEP_COLORS[key] : 'var(--g4)'} />
                  </span>
                  <span style={styles.moduleToggleLabel}>{t(meta.labelKey, undefined, lang)}</span>
                  {on && (
                    <AppIcon
                      name="ChevronDown"
                      size={15}
                      color="var(--g4)"
                      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}
                    />
                  )}
                  <div
                    className={`toggle ${on ? '' : 'off'}`}
                    style={on ? { background: ROUTINE_STEP_COLORS[key] } : undefined}
                    onClick={e => { e.stopPropagation(); onToggleRoutineModule?.(key, !on) }}
                    role="switch"
                    aria-checked={on}
                    aria-label={t(meta.labelKey, undefined, lang)}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </button>

                {expanded && key === 'prayer' && (
                  <div style={styles.moduleAccordionBody}>
                    <p style={styles.moduleAccordionSub}>{t('routine.sectionPrayerSub', undefined, lang)}</p>
                    <div className="duration-sel" style={styles.durationSel}>
                      {PRAYER_DURATION_OPTIONS.map(n => (
                        <button
                          key={n}
                          style={{ ...styles.durationBtn, ...(n === prayerMinutes ? { ...styles.durationBtnActive, background: ROUTINE_STEP_COLORS.prayer } : {}) }}
                          onClick={() => choosePrayer(n)}
                        >
                          <span style={styles.durationBtnNum}>{n}</span>
                          <span style={styles.durationBtnUnit}>{t('routine.min', undefined, lang)}</span>
                        </button>
                      ))}
                    </div>
                    <button style={{ ...styles.sectionGoBtn, background: ROUTINE_STEP_COLORS.prayer }} onClick={() => onNavigate?.('prayer')}>
                      {t('routine.goToPrayer', undefined, lang)} <AppIcon name="ChevronRight" size={14} />
                    </button>
                  </div>
                )}

                {/* Leitura da Bíblia — plano fixo (ordem/ritmo) OU por tema
                    (IA), um botão-push do lado de cada título decide qual
                    dos dois está ATIVO (mesmo padrão de antes em
                    PlanScreen.jsx). */}
                {expanded && key === 'reading' && (
                  <div style={styles.moduleAccordionBody}>
                    <div>
                      <p style={styles.sectionLabel}>{t('plan.activePlanTitle', undefined, lang)}</p>
                      <ActivePlanCard activePlan={activePlan} todaySession={todaySession} lang={lang} onContinue={onContinueSession} />
                    </div>

                    <div style={styles.sectionHeaderRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...styles.sectionLabel, margin: 0 }}>{t('plan.readingPlanTitle', undefined, lang)}</p>
                        <p style={{ ...styles.sectionSub, margin: '2px 0 0' }}>{t('plan.readingPlanSub', undefined, lang)}</p>
                      </div>
                      <div
                        className={`toggle ${activePlanData.kind !== 'theme' ? '' : 'off'}`}
                        onClick={activateBiblePlan}
                        role="switch"
                        aria-checked={activePlanData.kind !== 'theme'}
                      >
                        <div className="toggle-thumb" />
                      </div>
                    </div>

                    {activePlanData.kind !== 'theme' && (
                      <div style={styles.readingPlanCard}>
                        <p style={styles.chipsLabel}>{t('plan.orderLabel', undefined, lang)}</p>
                        <div style={styles.orderSel}>
                          <button
                            style={{ ...styles.orderBtn, ...(currentOrder === 'standard' ? styles.orderBtnActive : {}) }}
                            onClick={() => chooseOrder('standard')}
                          >
                            <AppIcon name="BookOpen" size={15} color={currentOrder === 'standard' ? 'white' : 'var(--g4)'} />
                            {t('plan.orderStandard', undefined, lang)}
                          </button>
                          <button
                            style={{ ...styles.orderBtn, ...(currentOrder === 'chrono' ? styles.orderBtnActive : {}) }}
                            onClick={() => chooseOrder('chrono')}
                          >
                            <AppIcon name="Hourglass" size={15} color={currentOrder === 'chrono' ? 'white' : 'var(--g4)'} />
                            {t('plan.orderChronological', undefined, lang)}
                          </button>
                        </div>

                        <p style={{ ...styles.chipsLabel, marginTop: 12 }}>{t('plan.paceLabel', undefined, lang)}</p>
                        <div style={styles.paceSel}>
                          {PLANS.map(p => (
                            <button
                              key={p.id}
                              style={{ ...styles.paceBtn, ...(currentPaceId === p.id ? styles.paceBtnActive : {}) }}
                              onClick={() => choosePace(p.id)}
                            >
                              <AppIcon name={p.icon} size={14} color={currentPaceId === p.id ? 'white' : 'var(--g4)'} />
                              <span>{lang === 'en' ? p.labelEn : p.label}</span>
                              <span style={{ ...styles.paceBtnTime, ...(currentPaceId === p.id ? styles.paceBtnTimeActive : {}) }}>
                                {p.readingMinutes != null ? t('journey.minPerDay', { n: p.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={styles.sectionHeaderRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...styles.sectionLabel, margin: 0 }}>
                          {activeThemePlan ? themePlanTitle(activeThemePlan) : t('plan.themePlanTitle', undefined, lang)}
                        </p>
                        <p style={{ ...styles.sectionSub, margin: '2px 0 0' }}>{t('plan.themePlanSub', undefined, lang)}</p>
                      </div>
                      <div
                        className={`toggle ${activePlanData.kind === 'theme' ? '' : 'off'}`}
                        style={themePlans.length === 0 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                        onClick={activateThemePlan}
                        role="switch"
                        aria-checked={activePlanData.kind === 'theme'}
                      >
                        <div className="toggle-thumb" />
                      </div>
                    </div>

                    {activeThemePlan && (
                      <div style={styles.readingPlanCard}>
                        {activeThemePlan.overview && (
                          <p style={{ ...styles.themeOverview, marginTop: 0 }}>{activeThemePlan.overview}</p>
                        )}
                        {activeThemePlan.passages ? (
                          <ThemeTextsChecklist
                            key={activeThemePlan.id}
                            plan={activeThemePlan}
                            completedSet={completedSet}
                            todayThemePicks={todayThemePicks}
                            lang={lang}
                            onOpenText={key => onStartThemeReading?.(activeThemePlan.id, [key])}
                            onAddToRoutine={keys => onAddSessionsToRoutine?.(activeThemePlan.id, keys)}
                            onStartReading={keys => onStartThemeReading?.(activeThemePlan.id, keys)}
                          />
                        ) : (
                          <p style={styles.sectionSub}>
                            {t('themePlan.sessionsCount', { done: themePlanProgress(activeThemePlan, completedSet).done, total: themePlanProgress(activeThemePlan, completedSet).total }, lang)}
                          </p>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentThemePlans.map(tp => {
                        const progress = themePlanProgress(tp, completedSet)
                        return (
                          <PlanRow
                            key={tp.id}
                            icon="Sparkles"
                            iconColor="#A21CAF"
                            iconBg="#FAE8FF"
                            title={themePlanTitle(tp)}
                            sub={progress.totalMinutes != null
                              ? `${t('themePlan.sessionsCount', { done: progress.done, total: progress.total }, lang)} · ~${progress.totalMinutes} ${t('routine.min', undefined, lang)}`
                              : t('themePlan.sessionsCount', { done: progress.done, total: progress.total }, lang)}
                            isActive={activeAltPlan?.type === 'theme' && activeAltPlan.planId === tp.id}
                            lang={lang}
                            onOpen={() => onOpenThemePlan?.(tp.id)}
                            onChoose={() => onSelectActivePlan?.({ type: 'theme', planId: tp.id })}
                          />
                        )
                      })}
                      <button style={styles.createThemePlanLink} onClick={() => onNavigate?.('themePlan')}>
                        {t('plan.createThemePlanLink', undefined, lang)}
                      </button>
                    </div>

                    {activePlanData.kind !== 'theme' && (
                      <>
                        <div style={{ margin: '4px 2px 0' }}>
                          <p style={styles.overviewTitle}>{t('plan.sessionsOverviewTitle', undefined, lang)}</p>
                          <p style={styles.overviewSub}>{t('plan.sessionsOverviewSub', undefined, lang)}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {activePlanData.blocks.map(block => (
                            <PlanBlockSection
                              key={block.id}
                              block={block}
                              sessions={activePlanData.sessionsByBlock[block.id] ?? []}
                              open={openBlockId === block.id}
                              onToggle={() => setOpenBlockId(v => (v === block.id ? null : block.id))}
                              completedSet={completedSet}
                              onToggleSession={onToggleSession}
                              onOpenSession={s => openSession(block.id, s.id)}
                              lang={lang}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <div style={styles.readingStatsRow}>
                      <div style={styles.readingStat}>
                        <span style={styles.readingStatN}>{doneSessions}/{totalSessions}</span>
                        <span style={styles.readingStatL}>{t('journey.sessionsStat', undefined, lang)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estudo — só MOSTRA qual estudo está em andamento (guiado
                    ou indutivo); a escolha de QUAL estudo seguir mora na
                    aba Estudos agora (ver StudiesScreen.jsx/onSelectActiveStudy),
                    não aqui. Sessão de hoje e marcar concluído também
                    moram lá, que já sabe calcular isso a partir do
                    progresso salvo. */}
                {expanded && key === 'study' && (
                  <div style={styles.moduleAccordionBody}>
                    <p style={styles.moduleAccordionSub}>{t('routine.sectionStudySub', undefined, lang)}</p>
                    {activeStudy ? (
                      <div style={styles.activeStudyCard}>
                        <span style={styles.activeStudyIcon}><AppIcon name={activeStudy.icon} size={16} color={ROUTINE_STEP_COLORS.study} /></span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={styles.activePlanSummaryLabel}>{lang === 'en' ? activeStudy.titleEn : activeStudy.title}</span>
                          <span style={styles.activePlanSummarySub}>
                            {isInductiveActive
                              ? t('routine.studyInductiveSub', undefined, lang)
                              : t('themePlan.sessionsCount', { done: 0, total: activeStudy.sessions.length }, lang)}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <p style={styles.moduleAccordionSub}>{t('routine.noActiveStudy', undefined, lang)}</p>
                    )}

                    <button style={{ ...styles.sectionGoBtn, background: ROUTINE_STEP_COLORS.study }} onClick={() => onNavigate?.('studies')}>
                      {t('routine.goToStudy', undefined, lang)} <AppIcon name="ChevronRight" size={14} />
                    </button>
                  </div>
                )}

                {expanded && key === 'reflection' && (
                  <div style={styles.moduleAccordionBody}>
                    <p style={styles.moduleAccordionSub}>{t('routine.sectionReflectionSub', undefined, lang)}</p>
                    <div className="duration-sel" style={styles.durationSel}>
                      {REFLECTION_DURATION_OPTIONS.map(n => (
                        <button
                          key={n}
                          style={{ ...styles.durationBtn, ...(n === reflectionMinutes ? { ...styles.durationBtnActive, background: ROUTINE_STEP_COLORS.reflection } : {}) }}
                          onClick={() => chooseReflection(n)}
                        >
                          <span style={styles.durationBtnNum}>{n}</span>
                          <span style={styles.durationBtnUnit}>{t('routine.min', undefined, lang)}</span>
                        </button>
                      ))}
                    </div>
                    <button style={{ ...styles.sectionGoBtn, background: ROUTINE_STEP_COLORS.reflection }} onClick={() => onNavigate?.('reflection')}>
                      {t('routine.goToReflection', undefined, lang)} <AppIcon name="ChevronRight" size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Calendário mensal — visão completa de quais dias tiveram cada
            passo concluído. */}
        <div style={styles.calendarCard}>
          <p style={styles.calendarCardTitle}>{t('progress.routineCalendarTitle', undefined, lang)}</p>
          <p style={styles.calendarCardSub}>{t('progress.routineCalendarSub', undefined, lang)}</p>
          <RoutineCalendar dailyRoutine={session.dailyRoutine} lang={lang} modules={routineModules} />
        </div>

        {/* Constância da rotina — dias/semana em que cada passo foi feito
            nas últimas 4 semanas. */}
        <RoutineUsageCard dailyRoutine={session.dailyRoutine} lang={lang} modules={routineModules} />
      </div>
    </div>
  )
}

// Explica os 3 passos do método (Oração/Leitura/Reflexão) — morava na Home,
// mudou pra cá por pedido explícito (fica junto de onde a pessoa realmente
// configura a rotina, não na tela de resumo do dia).
function TutorialCard({ lang }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={styles.tutorialCard}>
      <button style={styles.tutorialToggle} onClick={() => setOpen(v => !v)}>
        <span style={styles.tutorialEmoji}><AppIcon name="Lightbulb" size={20} color="var(--or)" /></span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={styles.tutorialToggleTitle}>{t('home.tutorialToggleTitle', undefined, lang)}</p>
          <p style={styles.tutorialToggleSub}>{t('home.tutorialToggleSub', undefined, lang)}</p>
        </div>
        <span style={{ fontSize: 14, color: 'var(--g4)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>

      {open && (
        <div style={styles.tutorialBody}>
          <p style={styles.tutorialIntro}>
            {t('home.tutorialIntro', undefined, lang)}
          </p>

          <TutorialStep
            icon="HandHeart" time={t('home.stepPrayerTime', undefined, lang)} title={t('home.stepPrayerTitle', undefined, lang)} theme="orange"
            desc={t('home.stepPrayerDesc', undefined, lang)}
          />
          <TutorialStep
            icon="BookOpen" time={t('home.stepReadingTime', undefined, lang)} title={t('home.stepReadingTitle', undefined, lang)} theme="purple"
            desc={t('home.stepReadingDesc', undefined, lang)}
          />
          <TutorialStep
            icon="PenLine" time={t('home.stepReflectionTime', undefined, lang)} title={t('home.stepReflectionTitle', undefined, lang)} theme="green"
            desc={t('home.stepReflectionDesc', undefined, lang)}
          />

          <div style={styles.tutorialTip}>
            {t('home.tutorialTip', undefined, lang)}
          </div>

          <div style={styles.tutorialTipBlue}>
            {t('home.tutorialTipRoutine', undefined, lang)}
          </div>

          <div style={styles.tutorialTipPurple}>
            {t('home.tutorialTipBonus', undefined, lang)}
          </div>

          <p style={styles.tutorialOutro}>{t('home.tutorialOutro', undefined, lang)}</p>
        </div>
      )}
    </div>
  )
}

function TutorialStep({ icon, time, title, desc, theme }) {
  const themeColors = STAT_THEMES[theme]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ ...styles.tutorialStepIcon, background: themeColors.bg }}><AppIcon name={icon} size={16} color={themeColors.color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={styles.tutorialStepTitle}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: themeColors.color }}>{time}</span>
        </div>
        <p style={styles.tutorialStepDesc}>{desc}</p>
      </div>
    </div>
  )
}

function ActivePlanCard({ activePlan, todaySession, lang, onContinue }) {
  const ctaLabel = activePlan.needsThemePick
    ? t('themePlan.chooseTodayCta', undefined, lang)
    : todaySession.progress === 100 ? t('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? t('home.continueSession', undefined, lang)
    : t('home.startSession', undefined, lang)
  const isAiPlan = activePlan.kind === 'theme'

  return (
    <div style={{ ...styles.activeCard, ...(isAiPlan ? styles.activeCardAi : {}) }}>
      <div style={styles.activeCardTop}>
        <span style={styles.activeCardIcon}><AppIcon name={activePlan.icon} size={18} color="white" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.activeCardLabel}>{activePlan.label}</p>
          <p style={styles.activeCardMeta}>
            {t('themePlan.sessionsCount', { done: activePlan.doneCount, total: activePlan.totalCount }, lang)}
          </p>
        </div>
        <span style={styles.activeCardPercent}>{activePlan.percent}%</span>
      </div>
      <div style={styles.activeCardBar}>
        <div style={{ ...styles.activeCardBarFill, width: `${activePlan.percent}%` }} />
      </div>
      <button style={styles.activeCardBtn} onClick={onContinue}>
        {ctaLabel} <AppIcon name="ChevronRight" size={14} color="white" />
      </button>
    </div>
  )
}

// Textos de um plano por tema, agrupados por livro, cada um com checkbox +
// tempo de leitura — exportado (ThemePlanScreen.jsx reaproveita).
export function ThemeTextsChecklist({ plan, completedSet, todayThemePicks, lang, onOpenText, onAddToRoutine, onStartReading }) {
  const texts = deriveThemeTexts(plan.passages).map(s => ({
    ...s,
    status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
  }))
  const initialKeys = todayThemePicks?.planId === plan.id ? todayThemePicks.keys ?? [] : []
  const [selected, setSelected] = useState(() => new Set(initialKeys))

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedTexts = texts.filter(s => s.status !== 'done' && selected.has(themeTextKey(s)))
  const totalMinutes = selectedTexts.reduce((sum, s) => sum + s.minutes, 0)
  const bookGroups = groupSessionsByBook(texts)

  return (
    <>
      <p style={styles.chipsLabel}>{t('themePlan.textsLabel', undefined, lang)}</p>
      <p style={styles.textsInstructions}>{t('themePlan.textsInstructions', undefined, lang)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {bookGroups.map(group => (
          <div key={group.book} style={styles.textGroup}>
            <p style={styles.textGroupHeader}>{lang === 'en' ? group.sessions[0]?.bookEn : group.book}</p>
            {group.sessions.map(s => {
              const key = themeTextKey(s)
              const isDone = s.status === 'done'
              const isChecked = !isDone && selected.has(key)
              return (
                <div key={s.id} style={styles.textRow}>
                  <span
                    role={isDone ? undefined : 'checkbox'}
                    aria-checked={isChecked}
                    style={{ ...styles.textCheckbox, ...(isDone ? styles.textCheckboxDone : isChecked ? styles.textCheckboxChecked : {}) }}
                    onClick={() => !isDone && toggle(key)}
                  >
                    {isDone && <AppIcon name="Check" size={13} color="white" />}
                    {!isDone && isChecked && <AppIcon name="Check" size={13} color="white" />}
                  </span>
                  <button style={styles.textInfo} onClick={() => onOpenText?.(key)}>
                    <span style={styles.textTitle}>{lang === 'en' ? s.titleEn : s.title}</span>
                    <span style={styles.textMinutes}>{t('themePlan.minutesEach', { n: s.minutes }, lang)}</span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={styles.todaySummary}>
        <span style={styles.todaySummaryText}>
          {t('themePlan.todaySummary', { minutes: totalMinutes, count: selectedTexts.length }, lang)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button
          style={{ ...styles.addToRoutineBtn, ...(selectedTexts.length === 0 ? styles.addToRoutineBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onAddToRoutine?.([...selected])}
        >
          {t('themePlan.addToRoutineCta', undefined, lang)}
        </button>
        <button
          style={{ ...styles.startTodayBtn, ...(selectedTexts.length === 0 ? styles.startTodayBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onStartReading?.([...selected])}
        >
          {t('themePlan.startTodayCta', undefined, lang)} <AppIcon name="ChevronRight" size={14} color="white" />
        </button>
      </div>
    </>
  )
}

// Linha genérica de "escolher entre várias opções salvas" — reaproveitada
// pra planos por tema E pra escolher o estudo guiado ativo (mesmo visual,
// só troca ícone/cores de quem chama).
function PlanRow({ icon, iconColor, iconBg, title, sub, isActive, lang, onOpen, onChoose }) {
  return (
    <div style={{ ...styles.planRow, border: isActive ? '0.5px solid var(--gold-soft)' : styles.planRow.border }}>
      <button style={styles.planRowMain} onClick={onOpen} disabled={!onOpen}>
        <span style={{ ...styles.planRowIcon, background: iconBg }}><AppIcon name={icon} size={16} color={iconColor} /></span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={styles.planRowTitle}>{title}</span>
          <span style={styles.planRowSub}>{sub}</span>
        </span>
      </button>
      {isActive
        ? <span style={styles.activeBadge}>{t('plan.activeBadge', undefined, lang)}</span>
        : <button style={styles.chooseBtn} onClick={onChoose}>{t('plan.chooseAction', undefined, lang)}</button>}
    </div>
  )
}

function PlanBlockSection({ block, sessions, open, onToggle, completedSet, onToggleSession, onOpenSession, lang }) {
  const gradient = GRADIENT_MAP[block.gradientKey]
  const accent = ACCENT_MAP[block.gradientKey]
  const name = lang === 'en' ? block.nameEn : block.name
  const tag = lang === 'en' ? block.tagEn : block.tag
  const bookGroups = groupSessionsByBook(sessions)

  return (
    <div style={{
      ...styles.blockSection,
      boxShadow: block.status === 'active' ? `var(--shadow-premium), 0 8px 22px ${GLOW_MAP[block.gradientKey]}` : `0 8px 22px ${GLOW_MAP[block.gradientKey]}`,
      border: block.status === 'active' ? '0.5px solid var(--gold-soft)' : styles.blockSection.border,
    }}>
      <button style={styles.blockHeader} onClick={onToggle}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AppIcon name={block.icon} size={19} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tag && <p style={styles.blockTag}>{tag}</p>}
          <p style={styles.blockName}>{name}</p>
        </div>
        <span style={{ ...styles.blockPercent, color: accent }}>{block.percent}%</span>
        <AppIcon name="ChevronDown" size={16} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={styles.blockBody}>
          {bookGroups.map(group => (
            <PlanBookGroup
              key={group.book}
              group={group}
              completedSet={completedSet}
              onToggleSession={onToggleSession}
              onOpenSession={onOpenSession}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanBookGroup({ group, completedSet, onToggleSession, onOpenSession, lang }) {
  const total = group.sessions.length
  const doneCount = group.sessions.filter(s => s.status === 'done').length
  const [open, setOpen] = useState(() => group.sessions.some(s => s.status === 'current'))
  const displayName = lang === 'en' ? group.sessions[0]?.bookEn : group.book

  return (
    <div style={styles.bookGroup}>
      <button style={styles.bookHeader} onClick={() => setOpen(v => !v)}>
        <span style={styles.bookName}>{displayName}</span>
        <span style={styles.bookMeta}>{doneCount}/{total}</span>
        <AppIcon name="ChevronDown" size={13} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={styles.sessionList}>
          {group.sessions.map(s => (
            <PlanSessionRow key={s.id} s={s} onToggleSession={onToggleSession} onOpen={() => onOpenSession(s)} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanSessionRow({ s, onToggleSession, onOpen, lang }) {
  const isDone = s.status === 'done'
  const isCurrent = s.status === 'current'
  const isReflection = s.type === 'reflection'
  const title = lang === 'en' ? s.titleEn : s.title
  const passage = lang === 'en' ? s.passageEn : s.passage

  return (
    <div style={{ ...styles.sessionRow, background: isCurrent ? 'var(--olt)' : 'var(--g1)', border: `0.5px solid ${isCurrent ? 'var(--gold-soft)' : isReflection ? 'rgba(168,85,247,.3)' : 'var(--g2)'}` }}>
      <span
        role="button"
        aria-label={t('home.routineMarkDone', undefined, lang)}
        style={{ ...styles.sessionCheck, background: isDone ? 'var(--grad-vivid)' : isCurrent ? 'var(--bk)' : isReflection ? '#A855F7' : 'var(--g3)' }}
        onClick={() => onToggleSession?.(s, !isDone)}
      >
        {isDone
          ? <AppIcon name="Check" size={13} color="white" />
          : isReflection
            ? <AppIcon name="PenLine" size={12} color="white" />
            : <span style={{ fontSize: 9.5, fontWeight: 700, color: isCurrent ? 'white' : 'var(--g5)' }}>{s.id}</span>}
      </span>
      <button style={styles.sessionInfo} onClick={onOpen}>
        <span style={styles.sessionTitle}>
          {isReflection ? title : `${t('reading.sessionLabel', { n: s.id }, lang)} · ${title}`}
        </span>
        <span style={styles.sessionPassage}>{passage}</span>
      </button>
      <AppIcon name="ChevronRight" size={14} color="var(--g4)" style={{ flexShrink: 0 }} />
    </div>
  )
}

// Métrica de constância — um anel por semana (mesmo desenho do calendário
// mensal, ver RoutineDayRing.jsx: uma fatia fixa por passo LIGADO), só que
// cada fatia vem parcialmente preenchida em vez de cheia/vazia — a fração
// de quantos dos 7 dias da semana aquele passo foi feito.
function RoutineUsageCard({ dailyRoutine, lang, modules }) {
  const weeks = computeWeeklyRoutineStats(dailyRoutine ?? {}, modules, 4)
  const hasAnyData = weeks.some(w => w.prayerDays > 0 || w.readingDays > 0 || w.studyDays > 0 || w.reflectionDays > 0)
  const MAX_DAYS = 7
  const avgFullDays = averageFullRoutineDays(weeks)
  const weekFraction = w => Object.fromEntries(modules.map(key => [key, (w[`${key}Days`] ?? 0) / MAX_DAYS]))

  return (
    <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 15, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bk)' }}>{t('progress.routineUsageTitle', undefined, lang)}</p>
      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, marginBottom: 12 }}>{t('progress.routineUsageSub', undefined, lang)}</p>

      {hasAnyData ? (
        <>
          <div style={styles.routineUsageChart}>
            {weeks.map((w, i) => {
              const isCurrent = i === weeks.length - 1
              return (
                <div key={i} style={{ ...styles.routineUsageMonthCol, ...(isCurrent ? styles.routineUsageMonthColCurrent : {}) }}>
                  {isCurrent && <span style={styles.routineUsageCurrentTag}>{t('progress.routineUsageThisWeek', undefined, lang)}</span>}
                  <span style={{ ...styles.routineUsageMonthNum, ...(isCurrent ? styles.routineUsageMonthNumCurrent : {}) }}>{w.fullDays}</span>
                  <div style={styles.routineUsageRingWrap}>
                    <RoutineDayRing modules={modules} done={weekFraction(w)} size={34} strokeWidth={3.5} />
                  </div>
                  <span style={{ ...styles.routineUsageMonthLabel, ...(isCurrent ? styles.routineUsageMonthLabelCurrent : {}) }}>
                    {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'numeric' }).format(w.start)}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={styles.routineUsageLegend}>
            {modules.includes('prayer') && <UsageLegendDot color={ROUTINE_STEP_COLORS.prayer} label={t('home.routinePrayer', undefined, lang)} />}
            {modules.includes('reading') && <UsageLegendDot color={ROUTINE_STEP_COLORS.reading} label={t('home.routineReading', undefined, lang)} />}
            {modules.includes('study') && <UsageLegendDot color={ROUTINE_STEP_COLORS.study} label={t('home.routineStudy', undefined, lang)} />}
            {modules.includes('reflection') && <UsageLegendDot color={ROUTINE_STEP_COLORS.reflection} label={t('home.routineReflection', undefined, lang)} />}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)' }}>
            <div style={{ background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 16, padding: 13, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginBottom: 3 }}>{t('progress.routineAvgLabel', undefined, lang)}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.3px' }}>
                {avgFullDays.toFixed(1).replace(/\.0$/, '')}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '10px 0' }}>
          {t('progress.routineUsageEmpty', undefined, lang)}
        </p>
      )}
    </div>
  )
}

function UsageLegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' }}>{label}</span>
    </span>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },

  tutorialCard:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  tutorialToggle:{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
  tutorialEmoji: { fontSize: 22, flexShrink: 0 },
  tutorialToggleTitle: { fontSize: 13, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  tutorialToggleSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  tutorialBody:  { padding: '2px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid var(--g1)', paddingTop: 13 },
  tutorialIntro: { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55 },
  tutorialStepIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  tutorialStepTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  tutorialStepDesc:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginTop: 2 },
  tutorialTip:   { background: 'var(--olt)', border: '0.5px dashed rgba(157,67,0,.4)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5 },
  tutorialTipPurple: { background: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: '0.5px dashed rgba(168,85,247,.4)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 500, color: '#6B21A8', lineHeight: 1.5 },
  tutorialTipBlue:   { background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '0.5px dashed rgba(59,130,246,.4)', borderRadius: 11, padding: 11, fontSize: 12.5, fontWeight: 500, color: '#1D4ED8', lineHeight: 1.5 },
  tutorialOutro: { fontSize: 12.5, fontWeight: 700, color: 'var(--or)', textAlign: 'center' },

  moduleToggleCard:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 2 },
  moduleToggleTitle: { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  moduleToggleRow:   { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'none', padding: '7px 0', margin: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', transition: 'opacity .15s' },
  moduleToggleRowOff:{ opacity: 0.5, cursor: 'default' },
  moduleToggleIcon:  { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  moduleToggleLabel: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  moduleAccordionDivider: { borderTop: '0.5px solid var(--g1)', marginTop: 2, paddingTop: 2 },
  moduleAccordionBody: { padding: '2px 2px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  moduleAccordionSub:  { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', margin: '-4px 2px 0' },

  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '20px 20px 18px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTotal:   { fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' },
  heroTotalUnit: { fontSize: 15, fontWeight: 700 },
  heroTotalLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.85)', marginTop: 2, position: 'relative' },
  heroBreakdown:     { display: 'flex', gap: 8, marginTop: 14, width: '100%' },
  heroBreakdownItem: { flex: 1, background: 'rgba(255,255,255,.14)', border: '0.5px solid rgba(255,255,255,.18)', borderRadius: 12, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  heroBreakdownN:    { fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, color: 'white', marginTop: 3, lineHeight: 1 },
  heroBreakdownUnit: { fontSize: 8.5, fontWeight: 600 },
  heroBreakdownL:    { fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  heroStartBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, border: 'none', borderRadius: 24, padding: '11px 26px', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font)', color: 'var(--or)', cursor: 'pointer', background: 'white', boxShadow: '0 8px 20px rgba(0,0,0,.15)' },

  stepper:     { display: 'flex', alignItems: 'flex-start', background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: '18px 10px 14px', boxShadow: 'var(--shadow-card)' },
  stepNodeWrap:{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 66 },
  stepNode:    { width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .4s ease, border-color .4s ease' },
  stepLabelBtn:{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, width: '100%' },
  stepLabel:   { fontSize: 9.5, fontWeight: 700, color: 'var(--g5)', textAlign: 'center' },
  stepTag:     { fontSize: 8.5, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3, transition: 'color .4s ease' },
  stepLineTrack: { flex: 1, height: 3, background: 'var(--g2)', borderRadius: 2, marginTop: 18, overflow: 'hidden' },
  stepLineFill:  { height: '100%', borderRadius: 2, transition: 'width .6s ease' },

  sectionLabel: { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 2px 6px' },
  sectionSub:   { fontSize: 11, fontWeight: 500, color: 'var(--g5)', margin: '-4px 2px 6px' },

  sectionHeaderRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 6px' },
  readingPlanCard: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  themeOverview: { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, marginBottom: 12 },
  chipsLabel:      { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textsInstructions: { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.45, marginTop: -6, marginBottom: 10 },

  orderSel:    { display: 'flex', gap: 6 },
  orderBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 11, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  orderBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },

  paceSel:     { display: 'flex', gap: 6, flexWrap: 'wrap' },
  paceBtn:     { flex: '1 1 0', minWidth: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center', padding: '10px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  paceBtnActive: { color: 'white', borderColor: 'transparent', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  paceBtnTime: { fontSize: 8.5, fontWeight: 700, color: 'var(--g4)' },
  paceBtnTimeActive: { color: 'rgba(255,255,255,.8)' },

  textGroup:       { background: 'var(--white)', border: '0.5px solid var(--g1)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  textGroupHeader: { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', marginBottom: 2 },
  textRow:         { display: 'flex', alignItems: 'center', gap: 9 },
  textCheckbox:    { width: 24, height: 24, borderRadius: 7, border: '1.5px solid var(--g3)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' },
  textCheckboxChecked: { background: '#A21CAF', borderColor: '#A21CAF' },
  textCheckboxDone:    { background: 'var(--grad-vivid)', borderColor: 'transparent', cursor: 'default' },
  textInfo:        { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 0 },
  textTitle:       { fontSize: 11.5, fontWeight: 700, color: 'var(--bk)' },
  textMinutes:     { fontSize: 9.5, fontWeight: 500, color: 'var(--g5)' },

  todaySummary:      { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--olt)', border: '0.5px solid rgba(162,28,175,.25)', borderRadius: 13, padding: '10px 10px 10px 13px' },
  todaySummaryText:  { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700, color: '#A21CAF' },
  startTodayBtn:     { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: '#A21CAF' },
  startTodayBtnDisabled: { background: 'var(--g3)', cursor: 'default' },
  addToRoutineBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: '0.5px solid rgba(162,28,175,.35)', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: '#A21CAF', cursor: 'pointer', fontFamily: 'var(--font)', background: 'white' },
  addToRoutineBtnDisabled: { color: 'var(--g4)', borderColor: 'var(--g3)', cursor: 'default' },

  planRow:      { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: 6, boxShadow: 'var(--shadow-card)' },
  planRowMain:  { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 6 },
  planRowIcon:  { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  planRowTitle: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  planRowSub:   { display: 'block', fontSize: 10, fontWeight: 500, color: 'var(--g5)' },
  chooseBtn:    { flexShrink: 0, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--grad-primary)' },
  activeBadge:  { flexShrink: 0, borderRadius: 9, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--brand-deep)', background: 'var(--olt)' },
  createThemePlanLink: { alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--or)', padding: '2px 6px' },

  overviewTitle: { fontSize: 13, fontWeight: 700, color: 'var(--bk)' },
  overviewSub:   { fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },

  activeCard:      { background: 'var(--grad-vivid)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-glow)' },
  activeCardAi:    { background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 10px 28px rgba(162,28,175,.35)' },
  activeCardTop:   { display: 'flex', alignItems: 'center', gap: 10 },
  activeCardIcon:  { width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeCardLabel: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activeCardMeta:  { fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginTop: 1 },
  activeCardPercent: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 },
  activeCardBar:   { height: 5, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden', margin: '10px 0' },
  activeCardBarFill: { height: '100%', background: 'white', borderRadius: 99 },
  activeCardBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 11, padding: 10, fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },

  activeStudyCard: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '8px 8px 8px 9px' },
  activeStudyIcon: { width: 26, height: 26, borderRadius: 8, background: '#F2E6D2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activePlanSummaryLabel:{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activePlanSummarySub:  { display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' },

  readingStatsRow: { display: 'flex', gap: 6 },
  readingStat:     { flex: 1, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 },
  readingStatN:    { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', lineHeight: 1 },
  readingStatL:    { fontSize: 8.5, fontWeight: 600, color: 'var(--g4)' },

  durationSel: { display: 'flex', gap: 6 },
  durationBtn: { flex: 1, height: 44, borderRadius: 10, border: '0.5px solid var(--g2)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--g5)', background: 'var(--g1)', transition: 'background .15s, color .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 },
  durationBtnActive: { color: 'white', border: 'none', boxShadow: 'var(--shadow-glow)' },
  durationBtnNum:  { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, lineHeight: 1 },
  durationBtnUnit: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, opacity: 0.75, lineHeight: 1 },
  sectionGoBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, border: 'none', borderRadius: 12, padding: 11, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', boxShadow: 'var(--shadow-premium)' },

  routineUsageChart:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  routineUsageMonthCol:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  routineUsageMonthColCurrent: { background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 14, padding: '7px 4px 8px' },
  routineUsageCurrentTag: { fontSize: 7, fontWeight: 800, color: 'var(--or)', letterSpacing: 0.3, textTransform: 'uppercase' },
  routineUsageMonthNum:   { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', lineHeight: 1 },
  routineUsageMonthNumCurrent: { color: 'var(--or)', fontSize: 15 },
  routineUsageRingWrap:   { position: 'relative', width: 34, height: 34, flexShrink: 0 },
  routineUsageMonthLabel: { fontSize: 8.5, fontWeight: 600, color: 'var(--g4)', textTransform: 'capitalize' },
  routineUsageMonthLabelCurrent: { color: 'var(--or)', fontWeight: 800 },
  routineUsageLegend:     { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },

  blockSection: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, overflow: 'hidden' },
  blockHeader:  { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  blockTag:     { fontSize: 8, fontWeight: 700, color: 'var(--g4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  blockName:    { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  blockPercent: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', flexShrink: 0 },
  blockBody:    { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 },

  bookGroup:   { background: 'var(--white)', border: '0.5px solid var(--g1)', borderRadius: 14, overflow: 'hidden' },
  bookHeader:  { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  bookName:    { flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  bookMeta:    { fontSize: 10, fontWeight: 600, color: 'var(--g4)' },
  sessionList: { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 },

  sessionRow:   { display: 'flex', alignItems: 'center', gap: 9, borderRadius: 12, padding: '8px 9px', cursor: 'pointer' },
  sessionCheck: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' },
  sessionInfo:  { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', padding: 0 },
  sessionTitle: { fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sessionPassage: { fontSize: 9.5, fontWeight: 500, color: 'var(--g5)' },

  calendarCard:      { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 15, boxShadow: 'var(--shadow-card)' },
  calendarCardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--bk)' },
  calendarCardSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, marginBottom: 12 },
}
