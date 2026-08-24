// Mesmo breakpoint do layout desktop/tablet em index.css (≥768px) —
// centralizado aqui pra qualquer componente que precise decidir o que
// MONTAR (não só o que mostrar via CSS) conforme o tamanho de tela, sem
// duplicar o listener de matchMedia em cada lugar que precisar disso.
import { useState, useEffect } from 'react'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
