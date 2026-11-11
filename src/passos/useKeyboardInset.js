// useKeyboardInset.js — quantos pixels do fundo da tela o teclado está
// cobrindo. No celular o teclado não encolhe a página: ele passa por cima
// dela (só a área visível, `visualViewport`, diminui). As telas de passo
// somam esse valor ao fundo para o rodapé e o campo subirem junto.
import { useState, useEffect } from 'react'

export function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    function update() {
      const covered = window.innerHeight - vv.height - vv.offsetTop
      // Abaixo de 80px não é teclado (barra do navegador, zoom).
      setInset(covered > 80 ? Math.round(covered) : 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return inset
}
