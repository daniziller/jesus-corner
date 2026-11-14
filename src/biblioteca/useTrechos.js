// useTrechos.js — o texto dos trechos marcados que estão na tela. A
// marcação guarda livro, capítulo e versículos, não o texto; ele vem do
// arquivo do livro (`api.verseText`), uma vez por trecho. Devolve
// { [item.key]: texto }.
import { useState, useEffect, useRef } from 'react'

export function useTrechos(items, api, lang) {
  const [texts, setTexts] = useState({})
  const askedRef = useRef(new Set())
  const mountedRef = useRef(false)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => {
    for (const item of items) {
      if (!item?.verses?.length || askedRef.current.has(item.key)) continue
      askedRef.current.add(item.key)
      api.verseText(item, lang)
        .then(text => { if (mountedRef.current && text) setTexts(prev => ({ ...prev, [item.key]: text })) })
        .catch(() => { askedRef.current.delete(item.key) })
    }
  }, [items, api, lang])
  return texts
}
