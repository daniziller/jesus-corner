import { useState, useEffect } from 'react'
import { getRequests, saveRequests } from '../../prayer/prayerStore'
import { incrementPrayerStat } from '../../prayer/prayerStatsStore'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

const MONTH_ABBR = {
  pt: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
}

function todayStr(lang) {
  const d = new Date()
  const months = MONTH_ABBR[lang] ?? MONTH_ABBR.pt
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function PrayerRequests({ authUser, lang }) {
  const email = authUser?.email
  const [requests, setRequests]       = useState([])
  const [formOpen, setFormOpen]       = useState(false)
  const [newText, setNewText]         = useState('')
  const [openFolder, setOpenFolder]   = useState(null) // 'answered' | 'responded' | null

  // Recarrega se o usuário logado mudar (ex: trocou de conta)
  useEffect(() => {
    if (!email) return
    getRequests(email).then(setRequests)
  }, [email])

  function updateRequests(updater) {
    setRequests(prev => {
      const next = updater(prev)
      saveRequests(email, next).catch(err => {
        console.error('Failed to persist prayer requests', err)
      })
      return next
    })
  }

  const praying   = requests.filter(r => r.status === 'praying')
  const answered  = requests.filter(r => r.status === 'answered')
  const responded = requests.filter(r => r.status === 'responded')
  const total     = requests.length

  const pct = (n) => total ? Math.round(n / total * 100) + '%' : '0%'

  function addRequest() {
    if (!newText.trim()) return
    const nextId = requests.reduce((max, r) => Math.max(max, r.id), 0) + 1
    updateRequests(prev => [...prev, { id: nextId, text: newText.trim(), date: todayStr(lang), status: 'praying', note: '' }])
    incrementPrayerStat(email, 'requestsAdded').catch(err => console.error('Failed to persist prayer stat', err))
    setNewText('')
    setFormOpen(false)
  }

  // Contador de "atendidos" só sobe aqui, na transição de praying -> answered
  // (é a única chamada com status 'answered' em toda a tela) — por isso é
  // seguro incrementar sem checar o estado anterior.
  function changeStatus(id, status) {
    updateRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (status === 'answered') incrementPrayerStat(email, 'requestsAnswered').catch(err => console.error('Failed to persist prayer stat', err))
  }

  function deleteRequest(id) {
    updateRequests(prev => prev.filter(r => r.id !== id))
  }

  function saveNote(id, note) {
    updateRequests(prev => prev.map(r => r.id === id ? { ...r, note } : r))
  }

  function toggleFolder(type) {
    setOpenFolder(prev => prev === type ? null : type)
  }

  return (
    <div style={styles.section}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <AppIcon name="Bird" size={17} color="var(--or)" />
          <span style={styles.headerTitle}>{t('prayer.requestsTitle', undefined, lang)}</span>
        </div>
        <button style={styles.addBtn} onClick={() => setFormOpen(v => !v)}>+</button>
      </div>

      {/* Estatísticas */}
      <div style={styles.stats}>
        <StatBox label={t('prayer.praying', undefined, lang)}    count={praying.length}   pct={pct(praying.length)}   color="var(--or)" tint="linear-gradient(135deg,#FFF3E8,#FFE4CC)" onClick={() => setOpenFolder(null)} />
        <StatBox icon="Folder" label={t('prayer.answered', undefined, lang)}  count={answered.length}  pct={pct(answered.length)}  color="var(--gr)" tint="linear-gradient(135deg,#E4FBEC,#C7F5D6)" onClick={() => toggleFolder('answered')} />
        <StatBox icon="Folder" label={t('prayer.responded', undefined, lang)} count={responded.length} pct={pct(responded.length)} color="#3B82F6"   tint="linear-gradient(135deg,#EFF6FF,#DBEAFE)" onClick={() => toggleFolder('responded')} />
      </div>

      {/* Formulário */}
      {formOpen && (
        <div style={styles.form}>
          <textarea
            style={styles.textarea}
            placeholder={t('prayer.addRequestPlaceholder', undefined, lang)}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div style={styles.formBtns}>
            <button style={styles.btnAdd} onClick={addRequest}>{t('prayer.addRequestBtn', undefined, lang)}</button>
            <button style={styles.btnCancel} onClick={() => { setFormOpen(false); setNewText('') }}>{t('prayer.cancel', undefined, lang)}</button>
          </div>
        </div>
      )}

      {/* Lista Em Oração */}
      {praying.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><AppIcon name="Bird" size={26} color="var(--g4)" /></div>
          <div style={styles.emptyTitle}>{t('prayer.emptyTitle', undefined, lang)}</div>
          <div style={styles.emptySub}>{t('prayer.emptySub', undefined, lang)}</div>
        </div>
      ) : (
        <div>
          {praying.map(r => (
            <RequestItem
              key={r.id}
              request={r}
              lang={lang}
              onAnswer={() => changeStatus(r.id, 'answered')}
              onDeny={() => changeStatus(r.id, 'responded')}
              onDelete={() => deleteRequest(r.id)}
              onSaveNote={note => saveNote(r.id, note)}
            />
          ))}
        </div>
      )}

      {/* Pasta Atendidos */}
      {openFolder === 'answered' && (
        <FolderView
          title={t('prayer.answeredFolderTitle', undefined, lang)}
          color="var(--gr)"
          items={answered}
          lang={lang}
          onClose={() => setOpenFolder(null)}
          onDelete={id => deleteRequest(id)}
          onSaveNote={saveNote}
        />
      )}

      {/* Pasta Respondidos */}
      {openFolder === 'responded' && (
        <FolderView
          title={t('prayer.respondedFolderTitle', undefined, lang)}
          icon="MessageCircle"
          color="#3B82F6"
          items={responded}
          lang={lang}
          onClose={() => setOpenFolder(null)}
          onDelete={id => deleteRequest(id)}
          onSaveNote={saveNote}
        />
      )}
    </div>
  )
}

