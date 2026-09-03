// RoutineScreen.jsx — "Meu Plano" (redesign 1c, reskin Bento — tela 4b)
//
// Só a rotina de HOJE, na ordem do quadro 4b: três cartões de passo
// (concluído / atual / pendente), o modo mãos-livres e "Esta semana"
// (constância, mesma fonte de dado do card da Home). Toda a configuração
// (tempo por dia, quais passos, ordem) mora em AdjustPlanScreen.jsx, pelo
// botão "Ajustar" do cabeçalho — o quadro não tem outro atalho pra lá.
//
// O que saiu daqui (desde antes do reskin): o acordeão "Como funciona o
// método", os interruptores de módulo, o seletor de duração, a seção de
// Estudos, o card de plano por tema — ver AdjustPlanScreen.jsx e Biblioteca.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { DEFAULT_ROUTINE_MODULES, isDayGoalMet } from '../routine/routineStreak'
import { computeCurrentWeekDays } from '../routine/weekRings'

const STEP_ORDER = ['prayer', 'reading', 'reflection']

export default function RoutineScreen({ session, onContinueSession, onNavigate, onStartGuided }) {
  const { lang, plan, activePlan, todayRoutine, todaySession, routineModules, dailyRoutine, weekGoalDaysMet, weeklyGoalDays } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)

  const modules = routineModules ?? DEFAULT_ROUTINE_MODULES
  const enabled = STEP_ORDER.filter(k => modules.includes(k))
  const doneCount = enabled.filter(k => todayRoutine[k]).length

  const prayerMin = getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 0
  const reflectionMin = getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 0
  const readingMin = activePlan.readingMinutes ?? plan.readingMinutes ?? 0
  const stepMin = { prayer: prayerMin, reading: readingMin, reflection: reflectionMin }
  const totalMin = plan.minutesPerDay ?? enabled.reduce((s, k) => s + stepMin[k], 0)

  // Cabeçalho: "3 passos · 30 min · 1 feito" — o segmento de feitos some no
  // dia em que ainda não tem nenhum, em vez de mostrar "0 feito".
  const headerParts = [L('stepsCount', { n: enabled.length })]
  if (totalMin) headerParts.push(L('minutesCount', { min: Math.round(totalMin) }))
  if (doneCount > 0) headerParts.push(L(doneCount === 1 ? 'doneCountOne' : 'doneCountMany', { n: doneCount }))

  // Primeiro passo ligado ainda não feito = o passo "de agora".
  const currentKey = enabled.find(k => !todayRoutine[k]) ?? null

  const stepTitle = k => t(`home.routine${k[0].toUpperCase()}${k.slice(1)}`, undefined, lang)

  // "10 min · às 6:42" — hora em que o passo foi concluído (gravada em
  // `${step}At`, ver dailyRoutineStore.js). Dias registrados antes desse
  // carimbo existir caem no texto sem hora.
  function doneSubFor(k) {
    const at = todayRoutine[`${k}At`]
    const d = at ? new Date(at) : null
    if (!d || Number.isNaN(d.getTime())) return L('doneSub', { n: stepMin[k] })
    const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    return L('doneSubAt', { n: stepMin[k], time })
  }
  // "8 min · depois da leitura" — o passo ligado imediatamente anterior.
  function pendingSubFor(k) {
    const prev = enabled[enabled.indexOf(k) - 1]
    const after = prev ? L(`after${prev[0].toUpperCase()}${prev.slice(1)}`) : null
    return after ? L('pendingSub', { n: stepMin[k], after }) : L('minShort', { n: stepMin[k] })
  }

  function startStep(k) {
    // Encadeia a partir do passo atual (ver startGuidedRoutine em App.jsx).
    if (onStartGuided) { onStartGuided(); return }
    if (k === 'reading') { onContinueSession?.(); return }
    onNavigate?.(k) // 'prayer' | 'reflection'
  }

  // Esta semana — mesma fonte/critério da Home (dia conta pra meta quando a
  // LEITURA foi concluída, ver isDayGoalMet): 3 estados visuais (feito · em
  // curso · o resto), não 7 células com letra — aqui é resumo, não painel.
  const weekDays = computeCurrentWeekDays(dailyRoutine ?? {})
  const daysMet = weekGoalDaysMet ?? 0
  const goalDays = weeklyGoalDays ?? 5

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div>
          <p style={styles.title}>{L('title')}</p>
          <p style={styles.subtitle}>{headerParts.join(' · ')}</p>
        </div>
        <button style={styles.adjustBtn} onClick={() => onNavigate?.('adjustPlan')}>{L('adjust')}</button>
      </div>

      <div style={styles.body}>
        {enabled.map((k, i) => {
          const done = !!todayRoutine[k]
          const isCurrent = k === currentKey
          if (done) {
            // Concluído abre o que foi feito (não "começar" de novo).
            return (
              <button key={k} style={styles.doneCard} onClick={() => (k === 'reading' ? onContinueSession?.() : onNavigate?.(k))}>
                <span style={styles.doneIcon}>
                  <AppIcon name="Check" size={15} color="var(--bento-sand)" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.doneTitle}>{stepTitle(k)}</p>
                  <p style={styles.doneSub}>{doneSubFor(k)}</p>
                </div>
              </button>
            )
          }
          if (isCurrent) {
            const started = k === 'reading' && todaySession.progress > 0
            const subtitle = k === 'reading'
              ? (started ? L('readingResumeSubtitle', { title: todaySession.title }) : todaySession.title)
              : null
            return (
              <div key={k} style={styles.currentCard}>
                <div style={styles.currentHead}>
                  <p style={styles.currentLabel}>{L('nowStepOf', { i: i + 1, total: enabled.length })}</p>
                  <span style={styles.currentTime}>{L('minShort', { n: stepMin[k] })}</span>
                </div>
                <p style={styles.currentTitle}>{stepTitle(k)}</p>
                {subtitle && <p style={styles.currentSubtitle}>{subtitle}</p>}
                <button style={styles.currentBtn} onClick={() => startStep(k)}>
                  <span style={styles.currentBtnText}>{L(`start_${k}`)}</span>
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
                <p style={styles.pendingSub}>{pendingSubFor(k)}</p>
              </div>
            </div>
          )
        })}

        <button style={styles.handsFreeCard} onClick={() => onNavigate?.('handsFree')}>
          <span style={styles.handsFreeIcon}><AppIcon name="AudioLines" size={16} color="var(--bento-accent)" /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.handsFreeTitle}>{L('handsFreeTitle')}</span>
            <span style={styles.handsFreeSub}>{L('handsFreeSub')}</span>
          </span>
          <span style={styles.handsFreeChevron}>›</span>
        </button>

        <div style={styles.weekCard}>
          <div style={styles.weekHead}>
            <p style={styles.weekLabel}>{L('weekSectionLabel')}</p>
            <p style={styles.weekCount}>
              <span style={styles.weekCountStrong}>{L(daysMet === 1 ? 'weekCompletedOfOne' : 'weekCompletedOfMany', { n: daysMet })}</span>{' '}
              {L('weekCompletedOfSuffix', { total: goalDays })}
            </p>
          </div>
          <div style={styles.weekBarRow}>
            {weekDays.map((d, i) => {
              const done = !d.isFuture && isDayGoalMet(d)
              const style = done ? styles.weekBarDone : d.isToday ? styles.weekBarToday : styles.weekBarOther
              return <span key={d.key ?? i} style={{ ...styles.weekBarSeg, ...style }} />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 20px 0' },
  title: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: '4px 0 0' },
  adjustBtn: {
    height: 34, flexShrink: 0, padding: '0 14px', borderRadius: 12, border: 'none', background: 'var(--bento-card)',
    fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer',
  },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 },

  doneCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-sand)', border: 'none', borderRadius: 24, padding: '18px 20px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  doneIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 15.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', lineHeight: 1.2, margin: '0 0 3px' },
  doneSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-label)', lineHeight: 1.2, margin: 0 },

  currentCard: { background: 'var(--bento-ink)', borderRadius: 28, padding: 24, color: 'white' },
  currentHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' },
  currentLabel: { fontSize: 11, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  currentTime: { fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,.5)' },
  currentTitle: { fontSize: 27, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 6px' },
  currentSubtitle: { fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.55)', margin: '0 0 20px' },
  currentBtn: { height: 52, width: '100%', borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  currentBtnText: { fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)' },
  currentBtnArrow: { fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)', lineHeight: 1 },

  pendingCard: { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.6)', borderRadius: 24, padding: '18px 20px' },
  pendingDot: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--bento-pending-border)', boxSizing: 'border-box' },
  pendingTitle: { fontSize: 15.5, fontWeight: 800, color: 'var(--bento-t3)', lineHeight: 1.2, margin: '0 0 3px' },
  pendingSub: { fontSize: 12, fontWeight: 500, color: 'var(--bento-t4-soft)', lineHeight: 1.2, margin: 0 },

  handsFreeCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bento-card)', borderRadius: 24, padding: '18px 20px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)' },
  handsFreeIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  handsFreeTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  handsFreeSub: { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  handsFreeChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)', flexShrink: 0 },

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

}
