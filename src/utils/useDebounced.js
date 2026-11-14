// useDebounced.js — o valor só depois de `ms` sem mudar: a busca espera a
// pessoa parar de digitar (as buscas da Bíblia e da Biblioteca).
import { useState, useEffect } from 'react'

export function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}
