// AdjustPlanScreen.jsx — "Ajustar meu plano" (redesign 1d, reskin Bento —
// tela 5a). Toda a configuração da rotina num lugar só, visitado raramente:
// alcançada pelo link "Ajustar" em Meu Plano (4b) e pelo onboarding. A
// execução do dia mora em RoutineScreen (4b).
//
// Bloco 4 do redesign: "Tempo de cada passo" troca o antigo seletor de
// ritmo (Leve/Padrão/Intensivo/Livre) por steppers de minuto livre — a
// mesma decisão de 26d, e Leitura aqui é a fonte real da divisão de
// sessões (ver dynamicSessions.js). "Ritmo da semana" agora grava no
// weeklyDaysStore.js novo (mantém weekly_days em sincronia, não só o
// número — ver App.jsx/selectWeeklyDaysCount).
//
// Exceção: no plano CRONOLÓGICO (activeAltPlan.type === 'chrono'), a
// divisão em sessões ainda vem de PLANS (Leve/Padrão/Intensivo/Livre —
// ver ChronologicalPlanScreen.jsx, "paceId sempre vem de fora, pra não ter
// dois seletores de ritmo espalhados") — não migrou pra minutos livres
// nesta leva (fora do pedido desta rodada), então o seletor de ritmo
// antigo continua existindo só pra esse caso.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { StepMinutesEditor } from '../components/TimePerStepSheet'

const WEEKLY_GOAL_OPTIONS = [3, 4, 5, 6, 7]

export default function AdjustPlanScreen({ session, completedSet, stepMinutes, onSaveStepMinutes, activeAltPlan, onToggleRoutineModule, onSelectWeeklyDaysCount, onNavigate, onBack }) {
  const { lang, plan, routineModules, weeklyGoalDays } = session
  const L = (k, vars) => t(`routine.${k}`, vars, lang)
  const isChrono = activeAltPlan?.type === 'chrono'
  const isStudyOn = routineModules.includes('study')

  const minutes = {
    prayer: stepMinutes?.prayer ?? plan.prayerMinutes,
    reading: stepMinutes?.reading ?? plan.readingMinutes,
    reflection: stepMinutes?.reflection ?? plan.reflectionMinutes,
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
        {isChrono ? (
          // Cronológico: ritmo antigo (Leve/Padrão/Intensivo/Livre) — ver
          // nota no topo do arquivo. Mantido intacto, não migrado agora.
          <div style={styles.card}>
            <p style={styles.sectionLabel}>{L('timePerDayLabel')}</p>
            <p style={styles.sectionHint}>{L('timePerDayHint')}</p>
            <div style={styles.paceRow}>
              {PLANS.map(p => {
                const on = activeAltPlan.paceId === p.id
                return (
                  <button
                    key={p.id} style={{ ...styles.paceBtn, ...(on ? styles.paceBtnOn : {}) }}
                    onClick={() => onNavigate?.('journey')}
                  >
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
        ) : (
          // Tempo de cada passo (5a/26d) — steppers de minuto livre; Leitura
          // é a fonte real do tamanho da sessão (dynamicSessions.js).
          <StepMinutesEditor minutes={minutes} onChange={onSaveStepMinutes} completedSet={completedSet} lang={lang} showNoTimer={false} />
        )}

        {/* Estudo — único passo que continua sendo liga/desliga puro (sem
            minutos próprios; o tempo de estudo é livre, ver 4c/22c). */}
        <div style={styles.card}>
          <div style={styles.studyRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.studyName}>{t('home.routineStudy', undefined, lang)}</p>
              <p style={styles.studySub}>{L('studySwitchSub')}</p>
            </div>
            <button
              role="switch" aria-checked={isStudyOn}
              onClick={() => onToggleRoutineModule?.('study', !isStudyOn)}
              style={{ ...styles.switch, background: isStudyOn ? 'var(--bento-accent)' : 'var(--bento-line)', justifyContent: isStudyOn ? 'flex-end' : 'flex-start' }}
            >
              <span style={styles.switchThumb} />
            </button>
          </div>
        </div>

        {/* Ritmo da semana — meta de dias/semana (constância semanal). Um
            dia perdido não zera nada; isso só decide o que conta como
            "meta batida" na Home/Progresso, e QUAIS dias ficam marcados
            (weekly_days — ver selectWeeklyDaysCount em App.jsx). */}
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
                  onClick={() => onSelectWeeklyDaysCount?.(n)}
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
  body: {
    flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    padding: '0 20px 4px',
    display: 'flex', flexDirection: 'column', gap: 10,
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
  studyRow: { display: 'flex', alignItems: 'center', gap: 12 },
  studyName: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  studySub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  switch: {
    width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px',
    display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer',
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
