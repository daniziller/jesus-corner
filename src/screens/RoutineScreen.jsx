// RoutineScreen.jsx
// Aba "Rotina": escolher a duração de cada passo do dia (oração/leitura via
// plano/reflexão) num só lugar, ver o tempo total, e acompanhar visualmente
// os 3 passos de hoje numa "linha do tempo" que preenche conforme cada um é
// concluído (mesmos dados de session.todayRoutine que a Home já usa).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { computeTotalSessions } from '../utils/progress'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { computeWeeklyRoutineStats, averageFullRoutineDays } from '../routine/routineStreak'
import { getSavedPrayerMinutes, setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import RoutineCalendar from '../components/RoutineCalendar'

// Mesmas opções de cada tela dedicada (ver PrayerScreen.jsx/ReflectionScreen.jsx)
// — a Reflexão inclui 8 porque é o padrão do plano Leve.
const PRAYER_DURATION_OPTIONS = [5, 10, 15, 20, 30]
const REFLECTION_DURATION_OPTIONS = [5, 8, 10, 15, 20, 30]

export default function RoutineScreen({ session, blocks, onNavigate, onContinueSession, onMarkRoutineStep }) {
  const { lang, plan, activePlan, todayRoutine, todaySession } = session
  const readingCtaLabel =
    todaySession.progress === 100 ? t('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? t('home.continueSession', undefined, lang)
    : t('home.startSession', undefined, lang)
  // Estatísticas do plano de leitura — moradas antigas de JourneyScreen, que
  // agora só mostra a Bíblia em si (blocos/livros), não mais o plano.
  const doneSessions = blocks.reduce((s, b) => s + b.sessionsDone, 0)
  const totalSessions = computeTotalSessions(blocks)
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

  const totalMinutes = prayerMinutes + reflectionMinutes + (activePlan.readingMinutes ?? 0)
  // Mesmo roxo do card de plano ativo em PlanScreen.jsx (ActivePlanCard) —
  // plano por tema (IA) ativo pinta a barra de "sessão de hoje" e o ícone
  // do resumo do plano com esse tom, em vez do gradiente/marrom de sempre.
  const isAiPlan = activePlan.kind === 'theme'

  // Mesma ordem/cor/ícone da DailyRoutineCard na Home — bate visualmente
  // com o resto do app. Tocar na linha leva direto pra tela do passo; tocar
  // no ícone (stopPropagation, mesmo padrão da Home) marca/desmarca concluído
  // na hora, pra quem já orou/leu/refletiu fora do app e só quer marcar.
  const steps = [
    { key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer, title: t('home.routinePrayer', undefined, lang), done: !!todayRoutine.prayer, onClick: () => onNavigate?.('prayer'), onToggleCheck: () => onMarkRoutineStep?.('prayer', !todayRoutine.prayer) },
    { key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading, title: t('home.routineReading', undefined, lang), done: !!todayRoutine.reading, onClick: () => onContinueSession?.(), onToggleCheck: () => onMarkRoutineStep?.('reading', !todayRoutine.reading) },
    { key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection, title: t('home.routineReflection', undefined, lang), done: !!todayRoutine.reflection, onClick: () => onNavigate?.('reflection'), onToggleCheck: () => onMarkRoutineStep?.('reflection', !todayRoutine.reflection) },
  ]

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      <div style={styles.body}>
        {/* Título + subtítulo — só no desktop (≥1024px). No mobile o Figma
            pula direto pro card de hero; no desktop ele abre com "Rotina"
            + a mesma frase que já usávamos como heroSub. */}
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('routine.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('routine.heroSub', undefined, lang)}</p>
        </div>

        {/* Total do dia */}
        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <span style={{ position: 'relative', ...styles.heroTotal }}>
            {totalMinutes}<span style={styles.heroTotalUnit}> min</span>
          </span>
          <span style={{ position: 'relative', ...styles.heroTotalLabel }}>
            {activePlan.readingMinutes == null
              ? `${prayerMinutes + reflectionMinutes} ${t('routine.totalLabelFree', undefined, lang)}`
              : t('routine.totalLabel', undefined, lang)}
          </span>

          {/* Detalhe por categoria — reflete ao vivo a duração escolhida em
              cada seletor abaixo (mesmo estado, sem lógica extra pra
              sincronizar). Leitura mostra o nome do plano em vez de minutos
              quando é Livre (sem meta de tempo). */}
          <div style={{ position: 'relative', ...styles.heroBreakdown }}>
            <div style={styles.heroBreakdownItem}>
              <AppIcon name="HandHeart" size={13} color="rgba(255,255,255,.85)" />
              <span style={styles.heroBreakdownN}>{prayerMinutes}<span style={styles.heroBreakdownUnit}> min</span></span>
              <span style={styles.heroBreakdownL}>{t('home.routinePrayer', undefined, lang)}</span>
            </div>
            <div style={styles.heroBreakdownItem}>
              <AppIcon name="BookOpen" size={13} color="rgba(255,255,255,.85)" />
              <span style={styles.heroBreakdownN}>
                {activePlan.readingMinutes != null ? <>{activePlan.readingMinutes}<span style={styles.heroBreakdownUnit}> min</span></> : activePlan.label}
              </span>
              <span style={styles.heroBreakdownL}>{t('home.routineReading', undefined, lang)}</span>
            </div>
            <div style={styles.heroBreakdownItem}>
              <AppIcon name="PenLine" size={13} color="rgba(255,255,255,.85)" />
              <span style={styles.heroBreakdownN}>{reflectionMinutes}<span style={styles.heroBreakdownUnit}> min</span></span>
              <span style={styles.heroBreakdownL}>{t('home.routineReflection', undefined, lang)}</span>
            </div>
          </div>

          {/* Começa a rotina pelo primeiro passo (Oração) — de lá, ao
              terminar o cronômetro, um botão leva direto pro segundo
              passo (Leitura). */}
          <button style={{ position: 'relative', ...styles.heroStartBtn }} onClick={() => onNavigate?.('prayer')}>
            {t('routine.start', undefined, lang)} <AppIcon name="ChevronRight" size={15} />
          </button>
        </div>

        {/* Linha do tempo dos 3 passos de hoje */}
        <div style={styles.stepper}>
          {steps.map((step, i) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < steps.length - 1 ? 1 : 'unset' }}>
              {/* Ícone (marca/desmarca concluído) e o resto da linha (abre a
                  tela do passo) são dois elementos IRMÃOS, não um aninhado
                  dentro do outro — antes o ícone ficava embutido no botão de
                  navegar (com stopPropagation), e como ele é a parte mais
                  "pesada" visualmente, um toque no meio da coluna acabava
                  quase sempre acertando o ícone (marcar/desmarcar) em vez de
                  abrir a tela, mesmo mirando no rótulo de texto. Sem
                  aninhamento, cada área só responde ao próprio toque. */}
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

        {/* Oração — não tem mais aba própria na navegação (só mora aqui
            dentro de Rotina), então esse botão é o jeito principal de
            abrir a tela dela agora (além do passo "Oração" na linha do
            tempo acima). */}
        <PickerSection
          title={t('routine.sectionPrayer', undefined, lang)} sub={t('routine.sectionPrayerSub', undefined, lang)} icon="HandHeart" color={ROUTINE_STEP_COLORS.prayer} inline
          footer={
            <button style={{ ...styles.sectionGoBtn, background: ROUTINE_STEP_COLORS.prayer }} onClick={() => onNavigate?.('prayer')}>
              {t('routine.goToPrayer', undefined, lang)} <AppIcon name="ChevronRight" size={14} />
            </button>
          }
        >
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
        </PickerSection>

        {/* Leitura — escolher o tempo aqui é escolher o plano */}
        <PickerSection title={t('routine.sectionReading', undefined, lang)} sub={t('routine.sectionReadingSub', undefined, lang)} icon="BookOpen" color={ROUTINE_STEP_COLORS.reading}>
          {/* Sessão de hoje — mesmos dados de session.todaySession que a Home
              já mostra (ver App.jsx), só que aqui dentro da aba Rotina, que
              agora concentra tudo sobre o plano de leitura. O botão leva
              direto pra tela de leitura (mesmo onContinueSession da Home). */}
          <div style={{ ...styles.todaySessionCard, ...(isAiPlan ? styles.todaySessionCardAi : {}) }}>
            <div className="today-session-row">
              <div>
                <div style={styles.todaySessionBadge}>
                  <span style={styles.todaySessionDot} />
                  <span style={styles.todaySessionBlock}>{todaySession.block}</span>
                </div>
                <h4 style={styles.todaySessionTitle}>{todaySession.title}</h4>
                <p style={styles.todaySessionSub}>{todaySession.subtitle}</p>
              </div>
              <button className="today-session-btn-desktop" style={{ ...styles.todaySessionBtn, ...(isAiPlan ? { color: '#A21CAF' } : {}) }} onClick={onContinueSession}>
                {readingCtaLabel} <AppIcon name="ChevronRight" size={15} />
              </button>
            </div>
            <div style={styles.todaySessionProgressBar}>
              <div style={{ ...styles.todaySessionProgressFill, width: `${todaySession.progress}%` }} />
            </div>
          </div>

          {/* Resumo do plano ativo — escolher/trocar de plano agora é só na
              aba Plano (ver PlanScreen.jsx), que reúne fixos + temas +
              cronológico numa lista única com botão "Escolher". */}
          <div className="plan-row-desktop">
            <div style={styles.activePlanSummary}>
              <span style={{ ...styles.activePlanSummaryIcon, background: isAiPlan ? '#A21CAF' : ROUTINE_STEP_COLORS.reading }}>
                <AppIcon name={activePlan.icon} size={15} color="white" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={styles.activePlanSummaryLabel}>{activePlan.label}</span>
                <span style={styles.activePlanSummarySub}>
                  {activePlan.readingMinutes != null ? t('journey.minPerDay', { n: activePlan.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
                </span>
              </span>
              <button style={styles.changePlanBtn} onClick={() => onNavigate?.('plan')}>
                {t('routine.changePlan', undefined, lang)}
              </button>
            </div>

            <div className="plan-stats-inline" style={{ marginTop: 8 }}>
              <div style={styles.readingStatsRow}>
                <div style={styles.readingStat}>
                  <span style={styles.readingStatN}>{doneSessions}/{totalSessions}</span>
                  <span style={styles.readingStatL}>{t('journey.sessionsStat', undefined, lang)}</span>
                </div>
              </div>
            </div>
          </div>
        </PickerSection>

        {/* Reflexão */}
        <PickerSection
          title={t('routine.sectionReflection', undefined, lang)} sub={t('routine.sectionReflectionSub', undefined, lang)} icon="PenLine" color={ROUTINE_STEP_COLORS.reflection} inline
          footer={
            <button style={{ ...styles.sectionGoBtn, background: ROUTINE_STEP_COLORS.reflection }} onClick={() => onNavigate?.('reflection')}>
              {t('routine.goToReflection', undefined, lang)} <AppIcon name="ChevronRight" size={14} />
            </button>
          }
        >
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
        </PickerSection>

        {/* Calendário mensal — visão completa de quais dias tiveram cada
            passo concluído, não só as últimas semanas (complementa o card
            de constância logo abaixo, que é semanal). Mesmo componente
            usado na Home (ver src/components/RoutineCalendar.jsx). */}
        <div style={styles.calendarCard}>
          <p style={styles.calendarCardTitle}>{t('progress.routineCalendarTitle', undefined, lang)}</p>
          <p style={styles.calendarCardSub}>{t('progress.routineCalendarSub', undefined, lang)}</p>
          <RoutineCalendar dailyRoutine={session.dailyRoutine} lang={lang} />
        </div>

        {/* Constância da rotina — dias/semana em que cada passo foi feito
            nas últimas 4 semanas (movida da aba Progresso pra cá, mais perto
            de onde a pessoa já está configurando a rotina). */}
        <RoutineUsageCard dailyRoutine={session.dailyRoutine} lang={lang} />
      </div>
    </div>
  )
}

// footer fica FORA do wrapper "inline" de propósito — no desktop, esse
// wrapper vira uma linha (cabeçalho + seletor de duração lado a lado, ver
// .picker-section-inline no index.css); um botão de largura cheia dentro
// dela viraria mais um item espremido nessa linha em vez de ficar embaixo.
function PickerSection({ title, sub, icon, color, children, inline, footer }) {
  return (
    <div style={styles.section}>
      <div className={inline ? 'picker-section-inline' : undefined}>
        <div style={styles.sectionHeader}>
          <span style={{ ...styles.sectionIcon, background: `${color}1A` }}>
            <AppIcon name={icon} size={15} color={color} />
          </span>
          <div>
            <span style={styles.sectionTitle}>{title}</span>
            {sub && <p style={styles.sectionSub}>{sub}</p>}
          </div>
        </div>
        {children}
      </div>
      {footer}
    </div>
  )
}

// Métrica de constância — um mini gráfico de barras com o número de dias
// (não %) em que cada um dos 3 passos foi feito, semana a semana, pra dar
// uma noção de uso recente (não só o streak atual, que zera fácil) — mais
// granular que uma visão mensal, mostra quedas de constância bem mais cedo.
// Mais a média de dias/semana com a rotina completa, num bloco de métrica à
// parte, igual aos outros cards de métrica da tela. (Movida de
// ProgressScreen.jsx pra cá.)
function RoutineUsageCard({ dailyRoutine, lang }) {
  // 4 semanas (não 6) — com 3 anéis por semana + rótulo de data, 6 colunas
  // não cabiam na largura do card num celular comum e a última (a semana
  // atual, a mais importante) ficava cortada. Ela continua sempre por
  // último (à direita), agora com uma caixa própria pra se destacar das
  // outras 3, que só servem de contexto histórico.
  const weeks = computeWeeklyRoutineStats(dailyRoutine ?? {}, 4)
  const hasAnyData = weeks.some(w => w.prayerDays > 0 || w.readingDays > 0 || w.reflectionDays > 0)
  const MAX_DAYS = 7 // escala fixa da semana (não os totalDays parciais da semana atual)
  const avgFullDays = averageFullRoutineDays(weeks)

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
                  <div style={styles.routineUsageRings}>
                    <StepRing days={w.prayerDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.prayer} />
                    <StepRing days={w.readingDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.reading} />
                    <StepRing days={w.reflectionDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.reflection} />
                  </div>
                  <span style={{ ...styles.routineUsageMonthLabel, ...(isCurrent ? styles.routineUsageMonthLabelCurrent : {}) }}>
                    {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'numeric' }).format(w.start)}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={styles.routineUsageLegend}>
            <UsageLegendDot color={ROUTINE_STEP_COLORS.prayer} label={t('home.routinePrayer', undefined, lang)} />
            <UsageLegendDot color={ROUTINE_STEP_COLORS.reading} label={t('home.routineReading', undefined, lang)} />
            <UsageLegendDot color={ROUTINE_STEP_COLORS.reflection} label={t('home.routineReflection', undefined, lang)} />
          </div>

          {/* Média — bloco de métrica à parte, mesmo estilo do card "Sessões restantes" da aba Progresso */}
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

// Ring pequeno estilo Apple Fitness — um por passo, por semana. O
// preenchimento é só visual (dias/MAX_DAYS); o número que importa (dias da
// semana) já vem escrito em cima, então o ring não precisa carregar rótulo
// nenhum.
function StepRing({ days, maxDays, color, size = 16, strokeWidth = 2.5 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const frac = maxDays ? Math.min(1, days / maxDays) : 0
  const offset = c - frac * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g2)" strokeWidth={strokeWidth} />
      {frac > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      )}
    </svg>
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

  section:     { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  sectionSub:  { fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },

  readingStatsRow: { display: 'flex', gap: 6, marginTop: 8 },
  readingStat:     { flex: 1, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 },
  readingStatN:    { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--bk)', lineHeight: 1 },
  readingStatL:    { fontSize: 8.5, fontWeight: 600, color: 'var(--g4)' },

  todaySessionCard:   { position: 'relative', background: 'var(--grad-vivid)', borderRadius: 15, padding: '13px 14px 14px', marginBottom: 12, boxShadow: 'var(--shadow-glow)' },
  todaySessionCardAi: { background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 10px 28px rgba(162,28,175,.35)' },
  todaySessionBadge:  { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 },
  todaySessionDot:    { width: 5, height: 5, borderRadius: '50%', background: 'white' },
  todaySessionBlock:  { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.85)', textTransform: 'uppercase', letterSpacing: 0.4 },
  todaySessionTitle:  { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'white', marginBottom: 2, lineHeight: 1.2 },
  todaySessionSub:    { fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.75)', marginBottom: 10 },
  todaySessionProgressBar:  { height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  todaySessionProgressFill: { height: '100%', background: 'white', borderRadius: 99 },
  todaySessionBtn:    { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'white', border: 'none', borderRadius: 12, padding: 11, fontSize: 12.5, fontWeight: 800, color: 'var(--or)', cursor: 'pointer', fontFamily: 'var(--font)' },

  activePlanSummary:     { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '8px 8px 8px 9px' },
  activePlanSummaryIcon: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activePlanSummaryLabel:{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activePlanSummarySub:  { display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' },
  changePlanBtn:         { flexShrink: 0, border: 'none', borderRadius: 8, padding: '7px 11px', fontSize: 10, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--grad-primary)' },

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
  routineUsageRings:      { display: 'flex', alignItems: 'center', gap: 2 },
  routineUsageMonthLabel: { fontSize: 8.5, fontWeight: 600, color: 'var(--g4)', textTransform: 'capitalize' },
  routineUsageMonthLabelCurrent: { color: 'var(--or)', fontWeight: 800 },
  routineUsageLegend:     { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },

  calendarCard:      { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 15, boxShadow: 'var(--shadow-card)' },
  calendarCardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--bk)' },
  calendarCardSub:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, marginBottom: 12 },
}
