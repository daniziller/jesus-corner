// usePaginas.js — a paginação das listas da Biblioteca: começa em uma
// página e ganha mais uma cada vez que o fim da lista (`sentinelRef`)
// entra na tela. `resetKey` (o filtro, a ordem) volta para a primeira.
import { useState, useEffect, useRef } from 'react'

export function usePaginas(resetKey) {
  const [pages, setPages] = useState(1)
  const sentinelRef = useRef(null)
  useEffect(() => { setPages(1) }, [resetKey])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) setPages(p => p + 1) }, { rootMargin: '400px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  })
  return [pages, sentinelRef]
}
