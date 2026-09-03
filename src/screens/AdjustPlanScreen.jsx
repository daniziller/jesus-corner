// AdjustPlanScreen.jsx — "Ajustar meu plano" (redesign 1d)
//
// Toda a configuração da rotina num lugar só, visitado raramente: alcançada
// pelo link "Ajustar" em Meu Plano (1c) e pelo onboarding. Fundo branco
// (não creme) pra sinalizar "tela de ajuste". A execução do dia mora em
// RoutineScreen (1c).
//
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

// Cores dos passos (mesmas de ROUTINE_STEP_COLORS) — o quadradinho de cada
// linha usa a cor a 10% e o interruptor ligado usa a cor cheia.
const STEP_COLOR = { prayer: '#B5005D', reading: 'var(--or)', reflection: 'var(--bk)', study: 'var(--g4)' }
const STEP_ORDER = ['prayer', 'reading', 'reflection', 'study']
const WEEKLY_GOAL_OPTIONS = [3, 4, 5, 6, 7]

export default function AdjustPlanScreen({ session, activeAltPlan, onSelectPace, onSelectActivePlan, onToggleRoutineModule, onSelectWeeklyGoal, onNavigate, onBack }) {
  const { lang, plan, activePlan, routineModules, weeklyGoalDays } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)

  const isChrono = activeAltPlan?.type === 'chrono'
  const currentPaceId = isChrono ? activeAltPlan.paceId : plan.id
  const isOn = key => routineModules.includes(key)

  function choosePace(id) {
    onSelectActivePlan?.(isChrono ? { type: 'chrono', paceId: id } : { type: 'fixed', id })
    onSelectPace?.(id)
  }
  function chooseOrder(order) {
    onSelectActivePlan?.(order === 'chrono' ? { type: 'chrono', paceId: currentPaceId } : { type: 'fixed', id: currentPaceId })
  }

  const prayerMin = getSavedPrayerMinutes() ?? plan.prayerMinutes
  const reflectionMin = getSavedReflectionMinutes() ?? plan.reflectionMinutes
  const stepMin = {
    prayer: prayerMin,
    reading: activePlan.readingMinutes,
    reflection: reflectionMin,
    study: null,
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ArrowLeft" size={18} color="var(--bk)" />
        </button>
        <span style={styles.headerTitle}>{L('adjustTitle')}</span>
      </div>

      <div style={styles.body}>
        {/* Tempo por dia — o ritmo do plano fixo (Leve/Padrão/Intensivo/Livre). */}
        <p style={styles.sectionLabel}>{L('timePerDayLabel')}</p>
        <p style={styles.sectionHint}>{L('timePerDayHint')}</p>
        <div style={styles.paceRow}>
          {PLANS.map(p => {
            const on = currentPaceId === p.id
            return (
              <button key={p.id} style={{ ...styles.paceBtn, ...(on ? styles.paceBtnOn : {}) }} onClick={() => choosePace(p.id)}>
                <span style={{ ...styles.paceNum, color: on ? 'white' : 'var(--g6)' }}>
                  {p.minutesPerDay ?? (lang === 'en' ? p.labelEn : p.label)}
                </span>
                <span style={{ ...styles.paceUnit, color: on ? 'rgba(255,255,255,.75)' : 'var(--g4)' }}>
                  {p.minutesPerDay ? t('routine.min', undefined, lang) : ''}
                </span>
              </button>
            )
          })}
        </div>

        {/* Ordem — canônica ou cronológica. */}
        <p style={styles.sectionLabel}>{t('plan.orderLabel', undefined, lang)}</p>
        <p style={styles.sectionHint}>{L('orderHint')}</p>
        <div style={styles.orderRow}>
          <button style={{ ...styles.orderBtn, ...(!isChrono ? styles.orderBtnOn : {}) }} onClick={() => chooseOrder('standard')}>
            <AppIcon name="BookOpen" size={15} color={!isChrono ? 'white' : 'var(--g4)'} /> {t('plan.orderStandard', undefined, lang)}
          </button>
          <button style={{ ...styles.orderBtn, ...(isChrono ? styles.orderBtnOn : {}) }} onClick={() => chooseOrder('chrono')}>
            <AppIcon name="Hourglass" size={15} color={isChrono ? 'white' : 'var(--g4)'} /> {t('plan.orderChronological', undefined, lang)}
          </button>
        </div>

        {/* Passos do dia — Leitura fica ligada e travada. */}
        <p style={styles.sectionLabel}>{L('stepsLabel')}</p>
        <p style={styles.sectionHint}>{L('stepsHint')}</p>
        <div>
          {STEP_ORDER.map(key => {
            const on = isOn(key)
            const locked = key === 'reading'
            const min = stepMin[key]
            return (
              <div key={key} style={styles.stepRow}>
                <span style={{ ...styles.stepSquare, background: `color-mix(in srgb, ${STEP_COLOR[key]} 12%, transparent)` }} />
                <span style={{ ...styles.stepName, color: on ? 'var(--bk)' : 'var(--g4)' }}>
                  {t(`home.routine${key[0].toUpperCase()}${key.slice(1)}`, undefined, lang)}
                </span>
                {on && min != null && <span style={styles.stepMin}>{L('minShort', { n: min })}</span>}
                <button
                  role="switch"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => !locked && onToggleRoutineModule?.(key, !on)}
                  style={{
                    ...styles.switch,
                    background: on ? STEP_COLOR[key] : 'var(--g2)',
                    justifyContent: on ? 'flex-end' : 'flex-start',
                    opacity: locked ? 0.6 : 1,
                    cursor: locked ? 'default' : 'pointer',
                  }}
                >
                  <span style={styles.switchThumb} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Ritmo da semana — meta de dias/semana (constância semanal,
            etapa 4). Um dia perdido não zera nada; isso só decide o que
            conta como "meta batida" na Home/Progresso. */}
        <p style={styles.sectionLabel}>{L('weeklyGoalLabel')}</p>
        <p style={styles.sectionHint}>{L('weeklyGoalHint')}</p>
        <div style={styles.weeklyGoalRow}>
          {WEEKLY_GOAL_OPTIONS.map(n => {
            const on = weeklyGoalDays === n
            return (
              <button
                key={n}
                style={{ ...styles.weeklyGoalBtn, ...(on ? styles.weeklyGoalBtnOn : {}) }}
                onClick={() => onSelectWeeklyGoal?.(n)}
              >
                {n}
              </button>
            )
          })}
        </div>

        {/* Planos por tema (IA) e Estudos — acessos que ficavam em Meu Plano.
            Consolidam na Biblioteca (etapa 6). */}
        {(session.hasAI || session.hasPremium) && (
          <div style={styles.extraLinks}>
            {session.hasAI && (
              <button style={styles.extraLink} onClick={() => onNavigate?.('themePlan')}>
                <span style={styles.extraLinkIcon}><AppIcon name="Sparkles" size={16} color="#A21CAF" /></span>
                <span style={{ flex: 1, textAlign: 'left' }}>{t('plan.themePlanTitle', undefined, lang)}</span>
                <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
              </button>
            )}
            <button style={styles.extraLink} onClick={() => onNavigate?.('studies')}>
              <span style={styles.extraLinkIcon}><AppIcon name="GraduationCap" size={16} color="var(--or)" /></span>
              <span style={{ flex: 1, textAlign: 'left' }}>{t('nav.studies', undefined, lang)}</span>
              <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
            </button>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.saveBtn} onClick={onBack}>{L('savePlan')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--white)' },
  header: {
    height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px',
    borderBottom: '1px solid rgba(18,18,18,.07)',
  },
  backBtn: { border: 'none', background: 'none', padding: 4, margin: '0 -4px', cursor: 'pointer', display: 'flex' },
  headerTitle: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--bk)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '24px 22px calc(var(--nav-height) + 24px)' },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'var(--or)', margin: '30px 0 6px',
  },
  sectionHint: { fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: 'var(--g5)', margin: '0 0 14px' },
  paceRow: { display: 'flex', gap: 8 },
  paceBtn: {
    flex: 1, minWidth: 0, height: 64, borderRadius: 14, border: '1px solid var(--g2)', background: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    cursor: 'pointer', fontFamily: 'var(--font)',
  },
  paceBtnOn: { background: 'var(--or)', border: '1px solid var(--or)' },
  paceNum: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' },
  paceUnit: { fontSize: 10, fontWeight: 500 },
  orderRow: { display: 'flex', gap: 8 },
  orderBtn: {
    flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--g2)', background: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--g6)',
  },
  orderBtnOn: { background: 'var(--or)', border: '1px solid var(--or)', color: 'white' },
  stepRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0',
    borderBottom: '1px solid rgba(18,18,18,.07)',
  },
  stepSquare: { width: 30, height: 30, flexShrink: 0, borderRadius: 8 },
  stepName: { flex: 1, fontSize: 15, fontWeight: 600 },
  stepMin: { fontSize: 12, fontWeight: 500, color: 'var(--g4)' },
  switch: {
    width: 44, height: 26, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px',
    display: 'flex', alignItems: 'center', transition: 'background .15s',
  },
  switchThumb: { width: 20, height: 20, borderRadius: '50%', background: 'white' },
  weeklyGoalRow: { display: 'flex', gap: 6 },
  weeklyGoalBtn: {
    flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--g2)', background: 'none',
    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--g6)', cursor: 'pointer',
  },
  weeklyGoalBtnOn: { background: 'var(--or)', border: '1px solid var(--or)', color: 'white', fontWeight: 700 },
  extraLinks: { marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 },
  extraLink: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    border: '1px solid rgba(18,18,18,.07)', borderRadius: 14, background: 'var(--white)',
    padding: '13px 14px', cursor: 'pointer', fontFamily: 'var(--font)',
    fontSize: 14, fontWeight: 600, color: 'var(--bk)',
  },
  extraLinkIcon: {
    width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: 'var(--olt)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: { flexShrink: 0, padding: '16px 22px calc(24px + var(--safe-bottom))', borderTop: '1px solid rgba(18,18,18,.07)' },
  saveBtn: {
    width: '100%', height: 52, borderRadius: 99, border: 'none', background: 'var(--grad-primary)',
    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'white', cursor: 'pointer',
    boxShadow: 'var(--shadow-glow)',
  },
}
