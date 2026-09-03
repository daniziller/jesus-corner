// HomeScreen.jsx — Início (redesign 1a)
//
// A Home é uma tela de UMA decisão: continuar a leitura de hoje. Em ordem:
// data → versículo do dia → cartão da ação principal (o único --grad-primary
// da tela) → "Sua semana" → bloco atual da Bíblia. Métricas (anel de %,
// AT/NT, níveis, conquistas, metas, feed de amigos) foram pra Progresso, que
// já apresenta melhor — ver design_handoff_jesus_corner/README.md.

import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import PremiumLockCard from '../components/PremiumLockCard'
import { getTodayUpliftingVerse } from '../utils/upliftingVerse'
import { computeCurrentWeekDays, WEEKDAY_LETTERS } from '../routine/weekRings'
import { isDayComplete, DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

// Passos que o "cartão da ação" resume (Estudo fica de fora, igual ao fluxo
// guiado — ver GUIDED_STEPS em App.jsx).
const CARD_STEPS = ['prayer', 'reading', 'reflection']
// Etapa 4 do redesign troca isto por weekly_goal_days (3–7). Fixo por ora.
const WEEKLY_GOAL_DAYS = 5

// "Terça, 2 de setembro" / "Tuesday, September 2" — dia de semana curto,
// primeira letra maiúscula.
function formatToday(lang) {
  const raw = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const s = lang === 'en' ? raw : raw.replace('-feira', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HomeScreen({ session, authUser, onContinueSession, onNavigate, onStartGuided }) {
  const {
    lang, hasPremium, todaySession, currentBlock,
    dailyRoutine, todayRoutine, routineModules, plan, activePlan,
  } = session
  const L = (k, vars) => translate(`home.${k}`, vars, lang)

  const verse = getTodayUpliftingVerse(lang)
  const dateLabel = formatToday(lang)

  // ── Cartão da ação principal ──
  const enabledSteps = CARD_STEPS.filter(s => (routineModules ?? DEFAULT_ROUTINE_MODULES).includes(s))
  const stepDone = {
    prayer: !!todayRoutine.prayer,
    reading: !!todayRoutine.reading,
    reflection: !!todayRoutine.reflection,
  }
  const prayerMin = getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 0
  const reflectionMin = getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 0
  const readingMin = activePlan.readingMinutes ?? plan.readingMinutes ?? 0
  const totalMin = plan.minutesPerDay ?? enabledSteps.reduce((sum, s) => (
    sum + (s === 'prayer' ? prayerMin : s === 'reading' ? readingMin : reflectionMin)
  ), 0)
  const stepsLine = enabledSteps
    .map(s => translate(`home.routine${s[0].toUpperCase()}${s.slice(1)}`, undefined, lang))
    .join(' · ')
  const contextLine = totalMin
    ? `${stepsLine} — ${L('aboutMin', { n: Math.round(totalMin) })}`
    : stepsLine

  const started = todaySession.progress > 0
  const startLabel = todaySession.needsThemePick
    ? translate('themePlan.chooseTodayCta', undefined, lang)
    : L(started ? 'resumeRoutine' : 'beginRoutine')

  function handleStart() {
    if (todaySession.needsThemePick) { onNavigate?.('routine'); return }
    if (hasPremium && onStartGuided) onStartGuided()
    else onContinueSession?.()
  }

  // ── Sua semana ──
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const letters = WEEKDAY_LETTERS[lang] ?? WEEKDAY_LETTERS.pt
  const modules = routineModules ?? DEFAULT_ROUTINE_MODULES
  const daysDone = weekDays.filter(d => !d.isFuture && isDayComplete(d, d.isToday || d.isFuture ? modules : DEFAULT_ROUTINE_MODULES)).length

  return (
    <div style={styles.screen}>
      <p style={styles.date}>{dateLabel}</p>

      {/* Versículo do dia — sem cartão, sem tela cheia. */}
      <p style={styles.verseText}>“{verse.text}”</p>
      <p style={styles.verseRef}>{verse.ref}</p>

      {/* Cartão da ação principal — único --grad-primary da tela. */}
      <div style={styles.actionCard}>
        <p style={styles.actionLabel}>{L('continueWhereLeft')}</p>
        <p style={styles.actionTitle}>{todaySession.title}</p>
        <p style={styles.actionContext}>{contextLine}</p>

        {enabledSteps.length > 1 && (
          <div style={styles.stepBars}>
            {enabledSteps.map(s => (
              <span
                key={s}
                style={{ ...styles.stepBar, background: stepDone[s] ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.28)' }}
              />
            ))}
          </div>
        )}

        <div style={styles.actionRow}>
          <button style={styles.startBtn} onClick={handleStart}>
            <span style={styles.startBtnText}>{startLabel}</span>
            <span style={styles.startBtnArrow}>→</span>
          </button>
          <button
            style={styles.audioBtn}
            onClick={() => onNavigate?.('handsFree')}
            aria-label={L('handsFreeStart')}
            title={L('handsFreeStart')}
          >
            <AppIcon name="AudioLines" size={20} color="white" />
          </button>
        </div>
      </div>

      {/* Sua semana */}
      <div style={styles.weekHead}>
        <p style={styles.sectionLabelMuted}>{L('weekSection')}</p>
        <span style={styles.weekCount}>{L('weekDaysCount', { done: daysDone, total: 7 })}</span>
      </div>
      <div style={styles.weekRow}>
        {weekDays.map((d, i) => {
          const dayModules = d.isToday || d.isFuture ? modules : DEFAULT_ROUTINE_MODULES
          const done = !d.isFuture && isDayComplete(d, dayModules)
          const state = done ? 'done' : d.isToday ? 'today' : d.isFuture ? 'future' : 'missed'
          return (
            <span key={d.key} style={{ ...styles.weekCell, ...styles.weekCell_[state] }}>
              {letters[i]}
            </span>
          )
        })}
      </div>
      <p style={styles.weekNote}>{L('weekGoalNote', { n: WEEKLY_GOAL_DAYS })}</p>

      {/* Bloco atual da Bíblia — toque leva a Progresso. */}
      <button style={styles.blockCard} onClick={() => onNavigate?.('stats')}>
        <span style={styles.blockIcon}>
          <AppIcon name={currentBlock.icon || 'BookOpen'} size={18} color="var(--or)" />
        </span>
        <span style={styles.blockInfo}>
          <span style={styles.blockName}>{currentBlock.name}</span>
          {currentBlock.chapterLabel && <span style={styles.blockSub}>{currentBlock.chapterLabel}</span>}
        </span>
        <span style={styles.blockPct}>
          {currentBlock.percent.toLocaleString(lang === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 })}%
        </span>
      </button>

      {!hasPremium && (
        <div style={{ marginTop: 20 }}>
          <PremiumLockCard lang={lang} onNavigate={onNavigate} variant="premium" />
        </div>
      )}
    </div>
  )
}

const styles = {
  screen: {
    background: 'var(--olt)',
    height: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '8px 22px calc(var(--nav-height) + 24px)',
  },
  date: { fontSize: 13, fontWeight: 500, color: 'var(--g5)', margin: '8px 0 10px' },
  verseText: {
    fontStyle: 'italic', fontSize: 17, fontWeight: 400, lineHeight: 1.5,
    color: 'var(--g6)', textWrap: 'pretty', margin: '0 0 4px',
  },
  verseRef: { fontSize: 12, fontWeight: 600, color: 'var(--or)', margin: '0 0 20px' },

  actionCard: {
    background: 'var(--grad-primary)',
    boxShadow: 'var(--shadow-glow)',
    borderRadius: 22,
    padding: '24px 22px 22px',
    color: 'white',
  },
  actionLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,.72)', margin: '0 0 12px',
  },
  actionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800,
    letterSpacing: '-0.8px', lineHeight: 1.1, margin: '0 0 6px',
  },
  actionContext: { fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: 'rgba(255,255,255,.85)', margin: '0 0 20px' },
  stepBars: { display: 'flex', gap: 8, margin: '0 0 20px' },
  stepBar: { flex: 1, height: 5, borderRadius: 99 },
  actionRow: { display: 'flex', alignItems: 'center', gap: 12 },
  startBtn: {
    flex: 1, height: 52, borderRadius: 99, border: 'none', background: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer', fontFamily: 'var(--font)',
  },
  startBtnText: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--or)' },
  startBtnArrow: { fontSize: 16, fontWeight: 700, color: 'var(--or)', lineHeight: 1 },
  audioBtn: {
    width: 52, height: 52, flexShrink: 0, borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,.4)', background: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },

  weekHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 14px' },
  sectionLabelMuted: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'var(--g5)', margin: 0,
  },
  weekCount: { fontSize: 12, fontWeight: 600, color: 'var(--or)' },
  weekRow: { display: 'flex', gap: 10 },
  weekCell: {
    flex: 1, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 700,
  },
  weekCell_: {
    done: { background: 'var(--or)', color: 'white' },
    today: { background: 'white', border: '1.5px solid var(--or)', color: 'var(--or)' },
    future: { background: 'rgba(18,18,18,.05)', color: 'var(--g4)', fontWeight: 600 },
    missed: { background: 'rgba(18,18,18,.05)', color: 'var(--g4)', fontWeight: 600 },
  },
  weekNote: { fontSize: 12.5, fontWeight: 400, lineHeight: 1.5, color: 'var(--g5)', margin: '12px 0 0' },

  blockCard: {
    width: '100%', marginTop: 24, padding: '16px 18px', borderRadius: 16,
    background: 'var(--white)', border: 'none',
    display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
    fontFamily: 'var(--font)', textAlign: 'left',
  },
  blockIcon: {
    width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: 'var(--olt)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  blockInfo: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  blockName: { fontSize: 14, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.3 },
  blockSub: { fontSize: 12.5, fontWeight: 400, color: 'var(--g5)', lineHeight: 1.3 },
  blockPct: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--or)', flexShrink: 0 },
}
