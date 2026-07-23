// RoutineScreen.jsx
// Aba "Rotina": escolher a duração de cada passo do dia (oração/leitura via
// plano/reflexão) num só lugar, ver o tempo total, e acompanhar visualmente
// os 3 passos de hoje numa "linha do tempo" que preenche conforme cada um é
// concluído (mesmos dados de session.todayRoutine que a Home já usa).
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { getSavedPrayerMinutes, setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes, setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'

// Mesmas opções de cada tela dedicada (ver PrayerScreen.jsx/ReflectionScreen.jsx)
// — a Reflexão inclui 8 porque é o padrão do plano Leve.
const PRAYER_DURATION_OPTIONS = [5, 10, 15, 20, 30]
const REFLECTION_DURATION_OPTIONS = [5, 8, 10, 15, 20, 30]

export default function RoutineScreen({ session, onNavigate, onContinueSession, onSelectPlan, onMarkRoutineStep }) {
  const { lang, plan, todayRoutine } = session
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

  const totalMinutes = prayerMinutes + reflectionMinutes + (plan.readingMinutes ?? 0)

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
      <div className="page-header"><h1 className="page-title">{t('routine.pageTitle', undefined, lang)}</h1></div>

      <div style={styles.body}>
        <p style={styles.heroSub}>{t('routine.heroSub', undefined, lang)}</p>

        {/* Total do dia */}
        <div style={styles.hero} data-tour="routine-hero">
          <div style={styles.heroOrb} />
          <span style={{ position: 'relative', ...styles.heroTotal }}>
            {totalMinutes}<span style={styles.heroTotalUnit}> min</span>
          </span>
          <span style={{ position: 'relative', ...styles.heroTotalLabel }}>
            {plan.readingMinutes == null
              ? `${prayerMinutes + reflectionMinutes} ${t('routine.totalLabelFree', undefined, lang)}`
              : t('routine.totalLabel', undefined, lang)}
          </span>
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
              <button onClick={step.onClick} style={styles.stepNodeWrap}>
                <span
                  role="button"
                  aria-label={t('home.routineMarkDone', undefined, lang)}
                  style={{ ...styles.stepNode, background: step.done ? step.color : 'var(--g1)', borderColor: step.done ? step.color : 'var(--g2)', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); step.onToggleCheck() }}
                >
                  <AppIcon name={step.done ? 'Check' : step.icon} size={17} color={step.done ? 'white' : 'var(--g4)'} />
                </span>
                <span style={styles.stepLabel}>{step.title}</span>
                <span style={{ ...styles.stepTag, color: step.done ? step.color : 'var(--g4)' }}>
                  {step.done ? t('routine.stepDone', undefined, lang) : t('routine.stepPending', undefined, lang)}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div style={styles.stepLineTrack}>
                  <div style={{ ...styles.stepLineFill, width: step.done ? '100%' : '0%', background: step.color }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Oração */}
        <PickerSection title={t('routine.sectionPrayer', undefined, lang)} icon="HandHeart" color={ROUTINE_STEP_COLORS.prayer}>
          <div style={styles.durationSel}>
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
        <PickerSection title={t('routine.sectionReading', undefined, lang)} icon="BookOpen" color={ROUTINE_STEP_COLORS.reading}>
          <div style={styles.planSel}>
            {PLANS.filter(p => p.id !== 'free').map(p => (
              <button
                key={p.id}
                style={{ ...styles.planBtn, ...(plan.id === p.id ? { ...styles.planBtnActive, background: ROUTINE_STEP_COLORS.reading } : {}) }}
                onClick={() => onSelectPlan?.(p.id)}
              >
                {lang === 'en' ? p.labelEn : p.label}
              </button>
            ))}
          </div>
          {PLANS.filter(p => p.id === 'free').map(p => (
            <button
              key={p.id}
              style={{ ...styles.planBtnFree, ...(plan.id === p.id ? { ...styles.planBtnActive, background: ROUTINE_STEP_COLORS.reading } : {}) }}
              onClick={() => onSelectPlan?.(p.id)}
            >
              {lang === 'en' ? p.labelEn : p.label}
            </button>
          ))}
          <span style={styles.sectionCaption}>
            {plan.readingMinutes != null ? t('journey.minPerDay', { n: plan.readingMinutes }, lang) : t('journey.noTimeTarget', undefined, lang)}
          </span>
        </PickerSection>

        {/* Reflexão */}
        <PickerSection title={t('routine.sectionReflection', undefined, lang)} icon="PenLine" color={ROUTINE_STEP_COLORS.reflection}>
          <div style={styles.durationSel}>
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
      </div>
    </div>
  )
}

function PickerSection({ title, icon, color, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={{ ...styles.sectionIcon, background: `${color}1A` }}>
          <AppIcon name={icon} size={15} color={color} />
        </span>
        <span style={styles.sectionTitle}>{title}</span>
      </div>
      {children}
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },

  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '20px 20px 18px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTotal:   { fontSize: 38, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' },
  heroTotalUnit: { fontSize: 15, fontWeight: 700 },
  heroTotalLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.85)', marginTop: 2, position: 'relative' },
  heroStartBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, border: 'none', borderRadius: 24, padding: '11px 26px', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font)', color: 'var(--or)', cursor: 'pointer', background: 'white', boxShadow: '0 8px 20px rgba(0,0,0,.15)' },

  stepper:     { display: 'flex', alignItems: 'flex-start', background: 'var(--white)', borderRadius: 18, padding: '18px 10px 14px', boxShadow: 'var(--shadow-card)' },
  stepNodeWrap:{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', width: 66, padding: 0 },
  stepNode:    { width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .4s ease, border-color .4s ease' },
  stepLabel:   { fontSize: 9.5, fontWeight: 700, color: 'var(--g5)', textAlign: 'center' },
  stepTag:     { fontSize: 8.5, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3, transition: 'color .4s ease' },
  stepLineTrack: { flex: 1, height: 3, background: 'var(--g2)', borderRadius: 2, marginTop: 18, overflow: 'hidden' },
  stepLineFill:  { height: '100%', borderRadius: 2, transition: 'width .6s ease' },

  section:     { background: 'var(--white)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  sectionCaption: { display: 'block', marginTop: 8, fontSize: 10, fontWeight: 600, color: 'var(--g4)' },

  planSel:     { display: 'flex', gap: 6, marginBottom: 6 },
  planBtn:     { flex: 1, textAlign: 'center', padding: '7px 4px', fontSize: 10, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  planBtnActive: { color: 'white', borderColor: 'transparent', boxShadow: 'var(--shadow-glow)' },
  planBtnFree: { width: '100%', textAlign: 'center', padding: '7px 4px', fontSize: 10, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },

  durationSel: { display: 'flex', gap: 6 },
  durationBtn: { flex: 1, height: 44, borderRadius: 10, border: '0.5px solid var(--g2)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--g5)', background: 'var(--g1)', transition: 'background .15s, color .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 },
  durationBtnActive: { color: 'white', border: 'none', boxShadow: 'var(--shadow-glow)' },
  durationBtnNum:  { fontSize: 13, fontWeight: 800, lineHeight: 1 },
  durationBtnUnit: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, opacity: 0.75, lineHeight: 1 },
}