/* ── Sub-componentes ── */

function StatBox({ icon, label, count, pct, color, tint, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.statBox, flex: 1, background: tint, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      <div style={{ ...styles.statNum, color }}>{count}</div>
      <div style={{ ...styles.statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        {icon && <AppIcon name={icon} size={9} />}{label}
      </div>
      <div style={{ ...styles.statPct, color }}>{pct}</div>
    </button>
  )
}

function RequestItem({ request, lang, onAnswer, onDeny, onDelete, onSaveNote }) {
  return (
    <div style={styles.item}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div style={styles.itemDot} />
        <div style={styles.itemBody}>
          <div style={styles.itemText}>{request.text}</div>
          <div style={styles.itemDate}>{request.date}</div>
        </div>
        <div style={styles.itemActions}>
          <button style={{ ...styles.action, ...styles.actionOk }} onClick={onAnswer} title={t('prayer.answerAction', undefined, lang)}><AppIcon name="Check" size={13} /></button>
          <button style={{ ...styles.action, ...styles.actionNo }} onClick={onDeny}   title={t('prayer.denyAction', undefined, lang)}><AppIcon name="MessageCircle" size={13} /></button>
          <button style={{ ...styles.action, ...styles.actionDel }} onClick={onDelete} title={t('prayer.deleteAction', undefined, lang)}><AppIcon name="Trash2" size={13} /></button>
        </div>
      </div>
      <NoteEditor note={request.note} onSave={onSaveNote} lang={lang} />
    </div>
  )
}

function FolderView({ title, icon, color, items, lang, onClose, onDelete, onSaveNote }) {
  return (
    <div style={{ borderTop: '0.5px solid var(--g2)' }}>
      <div style={styles.folderHeader} onClick={onClose}>
        <span style={{ ...styles.folderLabel, color, display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <AppIcon name={icon} size={12} />}{title}
        </span>
        <span style={styles.folderClose}>{t('prayer.closeFolder', undefined, lang)}</span>
      </div>
      {items.map(r => (
        <div key={r.id} style={styles.folderItem}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <div style={{ ...styles.folderDot, background: color }} />
            <div style={{ flex: 1 }}>
              <div style={styles.folderText}>{r.text}</div>
              <div style={styles.folderDate}>{r.date}</div>
            </div>
            <button style={styles.folderDel} onClick={() => onDelete(r.id)}><AppIcon name="Trash2" size={12} /></button>
          </div>
          <NoteEditor note={r.note} onSave={note => onSaveNote(r.id, note)} lang={lang} />
        </div>
      ))}
    </div>
  )
}

function NoteEditor({ note, onSave, lang }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(note ?? '')

  useEffect(() => { setText(note ?? '') }, [note])

  if (!open) {
    return (
      <button style={{ ...styles.noteToggle, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setOpen(true)}>
        <AppIcon name="StickyNote" size={11} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note || t('prayer.addNote', undefined, lang)}</span>
      </button>
    )
  }

  return (
    <div style={styles.noteBox}>
      <textarea
        style={styles.noteTextarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('prayer.notePlaceholder', undefined, lang)}
        rows={2}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={styles.noteSaveBtn} onClick={() => { onSave(text); setOpen(false) }}>{t('prayer.noteSave', undefined, lang)}</button>
        <button style={styles.noteCancelBtn} onClick={() => { setText(note ?? ''); setOpen(false) }}>{t('prayer.noteCancel', undefined, lang)}</button>
      </div>
    </div>
  )
}

/* ── Estilos locais ── */
const styles = {
  section:      { background: 'var(--white)', borderRadius: 20, border: '0.5px solid var(--g1)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  header:       { padding: '13px 14px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--g1)' },
  headerLeft:   { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 13, fontWeight: 700, color: 'var(--bk)', letterSpacing: '-0.2px' },
  addBtn:       { width: 28, height: 28, borderRadius: '50%', background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', lineHeight: 1, padding: 0 },
  stats:        { padding: '10px 12px', display: 'flex', gap: 7, borderBottom: '0.5px solid var(--g1)' },
  statBox:      { borderRadius: 12, padding: '8px', textAlign: 'center' },
  statNum:      { fontSize: 17, fontWeight: 900, color: 'var(--bk)', lineHeight: 1, letterSpacing: '-1px' },
  statLabel:    { fontSize: 8, fontWeight: 600, color: 'var(--g5)', marginTop: 2 },
  statPct:      { fontSize: 8.5, fontWeight: 700, marginTop: 1 },
  form:         { padding: '11px 13px', borderBottom: '0.5px solid var(--g2)', display: 'flex', flexDirection: 'column', gap: 8 },
  textarea:     { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 9, padding: '9px 11px', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', minHeight: 64, lineHeight: 1.5 },
  formBtns:     { display: 'flex', gap: 7 },
  btnAdd:       { flex: 1, background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)', borderRadius: 9, padding: 8, border: 'none', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: 'white', cursor: 'pointer' },
  btnCancel:    { background: 'var(--g1)', borderRadius: 9, padding: '8px 12px', border: 'none', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: 'var(--g5)', cursor: 'pointer' },
  item:         { padding: '11px 13px', borderBottom: '0.5px solid var(--g1)', display: 'flex', flexDirection: 'column', gap: 7 },
  itemDot:      { width: 7, height: 7, borderRadius: '50%', background: 'var(--or)', flexShrink: 0, marginTop: 4 },
  itemBody:     { flex: 1, minWidth: 0 },
  itemText:     { fontSize: 12, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.45, marginBottom: 2 },
  itemDate:     { fontSize: 10, fontWeight: 500, color: 'var(--g4)' },
  itemActions:  { display: 'flex', gap: 5, flexShrink: 0, marginTop: 1 },
  action:       { width: 25, height: 25, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, border: 'none', fontFamily: 'var(--font)' },
  actionOk:     { background: 'rgba(22,163,74,.1)', color: '#15803D' },
  actionNo:     { background: 'rgba(59,130,246,.1)', color: '#1D4ED8' },
  actionDel:    { background: 'var(--g1)', color: 'var(--g4)' },
  empty:        { padding: '20px 13px', textAlign: 'center' },
  emptyTitle:   { fontSize: 12, fontWeight: 600, color: 'var(--bk)', marginBottom: 2 },
  emptySub:     { fontSize: 10, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  folderHeader: { padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  folderLabel:  { fontSize: 11, fontWeight: 700, letterSpacing: 0.2 },
  folderClose:  { fontSize: 11, color: 'var(--g4)', fontWeight: 600 },
  folderItem:   { padding: '9px 13px', borderTop: '0.5px solid var(--g1)', display: 'flex', flexDirection: 'column', gap: 7 },
  folderDot:    { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  folderText:   { fontSize: 11.5, fontWeight: 600, color: 'var(--bk)', lineHeight: 1.4, marginBottom: 2 },
  folderDate:   { fontSize: 10, fontWeight: 500, color: 'var(--g4)' },
  folderDel:    { width: 23, height: 23, borderRadius: 6, background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--g4)', border: 'none', flexShrink: 0 },
  noteToggle:   { alignSelf: 'flex-start', maxWidth: '100%', textAlign: 'left', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 9, padding: '5px 9px', fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  noteBox:      { display: 'flex', flexDirection: 'column', gap: 6 },
  noteTextarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 9, padding: '8px 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5, background: 'var(--g1)' },
  noteSaveBtn:  { background: 'var(--grad-vivid)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' },
  noteCancelBtn:{ background: 'var(--g1)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 10.5, fontWeight: 600, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
}
