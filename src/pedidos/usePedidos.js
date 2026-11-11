// usePedidos.js — a lista de pedidos de oração de uma tela (Súplica, S2;
// lista, O1) e o "orei" com resposta na hora: o toque muda a tela antes de
// o servidor responder e volta atrás se a gravação falhar.
import { useState, useEffect, useRef, useCallback } from 'react'
import { pedidosApi } from './pedidosApi'
import { applyOrei, revertOrei } from './pedidosMath.js'

export function usePedidos({ api = pedidosApi, enabled = true } = {}) {
  const [list, setList] = useState(null)
  const [error, setError] = useState(false)
  // Os pedidos marcados desde que a tela abriu — só esses a Súplica deixa
  // desmarcar — e como cada um estava antes da marca.
  const [sessionMarks, setSessionMarks] = useState(() => new Set())
  const beforeRef = useRef(new Map())
  // Uma gravação de cada vez por pedido: marcar e desmarcar em seguida
  // chegam ao servidor na ordem dos toques.
  const queueRef = useRef(new Map())

  const reload = useCallback(() => api.load()
    .then(next => { setList(next); setError(false) })
    .catch(err => { console.error('[pedidos] carregar', err); setError(true) }), [api])
  useEffect(() => { if (enabled) reload() }, [enabled, reload])

  function patch(id, fn) {
    setList(prev => prev?.map(r => (r.id === id ? fn(r) : r)) ?? prev)
  }
  function mark(id, on) {
    setSessionMarks(prev => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })
  }
  function enqueue(id, job) {
    const run = (queueRef.current.get(id) ?? Promise.resolve()).then(job)
    queueRef.current.set(id, run.catch(() => {}))
    return run
  }

  function orar(p) {
    if (p.prayedToday) return
    beforeRef.current.set(p.id, p)
    patch(p.id, applyOrei)
    mark(p.id, true)
    enqueue(p.id, () => api.orar(p)).catch(err => {
      console.error('[pedidos] orei', err)
      patch(p.id, r => revertOrei(r, p))
      mark(p.id, false)
    })
  }

  function desfazer(p) {
    const before = beforeRef.current.get(p.id)
    if (!before || !sessionMarks.has(p.id)) return
    patch(p.id, r => revertOrei(r, before))
    mark(p.id, false)
    enqueue(p.id, () => api.desfazer(before)).catch(err => {
      console.error('[pedidos] desfazer orei', err)
      patch(p.id, applyOrei)
      mark(p.id, true)
    })
  }

  return { list, loading: enabled && list == null && !error, error, sessionMarks, orar, desfazer, reload }
}
