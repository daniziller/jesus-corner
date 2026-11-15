// useAnotacao.js — a anotação aberta na página de escrever: carrega (uma
// guardada, o rascunho em andamento ou uma nova), guarda o que muda e
// grava sozinha. Não existe "Salvar": cada mudança fica na hora numa cópia
// no aparelho e é gravada na conta ~1,2 s depois da última — e também ao
// esconder o app e ao sair da página. Fechar nunca perde texto. Só
// "Finalizar" finaliza. Uma anotação sem nada escrito não é gravada (e, se
// já tinha sido, sai ao fechar).
//
// O tempo anotando soma só enquanto a página está aberta.
import { useState, useEffect, useRef, useCallback } from 'react'
import { anotarApi } from './anotarApi'
import { recoverLocalDraft } from './recuperarRascunho'
import { newNote, openNote, notePayload, noteHasContent, currentDraft } from './anotarMath.js'

const AUTOSAVE_MS = 1200
const RETRY_MS = 5000

// `target`: { noteId } — uma anotação guardada; { fresh: true, type } —
// uma nova; {} — o rascunho em andamento ou, sem rascunho, uma nova.
// `countTime: false`: fora da página de escrever (a anotação guardada,
// N5, e a leitura), o tempo anotando não anda.
export function useAnotacao({ api = anotarApi, target = {}, countTime = true } = {}) {
  const [draft, setDraft] = useState(null)
  const [library, setLibrary] = useState({ sermonNotes: [], highlights: [] })
  const [status, setStatus] = useState('loading')
  const [save, setSave] = useState({ saving: false, savedAt: null, error: false })
  const [retry, setRetry] = useState(0)

  const draftRef = useRef(null)
  draftRef.current = draft
  const ownerRef = useRef('guest')
  const dirtyRef = useRef(false)
  const storedRef = useRef(false)
  const closedRef = useRef(false)
  // "Finalizar" em curso: qualquer gravação que saia nesse meio-tempo (o
  // autosave da última tecla, a pausa do app) grava já finalizada — senão
  // ela entrava na fila depois e voltava a anotação a rascunho.
  const finalizingRef = useRef(false)
  const autosaveTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const startRef = useRef(Date.now())
  const baseSecondsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    recoverLocalDraft(api).then(data => {
      if (cancelled) return
      const saved = target.noteId ? data.sermonNotes.find(n => n.id === target.noteId)
        : target.fresh ? null
        : currentDraft(data.sermonNotes)
      if (target.noteId && !saved) { setLibrary(data); setStatus('missing'); return }
      const note = saved ? openNote(saved) : newNote({ type: target.type ?? 'sermon' })
      ownerRef.current = data.owner
      storedRef.current = !!saved
      baseSecondsRef.current = note.durationSeconds ?? 0
      startRef.current = Date.now()
      setLibrary(data)
      setDraft(note)
      setStatus('ready')
    }).catch(err => { console.error('[anotar] carregar', err); if (!cancelled) setStatus('error') })
    return () => { cancelled = true; mountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seconds = useCallback(() => baseSecondsRef.current + (countTime ? Math.floor((Date.now() - startRef.current) / 1000) : 0), [countTime])

  // O registro de agora, como vai ser gravado.
  const payloadOf = useCallback((current, finalize = false) => {
    const withTime = { ...current, durationSeconds: seconds(), ...(finalize ? { finalizedAt: current.finalizedAt ?? new Date().toISOString() } : null) }
    return notePayload(withTime, { trim: finalize })
  }, [seconds])

  // Grava na conta o rascunho como está. `finalize`: marca como finalizada
  // e tira as sobras de espaço. Devolve o que foi gravado, ou nulo.
  const persist = useCallback(async ({ finalize = false } = {}) => {
    const current = draftRef.current
    if (!current || !noteHasContent(current)) return null
    const payload = payloadOf(current, finalize || finalizingRef.current)
    api.keepLocal(ownerRef.current, payload)
    dirtyRef.current = false
    if (mountedRef.current) setSave(s => ({ ...s, saving: true }))
    try {
      await api.save(payload)
      storedRef.current = true
      // Sem nada novo desde que esta gravação saiu, a cópia do aparelho
      // já não é necessária.
      if (!dirtyRef.current) api.clearLocal(ownerRef.current, payload.id)
      if (mountedRef.current) setSave({ saving: false, savedAt: Date.now(), error: false })
      return payload
    } catch (err) {
      console.error('[anotar] gravar', err)
      dirtyRef.current = true
      if (mountedRef.current) { setSave(s => ({ ...s, saving: false, error: true })); setRetry(n => n + 1) }
      return null
    }
  }, [api, payloadOf])

  // Uma mudança da pessoa: um pedaço ({ title }) ou uma função do rascunho.
  const change = useCallback(update => {
    dirtyRef.current = true
    setDraft(prev => (prev ? (typeof update === 'function' ? update(prev) : { ...prev, ...update }) : prev))
  }, [])

  // Cada mudança fica na hora no aparelho e é gravada na conta ao pausar.
  useEffect(() => {
    if (!draft || !dirtyRef.current) return undefined
    if (noteHasContent(draft)) api.keepLocal(ownerRef.current, payloadOf(draft))
    const timer = setTimeout(() => { persist() }, AUTOSAVE_MS)
    autosaveTimerRef.current = timer
    return () => clearTimeout(timer)
  }, [draft, api, payloadOf, persist])

  // Se a gravação falhou (sem rede), tenta de novo sozinha.
  useEffect(() => {
    if (!retry) return undefined
    const timer = setTimeout(() => { if (dirtyRef.current && !closedRef.current) persist() }, RETRY_MS)
    return () => clearTimeout(timer)
  }, [retry, persist])

  // Ao esconder o app (trocar de app, bloquear a tela, fechar) e ao sair
  // da página, grava na hora — sem esperar a pausa.
  useEffect(() => {
    const flush = () => { if (!closedRef.current && dirtyRef.current) persist() }
    const onVisibility = () => { if (document.hidden) flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [persist])

  // Fechar a página: o rascunho fica guardado; vazio, não deixa rastro.
  const leave = useCallback(async () => {
    const current = draftRef.current
    if (current && !noteHasContent(current)) {
      closedRef.current = true
      api.clearLocal(ownerRef.current, current.id)
      if (storedRef.current) await api.remove(current.id).catch(err => console.error('[anotar] apagar rascunho vazio', err))
      return
    }
    if (dirtyRef.current) await persist()
    closedRef.current = !dirtyRef.current
  }, [api, persist])

  const finalize = useCallback(async () => {
    finalizingRef.current = true
    clearTimeout(autosaveTimerRef.current)
    const saved = await persist({ finalize: true })
    if (!saved) finalizingRef.current = false
    if (saved) {
      closedRef.current = true
      if (mountedRef.current) setDraft(prev => (prev ? { ...prev, finalizedAt: saved.finalizedAt } : prev))
    }
    return saved
  }, [persist])

  // A anotação vai ser apagada: nada mais grava (nem o autosave pendente,
  // nem a gravação ao sair) e a cópia do aparelho sai — senão ela voltava.
  const discard = useCallback(() => {
    closedRef.current = true
    dirtyRef.current = false
    clearTimeout(autosaveTimerRef.current)
    if (draftRef.current) api.clearLocal(ownerRef.current, draftRef.current.id)
  }, [api])

  return { status, draft, library, save, change, persist, leave, finalize, discard, seconds }
}
