// NotesScreen.jsx
// Histórico de todas as anotações da pessoa (leitura + Reflexão diária)
// num lugar só — hoje cada uma só era visível "no contexto" onde foi
// escrita (a passagem exata, ou só no dia em que a Reflexão foi feita).
// Alcançável só por um link em Perfil (ver profile.notesLabel em
// ProfileScreen.jsx) — não é aba própria na navegação, mesmo padrão de
// ContactScreen.jsx/UpgradeScreen.jsx.
import { useState, useEffect, useMemo } from 'react'
import { getNotes, noteTextOf, noteUpdatedAtOf, parseNoteKey } from '../notes/notesStore'
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

export default function NotesScreen({ session, authUser, blocks }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', notes: [] })
  const [filter, setFilter] = useState('all')

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
      return `${bookLabel(note.book)} · ${range}`
    }
    return note.key
  }

  function iconFor(type) {
    return type === 'reading' ? 'BookOpen' : 'PenLine'
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
          {filteredNotes.map(note => (
            <div key={note.key} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}><AppIcon name={iconFor(note.type)} size={13} color="var(--or)" /></span>
                <span style={styles.cardLabel}>{labelFor(note)}</span>
              </div>
              <p style={styles.cardText}>{note.text}</p>
            </div>
          ))}
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
  cardLabel:  { fontSize: 10.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.3, textTransform: 'uppercase', minWidth: 0 },
  cardText:   { fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
}
