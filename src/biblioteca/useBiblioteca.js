// useBiblioteca.js — o que a aba Biblioteca carregou: os itens, os
// capítulos lidos por dia e o resumo dos estudos. `refreshKey` recarrega
// (a aba fica montada; App.jsx incrementa a cada visita).
import { useState, useEffect, useCallback } from 'react'
import { bibliotecaApi } from './bibliotecaApi'

const EMPTY = []
const NONE = {}

export function useBiblioteca({ api = bibliotecaApi, enabled = true, refreshKey = 0 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  const reload = useCallback(() => api.load()
    .then(next => { setData(next); setError(false) })
    .catch(err => { console.error('[biblioteca] carregar', err); setError(true) }), [api])
  useEffect(() => { if (enabled) reload() }, [enabled, reload, refreshKey])

  return {
    status: data ? 'ready' : error ? 'error' : 'loading',
    items: data?.items ?? EMPTY, readByDay: data?.readByDay ?? NONE, studies: data?.studies ?? { count: 0, active: null }, studyItems: data?.studyItems ?? EMPTY,
    reload,
  }
}
