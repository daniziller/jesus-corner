// AdjustPlanScreen.jsx — "Ajustar meu plano" (redesign 1d, reskin Bento — tela 5a)
//
// Toda a configuração da rotina num lugar só, visitado raramente: alcançada
// pelo link "Ajustar" em Meu Plano (4b) e pelo onboarding. A execução do
// dia mora em RoutineScreen (4b).
//
// Segue o quadro 5a à letra: Tempo por dia, Passos do dia e Ritmo da
// semana, e só. O seletor de ordem (tradicional/cronológica) que morava
// aqui como cartão extra saiu na auditoria do redesign — a escolha da
// ordem cronológica fica sem tela até ganhar um lugar próprio (decisão da
// autora); a lógica (onSelectActivePlan com type 'chrono') continua
// intacta e é respeitada pelo seletor de ritmo abaixo.
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
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
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
                  <span style={{ ...styles.paceUnit, fontWeight: on ? 700 : 600, color: on ? 'rgba(26,23,20,.6)' : 'var(--bento-t5)' }}>
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
          <p style={{ ...styles.sectionHint, margin: '0 0 8px' }}>{L('stepsHint')}</p>
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

        {/* Ritmo da semana — meta de dias/semana (constância semanal,
            etapa 4). Um dia perdido não zera nada; isso só decide o que
            conta como "meta batida" na Home/Progresso. */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('weeklyGoalLabel')}</p>
          <p style={{ ...styles.sectionHint, color: 'var(--bento-sand-ink-mid)' }}>{L('weeklyGoalHint')}</p>
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
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  // Sem barra inferior nesta tela (quadro 5a): o rodapé é o "Salvar plano".
  body: {
    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    padding: '0 20px 4px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  sectionLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase',
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
  paceNum: { fontSize: 18, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' },
  paceUnit: { fontSize: 10, fontWeight: 600, lineHeight: 1 },
  stepRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
    borderBottom: '1px solid var(--bento-line)',
  },
  stepName: { flex: 1, fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, lineHeight: 1 },
  stepMin: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t5)' },
  switch: {
    width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px',
    display: 'flex', alignItems: 'center', transition: 'background .15s',
  },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },
  weeklyGoalRow: { display: 'flex', gap: 7 },
  weeklyGoalBtn: {
    flex: 1, height: 46, borderRadius: 14, border: 'none', padding: 0, background: 'rgba(255,255,255,.55)',
    fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, lineHeight: '46px', color: 'var(--bento-sand-ink-mid)', cursor: 'pointer',
  },
  weeklyGoalBtnOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  footer: { flexShrink: 0, padding: '16px 20px calc(22px + var(--safe-bottom))' },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)',
    fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer',
  },
}
