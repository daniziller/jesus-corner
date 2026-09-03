// AdjustPlanScreen.jsx — "Ajustar meu plano" (redesign 1d, reskin Bento — tela 5a)
//
// Toda a configuração da rotina num lugar só, visitado raramente: alcançada
// pelo link "Ajustar" em Meu Plano (4b) e pelo onboarding. A execução do
// dia mora em RoutineScreen (4b).
//
// Fora do escopo deste reskin: o mockup 5a só mostra Tempo por dia, Passos
// do dia e Ritmo da semana — sem seletor de ordem (canônica/cronológica) e
// sem os atalhos pra Plano por tema (IA) / Estudos. Os atalhos saíram daqui
// porque já existem outras entradas pra eles (Oração, Reflexão, Leitura —
// ver PrayerScreen/ReflectionScreen/ReadingBlockView), mas o seletor de
// ordem ficou: é a ÚNICA tela do app onde essa escolha pode ser feita, e
// removê-la tiraria o acesso à funcionalidade — segue como um cartão extra
// próprio, com o mesmo tratamento visual das demais seções.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

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
          <AppIcon name="ArrowLeft" size={16} color="var(--bento-ink)" />
        </button>
        <p style={styles.headerTitle}>{L('adjustTitle')}</p>
      </div>

      <div style={styles.body}>
        {/* Tempo por dia — o ritmo do plano fixo (Leve/Padrão/Intensivo/Livre). */}
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('timePerDayLabel')}</p>
          <p style={styles.sectionHint}>{L('timePerDayHint')}</p>
          <div style={styles.paceRow}>
            {PLANS.map(p => {
              const on = currentPaceId === p.id
              return (
                <button key={p.id} style={{ ...styles.paceBtn, ...(on ? styles.paceBtnOn : {}) }} onClick={() => choosePace(p.id)}>
                  <span style={{ ...styles.paceNum, color: on ? 'var(--bento-ink)' : 'var(--bento-t3)' }}>
                    {p.minutesPerDay ?? (lang === 'en' ? p.labelEn : p.label)}
                  </span>
                  <span style={{ ...styles.paceUnit, color: on ? 'rgba(26,23,20,.6)' : 'var(--bento-t5)' }}>
                    {p.minutesPerDay ? t('routine.min', undefined, lang) : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Passos do dia — Leitura fica ligada e travada. */}
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('stepsLabel')}</p>
          <p style={styles.sectionHint}>{L('stepsHint')}</p>
          <div>
            {STEP_ORDER.map((key, i) => {
              const on = isOn(key)
              const locked = key === 'reading'
              const min = stepMin[key]
              return (
                <div key={key} style={{ ...styles.stepRow, ...(i === STEP_ORDER.length - 1 ? { borderBottom: 'none', paddingBottom: 0 } : {}) }}>
                  <span style={{ ...styles.stepName, color: on ? 'var(--bento-ink)' : 'var(--bento-t5)' }}>
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
                      background: locked ? 'var(--bento-ink)' : on ? 'var(--bento-accent)' : 'var(--bento-line)',
                      justifyContent: on ? 'flex-end' : 'flex-start',
                      cursor: locked ? 'default' : 'pointer',
                    }}
                  >
                    <span style={styles.switchThumb} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ordem — canônica ou cronológica. Não está no mockup 5a, mas é a
            única tela onde dá pra mudar isso — ver nota no topo do arquivo. */}
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{t('plan.orderLabel', undefined, lang)}</p>
          <p style={styles.sectionHint}>{L('orderHint')}</p>
          <div style={styles.orderRow}>
            <button style={{ ...styles.orderBtn, ...(!isChrono ? styles.orderBtnOn : {}) }} onClick={() => chooseOrder('standard')}>
              <AppIcon name="BookOpen" size={15} color={!isChrono ? 'var(--bento-ink)' : 'var(--bento-t4)'} /> {t('plan.orderStandard', undefined, lang)}
            </button>
            <button style={{ ...styles.orderBtn, ...(isChrono ? styles.orderBtnOn : {}) }} onClick={() => chooseOrder('chrono')}>
              <AppIcon name="Hourglass" size={15} color={isChrono ? 'var(--bento-ink)' : 'var(--bento-t4)'} /> {t('plan.orderChronological', undefined, lang)}
            </button>
          </div>
        </div>

        {/* Ritmo da semana — meta de dias/semana (constância semanal,
            etapa 4). Um dia perdido não zera nada; isso só decide o que
            conta como "meta batida" na Home/Progresso. */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('weeklyGoalLabel')}</p>
          <p style={{ ...styles.sectionHint, color: 'var(--bento-sand-ink)' }}>{L('weeklyGoalHint')}</p>
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
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.saveBtn} onClick={onBack}>{L('savePlan')}</button>
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px' },
  backBtn: {
    width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: {
    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    padding: '0 20px calc(var(--nav-height) + 24px)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  sectionLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'var(--bento-t4)', margin: '0 0 6px',
  },
  sectionHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '0 0 14px' },
  paceRow: { display: 'flex', gap: 8 },
  paceBtn: {
    flex: 1, minWidth: 0, height: 62, borderRadius: 16, border: 'none', background: 'var(--bento-line)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    cursor: 'pointer', fontFamily: 'var(--font-bento)',
  },
  paceBtnOn: { background: 'var(--bento-accent)' },
  paceNum: { fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' },
  paceUnit: { fontSize: 10, fontWeight: 600 },
  orderRow: { display: 'flex', gap: 8 },
  orderBtn: {
    flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'var(--bento-line)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)',
  },
  orderBtnOn: { background: 'var(--bento-accent)', color: 'var(--bento-ink)' },
  stepRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
    borderBottom: '1px solid var(--bento-line)',
  },
  stepName: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700 },
  stepMin: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, color: 'var(--bento-t5)' },
  switch: {
    width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px',
    display: 'flex', alignItems: 'center', transition: 'background .15s',
  },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },
  weeklyGoalRow: { display: 'flex', gap: 7 },
  weeklyGoalBtn: {
    flex: 1, height: 46, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,.55)',
    fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-sand-ink)', cursor: 'pointer',
  },
  weeklyGoalBtnOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  footer: { flexShrink: 0, padding: '16px 20px calc(22px + var(--safe-bottom))' },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer',
  },
}
