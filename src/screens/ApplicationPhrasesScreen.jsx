// ApplicationPhrasesScreen.jsx
// Histórico só das frases de aplicação da Reflexão (uma por dia, ver
// ReflectionScreen.jsx/reflection/applicationPhraseStore.js) — item
// dedicado em Perfil, separado de Minhas anotações (que também mostra
// essas frases dentro do filtro "Reflexão", mas aqui é o lugar próprio
// pra elas, com o título da sessão de leitura do dia + a data de cada
// uma). Mesmo padrão de edição/exclusão de NotesScreen.jsx, deliberadamente
// duplicado (não importado de lá) — telas de histórico pequenas assim não
// valem o acoplamento de compartilhar componente. Cores/medidas dos
// cartões seguem as mesmas de NotesScreen.jsx (cartão branco raio 24, tag
// uppercase pequena) pra ficar visualmente igual à tela irmã.
//
// Sem quadro próprio no handoff — cabeçalho segue o mesmo padrão de tela
// secundária já usado em GroupAdminScreen.jsx/ContactScreen.jsx.
import { useState, useEffect } from 'react'
import { getNotes, saveNote, noteTextOf, noteUpdatedAtOf, noteSessionTitleOf, parseNoteKey } from '../notes/notesStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const FONT = 'var(--font-bento)'

export default function ApplicationPhrasesScreen({ session, authUser, onBack }) {
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

  // A frase fixada na Home (application:pinned) é uma cópia à parte do
  // histórico diário (application:{data}), sem nenhuma referência de volta
  // pra qual dia ela veio — editar/apagar a entrada do histórico não tocava
  // nela, então o card da Home podia continuar mostrando um texto já
  // editado ou apagado, indefinidamente. Compara pelo TEXTO (não existe
  // outra forma de saber "essa é a mesma frase" entre as duas chaves) e
  // atualiza/limpa a fixada junto sempre que ela for a que está sendo
  // editada ou apagada.
  async function syncPinnedIfMatches(oldText, newText) {
    const pinned = await getPinnedApplicationPhrase(authUser.email).catch(() => '')
    if (pinned && pinned === oldText) {
      await setPinnedApplicationPhrase(authUser.email, newText).catch(err => {
        console.error('Failed to sync pinned application phrase', err)
      })
    }
  }

  async function saveEdit(phrase) {
    if (!editText.trim()) return
    setBusyKey(phrase.key)
    try {
      // Mantém o mesmo sessionTitle já gravado — editar o texto não muda
      // qual foi a sessão de leitura daquele dia.
      await saveNote(authUser.email, phrase.key, editText, { sessionTitle: phrase.sessionTitle })
      await syncPinnedIfMatches(phrase.text, editText)
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
      await syncPinnedIfMatches(phrase.text, '')
      setState(s => ({ ...s, phrases: s.phrases.filter(p => p.key !== phrase.key) }))
    } catch (err) {
      console.error('Failed to delete application phrase', err)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.headerTitle}>{t('applicationPhrases.pageTitle', undefined, lang)}</p>
          <p style={s.headerSub}>{t('applicationPhrases.heroSub', undefined, lang)}</p>
        </div>
      </div>

      <div style={s.body}>
        {state.status === 'loading' && <p style={s.emptyHint}>{t('applicationPhrases.loading', undefined, lang)}</p>}
        {state.status === 'error' && <p style={s.emptyHint}>{t('applicationPhrases.error', undefined, lang)}</p>}
        {state.status === 'ready' && state.phrases.length === 0 && (
          <p style={s.emptyHint}>{t('applicationPhrases.empty', undefined, lang)}</p>
        )}

        {state.phrases.map(phrase => {
          const isEditing = editingKey === phrase.key
          const isBusy = busyKey === phrase.key
          return (
            <div key={phrase.key} style={s.card}>
              <div style={s.cardHeader}>
                {phrase.sessionTitle && <p style={s.cardTitleLine}>{phrase.sessionTitle}</p>}
                <span style={s.cardTime}>{dateLabelFor(phrase.date)}</span>
                {!isEditing && (
                  <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      style={s.cardActionBtn} onClick={() => startEdit(phrase)}
                      aria-label={t('applicationPhrases.editAction', undefined, lang)} disabled={isBusy}
                    >
                      <AppIcon name="PenLine" size={13} color="var(--bento-t3)" />
                    </button>
                    <button
                      style={s.cardActionBtn} onClick={() => deletePhrase(phrase)}
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
                    style={s.editInput}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    maxLength={140}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      style={s.editSaveBtn} onClick={() => saveEdit(phrase)}
                      disabled={isBusy || !editText.trim()}
                    >
                      {isBusy ? t('applicationPhrases.saving', undefined, lang) : t('applicationPhrases.saveEdit', undefined, lang)}
                    </button>
                    <button style={s.editCancelBtn} onClick={cancelEdit} disabled={isBusy}>
                      {t('applicationPhrases.cancelEdit', undefined, lang)}
                    </button>
                  </div>
                </>
              ) : (
                <p style={s.cardText}>{phrase.text}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '24px 12px' },

  card: { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitleLine: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 800, lineHeight: 1.3, color: 'var(--bento-ink)', margin: 0 },
  cardTime: { flexShrink: 0, fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  cardText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', lineHeight: 1.5, margin: 0 },
  cardActionBtn: { width: 24, height: 24, border: 'none', background: 'none', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  editInput: { width: '100%', border: 'none', borderRadius: 11, padding: '10px 12px', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)' },
  editSaveBtn: { flex: 1, background: 'var(--bento-accent)', border: 'none', borderRadius: 11, padding: 9, fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  editCancelBtn: { flex: 1, background: 'var(--bento-line)', border: 'none', borderRadius: 11, padding: 9, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
}
