// NotesScreen.jsx
// Histórico de todas as anotações da pessoa (leitura + Reflexão diária)
// num lugar só — hoje cada uma só era visível "no contexto" onde foi
// escrita (a passagem exata, ou só no dia em que a Reflexão foi feita).
// Aba própria na navegação (ver BottomNav.jsx/Sidebar.jsx) — antes só um
// link em Perfil. Duas formas de achar uma anotação: busca por palavra
// (instantânea, client-side, casa substring no texto) e busca por tema
// com IA (api/search-notes.js) — pra quando a pessoa lembra do ASSUNTO
// mas não da palavra exata que usou.
import { useState, useEffect, useMemo } from 'react'
import { getNotes, saveNote, noteTextOf, noteUpdatedAtOf, parseNoteKey } from '../notes/notesStore'
import { searchNotesByTheme } from '../notes/notesSearchStore'
import { getSermonNotes, saveSermonNote, deleteSermonNote } from '../notes/sermonNotesStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getHighlights, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { HIGHLIGHT_COLORS } from '../data/highlightColors'
import { formatVerseRanges } from '../utils/verseRanges'
import { computeBookChapterCounts } from '../utils/progress'
import { dateKey } from '../utils/dateKey'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 'reading' cobre nota de capítulo e reflexão de fechamento de livro;
// 'highlight' é a marcação de trecho específico (ver src/highlights/
// highlightsStore.js) — ganhou aba própria (antes vinha junto de
// 'reading') pra dar espaço ao filtro por cor, só faz sentido pra
// marcações. 'reflection' cobre a anotação geral E a frase de aplicação
// da Reflexão diária — as duas vêm da mesma aba, só em campos separados
// (ver ReflectionScreen.jsx). 'sermon' é a anotação de sermão (ver
// src/notes/sermonNotesStore.js) — registro à parte, sem ligação com uma
// passagem/dia do plano de leitura.
const FILTERS = [
  { key: 'all', types: null, labelKey: 'notes.filterAll' },
  { key: 'reading', types: ['reading', 'book-reflection'], labelKey: 'notes.filterReading' },
  { key: 'highlight', types: ['highlight'], labelKey: 'notes.filterHighlights' },
  { key: 'reflection', types: ['daily-reflection', 'application-phrase'], labelKey: 'notes.filterReflection' },
  { key: 'sermon', types: ['sermon'], labelKey: 'notes.filterSermon' },
]

// Cor própria por tipo de anotação — mesma cor usada na faixa de tipos
// (sempre visível, ver abaixo) e no ícone/rótulo de cada card, pra dar pra
// reconhecer o tipo de longe, sem precisar abrir o painel de filtros.
// 'highlight' aqui é só a cor do ÍCONE da aba/card genérico — uma marcação
// específica usa a cor de verdade que a pessoa escolheu (ver HIGHLIGHT_COLORS
// / hc mais abaixo, que sobrescreve isso).
const TYPE_STYLES = {
  all:        { color: 'var(--bk)', bg: 'var(--g2)' },
  reading:    { color: '#2563EB', bg: 'rgba(37,99,235,.12)' },
  highlight:  { color: '#CA8A04', bg: 'rgba(202,138,4,.12)' },
  reflection: { color: '#7C3AED', bg: 'rgba(124,58,237,.12)' },
  sermon:     { color: '#B45309', bg: 'rgba(180,83,9,.12)' },
}

// A que grupo de cor/ícone uma anotação pertence — mesmas 4 categorias da
// faixa de tipos acima ('reading' cobre tanto nota de capítulo quanto
// reflexão de fechamento de livro, ver FILTERS).
function typeGroupFor(note) {
  if (note.type === 'highlight') return 'highlight'
  if (note.type === 'sermon') return 'sermon'
  if (note.type === 'daily-reflection' || note.type === 'application-phrase') return 'reflection'
  return 'reading'
}

// Uma faixa nova de anotação de sermão, sem livro/capítulo/versículo
// escolhidos ainda (ver addPassageRow).
function blankPassage() {
  return { book: '', chapter: '', verseStart: '', verseEnd: '' }
}

// Filtro por quando a anotação foi adicionada (updatedAt — só existe
// createdAt separado pra marcações, ver highlightEntries abaixo, então
// usa sempre updatedAt como "data" pra tratar tudo do mesmo jeito).
// 'custom' revela dois campos de data (de/até, ver dateFilterRangeFor).
const DATE_FILTERS = [
  { key: 'all', labelKey: 'notes.dateFilterAll' },
  { key: 'today', labelKey: 'notes.dateFilterToday' },
  { key: 'week', labelKey: 'notes.dateFilterWeek' },
  { key: 'month', labelKey: 'notes.dateFilterMonth' },
  { key: 'custom', labelKey: 'notes.dateFilterCustom' },
]

function dateFilterRangeFor(key, customFrom, customTo) {
  if (key === 'all') return null
  const today = new Date()
  if (key === 'today') { const k = dateKey(today); return { from: k, to: k } }
  if (key === 'week') {
    const dow = today.getDay()
    const diff = (dow === 0 ? -6 : 1) - dow
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
    return { from: dateKey(monday), to: dateKey(today) }
  }
  if (key === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: dateKey(first), to: dateKey(today) }
  }
  return { from: customFrom || null, to: customTo || null }
}

