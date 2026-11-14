// CampoDeBloco.jsx — o campo de um bloco de texto da página de anotação
// (parágrafo ou tópico): cresce com o que se escreve, sem rolagem própria.
// `focus` ({ key, caret }): quando a chave muda, o campo ganha o foco com
// o cursor em `caret` (no fim, se não vier). Escrevendo no fim do texto, a
// página rola para o cursor nunca ficar escondido atrás da barra de
// ferramentas ou do teclado.
import { useRef, useLayoutEffect, useEffect } from 'react'

const MARGIN = 18

// Rola a página até o fim do campo aparecer.
function reveal(el) {
  const scroller = el.closest('[data-anotar-rolagem]')
  if (!scroller) return
  const field = el.getBoundingClientRect()
  const view = scroller.getBoundingClientRect()
  if (field.bottom > view.bottom - MARGIN) scroller.scrollTop += field.bottom - view.bottom + MARGIN
}

export default function CampoDeBloco({ value, onChange, focus = null, revealKey = 0, style, ...rest }) {
  const ref = useRef(null)
  const lastFocus = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    if (focus && lastFocus.current !== focus.key) {
      lastFocus.current = focus.key
      el.focus({ preventScroll: true })
      const caret = focus.caret ?? el.value.length
      el.setSelectionRange(caret, caret)
    }
    if (document.activeElement === el && el.selectionEnd === el.value.length) reveal(el)
  }, [value, focus, revealKey])

  // A largura muda (girar o aparelho): a altura acompanha.
  useEffect(() => {
    function resize() {
      const el = ref.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <textarea
      ref={ref} rows={1} value={value} onChange={e => onChange(e.target.value)}
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden', background: 'none', padding: 0, caretColor: 'var(--bento-accent)', ...style }}
      {...rest}
    />
  )
}
