// ReportProblemScreen.jsx — 42o "Reportar problema" (handoff-admin-42,
// Bloco 3). Canal direto do admin de grupo com o Master — "sem esperar as
// 24h" da escalação de denúncia (Regra 6.1). Chega na mesma fila de 42f
// (Bloco 4, ainda não construído) via admin_reports (migration 0067).
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getGroupDetail } from '../groups/groupsStore'
import { getComments } from '../groups/commentsStore'
import { createAdminReport } from '../groups/adminReportsStore'

const FONT = 'var(--font-bento)'
const CATEGORIES = ['member', 'app_error', 'ai_response', 'billing', 'other']

export default function ReportProblemScreen({ session, groupId, onBack, onSent }) {
  const lang = session.lang
  const L = (k, vars) => t(`reportProblem.${k}`, vars, lang)

  const [category, setCategory] = useState('member')
  const [body, setBody] = useState('')
  const [members, setMembers] = useState([])
  const [comments, setComments] = useState([])
  const [attachedUser, setAttachedUser] = useState(null)
  const [attachedMessageIds, setAttachedMessageIds] = useState([])
  const [pickerOpen, setPickerOpen] = useState(null) // 'person' | 'messages' | null
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getGroupDetail(groupId).then(detail => setMembers(detail?.members ?? []))
    getComments(groupId).then(setComments)
  }, [groupId])

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      await createAdminReport({
        groupId, category, body: body.trim(),
        attachedUserId: attachedUser?.userId ?? null,
        attachedMessageIds,
      })
      onSent()
    } catch (err) {
      setError(L('sendError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="#fff" />
        </button>
        <p style={s.headerBadge}>{L('headerBadge')}</p>
        <h1 style={s.title}>{L('title')}</h1>
        <p style={s.subtitle}>{L('subtitle')}</p>
      </div>

      <div style={s.body}>
        <div style={s.pillRow}>
          {CATEGORIES.map(cat => (
            <button key={cat} type="button" style={{ ...s.pill, ...(category === cat ? s.pillOn : {}) }} onClick={() => setCategory(cat)}>
              {L(`category.${cat}`)}
            </button>
          ))}
        </div>

        <textarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} placeholder={L('placeholder')} />

        <div style={s.card}>
          <button type="button" style={{ ...s.linkRow, borderBottom: '1px solid var(--bento-line)' }} onClick={() => setPickerOpen('person')}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={s.linkLabel}>{L('attachPersonLabel')}</p>
              <p style={s.linkSub}>{attachedUser ? attachedUser.name : L('attachPersonNone')}</p>
            </div>
            <span style={s.chevron}>›</span>
          </button>
          <button type="button" style={s.linkRow} onClick={() => setPickerOpen('messages')}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={s.linkLabel}>{L('attachMessagesLabel')}</p>
              <p style={s.linkSub}>{attachedMessageIds.length > 0 ? L('attachMessagesCount', { n: attachedMessageIds.length }) : L('attachMessagesNone')}</p>
            </div>
            <span style={s.chevron}>›</span>
          </button>
        </div>

        <div style={s.sandCard}>
          <p style={s.sandText}>
            {attachedUser ? L('privacyNoteWithName', { name: attachedUser.name.trim().split(/\s+/)[0] }) : L('privacyNoteGeneric')}
          </p>
        </div>

        {error && <p style={s.errorText}>{error}</p>}
      </div>

      <div style={s.footer}>
        <button type="button" style={{ ...s.sendBtn, ...(sending || !body.trim() ? s.btnDisabled : {}) }} onClick={handleSend} disabled={sending || !body.trim()}>
          {sending ? L('sending') : L('sendBtn')}
        </button>
      </div>

      {pickerOpen === 'person' && (
        <PickerSheet
          title={L('attachPersonLabel')} onClose={() => setPickerOpen(null)}
          items={members.map(m => ({ id: m.userId, label: m.name, selected: attachedUser?.userId === m.userId }))}
          onToggle={id => { setAttachedUser(members.find(m => m.userId === id) ?? null); setPickerOpen(null) }}
        />
      )}
      {pickerOpen === 'messages' && (
        <PickerSheet
          title={L('attachMessagesLabel')} onClose={() => setPickerOpen(null)} multi
          items={comments.map(c => ({ id: c.id, label: c.body.slice(0, 60), selected: attachedMessageIds.includes(c.id) }))}
          onToggle={id => setAttachedMessageIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))}
        />
      )}
    </div>
  )
}

function PickerSheet({ title, items, onToggle, onClose, multi }) {
  return createPortal(
    <div style={s.sheetBackdrop} onClick={onClose}>
      <div style={s.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={s.sheetTitle}>{title}</p>
        <div style={s.sheetList}>
          {items.length === 0 && <p style={s.sheetEmpty}>—</p>}
          {items.map(item => (
            <button key={item.id} type="button" style={s.sheetItem} onClick={() => onToggle(item.id)}>
              <span style={s.sheetItemLabel}>{item.label}</span>
              {item.selected && <AppIcon name="Check" size={15} color="var(--bento-accent)" />}
            </button>
          ))}
        </div>
        {multi && <button type="button" style={s.sheetDoneBtn} onClick={onClose}>Ok</button>}
      </div>
    </div>,
    document.body,
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, padding: '24px 20px 20px', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', gap: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 10 },
  headerBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 10px' },
  title: { fontFamily: FONT, fontSize: 25, fontWeight: 800, letterSpacing: '-1px', color: '#fff', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.6)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  pill: { border: 'none', borderRadius: 99, padding: '11px 18px', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  pillOn: { background: 'var(--bento-ink)', color: '#fff' },
  textarea: { width: '100%', minHeight: 140, border: 'none', borderRadius: 20, padding: '16px 18px', fontFamily: FONT, fontSize: 14.5, fontWeight: 400, lineHeight: 1.5, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)', resize: 'none' },

  card: { background: 'var(--bento-card)', borderRadius: 20, overflow: 'hidden' },
  linkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer' },
  linkLabel: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  linkSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chevron: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--bento-t5)' },

  sandCard: { background: 'var(--bento-sand)', borderRadius: 18, padding: '14px 16px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-sand-ink)', margin: 0 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },

  footer: { flexShrink: 0, padding: '14px 20px calc(14px + var(--safe-bottom))' },
  sendBtn: { width: '100%', height: 52, border: 'none', borderRadius: 18, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  btnDisabled: { opacity: .6, cursor: 'default' },

  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 170, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '70vh', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  sheetList: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  sheetEmpty: { fontFamily: FONT, fontSize: 13, color: 'var(--bento-t4)', textAlign: 'center', padding: 20 },
  sheetItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: 'none', background: 'var(--bento-card)', borderRadius: 14, padding: '13px 16px', fontFamily: FONT, cursor: 'pointer', textAlign: 'left' },
  sheetItemLabel: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sheetDoneBtn: { height: 46, border: 'none', borderRadius: 14, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
}
