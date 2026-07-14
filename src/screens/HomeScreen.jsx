// HomeScreen.jsx
// Tela inicial com % da Bíblia em destaque, sessão do dia e stats

import { useState, useEffect } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ActivityFeedItem from '../components/ActivityFeedItem'
import { getFriendsActivity } from '../activity/activityStore'
import { isDayComplete } from '../routine/routineStreak'
import { dateKey } from '../utils/dateKey'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { PLANS } from '../data/bibleBlocks'

export default function HomeScreen({ session, onContinueSession, onNavigate, onMarkRoutineStep, onSelectPlan }) {
  const {
    userName, biblePercent, atPercent, ntPercent,
    streak, todaySession, chaptersRead,
    level, nextLevel, levelPercent, xpForNext, lang,
    dailyRoutine, todayRoutine, plan,
  } = session

  const [friendActivity, setFriendActivity] = useState([])
  useEffect(() => {
    getFriendsActivity(3).then(setFriendActivity).catch(err => console.error('Failed to load friend activity', err))
  }, [])

  // Calcula o offset do anel SVG (circunferência = 2π×38 ≈ 238.76)
  const CIRCUMFERENCE = 238.76
  const offset = CIRCUMFERENCE - (biblePercent / 100) * CIRCUMFERENCE

  const ctaLabel =
    todaySession.progress === 100 ? translate('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? translate('home.continueSession', undefined, lang)
    : translate('home.startSession', undefined, lang)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: 83 }}>

      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <div style={styles.heroContent}>

          {/* Saudação + slogan do app */}
          <div>
            <p style={styles.greeting}>{translate('home.greeting', { name: userName }, lang)}</p>
            <h2 style={styles.sessionTitle}>{translate('auth.tagline', undefined, lang)}</h2>
          </div>

        </div>
      </div>

      {/* ── Corpo (sheet flutuante sobre o hero) ── */}
      <div style={styles.body}>

        {/* Tutorial do método (recolhido por padrão) — logo no topo, igual ao design original */}
        <TutorialCard lang={lang} />

        <div className="dashboard-grid">

          {/* Coluna primária: o que importa fazer hoje — leitura + rotina.
              Vem primeiro no DOM (logo primeiro no mobile) porque é o que
              o usuário quer em destaque, à frente do anel de %. */}
          <div className="dashboard-col">

            {/* Card de hoje — sessão de leitura em destaque */}
            <div>
              <div className="section-header">
                <h3 className="section-title">
                  {plan.id === 'free' ? translate('home.todayReadingHeader', undefined, lang) : translate('home.todaySessionHeader', { n: todaySession.number }, lang)}
                </h3>
              </div>
              <div style={styles.todayCard} data-tour="home-today-card">
                <div style={styles.todayAccent} />
                <div style={styles.todayBadge}>
                  <span style={styles.todayDot} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--or)' }}>{todaySession.block}</span>
                </div>
                <h3 style={styles.todayTitle}>{todaySession.title}</h3>
                <p style={styles.todaySub}>{todaySession.subtitle}</p>

                {/* Seletor de plano — trocar o ritmo de leitura sem sair da
                    Home, já que aqui é onde a leitura do dia é decidida. O
                    Livre fica numa linha própria embaixo (é um tipo de
                    leitura diferente, não só mais um tamanho de sessão). */}
                <div style={styles.planSel} data-tour="home-plan-select">
                  {PLANS.filter(p => p.id !== 'free').map(p => (
                    <button
                      key={p.id}
                      style={{ ...styles.planBtn, ...(plan.id === p.id ? styles.planBtnActive : {}) }}
                      onClick={() => onSelectPlan?.(p.id)}
                    >
                      {lang === 'en' ? p.labelEn : p.label}
                    </button>
                  ))}
                </div>
                {PLANS.filter(p => p.id === 'free').map(p => (
                  <button
                    key={p.id}
                    style={{ ...styles.planBtnFree, ...(plan.id === p.id ? styles.planBtnActive : {}) }}
                    onClick={() => onSelectPlan?.(p.id)}
                  >
                    {lang === 'en' ? p.labelEn : p.label}
                  </button>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)' }}>{translate('home.todayProgress', undefined, lang)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--or)' }}>{todaySession.progress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${todaySession.progress}%` }} />
                </div>
                <button style={styles.continueBtn} onClick={onContinueSession}>
                  {ctaLabel}
                </button>
              </div>
            </div>

            {/* Tracker dos 3 passos diários — clicável, navega pra onde cada
                passo é feito de verdade (oração/leitura), com um calendário
                de histórico embutido. */}
            <DailyRoutineCard
              dailyRoutine={dailyRoutine}
              todayRoutine={todayRoutine}
              plan={plan}
              lang={lang}
              onNavigate={onNavigate}
              onContinueSession={onContinueSession}
              onMarkRoutineStep={onMarkRoutineStep}
            />
          </div>

          {/* Coluna secundária: progresso geral (% da Bíblia, nível, stats,
              atividade dos amigos) — continua tudo aqui, só com menos peso
              visual que a coluna de hoje/rotina. */}
          <div className="dashboard-col">

            {/* Destaque % da Bíblia */}
            <div style={styles.pctHero} data-tour="home-bible-ring">
              <div style={styles.pctHeroGlow} />

              {/* Anel SVG */}
              <div style={styles.ringWrap}>
                <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
                  <circle cx="44" cy="44" r="38" fill="none" stroke="white" strokeWidth="7"
                    strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div style={styles.ringText}>
                  <span style={styles.ringNum}>{biblePercent}</span>
                  <span style={styles.ringPct}>%</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                <div>
                  <p style={styles.pctLabel}>{translate('home.bibleReadLabel', undefined, lang)}</p>
                  <p style={styles.pctTitle}>{translate('progress.bibleComplete', undefined, lang)}: {biblePercent}%</p>
                  <p style={styles.pctSub}>{translate('home.chaptersRead', { n: chaptersRead }, lang)} · {streak} {lang === 'en' ? 'days' : 'dias'} <AppIcon name="Flame" size={11} style={{ verticalAlign: 'middle' }} /></p>
                </div>
                {/* Barras AT/NT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <BarRow label="AT" pct={atPercent}  color="#FFFFFF" />
                  <BarRow label="NT" pct={ntPercent}  color="#FFFFFF" />
                </div>
              </div>
            </div>

            {/* Nível e XP */}
            <LevelCard level={level} nextLevel={nextLevel} percent={levelPercent} xpForNext={xpForNext} lang={lang} />

            {/* Stats */}
            <div>
              <div className="section-header"><h3 className="section-title">{translate('home.thisWeek', undefined, lang)}</h3></div>
              <div style={styles.statsRow}>
                <StatCard value={streak}       suffix={<AppIcon name="Flame" size={12} />} label={translate('home.streakLabel', undefined, lang)}  theme="orange" />
                <StatCard value={level.level}  suffix=""   label={level.title}    theme="purple" />
                <StatCard value={Math.round((100 - biblePercent) * 10) / 10} suffix="%" label={translate('home.remainingLabel', undefined, lang)} theme="green"  />
              </div>
            </div>

            {/* Atividade dos amigos (versão compacta — a completa mora na aba Comunidade) */}
            {friendActivity.length > 0 && (
              <div>
                <div className="section-header">
                  <h3 className="section-title">{translate('activity.homeTitle', undefined, lang)}</h3>
                  <span className="section-link" onClick={() => onNavigate?.('groups')}>{translate('activity.seeAll', undefined, lang)}</span>
                </div>
                <div style={styles.activityCard}>
                  {friendActivity.map((a, i) => (
                    <div key={a.id} style={{ paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? '0.5px solid var(--g1)' : 'none' }}>
                      <ActivityFeedItem activity={a} lang={lang} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function LevelCard({ level, nextLevel, percent, xpForNext, lang }) {
  return (
    <div style={styles.levelCard}>
      <div style={styles.levelEmoji}><AppIcon name={level.icon} size={24} color="var(--or)" /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={styles.levelTitle}>{lang === 'en' ? 'Level' : 'Nível'} {level.level} · {level.title}</span>
        </div>
        <div style={styles.levelBar}>
          <div style={{ ...styles.levelBarFill, width: `${percent}%` }} />
        </div>
        <p style={styles.levelSub}>
          {nextLevel
            ? <>{translate('home.xpToNext', { n: xpForNext, title: nextLevel.title }, lang)} <AppIcon name={nextLevel.icon} size={11} style={{ verticalAlign: 'middle' }} /></>
            : translate('home.maxLevel', undefined, lang)}
        </p>
      </div>
    </div>
  )
}

function TutorialCard({ lang }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={styles.tutorialCard}>
      <button style={styles.tutorialToggle} onClick={() => setOpen(v => !v)}>
        <span style={styles.tutorialEmoji}><AppIcon name="Lightbulb" size={20} color="var(--or)" /></span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={styles.tutorialToggleTitle}>{translate('home.tutorialToggleTitle', undefined, lang)}</p>
          <p style={styles.tutorialToggleSub}>{translate('home.tutorialToggleSub', undefined, lang)}</p>
        </div>
        <span style={{ fontSize: 14, color: 'var(--g4)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>

      {open && (
        <div style={styles.tutorialBody}>
          <p style={styles.tutorialIntro}>
            {translate('home.tutorialIntro', undefined, lang)}
          </p>

          <TutorialStep
            icon="HandHeart" time={translate('home.stepPrayerTime', undefined, lang)} title={translate('home.stepPrayerTitle', undefined, lang)} theme="orange"
            desc={translate('home.stepPrayerDesc', undefined, lang)}
          />
          <TutorialStep
            icon="BookOpen" time={translate('home.stepReadingTime', undefined, lang)} title={translate('home.stepReadingTitle', undefined, lang)} theme="purple"
            desc={translate('home.stepReadingDesc', undefined, lang)}
          />
          <TutorialStep
            icon="PenLine" time={translate('home.stepReflectionTime', undefined, lang)} title={translate('home.stepReflectionTitle', undefined, lang)} theme="green"
            desc={translate('home.stepReflectionDesc', undefined, lang)}
          />

          <div style={styles.tutorialTip}>
            {translate('home.tutorialTip', undefined, lang)}
          </div>

          <div style={styles.tutorialTipPurple}>
            {translate('home.tutorialTipBonus', undefined, lang)}
          </div>

          <p style={styles.tutorialOutro}>{translate('home.tutorialOutro', undefined, lang)}</p>
        </div>
      )}
    </div>
  )
}

function TutorialStep({ icon, time, title, desc, theme }) {
  const t = STAT_THEMES[theme]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ ...styles.tutorialStepIcon, background: t.bg }}><AppIcon name={icon} size={16} color={t.color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={styles.tutorialStepTitle}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{time}</span>
        </div>
        <p style={styles.tutorialStepDesc}>{desc}</p>
      </div>
    </div>
  )
}

/* ── "Sua rotina com Deus" — 3 passos diários clicáveis + calendário de
   histórico. A linha inteira de Oração e Leitura navega pra onde o passo é
   feito de verdade; os dois também têm um ícone-checkbox próprio (clique
   separado, com stopPropagation, sem navegar) pra quem já orou/leu fora do
   app e só quer marcar. Reflexão não tem uma tela própria, então o toggle
   acontece direto no card, na linha inteira. ── */
function DailyRoutineCard({ dailyRoutine, todayRoutine, plan, lang, onNavigate, onContinueSession, onMarkRoutineStep }) {
  const [showCalendar, setShowCalendar] = useState(false)

  // Os 3 passos sempre aparecem (ver PLANS[].modules em bibleBlocks.js) — o
  // que muda de um plano pro outro é a duração de cada um
  // (prayerMinutes/reflectionMinutes), mostrada aqui no subtítulo.
  const allSteps = [
    {
      key: 'prayer', icon: 'HandHeart', color: ROUTINE_STEP_COLORS.prayer,
      title: translate('home.routinePrayer', undefined, lang),
      sub: translate('home.routinePrayerSub', { min: plan.prayerMinutes }, lang),
      done: !!todayRoutine.prayer,
      onClick: () => onNavigate?.('prayer'),
      onToggleCheck: () => onMarkRoutineStep?.('prayer', !todayRoutine.prayer),
    },
    {
      key: 'reading', icon: 'BookOpen', color: ROUTINE_STEP_COLORS.reading,
      title: translate('home.routineReading', undefined, lang),
      sub: plan.readingMinutes == null
        ? translate('home.routineReadingSubFree', undefined, lang)
        : translate('home.routineReadingSub', { min: plan.readingMinutes }, lang),
      done: !!todayRoutine.reading,
      onClick: () => onContinueSession?.(),
      onToggleCheck: () => onMarkRoutineStep?.('reading', !todayRoutine.reading),
    },
    {
      key: 'reflection', icon: 'PenLine', color: ROUTINE_STEP_COLORS.reflection,
      title: translate('home.routineReflection', undefined, lang),
      sub: translate('home.routineReflectionSub', { min: plan.reflectionMinutes }, lang),
      done: !!todayRoutine.reflection,
      onClick: () => onNavigate?.('reflection'),
      onToggleCheck: () => onMarkRoutineStep?.('reflection', !todayRoutine.reflection),
    },
  ]
  const steps = allSteps.filter(s => plan.modules.includes(s.key))
  const doneCount = steps.filter(s => s.done).length
  // O primeiro passo ainda não feito ganha destaque — é "pra onde seguir"
  // depois de terminar o anterior.
  const nextIndex = steps.findIndex(s => !s.done)

  return (
    <div style={styles.routineCard} data-tour="home-routine-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <p style={styles.routineTitle}>{translate('home.routineTitle', undefined, lang)}</p>
          <p style={styles.routineSub}>{translate('home.routineStepsCount', { done: doneCount, total: steps.length }, lang)}</p>
        </div>
        <button style={styles.routineCalendarToggle} onClick={() => setShowCalendar(v => !v)}>
          <AppIcon name="Calendar" size={13} />
          {translate(showCalendar ? 'home.routineHideCalendar' : 'home.routineViewCalendar', undefined, lang)}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isNext = i === nextIndex
          return (
            <button
              key={step.key}
              style={{
                ...styles.routineStepRow,
                ...(step.done ? styles.routineStepRowDone : {}),
                ...(isNext ? { borderColor: step.color } : {}),
              }}
              onClick={step.onClick}
            >
              {step.onToggleCheck ? (
                <span
                  role="button"
                  aria-label={translate('home.routineMarkDone', undefined, lang)}
                  style={{ ...styles.routineStepIcon, background: step.done ? step.color : 'var(--g1)', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); step.onToggleCheck() }}
                >
                  {step.done
                    ? <AppIcon name="Check" size={16} color="white" />
                    : <AppIcon name={step.icon} size={16} color="var(--g4)" />}
                </span>
              ) : (
                <div style={{ ...styles.routineStepIcon, background: step.done ? step.color : 'var(--g1)' }}>
                  {step.done
                    ? <AppIcon name="Check" size={16} color="white" />
                    : <AppIcon name={step.icon} size={16} color="var(--g4)" />}
                </div>
              )}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={styles.routineStepTitle}>{step.title}</p>
                <p style={styles.routineStepSub}>{step.done ? translate('home.routineDoneTag', undefined, lang) : step.sub}</p>
              </div>
              <AppIcon name="ChevronRight" size={15} color="var(--g4)" />
            </button>
          )
        })}
      </div>

      {doneCount === steps.length && (
        <p style={styles.routineAllDone}>{translate('home.routineAllDoneMsg', undefined, lang)}</p>
      )}

      {showCalendar && <RoutineCalendar dailyRoutine={dailyRoutine} lang={lang} />}
    </div>
  )
}

function RoutineCalendar({ dailyRoutine, lang }) {
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay() // 0 = domingo

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i) // uma semana qualquer começando num domingo
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'narrow' }).format(d)
  })
  const monthLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' }).format(monthCursor)

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  function changeMonth(delta) {
    setMonthCursor(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d })
  }

  return (
    <div style={styles.calendarWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={styles.calendarNavBtn} onClick={() => changeMonth(-1)} aria-label="prev"><AppIcon name="ArrowLeft" size={14} /></button>
        <p style={styles.calendarMonthLabel}>{monthLabel}</p>
        <button style={styles.calendarNavBtn} onClick={() => changeMonth(1)} aria-label="next"><AppIcon name="ArrowLeft" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
      </div>
      <div style={styles.calendarGrid}>
        {weekdayLabels.map((w, i) => <span key={i} style={styles.calendarWeekday}>{w}</span>)}
        {cells.map((day, i) => {
          if (day == null) return <span key={i} />
          const dayData = dailyRoutine[dateKey(new Date(year, month, day))]
          const complete = isDayComplete(dayData)
          return (
            <div key={i} style={styles.calendarDayCell}>
              <span style={{ ...styles.calendarDayNum, ...(complete ? styles.calendarDayNumComplete : {}) }}>{day}</span>
              <div style={styles.calendarStepDots}>
                <span style={{ ...styles.calendarStepDot, background: dayData?.prayer ? ROUTINE_STEP_COLORS.prayer : 'var(--g2)' }} />
                <span style={{ ...styles.calendarStepDot, background: dayData?.reading ? ROUTINE_STEP_COLORS.reading : 'var(--g2)' }} />
                <span style={{ ...styles.calendarStepDot, background: dayData?.reflection ? ROUTINE_STEP_COLORS.reflection : 'var(--g2)' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.calendarLegend}>
        <LegendDot color={ROUTINE_STEP_COLORS.prayer} label={translate('home.routinePrayer', undefined, lang)} />
        <LegendDot color={ROUTINE_STEP_COLORS.reading} label={translate('home.routineReading', undefined, lang)} />
        <LegendDot color={ROUTINE_STEP_COLORS.reflection} label={translate('home.routineReflection', undefined, lang)} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' }}>{label}</span>
    </span>
  )
}

function BarRow({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, width: 26, flexShrink: 0, color }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, width: 28, textAlign: 'right', color }}>{pct}%</span>
    </div>
  )
}

const STAT_THEMES = {
  orange: { bg: 'linear-gradient(135deg,#FFF3E8,#FFDDB8)', border: 'rgba(249,115,22,.25)', color: '#EA580C' },
  purple: { bg: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: 'rgba(168,85,247,.25)', color: '#9333EA' },
  green:  { bg: 'linear-gradient(135deg,#E4FBEC,#C7F5D6)', border: 'rgba(22,163,74,.25)',  color: '#16A34A' },
}

function StatCard({ value, suffix, label, theme }) {
  const t = STAT_THEMES[theme]
  return (
    <div style={{ flex: 1, background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 15, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 21, fontWeight: 900, color: t.color, lineHeight: 1, marginBottom: 2, letterSpacing: '-1px' }}>
        {value}<span style={{ fontSize: 12, fontWeight: 700 }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--g6)' }}>{label}</div>
    </div>
  )
}

const styles = {
  routineCard:        { background: 'white', border: '0.5px solid var(--gold-soft)', borderRadius: 18, boxShadow: 'var(--shadow-premium)', padding: 14 },
  routineTitle:       { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--bk)', letterSpacing: '-0.1px' },
  routineSub:         { fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  routineCalendarToggle: { display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'var(--g1)', borderRadius: 20, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  routineStepRow:     { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: '1.5px solid var(--g1)', background: 'var(--g1)', borderRadius: 14, padding: 10, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  routineStepRowDone: { background: 'white', borderColor: 'var(--g1)' },
  routineStepIcon:    { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routineStepTitle:   { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  routineStepSub:     { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  routineAllDone:     { fontSize: 11, fontWeight: 700, color: 'var(--or)', textAlign: 'center', marginTop: 10 },
  calendarWrap:       { marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)' },
  calendarNavBtn:      { width: 26, height: 26, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  calendarMonthLabel: { fontSize: 12, fontWeight: 700, color: 'var(--bk)', textTransform: 'capitalize' },
  calendarGrid:       { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' },
  calendarWeekday:    { fontSize: 9, fontWeight: 700, color: 'var(--g4)', textTransform: 'uppercase', padding: '2px 0' },
  calendarDayCell:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '2px 0' },
  calendarDayNum:     { fontSize: 10, fontWeight: 600, color: 'var(--g6)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarDayNumComplete: { background: 'linear-gradient(135deg, var(--gold), var(--or))', color: 'white', fontWeight: 800 },
  calendarStepDots:   { display: 'flex', gap: 2 },
  calendarStepDot:    { width: 5, height: 5, borderRadius: 1.5, flexShrink: 0 },
  calendarLegend:      { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },
  tutorialCard:  { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  tutorialToggle:{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
  tutorialEmoji: { fontSize: 22, flexShrink: 0 },
  tutorialToggleTitle: { fontSize: 13, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  tutorialToggleSub:   { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  tutorialBody:  { padding: '2px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid var(--g1)', paddingTop: 13 },
  tutorialIntro: { fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55 },
  tutorialStepIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  tutorialStepTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  tutorialStepDesc:  { fontSize: 11, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginTop: 2 },
  tutorialTip:   { background: 'var(--olt)', border: '0.5px dashed rgba(249,115,22,.4)', borderRadius: 11, padding: 11, fontSize: 11, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5 },
  tutorialTipPurple: { background: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: '0.5px dashed rgba(168,85,247,.4)', borderRadius: 11, padding: 11, fontSize: 11, fontWeight: 500, color: '#6B21A8', lineHeight: 1.5 },
  tutorialOutro: { fontSize: 11, fontWeight: 700, color: 'var(--or)', textAlign: 'center' },
  hero:          { minHeight: 150, background: '#141414', position: 'relative', overflow: 'hidden', flexShrink: 0 },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.55, top: -80, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.35, bottom: -70, left: -50 },
  heroContent:   { position: 'relative', zIndex: 2, padding: '18px 20px 30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  greeting:      { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginBottom: 3 },
  sessionTitle:  { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, fontStyle: 'italic', color: 'white', lineHeight: 1.3, letterSpacing: '-0.2px' },
  body:          { flex: 1, background: 'var(--white)', borderRadius: '26px 26px 0 0', marginTop: -22, position: 'relative', zIndex: 3, boxShadow: '0 -12px 30px rgba(0,0,0,.05)', padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  pctHero:       { background: 'var(--grad-vivid)', borderRadius: 22, padding: 20, display: 'flex', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  pctHeroGlow:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -40 },
  ringWrap:      { position: 'relative', width: 88, height: 88, flexShrink: 0 },
  ringText:      { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  ringNum:       { fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-1px' },
  ringPct:       { fontSize: 10, fontWeight: 700, color: 'white' },
  pctLabel:      { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.75)', letterSpacing: 1.5, textTransform: 'uppercase' },
  pctTitle:      { fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.25, letterSpacing: '-0.2px' },
  pctSub:        { fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.7)' },
  todayCard:     { position: 'relative', background: 'var(--white)', border: '0.5px solid var(--gold-soft)', borderRadius: 20, padding: '16px 16px 16px 21px', overflow: 'hidden', boxShadow: 'var(--shadow-premium)' },
  todayAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: 'linear-gradient(180deg, var(--gold), var(--or))' },
  todayBadge:    { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(249,115,22,.12)', border: '0.5px solid rgba(249,115,22,.25)', borderRadius: 20, padding: '3px 9px', marginBottom: 10 },
  todayDot:      { width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', animation: 'pulse 2s infinite' },
  todayTitle:    { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--bk)', marginBottom: 4, lineHeight: 1.3, letterSpacing: '-0.2px' },
  todaySub:      { fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginBottom: 12 },
  planSel:       { display: 'flex', gap: 6, marginBottom: 6 },
  planBtn:       { flex: 1, textAlign: 'center', padding: '7px 4px', fontSize: 10, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  planBtnActive: { color: 'white', background: 'var(--grad-primary)', borderColor: 'transparent', boxShadow: 'var(--shadow-glow)' },
  planBtnFree:   { width: '100%', textAlign: 'center', padding: '7px 4px', fontSize: 10, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)', marginBottom: 12 },
  progressBar:   { height: 3, background: 'var(--g2)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: '100%', background: 'var(--grad-premium)', borderRadius: 99, transition: 'width 0.6s ease' },
  continueBtn:   { width: '100%', background: 'var(--grad-premium)', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-premium)' },
  statsRow:      { display: 'flex', gap: 8 },
  activityCard:  { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 13, boxShadow: 'var(--shadow-card)' },
  levelCard:     { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-card)' },
  levelEmoji:    { fontSize: 26, flexShrink: 0 },
  levelTitle:    { fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  levelBar:      { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  levelBarFill:  { height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  levelSub:      { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 5 },
}
