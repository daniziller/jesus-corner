import { useCallback, useEffect, useState } from 'react'
import TourOverlay from './TourOverlay'
import { TOUR_STEPS } from './tourSteps'

// Orquestra o tutorial de primeiro acesso: troca de aba (reaproveitando a
// mesma navigateTo do resto do app, sem duplicar a lógica de canAccessGroups
// nem o reset da Jornada) e avança o índice do passo. Só é montado por
// App.jsx enquanto o tour está ativo — desmontar já reseta todo esse estado
// sozinho, sem precisar de lógica de reset manual ao terminar.
export default function TourController({ onNavigate, currentTab, onFinish, onSkip, lang }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = TOUR_STEPS[stepIndex]
  const isLast = stepIndex === TOUR_STEPS.length - 1

  useEffect(() => {
    if (step.tab && step.tab !== currentTab) {
      onNavigate(step.tab)
    }
  }, [step, currentTab, onNavigate])

  const advance = useCallback(() => {
    if (isLast) { onFinish(); return }
    setStepIndex(i => i + 1)
  }, [isLast, onFinish])

  // Alvo nunca apareceu a tempo (ex: um data-tour ficou dessincronizado) —
  // pula o passo em vez de travar numa tela escura pra sempre.
  const handleTargetMissing = useCallback(() => {
    advance()
  }, [advance])

  if (step.tab && step.tab !== currentTab) return null

  return (
    <TourOverlay
      step={step}
      stepNumber={stepIndex + 1}
      totalSteps={TOUR_STEPS.length}
      isLast={isLast}
      onAdvance={advance}
      onSkip={onSkip}
      onTargetMissing={handleTargetMissing}
      lang={lang}
    />
  )
}
