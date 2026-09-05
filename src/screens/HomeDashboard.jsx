// HomeDashboard.jsx — Início com painel de métricas (quadro 12a).
//
// Entra no lugar da Home de uma decisão (3c, HomeScreen.jsx) depois da
// primeira semana cumprida — ver shouldShowDashboard abaixo. Painel
// primeiro (constância das últimas 9 semanas, três números que só sobem,
// onde a pessoa está, a semana), e a ação continua a um toque na barra
// escura fixa acima da navegação — ela não rola com o painel.
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatToday, greetingFor } from './HomeScreen'
import { computeCurrentWeekDays, WEEKDAY_LETTERS } from '../routine/weekRings'
import { isDayGoalMet, computeRecentWeeksStatus, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

const CARD_STEPS = ['prayer', 'reading', 'reflection']
const FONT = 'var(--font-bento)'
const WEEKS_BACK = 9
const FIRST_DAYS = 7

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

// Regra do quadro 12a: nos primeiros 7 dias, e sempre que o painel estiver
// zerado, a Home é 3c — o painel só entra depois da primeira semana
// cumprida. "Primeiro dia" é a entrada mais antiga da rotina diária.
export function shouldShowDashboard(session) {
  const { dailyRoutine, weeksInGoal, chaptersRead } = session
  if (!weeksInGoal || !chaptersRead) return false
  const keys = Object.keys(dailyRoutine ?? {}).sort()
  if (!keys.length) return false
  const [y, m, d] = keys[0].split('-').map(Number)
  const first = new Date(y, m - 1, d)
  const ageDays = (Date.now() - first.getTime()) / 86400000
  return ageDays >= FIRST_DAYS
}

export default function HomeDashboard({ session, readingSeconds = 0, onContinueSession, onNavigate, onStartGuided }) {
  const {
    lang, hasPremium, userName, avatarInitials, todaySession, weeksInGoal,
    biblePercent, chaptersRead, totalChapters, booksCompleted, currentBlock,
    dailyRoutine, todayRoutine, routineModules, plan, activePlan,
    weeklyGoalDays, weekGoalDaysMet,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)
  const locale = lang === 'en' ? 'en' : 'pt-BR'
  const fmt = n => n.toLocaleString(locale)
  const pct1 = n => n.toLocaleString(locale, { maximumFractionDigits: 1 }) + '%'

  // ── Barra de ação (mesma decisão da Home 3c) ──
  const enabledSteps = CARD_STEPS.filter(s => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s))
  const stepDone = { prayer: !!todayRoutine.prayer, reading: !!todayRoutine.reading, reflection: !!todayRoutine.reflection }
  const currentStepKey = enabledSteps.find(s => !stepDone[s]) ?? 'reading'
  const currentIndex = Math.max(0, enabledSteps.indexOf(currentStepKey))
  const isReadingStep = currentStepKey === 'reading'
  const stepMinMap = {
    prayer: getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 0,
    reading: activePlan.readingMinutes ?? plan.readingMinutes ?? 0,
    reflection: getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 0,
  }
  const currentMin = stepMinMap[currentStepKey]
  const actionTitle = todaySession.needsThemePick
    ? todaySession.title
    : isReadingStep ? todaySession.title : translate(`home.routine${cap(currentStepKey)}`, undefined, lang)
  const actionLabel = todaySession.needsThemePick
    ? translate('themePlan.chooseTodayCta', undefined, lang)
    : L('resumeRoutine')
  function handleStart() {
    if (todaySession.needsThemePick) { onNavigate?.('routine'); return }
    if (hasPremium && onStartGuided) onStartGuided()
    else onContinueSession?.()
  }

  // ── Constância · últimas 9 semanas ──
  const goalDays = weeklyGoalDays ?? 5
  const weeks = computeRecentWeeksStatus(dailyRoutine ?? {}, goalDays, WEEKS_BACK)

  // ── Esta semana ──
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const daysMet = weekGoalDaysMet ?? 0

  const hours = Math.floor(readingSeconds / 3600)
  const blockPct = Math.max(0, Math.min(100, currentBlock?.percent ?? 0))

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div>
          <p style={s.greeting}>{greetingFor(lang, userName)}</p>
          <p style={s.date}>{formatToday(lang)}</p>
        </div>
        <button style={s.avatar} onClick={() => onNavigate?.('profile')} aria-label={translate('nav.profile', undefined, lang)}>
          {avatarInitials}
        </button>
      </div>

      <div style={s.body}>
        {/* Constância */}
        <button style={s.darkCard} onClick={() => onNavigate?.('stats')}>
          <div style={s.darkHead}>
            <p style={s.darkLabel}>{L('dashConstancy')}</p>
            <span style={s.darkHint}>{L('dashLastWeeks')}</span>
          </div>
          <div style={s.bigRow}>
            <p style={s.bigNumber}>{weeksInGoal}</p>
            <p style={s.bigCaption}>{L('dashWeeksInGoal')}</p>
          </div>
          <div style={s.bars}>
            {weeks.map((w, i) => {
              const ratio = Math.min(1, w.daysMet / goalDays)
              const height = `${Math.max(8, Math.round(ratio * 100))}%`
              const background = w.isCurrent ? 'rgba(255,255,255,.18)' : w.met ? 'var(--bento-accent)' : 'rgba(240,102,43,.45)'
              return <div key={i} style={{ flex: 1, height, borderRadius: 5, background }} />
            })}
          </div>
          <p style={s.darkNote}>{L('dashBarNote')}</p>
        </button>

        {/* Três números que só sobem */}
        <div style={s.statsRow}>
          <button style={s.statCard} onClick={() => onNavigate?.('stats')}>
            <p style={s.statNumber}>{fmt(chaptersRead)}</p>
            <p style={s.statLabel}>{L('dashChapters')}</p>
          </button>
          <button style={s.statCard} onClick={() => onNavigate?.('stats')}>
            <p style={s.statNumber}>{fmt(hours)}<span style={s.statUnit}>h</span></p>
            <p style={s.statLabel}>{L('dashHours')}</p>
          </button>
          <button style={{ ...s.statCard, background: 'var(--bento-sand)' }} onClick={() => onNavigate?.('stats')}>
            <p style={{ ...s.statNumber, color: 'var(--bento-sand-icon)' }}>{fmt(booksCompleted)}</p>
            <p style={{ ...s.statLabel, color: 'var(--bento-sand-label)' }}>{L('dashBooks')}</p>
          </button>
        </div>

        {/* Onde você está */}
        <button style={s.whereCard} onClick={() => onNavigate?.('journey')}>
          <div style={s.whereHead}>
            <p style={s.cardLabel}>{L('dashWhere', { block: currentBlock?.name ?? '' })}</p>
            <span style={s.wherePct}>{pct1(blockPct)}</span>
          </div>
          <p style={s.whereTitle}>
            {currentBlock?.chapter != null && currentBlock?.bookChapters
              ? L('dashBookOf', { book: currentBlock.book, n: currentBlock.chapter, total: currentBlock.bookChapters })
              : todaySession.title}
          </p>
          <div style={s.whereBar}><div style={{ width: `${blockPct}%`, height: 10, borderRadius: 99, background: 'var(--bento-accent)' }} /></div>
          <p style={s.whereFoot}>{L('dashBibleFoot', { pct: pct1(biblePercent), done: fmt(chaptersRead), total: fmt(totalChapters) })}</p>
        </button>

        {/* Esta semana */}
        <div style={s.weekCard}>
          <div style={s.weekHead}>
            <p style={s.cardLabel}>{translate('routine.weekSectionLabel', undefined, lang)}</p>
            <p style={s.weekCount}>
              <span style={s.weekCountStrong}>
                {translate(daysMet === 1 ? 'routine.weekCompletedOfOne' : 'routine.weekCompletedOfMany', { n: daysMet }, lang)}
              </span>{' '}
              {translate('routine.weekCompletedOfSuffix', { total: goalDays }, lang)}
            </p>
          </div>
          <div style={s.weekGrid}>
            {weekDays.map((d, i) => {
              const done = !d.isFuture && isDayGoalMet(d)
              const state = done ? 'done' : d.isToday ? 'today' : 'other'
              return (
                <div key={d.key} style={s.weekDayCol}>
                  <span style={{ ...s.weekDaySquare, ...s.weekDaySquare_[state] }}>
                    {state === 'done' && <AppIcon name="Check" size={14} color="var(--bento-ink)" strokeWidth={2.8} />}
                  </span>
                  <span style={{ ...s.weekDayLetter, ...s.weekDayLetter_[state] }}>{letters[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Ação fixa acima da navegação — não rola com o painel. */}
      <div style={s.actionWrap}>
        <div style={s.actionBar}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.actionLabel}>{translate('routine.nowStepOf', { i: currentIndex + 1, total: enabledSteps.length }, lang)}</p>
            <p style={s.actionTitle}>
              {actionTitle}
              {!todaySession.needsThemePick && !!currentMin && (
                <span style={s.actionMin}> · {translate('routine.minShort', { n: currentMin }, lang)}</span>
              )}
            </p>
          </div>
          <button style={s.actionBtn} onClick={handleStart}>
            <span style={s.actionBtnText}>{actionLabel}</span>
            <span style={s.actionBtnArrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Medidas do quadro 12a.
const s = {
  screen: { background: 'var(--bento-bg)', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 'var(--nav-height)', boxSizing: 'border-box' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 0' },
  greeting: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  date: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  avatar: {
    width: 36, height: 36, flexShrink: 0, borderRadius: 14, border: 'none', padding: 0, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: '36px', color: 'var(--bento-bg)',
  },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  darkCard: { flex: 'none', borderRadius: 28, background: 'var(--bento-ink)', padding: 20, color: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: FONT },
  darkHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  darkHint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.38)' },
  bigRow: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 14px' },
  bigNumber: { fontFamily: FONT, fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', margin: 0, color: '#fff' },
  bigCaption: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', margin: 0, whiteSpace: 'pre-line' },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 44, margin: '0 0 10px' },
  darkNote: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.45)', margin: 0 },

  statsRow: { flex: 'none', display: 'flex', gap: 8 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 20, border: 'none', background: 'var(--bento-card)', padding: '14px 13px', textAlign: 'left', cursor: 'pointer', fontFamily: FONT },
  statNumber: { fontFamily: FONT, fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  statUnit: { fontSize: 19, letterSpacing: '-.6px' },
  statLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0, whiteSpace: 'pre-line' },

  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  whereCard: { flex: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: FONT, width: '100%' },
  whereHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 10px' },
  wherePct: { fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1, color: 'var(--bento-accent)' },
  whereTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.9px', color: 'var(--bento-ink)', margin: '0 0 12px' },
  whereBar: { height: 10, borderRadius: 99, background: 'var(--bento-line)', margin: '0 0 10px', overflow: 'hidden' },
  whereFoot: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t5)', margin: 0 },

  weekCard: { flex: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  weekCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)', margin: 0 },
  weekCountStrong: { fontWeight: 800, color: 'var(--bento-ink)' },
  weekGrid: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  weekDayCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 },
  weekDaySquare: { width: 28, height: 28, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  weekDaySquare_: {
    done: { background: 'var(--bento-accent)' },
    today: { border: '2px dashed var(--bento-accent)' },
    other: { background: 'var(--bento-line)' },
  },
  weekDayLetter: { fontFamily: FONT, fontSize: 9.5, lineHeight: 1 },
  weekDayLetter_: {
    done: { fontWeight: 800, color: 'var(--bento-ink)' },
    today: { fontWeight: 800, color: 'var(--bento-accent)' },
    other: { fontWeight: 600, color: 'var(--bento-t5)' },
  },

  actionWrap: { flex: 'none', padding: '10px 20px 8px' },
  actionBar: { borderRadius: 22, background: 'var(--bento-ink)', padding: '10px 10px 10px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  actionLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 6px' },
  actionTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1, letterSpacing: '-.6px', color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actionMin: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1, letterSpacing: 0, color: 'rgba(255,255,255,.45)' },
  actionBtn: { flex: 'none', height: 46, borderRadius: 15, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, cursor: 'pointer' },
  actionBtnText: { fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  actionBtnArrow: { fontFamily: FONT, fontSize: 14, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
}
