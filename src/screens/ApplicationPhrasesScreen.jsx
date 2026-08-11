// ApplicationPhrasesScreen.jsx
// Histórico só das frases de aplicação da Reflexão (uma por dia, ver
// ReflectionScreen.jsx/reflection/applicationPhraseStore.js) — item
// dedicado em Perfil, separado de Minhas anotações (que também mostra
// essas frases dentro do filtro "Reflexão", mas aqui é o lugar próprio
// pra elas, com o título da sessão de leitura do dia + a data de cada
// uma). Mesmo padrão de edição/exclusão de NotesScreen.jsx, deliberadamente
// duplicado (não importado de lá) — telas de histórico pequenas assim não
// valem o acoplamento de compartilhar componente.
import { useState, useEffect } from 'react'
import { getNotes, saveNote, noteTextOf, noteUpdatedAtOf, noteSessionTitleOf, parseNoteKey } from '../notes/notesStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ApplicationPhrasesScreen({ session, authUser }) {
  const { lang } = session
  const [state, setState] = useState({ status: 'loading', phrases: [] })
  const [editingKey, setEditingKey] = useState(null)
  const [editText, setEditText] = useState('')
  const [busyKey, setBusyKey] = useState(null)

  useEffect(() => {
    if (!authUser?.email) { setState({ status: 'ready', phrases: [] }); return }
    let cancelled = false
    getNotes(authUser.email)
      .then(map => {
        if (cancelled) return
        const phrases = Object.entries(map)
          .map(([key, entry]) => ({
            key,
            text: noteTextOf(entry),
            updatedAt: noteUpdatedAtOf(entry),
            sessionTitle: noteSessionTitleOf(entry),
            ...parseNoteKey(key),
          }))
          .filter(n => n.text && n.type === 'application-phrase')
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        setState({ status: 'ready', phrases })
      })
      .catch(err => {
        console.error('Failed to load application phrases', err)
        if (!cancelled) setState({ status: 'error', phrases: [] })
      })
    return () => { cancelled = true }
  }, [authUser?.email])

  function dateLabelFor(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`)
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  }

  function startEdit(phrase) {
    setEditingKey(phrase.key)
    setEditText(phrase.text)
  }
  function cancelEdit() {
    setEditingKey(null)
    setEditText('')
  }

  async function saveEdit(phrase) {
    if (!editText.trim()) return
    setBusyKey(phrase.key)
    try {
      // Mantém o mesmo sessionTitle já gravado — editar o texto não muda
      // qual foi a sessão de leitura daquele dia.
      await saveNote(authUser.email, phrase.key, editText, { sessionTitle: phrase.sessionTitle })
      setState(s => ({
        ...s,
        phrases: s.phrases
          .map(p => p.key === phrase.key ? { ...p, text: editText, updatedAt: new Date().toISOString() } : p)
          .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      }))
      setEditingKey(null)
      setEditText('')
    } catch (err) {
      console.error('Failed to update application phrase', err)
    } finally {
      setBusyKey(null)
    }
  }

  async function deletePhrase(phrase) {
    if (!window.confirm(t('applicationPhrases.deleteConfirm', undefined, lang))) return
    setBusyKey(phrase.key)
    try {
      await saveNote(authUser.email, phrase.key, '')
      setState(s => ({ ...s, phrases: s.phrases.filter(p => p.key !== phrase.key) }))
    } catch (err) {
      console.error('Failed to delete application phrase', err)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={styles.body}>
        <div className="page-header" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{t('applicationPhrases.pageTitle', undefined, lang)}</h1>
          <p style={styles.heroSub}>{t('applicationPhrases.heroSub', undefined, lang)}</p>
        </div>

        {state.status === 'loading' && <p style={styles.emptyHint}>{t('applicationPhrases.loading', undefined, lang)}</p>}
        {state.status === 'error' && <p style={styles.emptyHint}>{t('applicationPhrases.error', undefined, lang)}</p>}
        {state.status === 'ready' && state.phrases.length === 0 && (
          <p style={styles.emptyHint}>{t('applicationPhrases.empty', undefined, lang)}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.phrases.map(phrase => {
            const isEditing = editingKey === phrase.key
            const isBusy = busyKey === phrase.key
            return (
              <div key={phrase.key} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIcon}><AppIcon name="Sparkles" size={13} color="#A21CAF" /></span>
                  <span style={styles.cardLabel}>
                    {phrase.sessionTitle && <span style={styles.cardSession}>{phrase.sessionTitle}</span>}
                    <span style={styles.cardDate}>{dateLabelFor(phrase.date)}</span>
                  </span>
                  {!isEditing && (
                    <span style={styles.cardActions}>
                      <button
                        style={styles.cardActionBtn} onClick={() => startEdit(phrase)}
                        aria-label={t('applicationPhrases.editAction', undefined, lang)} disabled={isBusy}
                      >
                        <AppIcon name="PenLine" size={13} color="var(--g5)" />
                      </button>
                      <button
                        style={styles.cardActionBtn} onClick={() => deletePhrase(phrase)}
                        aria-label={t('applicationPhrases.deleteAction', undefined, lang)} disabled={isBusy}
                      >
                        <AppIcon name="Trash2" size={13} color="var(--re)" />
                      </button>
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      style={styles.editInput}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      maxLength={140}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        style={styles.editSaveBtn} onClick={() => saveEdit(phrase)}
                        disabled={isBusy || !editText.trim()}
                      >
                        {isBusy ? t('applicationPhrases.saving', undefined, lang) : t('applicationPhrases.saveEdit', undefined, lang)}
                      </button>
                      <button style={styles.editCancelBtn} onClick={cancelEdit} disabled={isBusy}>
                        {t('applicationPhrases.cancelEdit', undefined, lang)}
                      </button>
                    </div>
                  </>
                ) : (
                  <p style={styles.cardText}>{phrase.text}</p>
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
  emptyHint:  { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '24px 12px' },
  card:       { background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', border: '0.5px dashed rgba(192,38,211,.4)', borderRadius: 18, padding: 13 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardIcon:   { width: 22, height: 22, borderRadius: 7, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  cardLabel:  { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  cardSession:{ fontSize: 11, fontWeight: 700, color: 'var(--bk)', lineHeight: 1.3 },
  cardDate:   { fontSize: 9.5, fontWeight: 600, color: '#A21CAF', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 1 },
  cardText:   { fontSize: 13, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.5 },
  cardActions:  { display: 'flex', gap: 2, flexShrink: 0 },
  cardActionBtn:{ width: 24, height: 24, border: 'none', background: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  editInput:  { width: '100%', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'white' },
  editSaveBtn:  { flex: 1, background: '#A21CAF', border: 'none', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  editCancelBtn:{ flex: 1, background: 'white', border: '0.5px solid rgba(192,38,211,.3)', borderRadius: 11, padding: 9, fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
}
