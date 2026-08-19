// Seletor pequeno e discreto (3 pontos) pra pular direto entre os passos da
// rotina de hoje (Oração/Leitura/Reflexão) sem precisar voltar pra aba
// Rotina — usado no topo das telas de cada passo (PrayerScreen.jsx,
// ReflectionScreen.jsx, ReadingBlockView.jsx no fluxo guiado). Oração e
// Reflexão não têm aba própria na navegação (só moram dentro de Rotina ou
// chegando por aqui), então sem isso o único jeito de ir de uma pra outra
// era voltar pra Rotina toda vez. Só mostra os passos que o plano ativo
// realmente usa (plan.modules) — mesmo filtro do "stepper" da RoutineScreen.
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'

const STEP_META = {
  prayer:     { icon: 'HandHeart', labelKey: 'home.routinePrayer' },
  reading:    { icon: 'BookOpen',  labelKey: 'home.routineReading' },
  reflection: { icon: 'PenLine',   labelKey: 'home.routineReflection' },
}

export default function RoutineStepSwitcher({ session, activeStep, onGoPrayer, onGoReading, onGoReflection }) {
  const { lang, plan, todayRoutine } = session
  const goTo = { prayer: onGoPrayer, reading: onGoReading, reflection: onGoReflection }
  const steps = (plan?.modules ?? []).filter(key => STEP_META[key])
  // Só um passo no plano (raro) — nada pra trocar, não faz sentido mostrar.
  if (steps.length < 2) return null

  return (
    <div style={styles.row}>
      {steps.map(key => {
        const meta = STEP_META[key]
        const color = ROUTINE_STEP_COLORS[key]
        const isActive = key === activeStep
        const done = !!todayRoutine?.[key]
        return (
          <button
            key={key}
            type="button"
            onClick={isActive ? undefined : goTo[key]}
            aria-label={t(meta.labelKey, undefined, lang)}
            aria-current={isActive ? 'step' : undefined}
            style={{
              ...styles.dot,
              background: isActive || done ? color : 'var(--g1)',
              ...(isActive ? { boxShadow: `0 0 0 2.5px var(--white), 0 0 0 4px ${color}` } : {}),
              cursor: isActive ? 'default' : 'pointer',
            }}
          >
            <AppIcon name={done && !isActive ? 'Check' : meta.icon} size={13} color={isActive || done ? 'white' : 'var(--g4)'} />
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  row: { display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 0 0' },
  dot: { width: 28, height: 28, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
}
