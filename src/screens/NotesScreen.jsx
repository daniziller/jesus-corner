// NotesScreen.jsx
// Histórico de todas as anotações da pessoa (leitura + Reflexão diária)
// num lugar só — hoje cada uma só era visível "no contexto" onde foi
// escrita (a passagem exata, ou só no dia em que a Reflexão foi feita).
// Alcançável só por um link em Perfil (ver profile.notesLabel em
// ProfileScreen.jsx) — não é aba própria na navegação, mesmo padrão de
// ContactScreen.jsx/UpgradeScreen.jsx.
import { useState, useEffect, useMemo } from 'react'
import { getNotes, saveNote, noteTextOf, noteUpdatedAtOf, parseNoteKey } from '../notes/notesStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 'reading' cobre nota de capítulo E reflexão de fechamento de livro — as
// duas vivem dentro do fluxo de leitura da Bíblia, só "reflection" (a aba
// Reflexão diária) é uma origem separada de verdade.
const FILTERS = [
  { key: 'all', types: null, labelKey: 'notes.filterAll' },
  { key: 'reading', types: ['reading', 'book-reflection'], labelKey: 'notes.filterReading' },
  { key: 'reflection', types: ['daily-reflection'], labelKey: 'notes.filterReflection' },
]

export default function NotesScreen({ session, authUser, blocks, sessionsByBlock }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', notes: [] })
  const [filter, setFilter] = useState('all')
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
    getNotes(authUser.email)
      .then(map => {
        if (cancelled) return
        const notes = Object.entries(map)
          .map(([key, entry]) => ({
            key,
            text: noteTextOf(entry),
            updatedAt: noteUpdatedAtOf(entry),
            ...parseNoteKey(key),
          }))
          .filter(n => n.text)
          // Mais recentes primeiro; anotações salvas antes desta tela
          // existir não têm updatedAt (formato antigo, só texto) — ficam
          // no fim, sem embaralhar as que já têm data de verdade.
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
    if (note.type === 'daily-reflection') {
      const d = new Date(`${note.date}T00:00:00`)
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
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
    return note.key
  }

  function iconFor(type) {
    return type === 'reading' ? 'BookOpen' : 'PenLine'
  }

  function startEdit(note) {
    setEditingKey(note.key)
    setEditText(note.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
  }

  async function saveEdit(note) {
    // Texto vazio deletaria a nota (mesma regra de saveNote) — pra isso
    // tem o botão de deletar, específico e com confirmação; edição vazia
    // simplesmente não salva.
    if (!editText.trim()) return
    setBusyKey(note.key)
    try {
      await saveNote(authUser.email, note.key, editText)
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
      await saveNote(authUser.email, note.key, '')
      setState(s => ({ ...s, notes: s.notes.filter(n => n.key !== note.key) }))
    } catch (err) {
      console.error('Failed to delete note', err)
    } finally {
      setBusyKey(null)
    }
  }

  const activeFilter = FILTERS.find(f => f.key === filter)
  const filteredNotes = activeFilter.types
    ? state.notes.filter(n => activeFilter.types.includes(n.type))
    : state.notes

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('notes.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('notes.heroSub', undefined, lang)}</p>
        </div>

        {/* Filtro por origem — leitura (capítulo + reflexão de fechamento
            de livro) vs a Reflexão diária, as duas fontes de anotação que
            existem hoje. */}
        {state.status === 'ready' && state.notes.length > 0 && (
          <div style={styles.filterRow}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
                onClick={() => setFilter(f.key)}
              >
                {t(f.labelKey, undefined, lang)}
              </button>
            ))}
          </div>
        )}

        {state.status === 'loading' && <p style={styles.emptyHint}>{t('notes.loading', undefined, lang)}</p>}
        {state.status === 'error' && <p style={styles.emptyHint}>{t('notes.error', undefined, lang)}</p>}
        {state.status === 'ready' && state.notes.length === 0 && (
          <p style={styles.emptyHint}>{t('notes.empty', undefined, lang)}</p>
        )}
        {state.status === 'ready' && state.notes.length > 0 && filteredNotes.length === 0 && (
          <p style={styles.emptyHint}>{t('notes.emptyFiltered', undefined, lang)}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotes.map(note => {
            const isEditing = editingKey === note.key
            const isBusy = busyKey === note.key
            return (
              <div key={note.key} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIcon}><AppIcon name={iconFor(note.type)} size={13} color="var(--or)" /></span>
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
                ) : (
                  <p style={styles.cardText}>{note.text}</p>
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
  filterRow:  { display: 'flex', gap: 6 },
  filterBtn:  { flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 11.5, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  filterBtnActive: { color: 'white', background: 'var(--grad-primary)', border: '0.5px solid transparent', boxShadow: 'var(--shadow-glow)' },
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },
  card:       { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 18, padding: 13, boxShadow: 'var(--shadow-card)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardIcon:   { width: 22, height: 22, borderRadius: 7, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardLabel:  { flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.3, textTransform: 'uppercase' },
  cardText:   { fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  cardActions:  { display: 'flex', gap: 2, flexShrink: 0 },
  cardActionBtn:{ width: 24, height: 24, border: 'none', background: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  editTextarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--g1)' },
  editSaveBtn:  { flex: 1, background: 'var(--grad-primary)', border: 'none', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  editCancelBtn:{ flex: 1, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
}
