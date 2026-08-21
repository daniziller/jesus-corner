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
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getHighlights, updateHighlightText, hideHighlight } from '../highlights/highlightsStore'
import { HIGHLIGHT_COLORS } from '../data/highlightColors'
import { formatVerseRanges } from '../utils/verseRanges'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 'reading' cobre nota de capítulo e reflexão de fechamento de livro;
// 'highlight' é a marcação de trecho específico (ver src/highlights/
// highlightsStore.js) — ganhou aba própria (antes vinha junto de
// 'reading') pra dar espaço ao filtro por cor, só faz sentido pra
// marcações. 'reflection' cobre a anotação geral E a frase de aplicação
// da Reflexão diária — as duas vêm da mesma aba, só em campos separados
// (ver ReflectionScreen.jsx).
const FILTERS = [
  { key: 'all', types: null, labelKey: 'notes.filterAll' },
  { key: 'reading', types: ['reading', 'book-reflection'], labelKey: 'notes.filterReading' },
  { key: 'highlight', types: ['highlight'], labelKey: 'notes.filterHighlights' },
  { key: 'reflection', types: ['daily-reflection', 'application-phrase'], labelKey: 'notes.filterReflection' },
]

export default function NotesScreen({ session, authUser, blocks, sessionsByBlock }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', notes: [] })
  const [filter, setFilter] = useState('all')
  // Filtro por cor — só faz sentido dentro da aba "Marcações" (ver
  // FILTERS acima); null = todas as cores.
  const [colorFilter, setColorFilter] = useState(null)
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

  // Nome do livro (chave canônica, sempre em pt) -> nome em inglês, só pra
  // exibir certo com o app em EN — mesma fonte que o resto do app usa pra
  // nomes de livro (blocks.books/blocks.booksEn, arrays paralelos).
  const bookNameEn = useMemo(() => {
    const map = {}
    for (const b of blocks) b.books.forEach((name, i) => { map[name] = b.booksEn[i] })
    return map
  }, [blocks])

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', notes: [] }); return }
    let cancelled = false
    Promise.all([getNotes(authUser.email), getHighlights(authUser.email)])
      .then(([map, highlightList]) => {
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
        // Mais recentes primeiro; anotações salvas antes desta tela existir
        // não têm updatedAt (formato antigo, só texto) — ficam no fim, sem
        // embaralhar as que já têm data de verdade.
        const notes = [...noteEntries, ...highlightEntries]
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
    return 'PenLine'
  }

  function startEdit(note) {
    setEditingKey(note.key)
    setEditText(note.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
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
      else await saveNote(authUser.email, note.key, '')
      if (note.type === 'application-phrase') await syncPinnedIfMatches(note.text, '')
      setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
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
  const trimmedQuery = searchQuery.trim().toLowerCase()
  // Modo IA ativo (aiMatchKeys != null) ignora o filtro por origem de
  // propósito — buscar por tema deve olhar TODAS as anotações, não só a
  // aba selecionada; a ordem devolvida (mais relevante primeiro) também é
  // preservada, ao contrário da lista normal (mais recente primeiro).
  // Busca por palavra casa tanto o corpo da anotação quanto o rótulo
  // (nome do livro, data) — "genesis" deve achar as anotações de Gênesis
  // mesmo que a palavra em si nunca apareça no texto escrito.
  const filteredNotes = aiMatchKeys !== null
    ? aiMatchKeys.map(k => state.notes.find(n => n.key === k)).filter(Boolean)
    : trimmedQuery
      ? colorTypeFiltered.filter(n => n.text.toLowerCase().includes(trimmedQuery) || labelFor(n).toLowerCase().includes(trimmedQuery))
      : colorTypeFiltered

  function chooseFilter(key) {
    setFilter(key)
    setColorFilter(null)
  }

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('notes.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('notes.heroSub', undefined, lang)}</p>
        </div>

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

        {/* Filtro por origem — leitura (capítulo + reflexão de fechamento
            de livro) vs a Reflexão diária, as duas fontes de anotação que
            existem hoje. A busca por palavra respeita o filtro ativo (dá
            pra combinar as duas); a busca por tema (IA) ignora de
            propósito — por isso o filtro some só no modo IA, ver
            comentário em filteredNotes acima. */}
        {state.status === 'ready' && state.notes.length > 0 && aiMatchKeys === null && (
          <div style={styles.filterRow}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
                onClick={() => chooseFilter(f.key)}
              >
                {t(f.labelKey, undefined, lang)}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por cor — só dentro da aba "Marcações", pra achar um
            versículo pela cor usada em vez de vasculhar a lista inteira. */}
        {state.status === 'ready' && aiMatchKeys === null && filter === 'highlight' && (
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
            // Marcação usa a própria cor escolhida em vez do laranja padrão
            // — é a informação principal que diferencia uma marcação da
            // outra numa lista (ver HIGHLIGHT_COLORS).
            const hc = note.type === 'highlight'
              ? (HIGHLIGHT_COLORS.find(c => c.id === note.color) ?? HIGHLIGHT_COLORS[0])
              : null
            return (
              <div key={note.key} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.cardIcon, ...(hc ? { background: hc.bg } : {}) }}>
                    <AppIcon name={iconFor(note.type)} size={13} color={hc ? hc.swatch : 'var(--or)'} />
                  </span>
                  <span style={styles.cardLabel}>{labelFor(note)}</span>
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
  filterRow:  { display: 'flex', gap: 6 },
  filterBtn:  { flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 11.5, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  filterBtnActive: { color: 'white', background: 'var(--grad-primary)', border: '0.5px solid transparent', boxShadow: 'var(--shadow-glow)' },
  colorFilterRow:      { display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 2px 0' },
  colorFilterAllBtn:   { border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 20, padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  colorFilterAllBtnActive: { background: 'var(--bk)', color: 'white', border: '0.5px solid transparent' },
  colorSwatchBtn:      { width: 26, height: 26, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', boxShadow: '0 0 0 1px var(--g2)' },
  colorSwatchBtnActive:{ border: '2px solid white', boxShadow: '0 0 0 2px var(--bk)' },
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
}
