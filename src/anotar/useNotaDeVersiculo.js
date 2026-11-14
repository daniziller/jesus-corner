// useNotaDeVersiculo.js — a nota aberta em N4: carrega (a marcação que já
// existe naquele trecho, ou uma nota nova), guarda o que muda e grava
// sozinha. Não existe "Salvar": cada mudança fica na hora numa cópia no
// aparelho e é gravada na conta ~1,2 s depois da última — e ao sair. Uma
// nota vazia não é guardada. "Quem vê" só vale ao tocar em "Pronto": é aí
// que a escolha é gravada e a nota vai aos grupos escolhidos.
import { useState, useEffect, useRef, useCallback } from 'react'
import { anotarApi } from './anotarApi'
import { recoverLocalNote } from './recuperarRascunho'
import { openVerseNote, findHighlight, newVerseNoteRecord, pauseAction, emptyAction, groupsToPublish, groupPost, verseQuote } from './notaMath.js'

const AUTOSAVE_MS = 1200
const RETRY_MS = 5000

// `highlight` (ou `highlightId`): a marcação em que a nota é escrita;
// `reference` ({ book, bookEn, chapter, verses }): o trecho de uma nota
// nova. `sessionMode`: 'session' quando aberta na leitura do plano.
// `onHighlights`: recebe as marcações da pessoa a cada gravação.
export function useNotaDeVersiculo({ api = anotarApi, lang = 'pt', reference = null, highlight = null, highlightId = null, sessionMode = 'browse', onHighlights = null } = {}) {
  const [status, setStatus] = useState('loading')
  const [note, setNote] = useState(null)
  const [library, setLibrary] = useState({ highlights: [], sermonNotes: [] })
  const [chosen, setChosen] = useState([])
  const [verseText, setVerseText] = useState('')
  const [save, setSave] = useState({ saving: false, error: false })
  const [retry, setRetry] = useState(0)

  const noteRef = useRef(null)
  noteRef.current = note
  const ownerRef = useRef('guest')
  const dirtyRef = useRef(false)
  const touchedRef = useRef(false)
  const versesDirtyRef = useRef(false)
  const openedTextRef = useRef('')
  const closedRef = useRef(false)
  const mountedRef = useRef(true)
  const queueRef = useRef(Promise.resolve())
  const onHighlightsRef = useRef(onHighlights)
  onHighlightsRef.current = onHighlights

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    recoverLocalNote(api).then(data => {
      if (cancelled) return
      const id = highlight?.id ?? highlightId
      const recovered = data.recoveredNote && data.recoveredNote === id ? data.highlights.find(h => h.id === id) : null
      const existing = recovered ?? highlight ?? (id ? data.highlights.find(h => h.id === id && !h.hidden) : findHighlight(data.highlights, reference))
      if (!existing && !reference) { setStatus('missing'); return }
      const opened = openVerseNote({ existing, reference })
      ownerRef.current = data.owner
      openedTextRef.current = opened.text.trim()
      setLibrary(data)
      setChosen(opened.sharedGroupIds)
      setNote(opened)
      setStatus('ready')
    }).catch(err => { console.error('[nota] carregar', err); if (!cancelled) setStatus('error') })
    return () => { cancelled = true; mountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O texto do(s) versículo(s), na versão em uso.
  const book = note?.book
  const chapter = note?.chapter
  const versesKey = note?.verses.join(',') ?? ''
  useEffect(() => {
    if (!book || !versesKey) return undefined
    let cancelled = false
    api.chapterVerses(book, chapter, lang)
      .then(verses => { if (!cancelled) setVerseText(verseQuote(verses, versesKey.split(',').map(Number))) })
      .catch(err => { console.error('[nota] texto do versículo', err); if (!cancelled) setVerseText('') })
    return () => { cancelled = true }
  }, [api, lang, book, chapter, versesKey])

  const tell = highlights => { if (highlights) onHighlightsRef.current?.(highlights) }

  // A cópia do aparelho: o registro inteiro quando a nota ainda não
  // existe na conta, para poder ser criada ao reabrir.
  const localRecord = current => ({
    ...(current.stored ? null : newVerseNoteRecord(current, { sessionMode })),
    id: current.id, book: current.book, bookEn: current.bookEn, chapter: current.chapter, verses: current.verses,
    text: current.text.trim(), tags: current.tags, updatedAt: new Date().toISOString(),
  })

  // Grava na conta a nota como está (uma gravação de cada vez).
  const persist = useCallback(() => {
    const run = async () => {
      const current = noteRef.current
      if (!current) return true
      const action = pauseAction(current)
      if (action === 'none' || (!dirtyRef.current && !versesDirtyRef.current)) return true
      dirtyRef.current = false
      const versesChanged = versesDirtyRef.current
      versesDirtyRef.current = false
      if (mountedRef.current) setSave({ saving: true, error: false })
      try {
        let highlights
        if (action === 'create') {
          highlights = await api.createVerseNote(newVerseNoteRecord(current, { sessionMode }))
          noteRef.current = { ...noteRef.current, stored: true }
          if (mountedRef.current) setNote(prev => (prev ? { ...prev, stored: true } : prev))
        } else {
          if (versesChanged) await api.setVerseNoteVerses(current.id, current.verses)
          highlights = await api.updateVerseNote(current.id, { text: current.text.trim(), tags: current.tags })
        }
        if (!dirtyRef.current) api.clearLocalNote(ownerRef.current, current.id)
        tell(highlights)
        if (mountedRef.current) setSave({ saving: false, error: false })
        return true
      } catch (err) {
        console.error('[nota] gravar', err)
        dirtyRef.current = true
        if (versesChanged) versesDirtyRef.current = true
        if (mountedRef.current) { setSave({ saving: false, error: true }); setRetry(n => n + 1) }
        return false
      }
    }
    queueRef.current = queueRef.current.then(run, run)
    return queueRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, sessionMode])

  const change = useCallback(update => {
    dirtyRef.current = true
    touchedRef.current = true
    setNote(prev => (prev ? { ...prev, ...update } : prev))
  }, [])

  // "+ versículo": a nota passa a valer para o trecho escolhido.
  const setVerses = useCallback(verses => {
    versesDirtyRef.current = true
    change({ verses })
  }, [change])

  useEffect(() => {
    if (!note || !dirtyRef.current) return undefined
    if (note.text.trim()) api.keepLocalNote(ownerRef.current, localRecord(note))
    const timer = setTimeout(() => { persist() }, AUTOSAVE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, api, persist])

  useEffect(() => {
    if (!retry) return undefined
    const timer = setTimeout(() => { if (dirtyRef.current && !closedRef.current) persist() }, RETRY_MS)
    return () => clearTimeout(timer)
  }, [retry, persist])

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

  // Sair da tela. `done` é o "Pronto": além de gravar, vale a escolha de
  // "Quem vê" — a nota vai aos grupos escolhidos. Voltar só grava.
  const leave = useCallback(async ({ done = false, versionShort = '' } = {}) => {
    await persist()
    const current = noteRef.current
    if (!current) return
    closedRef.current = !dirtyRef.current
    const text = current.text.trim()
    try {
      if (!text && touchedRef.current) {
        const action = emptyAction(current)
        if (action === 'hide') tell(await api.hideVerseNote(current.id))
        else if (action === 'clear') tell(await api.updateVerseNote(current.id, { text: '', tags: current.tags }))
        api.clearLocalNote(ownerRef.current, current.id)
        return
      }
      if (!done || !text || !current.stored) return
      const before = current.sharedGroupIds
      const sameChoice = before.length === chosen.length && chosen.every(id => before.includes(id))
      if (!sameChoice) tell(await api.updateVerseNote(current.id, { text, tags: current.tags, sharedGroupIds: chosen }))
      if (!verseText) return
      const post = groupPost({ note: current, verseText, versionShort, lang })
      for (const groupId of groupsToPublish({ before, chosen, text, textChanged: text !== openedTextRef.current })) {
        api.publish(groupId, post).catch(err => console.error('[nota] levar ao grupo', groupId, err))
      }
    } catch (err) {
      console.error('[nota] sair', err)
    }
  }, [api, lang, persist, chosen, verseText])

  return { status, note, library, chosen, setChosen, verseText, save, change, setVerses, leave }
}
