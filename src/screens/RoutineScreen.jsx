// RoutineScreen.jsx — "Meu Plano" (redesign 1c)
//
// Só a rotina de HOJE: três cartões de passo (concluído / atual / pendente),
// o modo mãos-livres, e o link pra Ajustar meu plano. Toda a configuração
// (tempo por dia, quais passos, ordem) mora em AdjustPlanScreen (1d).
//
// O que saiu daqui: o acordeão "Como funciona o método", os interruptores
// de módulo, o seletor de duração, a seção de Estudos, o card de plano por
// tema — ver AdjustPlanScreen.jsx e (Estudos) a futura Biblioteca (1e).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { DEFAULT_ROUTINE_MODULES } from '../routine/routineStreak'

const STEP_COLOR = { prayer: '#B5005D', reading: 'var(--or)', reflection: 'var(--bk)' }
const STEP_ORDER = ['prayer', 'reading', 'reflection']

export default function RoutineScreen({ session, onContinueSession, onNavigate, onStartGuided }) {
  const { lang, plan, activePlan, todayRoutine, todaySession, routineModules } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)

  const modules = routineModules ?? DEFAULT_ROUTINE_MODULES
  const enabled = STEP_ORDER.filter(k => modules.includes(k))
  const doneCount = enabled.filter(k => todayRoutine[k]).length

  const prayerMin = getSavedPrayerMinutes() ?? plan.prayerMinutes ?? 0
  const reflectionMin = getSavedReflectionMinutes() ?? plan.reflectionMinutes ?? 0
  const readingMin = activePlan.readingMinutes ?? plan.readingMinutes ?? 0
  const stepMin = { prayer: prayerMin, reading: readingMin, reflection: reflectionMin }
  const totalMin = plan.minutesPerDay ?? enabled.reduce((s, k) => s + stepMin[k], 0)

  // Primeiro passo ligado ainda não feito = o passo "de agora".
  const currentKey = enabled.find(k => !todayRoutine[k]) ?? null

  const stepTitle = k => k === 'reading'
    ? `${t('home.routineReading', undefined, lang)} — ${todaySession.title}`
    : t(`home.routine${k[0].toUpperCase()}${k.slice(1)}`, undefined, lang)

  function startStep(k) {
    // Encadeia a partir do passo atual (ver startGuidedRoutine em App.jsx).
    if (onStartGuided) { onStartGuided(); return }
    if (k === 'reading') { onContinueSession?.(); return }
    onNavigate?.(k) // 'prayer' | 'reflection'
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <span style={styles.title}>{L('title')}</span>
        <button style={styles.adjustLink} onClick={() => onNavigate?.('adjustPlan')}>{L('adjust')}</button>
      </div>

      <div style={styles.body}>
        <p style={styles.subtitle}>
          {totalMin
            ? L('subtitleWithMin', { n: enabled.length, min: Math.round(totalMin) })
            : L('subtitle', { n: enabled.length })}
        </p>

        {enabled.map((k, i) => {
          const done = !!todayRoutine[k]
          const isCurrent = k === currentKey
          if (done) {
            // Concluído abre o que foi feito (não "começar" de novo).
            return (
              <button key={k} style={styles.doneCard} onClick={() => (k === 'reading' ? onContinueSession?.() : onNavigate?.(k))}>
                <span style={{ ...styles.doneDot, background: STEP_COLOR[k] }}>
                  <AppIcon name="Check" size={16} color="white" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.doneTitle}>{stepTitle(k)}</p>
                  <p style={styles.doneSub}>{L('doneSub', { n: stepMin[k] })}</p>
                </div>
              </button>
            )
          }
          if (isCurrent) {
            return (
              <div key={k} style={styles.currentCard}>
                <p style={styles.currentLabel}>{L('stepOfNow', { i: i + 1, total: enabled.length })}</p>
                <p style={styles.currentTitle}>{stepTitle(k)}</p>
                <p style={styles.currentTime}>{L('estimatedMin', { n: stepMin[k] })}</p>
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
                <p style={styles.pendingSub}>{L('minShort', { n: stepMin[k] })}</p>
              </div>
            </div>
          )
        })}

        {doneCount === enabled.length && enabled.length > 0 && (
          <p style={styles.allDone}>{t('home.routineAllDoneMsg', undefined, lang)}</p>
        )}

        <button style={styles.handsFreeCard} onClick={() => onNavigate?.('handsFree')}>
          <span style={styles.handsFreeIcon}><AppIcon name="AudioLines" size={17} color="white" /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.handsFreeTitle}>{L('handsFreeTitle')}</span>
            <span style={styles.handsFreeSub}>{L('handsFreeSub')}</span>
          </span>
          <span style={styles.handsFreeChevron}>›</span>
        </button>

        <p style={styles.escapeLink}>
          {L('escapePrefix')}{' '}
          <span style={styles.escapeLinkAction} onClick={() => onNavigate?.('adjustPlan')}>{L('escapeAction')}</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--olt)' },
  header: {
    height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 22px',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--bk)' },
  adjustLink: { border: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--or)', cursor: 'pointer', padding: 4 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 22px calc(var(--nav-height) + 24px)' },
  subtitle: { fontSize: 13.5, fontWeight: 400, lineHeight: 1.5, color: 'var(--g5)', margin: '0 0 20px' },

  doneCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--white)', border: 'none', borderRadius: 18, padding: 18, marginBottom: 10, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  doneDot: { width: 34, height: 34, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--bk)', lineHeight: 1.3, margin: '0 0 2px' },
  doneSub: { fontSize: 12.5, fontWeight: 400, color: 'var(--g5)', lineHeight: 1.3, margin: 0 },

  currentCard: { background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)', borderRadius: 22, padding: 22, color: 'white', marginBottom: 10 },
  currentLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)', margin: '0 0 10px' },
  currentTitle: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.15, margin: '0 0 4px' },
  currentTime: { fontSize: 13.5, fontWeight: 400, lineHeight: 1.5, color: 'rgba(255,255,255,.85)', margin: '0 0 18px' },
  currentBtn: { height: 48, width: '100%', borderRadius: 99, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font)' },
  currentBtnText: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--or)' },
  currentBtnArrow: { fontSize: 15, fontWeight: 700, color: 'var(--or)', lineHeight: 1 },

  pendingCard: { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.55)', borderRadius: 18, padding: 18, marginBottom: 10 },
  pendingDot: { width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed var(--g3)' },
  pendingTitle: { fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700, color: 'var(--g6)', lineHeight: 1.3, margin: '0 0 2px' },
  pendingSub: { fontSize: 12.5, fontWeight: 400, color: 'var(--g4)', lineHeight: 1.3, margin: 0 },

  allDone: { fontSize: 12.5, fontWeight: 700, color: 'var(--or)', textAlign: 'center', margin: '4px 0 14px' },

  handsFreeCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--bk)', borderRadius: 18, padding: '16px 18px', marginTop: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
  handsFreeIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--grad-vivid)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  handsFreeTitle: { display: 'block', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 2 },
  handsFreeSub: { display: 'block', fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,.6)' },
  handsFreeChevron: { fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,.5)', flexShrink: 0 },

  escapeLink: { fontSize: 12.5, fontWeight: 400, lineHeight: 1.5, color: '#8a8078', textAlign: 'center', margin: '24px 0 0' },
  escapeLinkAction: { color: 'var(--or)', fontWeight: 600, cursor: 'pointer' },
}
