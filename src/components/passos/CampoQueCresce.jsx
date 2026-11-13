// CampoQueCresce.jsx — campo de texto que cresce com o que se escreve (a
// partir de `minHeight`), sem barra de rolagem própria. Usado no cartão
// de escrita da oração (S1) e no cartão da pergunta da reflexão (S4).
// `focusEndKey`: quando muda, o campo ganha o foco com o cursor no fim.
import { useRef, useLayoutEffect } from 'react'

export default function CampoQueCresce({ value, onChange, minHeight, focusEndKey = 0, style, ...rest }) {
  const ref = useRef(null)
  const lastFocusKey = useRef(focusEndKey)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
    if (lastFocusKey.current !== focusEndKey) {
      lastFocusKey.current = focusEndKey
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.scrollIntoView?.({ block: 'nearest' })
    }
  }, [value, minHeight, focusEndKey])

  return (
    <textarea
      ref={ref} rows={1} value={value} onChange={e => onChange(e.target.value)}
      style={{ display: 'block', width: '100%', minHeight, boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden', ...style }}
      {...rest}
    />
  )
}