export default function NotesScreen({ session, authUser, blocks, sessionsByBlock, onOpenBiblePassage }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', notes: [] })
  // Painel de filtros (origem/livro/cor/data) minimizado por padrão — só
  // abre se a pessoa tocar em "Filtros". Os 4 filtros combinam entre si
  // (ver filteredNotes abaixo) — dá pra ver, por exemplo, só marcações
  // amarelas de Gênesis feitas essa semana, tudo ao mesmo tempo.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  // Filtro por livro — só existe em notas de leitura/marcação (reflexão
  // geral e frase de aplicação não têm livro); null = todos os livros.
  const [bookFilter, setBookFilter] = useState(null)
  // Filtro por cor — só faz sentido dentro da aba "Marcações" (ver
  // FILTERS acima); null = todas as cores.
  const [colorFilter, setColorFilter] = useState(null)
  // Filtro por preletor — só faz sentido dentro da aba "Sermão"; null =
  // todos os preletores.
  const [preacherFilter, setPreacherFilter] = useState(null)
  // Filtro por data de quando a anotação foi adicionada — independente dos
  // outros três, combina com eles (ver DATE_FILTERS acima).
  const [dateFilterKey, setDateFilterKey] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  // Busca por palavra — casa substring no texto, ao vivo, sem custo. Busca
  // por tema (IA) é uma AÇÃO à parte (botão), não roda a cada tecla —
  // manda o texto atual da caixa como o "tema" pra api/search-notes.js e
  // troca a lista pras chaves que voltarem. aiMatchKeys null = navegação
  // normal (filtro por origem + busca por palavra); array = modo IA ativo.
  const [searchQuery, setSearchQuery] = useState('')
  const [aiMatchKeys, setAiMatchKeys] = useState(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiError, setAiError] = useState('')
  // Nota sendo editada agora (key) + o texto em rascunho — só uma por vez.
  const [editingKey, setEditingKey] = useState(null)
  const [editText, setEditText] = useState('')
  // Key da nota com uma ação (salvar edição/deletar) em andamento — trava
  // só os botões DAQUELE card, não a tela inteira.
  const [busyKey, setBusyKey] = useState(null)

  // Formulário de anotação de sermão — bem mais campos que uma nota comum
  // (preletor/igreja/passagens/texto), então usa seu próprio formulário
  // rico em vez do textarea genérico de edição. sermonEditing != null =
  // editando uma existente (guarda o registro original, pra preservar
  // id/data/createdAt ao salvar); null = criando uma nova.
  const [creatingSermon, setCreatingSermon] = useState(false)
  const [sermonEditing, setSermonEditing] = useState(null)
  const [sermonPreacher, setSermonPreacher] = useState('')
  const [sermonChurch, setSermonChurch] = useState('')
  const [sermonPassages, setSermonPassages] = useState([])
  const [sermonText, setSermonText] = useState('')
  const [sermonBusy, setSermonBusy] = useState(false)
  const [sermonError, setSermonError] = useState('')

  // Nome do livro (chave canônica, sempre em pt) -> nome em inglês, só pra
  // exibir certo com o app em EN — mesma fonte que o resto do app usa pra
  // nomes de livro (blocks.books/blocks.booksEn, arrays paralelos).
  const bookNameEn = useMemo(() => {
    const map = {}
    for (const b of blocks) b.books.forEach((name, i) => { map[name] = b.booksEn[i] })
    return map
  }, [blocks])

  // Só livros que têm pelo menos uma nota/marcação — evita um seletor com
  // os 66 livros da Bíblia quando a pessoa só anotou em 3. Ordem canônica
  // (Gênesis primeiro), não alfabética — vem de `blocks`, a mesma fonte de
  // ordem que o resto do app usa.
  const availableBooks = useMemo(() => {
    const present = new Set(state.notes.filter(n => n.book).map(n => n.book))
    const ordered = []
    for (const block of blocks) {
      for (const b of block.books) {
        if (present.has(b) && !ordered.includes(b)) ordered.push(b)
      }
    }
    return ordered
  }, [state.notes, blocks])

  // Preletores já usados em alguma anotação de sermão — mesma ideia de
  // availableBooks (só quem já apareceu, não uma lista fixa), em ordem
  // alfabética (sem ordem canônica pra nomes de pessoa, ao contrário de
  // livro).
  const availablePreachers = useMemo(() => {
    const present = new Set(
      state.notes.filter(n => n.type === 'sermon' && n.preacher).map(n => n.preacher)
    )
    return [...present].sort((a, b) => a.localeCompare(b))
  }, [state.notes])

  // TODOS os 66 livros, em ordem canônica — usado no seletor de livro do
  // formulário de sermão (diferente de availableBooks acima, que só serve
  // pro FILTRO e por isso só lista quem já tem anotação).
  const allBooksOrdered = useMemo(() => blocks.flatMap(b => b.books), [blocks])
  // Quantos capítulos cada livro tem — popula o seletor de capítulo do
  // formulário de sermão (mesmo cálculo já usado em JourneyScreen.jsx pra
  // saber o total de capítulos por livro).
  const bookChapterCounts = useMemo(() => computeBookChapterCounts(sessionsByBlock), [sessionsByBlock])

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', notes: [] }); return }
    let cancelled = false
    Promise.all([getNotes(authUser.email), getHighlights(authUser.email), getSermonNotes(authUser.email)])
      .then(([map, highlightList, sermonList]) => {
        if (cancelled) return
        const noteEntries = Object.entries(map)
          .map(([key, entry]) => ({
            key,
            text: noteTextOf(entry),
            updatedAt: noteUpdatedAtOf(entry),
            ...parseNoteKey(key),
          }))
          // 'unknown' cobre application:pinned (não é uma entrada por dia,
          // é só o valor fixado no card da Home — ver notesStore.js) e
          // qualquer chave futura que essa tela ainda não saiba rotular.
          .filter(n => n.text && n.type !== 'unknown')
        // Marcações de trecho específico (ver src/highlights/
        // highlightsStore.js) — id próprio (não uma chave do mapa de notas
        // de cima), então id vira a "key" aqui só pra reaproveitar o mesmo
        // formato de card/edição/exclusão da lista. Sem exigir texto — um
        // versículo só marcado com uma cor, sem anotação nenhuma, ainda é
        // uma marcação de verdade e deve aparecer na lista (ver
        // styles.cardTextEmpty abaixo, pro card sem corpo escrito).
        const highlightEntries = highlightList
          .filter(h => !h.hidden)
          .map(h => ({
            key: h.id, id: h.id, text: h.text ?? '', updatedAt: h.createdAt ?? h.updatedAt,
            type: 'highlight', book: h.book, chapter: h.chapter, verses: h.verses, color: h.color,
          }))
        // Anotações de sermão (ver src/notes/sermonNotesStore.js) — id
        // próprio, sem livro/capítulo únicos (pode ter várias passagens ou
        // nenhuma, ver passages).
        const sermonEntries = sermonList.map(s => ({
          key: s.id, id: s.id, text: s.text ?? '', updatedAt: s.updatedAt ?? s.createdAt, createdAt: s.createdAt,
          type: 'sermon', date: s.date, preacher: s.preacher, church: s.church, passages: s.passages ?? [],
        }))
        // Mais recentes primeiro; anotações salvas antes desta tela existir
        // não têm updatedAt (formato antigo, só texto) — ficam no fim, sem
        // embaralhar as que já têm data de verdade.
        const notes = [...noteEntries, ...highlightEntries, ...sermonEntries]
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        setState({ status: 'ready', notes })
      })
      .catch(err => {
        console.error('Failed to load notes', err)
        if (!cancelled) setState({ status: 'error', notes: [] })
      })
    return () => { cancelled = true }
  }, [authUser?.email])

  function bookLabel(book) {
    return lang === 'en' ? (bookNameEn[book] ?? book) : book
  }

  // Nota é salva por passagem exata (livro + capítulos), não por id de
  // sessão — sobrevive a troca de plano (ver notesStore.js). Pra mostrar
  // "Sessão N" mesmo assim, procura no plano ATUAL uma sessão com essa
  // mesma passagem; se o plano mudou depois que a nota foi escrita e
  // nenhuma sessão bate mais exatamente, some sozinho (só livro + capítulo
  // continuam aparecendo, sem número).
  function sessionNumberFor(note) {
    if (note.type !== 'reading') return null
    for (const block of blocks) {
      const match = (sessionsByBlock[block.id] ?? []).find(
        s => s.book === note.book && s.chStart === note.chStart && s.chEnd === note.chEnd
      )
      if (match) return match.id
    }
    return null
  }

  function labelFor(note) {
    if (note.type === 'daily-reflection' || note.type === 'application-phrase') {
      const d = new Date(`${note.date}T00:00:00`)
      const dateStr = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      return note.type === 'application-phrase'
        ? `${dateStr} · ${t('notes.applicationPhraseTag', undefined, lang)}`
        : dateStr
    }
    if (note.type === 'sermon') {
      const d = new Date(`${note.date}T00:00:00`)
      const dateStr = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      return note.preacher ? `${dateStr} · ${note.preacher}` : dateStr
    }
    const chLabel = lang === 'en' ? 'Ch.' : 'Cap.'
    if (note.type === 'book-reflection') {
      return `${bookLabel(note.book)} · ${t('notes.bookReflectionTag', undefined, lang)}`
    }
    if (note.type === 'reading') {
      const range = note.chStart === note.chEnd ? `${chLabel} ${note.chStart}` : `${chLabel} ${note.chStart}–${note.chEnd}`
      const sessionN = sessionNumberFor(note)
      const sessionLabel = sessionN != null ? `${t('reading.sessionLabel', { n: sessionN }, lang)} · ` : ''
      return `${sessionLabel}${bookLabel(note.book)} · ${range}`
    }
    if (note.type === 'highlight') {
      return `${bookLabel(note.book)} ${note.chapter}:${formatVerseRanges(note.verses)}`
    }
    return note.key
  }

  function iconFor(type) {
    if (type === 'highlight') return 'Highlighter'
    if (type === 'reading') return 'BookOpen'
    if (type === 'application-phrase') return 'Sparkles'
    if (type === 'sermon') return 'Landmark'
    return 'PenLine'
  }

  // Rótulo de uma passagem de sermão pra exibir no chip/link (ver
  // passages abaixo) — "Livro Cap" ou "Livro Cap:de-até" quando tem faixa
  // de versículo.
  function passageLabel(p) {
    const range = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `-${p.verseEnd}` : ''}` : ''
    return `${bookLabel(p.book)} ${p.chapter}${range}`
  }

  function startEdit(note) {
    // Anotação de sermão tem campos demais (preletor/igreja/passagens) pro
    // textarea genérico — abre o formulário rico lá em cima já preenchido,
    // em vez de expandir inline neste card (ver startEditSermon abaixo).
    if (note.type === 'sermon') { startEditSermon(note); return }
    setEditingKey(note.key)
    setEditText(note.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
  }

  function startCreateSermon() {
    setSermonEditing(null)
    setSermonPreacher('')
    setSermonChurch('')
    setSermonPassages([])
    setSermonText('')
    setSermonError('')
    setCreatingSermon(true)
  }

  function startEditSermon(note) {
    setSermonEditing(note)
    setSermonPreacher(note.preacher ?? '')
    setSermonChurch(note.church ?? '')
    setSermonPassages((note.passages ?? []).map(p => ({
      book: p.book ?? '', chapter: p.chapter ? String(p.chapter) : '',
      verseStart: p.verseStart ? String(p.verseStart) : '', verseEnd: p.verseEnd ? String(p.verseEnd) : '',
    })))
    setSermonText(note.text ?? '')
    setSermonError('')
    setCreatingSermon(true)
  }

  function cancelSermonForm() {
    setCreatingSermon(false)
    setSermonEditing(null)
    setSermonError('')
  }

  function addPassageRow() {
    setSermonPassages(prev => [...prev, blankPassage()])
  }
  function updatePassageRow(index, field, value) {
    setSermonPassages(prev => prev.map((p, i) => {
      if (i !== index) return p
      // Trocar de livro invalida o capítulo escolhido (contagem de
      // capítulos é outra) — mesmo espírito de qualquer seletor
      // dependente.
      return field === 'book' ? { ...p, book: value, chapter: '' } : { ...p, [field]: value }
    }))
  }
  function removePassageRow(index) {
    setSermonPassages(prev => prev.filter((_, i) => i !== index))
  }

  async function saveSermon() {
    if (!sermonText.trim() || sermonBusy) return
    setSermonBusy(true)
    setSermonError('')
    try {
      const cleanPassages = sermonPassages
        .filter(p => p.book && p.chapter)
        .map(p => ({
          book: p.book,
          chapter: Number(p.chapter),
          verseStart: p.verseStart ? Number(p.verseStart) : null,
          verseEnd: p.verseEnd ? Number(p.verseEnd) : null,
        }))
      const nowIso = new Date().toISOString()
      // Data/createdAt preservados ao editar (o dia do sermão é quando foi
      // OUVIDO, não quando a anotação foi editada por último).
      const finalNote = {
        id: sermonEditing?.id ?? `sermon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: sermonEditing?.date ?? dateKey(),
        createdAt: sermonEditing?.createdAt ?? nowIso,
        updatedAt: nowIso,
        preacher: sermonPreacher.trim(),
        church: sermonChurch.trim(),
        passages: cleanPassages,
        text: sermonText.trim(),
      }
      await saveSermonNote(authUser.email, finalNote)
      const entry = {
        key: finalNote.id, id: finalNote.id, text: finalNote.text, updatedAt: finalNote.updatedAt, createdAt: finalNote.createdAt,
        type: 'sermon', date: finalNote.date, preacher: finalNote.preacher, church: finalNote.church, passages: finalNote.passages,
      }
      setState(s => ({
        ...s,
        notes: [entry, ...s.notes.filter(n => n.key !== finalNote.id)]
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      }))
      cancelSermonForm()
    } catch (err) {
      console.error('Failed to save sermon note', err)
      setSermonError(t('notes.sermonSaveError', undefined, lang))
    } finally {
      setSermonBusy(false)
    }
  }

  // A frase fixada na Home (application:pinned) é uma cópia à parte,
  // comparável só pelo texto (ver mesmo helper em
  // ApplicationPhrasesScreen.jsx) — sem isso, editar/apagar uma frase de
  // aplicação por aqui (ela também aparece no filtro "Reflexão" desta
  // tela) deixava o card da Home com um texto já editado ou apagado.
  async function syncPinnedIfMatches(oldText, newText) {
    const pinned = await getPinnedApplicationPhrase(authUser.email).catch(() => '')
    if (pinned && pinned === oldText) {
      await setPinnedApplicationPhrase(authUser.email, newText).catch(err => {
        console.error('Failed to sync pinned application phrase', err)
      })
    }
  }

  async function saveEdit(note) {
    // Texto vazio deletaria a nota (mesma regra de saveNote) — pra isso
    // tem o botão de deletar, específico e com confirmação; edição vazia
    // simplesmente não salva.
    if (!editText.trim()) return
    setBusyKey(note.key)
    try {
      // Marcação de trecho (highlight) vive numa coluna própria, à parte do
      // mapa de notas de sempre — ver src/highlights/highlightsStore.js.
      if (note.type === 'highlight') await updateHighlightText(authUser.email, note.id, editText)
      else await saveNote(authUser.email, note.key, editText)
      if (note.type === 'application-phrase') await syncPinnedIfMatches(note.text, editText)
      setState(s => ({
        ...s,
        notes: s.notes
          .map(n => n.key === note.key ? { ...n, text: editText, updatedAt: new Date().toISOString() } : n)
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      }))
      setEditingKey(null)
      setEditText('')
    } catch (err) {
      console.error('Failed to update note', err)
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteNote(note) {
    if (!window.confirm(t('notes.deleteConfirm', undefined, lang))) return
    setBusyKey(note.key)
    try {
      if (note.type === 'highlight') await hideHighlight(authUser.email, note.id)
      else if (note.type === 'sermon') await deleteSermonNote(authUser.email, note.id)
      else await saveNote(authUser.email, note.key, '')
      if (note.type === 'application-phrase') await syncPinnedIfMatches(note.text, '')
      setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
      // Apagou a que estava sendo editada no formulário de sermão — fecha
      // o formulário pra não deixar salvar uma anotação que não existe mais.
      if (sermonEditing?.key === note.key) cancelSermonForm()
    } catch (err) {
      console.error('Failed to delete note', err)
    } finally {
      setBusyKey(null)
    }
  }

  // Editar a busca por palavra enquanto uma busca por tema (IA) está ativa
  // sai do modo IA — os resultados antigos não fazem mais sentido pra um
  // texto novo que ainda nem foi buscado.
  function handleSearchChange(value) {
    setSearchQuery(value)
    if (aiMatchKeys !== null) { setAiMatchKeys(null); setAiError('') }
  }

  async function runAiSearch() {
    const query = searchQuery.trim()
    if (!query || aiSearching) return
    setAiSearching(true)
    setAiError('')
    try {
      const notesForSearch = state.notes.map(n => ({ key: n.key, text: n.text }))
      const matches = await searchNotesByTheme(query, notesForSearch)
      setAiMatchKeys(matches)
    } catch (err) {
      console.error('Failed to search notes by theme', err)
      setAiError(
        err.message === 'subscription_required' ? t('notes.searchAiSubscriptionRequired', undefined, lang)
        : t('notes.searchAiError', undefined, lang)
      )
    } finally {
      setAiSearching(false)
    }
  }

  function clearAiSearch() {
    setAiMatchKeys(null)
    setAiError('')
  }

  const activeFilter = FILTERS.find(f => f.key === filter)
  const typeFiltered = activeFilter.types
    ? state.notes.filter(n => activeFilter.types.includes(n.type))
    : state.notes
  // Filtro por cor só se aplica dentro da aba "Marcações" — nas outras,
  // colorFilter é sempre null (ver função que troca de aba abaixo).
  const colorTypeFiltered = colorFilter
    ? typeFiltered.filter(n => n.color === colorFilter)
    : typeFiltered
  // Filtro por preletor — mesmo espírito do filtro por cor, só se aplica
  // dentro da aba "Sermão".
  const preacherTypeFiltered = preacherFilter
    ? colorTypeFiltered.filter(n => n.preacher === preacherFilter)
    : colorTypeFiltered
  // Filtro por livro — independente do filtro por origem, combina com ele
  // (ex: "Leitura" + "Gênesis" só mostra notas de leitura de Gênesis).
  const bookFiltered = bookFilter
    ? preacherTypeFiltered.filter(n => n.book === bookFilter)
    : preacherTypeFiltered
  // Filtro por data — compara só a parte YYYY-MM-DD de updatedAt (ISO),
  // então funciona igual pra qualquer fuso sem precisar converter de
  // verdade; suficiente pra um filtro de UI, não pra algo exato ao segundo.
  const dateRange = dateFilterRangeFor(dateFilterKey, customFrom, customTo)
  const dateFiltered = dateRange
    ? bookFiltered.filter(n => {
        const nk = n.updatedAt ? n.updatedAt.slice(0, 10) : null
        if (!nk) return false
        if (dateRange.from && nk < dateRange.from) return false
        if (dateRange.to && nk > dateRange.to) return false
        return true
      })
    : bookFiltered
  const trimmedQuery = searchQuery.trim().toLowerCase()
  // Modo IA ativo (aiMatchKeys != null) ignora origem/livro/cor/data de
  // propósito — buscar por tema deve olhar TODAS as anotações, não só as
  // que passam pelos outros filtros; a ordem devolvida (mais relevante
  // primeiro) também é preservada, ao contrário da lista normal (mais
  // recente primeiro).
  // Busca por palavra casa tanto o corpo da anotação quanto o rótulo
  // (nome do livro, data) — "genesis" deve achar as anotações de Gênesis
  // mesmo que a palavra em si nunca apareça no texto escrito.
  const filteredNotes = aiMatchKeys !== null
    ? aiMatchKeys.map(k => state.notes.find(n => n.key === k)).filter(Boolean)
    : trimmedQuery
      ? dateFiltered.filter(n => n.text.toLowerCase().includes(trimmedQuery) || labelFor(n).toLowerCase().includes(trimmedQuery))
      : dateFiltered

  // Tipo não entra nesta contagem — a faixa de tipos fica sempre visível
  // (fora do painel), então já mostra sozinha se está filtrando por tipo;
  // a bolinha do botão "Filtros" só conta os refinamentos escondidos dentro
  // do painel (livro/cor/preletor/data).
  const activeFilterCount =
    (bookFilter ? 1 : 0) + (colorFilter ? 1 : 0) + (preacherFilter ? 1 : 0) + (dateFilterKey !== 'all' ? 1 : 0)

  function clearFilters() {
    setFilter('all')
    setBookFilter(null)
    setColorFilter(null)
    setPreacherFilter(null)
    setDateFilterKey('all')
    setCustomFrom('')
    setCustomTo('')
  }

  function chooseFilter(key) {
    setFilter(key)
    setColorFilter(null)
    setPreacherFilter(null)
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('notes.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('notes.heroSub', undefined, lang)}</p>
        </div>

        {/* Anotação de sermão — registro de um sermão ouvido na igreja
            (preletor, igreja, passagens bíblicas lidas, texto livre), à
            parte das anotações de leitura/reflexão (ver
            src/notes/sermonNotesStore.js). Botão "+" sempre visível no
            topo — não é um filtro, é a ação principal desta aba. */}
        {creatingSermon ? (
          <div style={styles.sermonFormCard}>
            <p style={styles.sermonFormTitle}>
              {sermonEditing ? t('notes.sermonEditTitle', undefined, lang) : t('notes.sermonNewTitle', undefined, lang)}
            </p>

            <p style={styles.createLabel}>{t('notes.sermonPreacherLabel', undefined, lang)}</p>
            <input
              type="text" style={styles.sermonInput} value={sermonPreacher}
              onChange={e => setSermonPreacher(e.target.value)}
              placeholder={t('notes.sermonPreacherPlaceholder', undefined, lang)}
              maxLength={80}
            />

            <p style={{ ...styles.createLabel, marginTop: 10 }}>{t('notes.sermonChurchLabel', undefined, lang)}</p>
            <input
              type="text" style={styles.sermonInput} value={sermonChurch}
              onChange={e => setSermonChurch(e.target.value)}
              placeholder={t('notes.sermonChurchPlaceholder', undefined, lang)}
              maxLength={80}
            />

            <p style={{ ...styles.createLabel, marginTop: 10 }}>{t('notes.sermonPassagesLabel', undefined, lang)}</p>
            {sermonPassages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {sermonPassages.map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={styles.passageRow}>
                      <select
                        style={styles.passageBookSelect} value={p.book}
                        onChange={e => updatePassageRow(i, 'book', e.target.value)}
                      >
                        <option value="">{t('notes.sermonPassageBookPlaceholder', undefined, lang)}</option>
                        {allBooksOrdered.map(b => <option key={b} value={b}>{bookLabel(b)}</option>)}
                      </select>
                      <select
                        style={styles.passageChapterSelect} value={p.chapter} disabled={!p.book}
                        onChange={e => updatePassageRow(i, 'chapter', e.target.value)}
                      >
                        <option value="">{t('notes.sermonPassageChapterPlaceholder', undefined, lang)}</option>
                        {Array.from({ length: bookChapterCounts[p.book] ?? 0 }, (_, idx) => idx + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <input
                        type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                        placeholder={t('notes.sermonVerseFrom', undefined, lang)} value={p.verseStart}
                        onChange={e => updatePassageRow(i, 'verseStart', e.target.value)}
                      />
                      <span style={styles.passageVerseSep}>–</span>
                      <input
                        type="number" min="1" inputMode="numeric" style={styles.passageVerseInput}
                        placeholder={t('notes.sermonVerseTo', undefined, lang)} value={p.verseEnd}
                        onChange={e => updatePassageRow(i, 'verseEnd', e.target.value)}
                      />
                      <button
                        style={styles.passageRemoveBtn} onClick={() => removePassageRow(i)}
                        aria-label={t('notes.sermonRemovePassage', undefined, lang)}
                      >
                        <AppIcon name="X" size={13} color="var(--g5)" />
                      </button>
                    </div>
                    {/* Link "ir pro texto" já ativo assim que livro+capítulo
                        são escolhidos — não precisa salvar a anotação
                        primeiro (ver onOpenBiblePassage). A tela de Notas
                        fica montada mesmo trocando de aba (ver App.jsx/
                        notesVisitedRef), então o rascunho do formulário
                        continua aqui quando a pessoa usa "Voltar" pra
                        retornar. */}
                    {p.book && p.chapter && (
                      <button
                        style={{ ...styles.passageChip, alignSelf: 'flex-start' }}
                        onClick={() => onOpenBiblePassage?.(p.book, Number(p.chapter))}
                      >
                        <AppIcon name="BookOpen" size={11} color="var(--or)" /> {passageLabel(p)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button style={styles.addPassageBtn} onClick={addPassageRow}>
              <AppIcon name="Plus" size={13} color="var(--or)" /> {t('notes.sermonAddPassage', undefined, lang)}
            </button>

            <p style={{ ...styles.createLabel, marginTop: 12 }}>{t('notes.sermonTextLabel', undefined, lang)}</p>
            <textarea
              style={styles.sermonTextarea} value={sermonText}
              onChange={e => setSermonText(e.target.value)}
              placeholder={t('notes.sermonTextPlaceholder', undefined, lang)}
              rows={5}
            />

            {sermonError && <p style={styles.aiErrorText}>{sermonError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                style={styles.editSaveBtn} onClick={saveSermon}
                disabled={sermonBusy || !sermonText.trim()}
              >
                {sermonBusy ? t('notes.saving', undefined, lang) : t('notes.sermonSaveBtn', undefined, lang)}
              </button>
              <button style={styles.editCancelBtn} onClick={cancelSermonForm} disabled={sermonBusy}>
                {t('notes.cancelEdit', undefined, lang)}
              </button>
            </div>
          </div>
        ) : (
          <button style={styles.sermonNewBtn} onClick={startCreateSermon}>
            <AppIcon name="Plus" size={16} color="white" /> {t('notes.sermonNewBtn', undefined, lang)}
          </button>
        )}

        {/* Busca por palavra (instantânea, casa substring no texto) +
            busca por tema com IA (botão à parte — só dispara ao tocar, não
            a cada tecla) — pra quando a pessoa lembra do assunto mas não
            da palavra exata que escreveu. */}
        {state.status === 'ready' && state.notes.length > 0 && (
          <>
            <div style={styles.searchRow}>
              <div style={styles.searchInputWrap}>
                <AppIcon name="Search" size={14} color="var(--g4)" />
                <input
                  type="text"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder={t('notes.searchPlaceholder', undefined, lang)}
                />
              </div>
              <button
                style={{ ...styles.searchAiBtn, opacity: (!searchQuery.trim() || aiSearching) ? 0.5 : 1, cursor: (!searchQuery.trim() || aiSearching) ? 'default' : 'pointer' }}
                onClick={runAiSearch}
                disabled={!searchQuery.trim() || aiSearching}
                aria-label={t('notes.searchAiBtn', undefined, lang)}
                title={t('notes.searchAiBtn', undefined, lang)}
              >
                <AppIcon name={aiSearching ? 'RefreshCw' : 'Sparkles'} size={15} color="white" className={aiSearching ? 'icon-spin' : undefined} />
              </button>
            </div>

            {aiMatchKeys !== null && (
              <div style={styles.aiActiveRow}>
                <span style={styles.aiActiveTag}>
                  <AppIcon name="Sparkles" size={11} color="#A21CAF" /> {t('notes.searchAiBtn', undefined, lang)}
                </span>
                <button style={styles.aiClearBtn} onClick={clearAiSearch}>{t('notes.searchAiClear', undefined, lang)}</button>
              </div>
            )}
            {aiError && <p style={styles.aiErrorText}>{aiError}</p>}
          </>
        )}

        {/* Tipo de anotação — SEMPRE visível (não fica escondido atrás do
            painel de filtros) e cada tipo tem sua própria cor, tanto aqui
            quanto no ícone/rótulo de cada card abaixo, pra dar pra
            reconhecer o tipo de longe. Some junto do resto na busca por
            tema (IA), que ignora filtros de propósito. */}
        {state.status === 'ready' && state.notes.length > 0 && aiMatchKeys === null && (
          <div style={styles.filterRow}>
            {FILTERS.map(f => {
              const ts = TYPE_STYLES[f.key]
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  style={{
                    ...styles.filterBtn,
                    background: active ? ts.color : ts.bg,
                    color: active ? 'white' : ts.color,
                  }}
                  onClick={() => chooseFilter(f.key)}
                >
                  {t(f.labelKey, undefined, lang)}
                </button>
              )
            })}
          </div>
        )}

        {/* Painel de filtros (livro/cor/preletor/data) minimizado por
            padrão — só o botão "Filtros" aparece, com uma bolinha
            mostrando quantos estão ativos; tocar abre o painel. A busca
            por tema (IA) ignora todos de propósito, então o botão some
            nesse modo (ver comentário em filteredNotes acima). */}
        {state.status === 'ready' && state.notes.length > 0 && aiMatchKeys === null && (
          <>
            <button style={styles.filtersToggleBtn} onClick={() => setFiltersOpen(v => !v)}>
              <AppIcon name="SlidersHorizontal" size={14} color="var(--g5)" />
              <span style={styles.filtersToggleLabel}>{t('notes.filtersToggle', undefined, lang)}</span>
              {activeFilterCount > 0 && <span style={styles.filtersBadge}>{activeFilterCount}</span>}
              <AppIcon
                name="ChevronDown" size={14} color="var(--g4)"
                style={{ marginLeft: 'auto', transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
              />
            </button>

            {filtersOpen && (
              <>
                {/* Livro — só notas de leitura/marcação têm um; lista só
                    os que já têm alguma anotação, em ordem canônica. */}
                {availableBooks.length > 0 && (
                  <select
                    style={styles.bookSelect}
                    value={bookFilter ?? ''}
                    onChange={e => setBookFilter(e.target.value || null)}
                    aria-label={t('notes.filterBookAll', undefined, lang)}
                  >
                    <option value="">{t('notes.filterBookAll', undefined, lang)}</option>
                    {availableBooks.map(b => (
                      <option key={b} value={b}>{bookLabel(b)}</option>
                    ))}
                  </select>
                )}

                {/* Cor — só dentro da aba "Marcações", pra achar um
                    versículo pela cor usada. */}
                {filter === 'highlight' && (
                  <div style={styles.colorFilterRow}>
                    <button
                      style={{ ...styles.colorFilterAllBtn, ...(colorFilter === null ? styles.colorFilterAllBtnActive : {}) }}
                      onClick={() => setColorFilter(null)}
                    >
                      {t('notes.filterColorAll', undefined, lang)}
                    </button>
                    {HIGHLIGHT_COLORS.map(c => (
                      <button
                        key={c.id}
                        style={{ ...styles.colorSwatchBtn, background: c.swatch, ...(colorFilter === c.id ? styles.colorSwatchBtnActive : {}) }}
                        onClick={() => setColorFilter(v => (v === c.id ? null : c.id))}
                        aria-label={t(c.labelKey, undefined, lang)}
                        aria-pressed={colorFilter === c.id}
                      />
                    ))}
                  </div>
                )}

                {/* Preletor — só dentro da aba "Sermão". */}
                {filter === 'sermon' && availablePreachers.length > 0 && (
                  <select
                    style={styles.bookSelect}
                    value={preacherFilter ?? ''}
                    onChange={e => setPreacherFilter(e.target.value || null)}
                    aria-label={t('notes.filterPreacherAll', undefined, lang)}
                  >
                    <option value="">{t('notes.filterPreacherAll', undefined, lang)}</option>
                    {availablePreachers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}

                {/* Data de quando foi adicionada. */}
                <div style={styles.dateFilterRow}>
                  {DATE_FILTERS.map(d => (
                    <button
                      key={d.key}
                      style={{ ...styles.dateFilterChip, ...(dateFilterKey === d.key ? styles.dateFilterChipActive : {}) }}
                      onClick={() => setDateFilterKey(d.key)}
                    >
                      {t(d.labelKey, undefined, lang)}
                    </button>
                  ))}
                </div>
                {dateFilterKey === 'custom' && (
                  <div style={styles.dateRangeRow}>
                    <input
                      type="date" style={styles.dateInput} value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      aria-label={t('notes.dateFilterFrom', undefined, lang)}
                    />
                    <span style={styles.dateRangeSep}>–</span>
                    <input
                      type="date" style={styles.dateInput} value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      aria-label={t('notes.dateFilterTo', undefined, lang)}
                    />
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <button style={styles.filtersClearBtn} onClick={clearFilters}>
                    {t('notes.filtersClear', undefined, lang)}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {state.status === 'loading' && <p style={styles.emptyHint}>{t('notes.loading', undefined, lang)}</p>}
        {state.status === 'error' && <p style={styles.emptyHint}>{t('notes.error', undefined, lang)}</p>}
        {state.status === 'ready' && state.notes.length === 0 && (
          <p style={styles.emptyHint}>{t('notes.empty', undefined, lang)}</p>
        )}
        {state.status === 'ready' && state.notes.length > 0 && filteredNotes.length === 0 && (
          <p style={styles.emptyHint}>
            {aiMatchKeys !== null ? t('notes.searchAiEmpty', undefined, lang)
              : trimmedQuery ? t('notes.emptySearch', undefined, lang)
              : t('notes.emptyFiltered', undefined, lang)}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotes.map(note => {
            const isEditing = editingKey === note.key
            const isBusy = busyKey === note.key
            // Marcação usa a própria cor escolhida em vez da cor fixa do
            // tipo "Marcações" — é a informação principal que diferencia
            // uma marcação da outra numa lista (ver HIGHLIGHT_COLORS). Os
            // outros tipos usam a cor fixa do grupo (ver TYPE_STYLES), pra
            // reconhecer o tipo de longe mesmo sem abrir filtro nenhum.
            const hc = note.type === 'highlight'
              ? (HIGHLIGHT_COLORS.find(c => c.id === note.color) ?? HIGHLIGHT_COLORS[0])
              : null
            const typeStyle = hc ? { color: hc.swatch, bg: hc.bg } : TYPE_STYLES[typeGroupFor(note)]
            return (
              <div key={note.key} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.cardIcon, background: typeStyle.bg }}>
                    <AppIcon name={iconFor(note.type)} size={13} color={typeStyle.color} />
                  </span>
                  <span style={{ ...styles.cardLabel, color: typeStyle.color }}>{labelFor(note)}</span>
                  {!isEditing && (
                    <span style={styles.cardActions}>
                      <button
                        style={styles.cardActionBtn} onClick={() => startEdit(note)}
                        aria-label={t('notes.editAction', undefined, lang)} disabled={isBusy}
                      >
                        <AppIcon name="PenLine" size={13} color="var(--g5)" />
                      </button>
                      <button
                        style={styles.cardActionBtn} onClick={() => deleteNote(note)}
                        aria-label={t('notes.deleteAction', undefined, lang)} disabled={isBusy}
                      >
                        <AppIcon name="Trash2" size={13} color="var(--re)" />
                      </button>
                    </span>
                  )}
                </div>

                {note.type === 'sermon' && (note.preacher || note.church) && (
                  <p style={styles.sermonMeta}>
                    {[note.preacher, note.church].filter(Boolean).join(' · ')}
                  </p>
                )}
                {note.type === 'sermon' && note.passages?.length > 0 && (
                  <div style={styles.passageChipRow}>
                    {note.passages.map((p, i) => (
                      <button
                        key={i} style={styles.passageChip}
                        onClick={() => onOpenBiblePassage?.(p.book, p.chapter)}
                      >
                        <AppIcon name="BookOpen" size={11} color="var(--or)" /> {passageLabel(p)}
                      </button>
                    ))}
                  </div>
                )}

                {isEditing ? (
                  <>
                    <textarea
                      style={styles.editTextarea}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={4}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        style={styles.editSaveBtn} onClick={() => saveEdit(note)}
                        disabled={isBusy || !editText.trim()}
                      >
                        {isBusy ? t('notes.saving', undefined, lang) : t('notes.saveEdit', undefined, lang)}
                      </button>
                      <button style={styles.editCancelBtn} onClick={cancelEdit} disabled={isBusy}>
                        {t('notes.cancelEdit', undefined, lang)}
                      </button>
                    </div>
                  </>
                ) : note.text ? (
                  <p style={styles.cardText}>{note.text}</p>
                ) : (
                  <p style={{ ...styles.cardText, ...styles.cardTextEmpty }}>{t('notes.noAnnotationText', undefined, lang)}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  body:       { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  heroSub:    { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 2px' },
  searchRow:      { display: 'flex', gap: 8 },
  searchInputWrap:{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--g2)', borderRadius: 13, padding: '0 12px', background: 'var(--card-bg)' },
  searchInput:    { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', padding: '10px 0', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)' },
  searchAiBtn:    { flexShrink: 0, width: 40, border: 'none', borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #C026D4 0%, #86198F 100%)', boxShadow: '0 6px 16px rgba(162,28,175,.3)' },
  aiActiveRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '-4px 2px 0' },
  aiActiveTag:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#A21CAF' },
  aiClearBtn:     { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', padding: '2px 4px' },
  aiErrorText:    { fontSize: 11.5, fontWeight: 600, color: 'var(--re, #DC2626)', margin: '-4px 2px 0' },
  filtersToggleBtn:  { display: 'flex', alignItems: 'center', gap: 7, border: '0.5px solid var(--g2)', background: 'var(--card-bg)', borderRadius: 13, padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: 'var(--g6)' },
  filtersToggleLabel:{ flexShrink: 0 },
  filtersBadge:      { minWidth: 17, height: 17, borderRadius: 9, background: 'var(--grad-primary)', color: 'white', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  filtersClearBtn:   { alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'var(--or)', padding: '2px 4px' },
  bookSelect:        { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--bk)', background: 'var(--card-bg)' },
  filterRow:  { display: 'flex', gap: 6 },
  filterBtn:  { flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', borderRadius: 9, border: 'none', fontFamily: 'var(--font)', transition: 'background .15s, color .15s' },
  colorFilterRow:      { display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 2px 0' },
  colorFilterAllBtn:   { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 20, padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  colorFilterAllBtnActive: { background: 'var(--bk)', color: 'white', border: '0.5px solid transparent' },
  colorSwatchBtn:      { width: 26, height: 26, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', boxShadow: '0 0 0 1px var(--g2)' },
  colorSwatchBtnActive:{ border: '2px solid white', boxShadow: '0 0 0 2px var(--bk)' },
  dateFilterRow:   { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-2px 2px 0' },
  dateFilterChip:  { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 20, padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  dateFilterChipActive: { background: 'var(--bk)', color: 'white', border: '0.5px solid transparent' },
  dateRangeRow:    { display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px' },
  dateRangeSep:    { fontSize: 12, fontWeight: 700, color: 'var(--g4)' },
  dateInput:       { flex: 1, minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 11, padding: '9px 10px', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: 'var(--bk)', background: 'var(--card-bg)' },
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },
  card:       { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 13, boxShadow: 'var(--shadow-card)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardIcon:   { width: 22, height: 22, borderRadius: 7, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardLabel:  { flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.3, textTransform: 'uppercase' },
  cardText:   { fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  cardTextEmpty: { color: 'var(--g4)', fontStyle: 'italic' },
  cardActions:  { display: 'flex', gap: 2, flexShrink: 0 },
  cardActionBtn:{ width: 24, height: 24, border: 'none', background: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  editTextarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--g1)' },
  editSaveBtn:  { flex: 1, background: 'var(--grad-primary)', border: 'none', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  editCancelBtn:{ flex: 1, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },

  sermonNewBtn:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)', color: 'white', cursor: 'pointer', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  sermonFormCard: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-card)' },
  sermonFormTitle:{ fontSize: 13, fontWeight: 800, color: 'var(--bk)', marginBottom: 10 },
  createLabel:    { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', marginBottom: 6 },
  sermonInput:    { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontSize: 12.5, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  sermonTextarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--white)' },
  passageRow:     { display: 'flex', alignItems: 'center', gap: 5 },
  passageBookSelect:   { flex: '1.3 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 6px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageChapterSelect:{ flex: '0.8 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageVerseInput:   { flex: '0.7 1 0', minWidth: 0, border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 4px', fontSize: 11, fontFamily: 'var(--font)', color: 'var(--bk)', background: 'var(--white)' },
  passageVerseSep:     { fontSize: 11, fontWeight: 700, color: 'var(--g4)', flexShrink: 0 },
  passageRemoveBtn:    { flexShrink: 0, width: 24, height: 24, border: 'none', background: 'var(--g1)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  addPassageBtn:  { display: 'flex', alignItems: 'center', gap: 5, border: '0.5px dashed var(--g3)', background: 'none', borderRadius: 9, padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--or)', cursor: 'pointer', fontFamily: 'var(--font)' },
  sermonMeta:     { fontSize: 11.5, fontWeight: 600, color: 'var(--g5)', marginBottom: 6 },
  passageChipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  passageChip:    { display: 'flex', alignItems: 'center', gap: 4, border: '0.5px solid rgba(157,67,0,.25)', background: 'var(--olt)', borderRadius: 20, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: 'var(--or)', cursor: 'pointer', fontFamily: 'var(--font)' },
}
