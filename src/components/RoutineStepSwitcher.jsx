// Seletor pequeno e discreto (3 bolinhas) pra pular direto entre os passos
// da rotina de hoje (Oração/Leitura/Reflexão) sem precisar voltar pra aba
// Rotina — usado logo acima do conteúdo principal das telas de cada passo
// (PrayerScreen.jsx, ReflectionScreen.jsx, ReadingBlockView.jsx no fluxo
// guiado). Oração e Reflexão não têm aba própria na navegação (só moram
// dentro de Rotina ou chegando por aqui), então sem isso o único jeito de ir
// de uma pra outra era voltar pra Rotina toda vez. Só mostra os passos que o
// plano ativo realmente usa (plan.modules) — mesmo filtro do "stepper" da
// RoutineScreen. O ícone de cada passo fica sempre visível (nunca vira um
// check genérico quando concluído) — é o que diferencia uma bolinha da
// outra à primeira vista; "concluído" fica só na cor de fundo.
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
              border: isActive ? `2.5px solid ${color}` : '2.5px solid transparent',
              boxShadow: isActive ? '0 0 0 2.5px var(--white)' : 'none',
              cursor: isActive ? 'default' : 'pointer',
            }}
          >
            <AppIcon name={meta.icon} size={18} color={isActive || done ? 'white' : 'var(--g4)'} />
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  row: { display: 'flex', justifyContent: 'center', gap: 16, padding: '14px 0' },
  dot: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
}
