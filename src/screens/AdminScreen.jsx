// Painel admin — só monta quando session.isAdmin é true (ver App.jsx), então
// as buscas abaixo já ficam restritas a quem de fato usa essa tela, sem
// guarda extra. Sub-navegação local (métricas/fale conosco/aviso geral),
// mesmo padrão sem router do resto do app.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatAmount } from '../billing/formatAmount'
import { getAdminMetrics, listContactMessages, replyToContactMessage, sendBroadcast } from '../admin/adminStore'

const TABS = ['metrics', 'contact', 'broadcast']
const TAB_ICONS = { metrics: 'BarChart3', contact: 'Mail', broadcast: 'Megaphone' }

export default function AdminScreen({ session }) {
  const { lang } = session
  const [tab, setTab] = useState('metrics')

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{t('admin.pageTitle', undefined, lang)}</h1></div>

      <div style={styles.body}>
        <div style={styles.tabBar}>
          {TABS.map(id => (
            <button
              key={id}
              style={{ ...styles.tabBtn, ...(tab === id ? styles.tabBtnActive : null) }}
              onClick={() => setTab(id)}
            >
              <AppIcon name={TAB_ICONS[id]} size={14} color={tab === id ? 'white' : 'var(--g5)'} />
              {t(`admin.tab.${id}`, undefined, lang)}
            </button>
          ))}
        </div>

        {tab === 'metrics' && <MetricsTab lang={lang} />}
        {tab === 'contact' && <ContactTab lang={lang} />}
        {tab === 'broadcast' && <BroadcastTab lang={lang} />}
      </div>
    </div>
  )
}

function MetricsTab({ lang }) {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminMetrics().then(setMetrics).catch(err => setError(err.message))
  }, [])

  if (error) return <p style={styles.errorMsg}>{error}</p>
  if (!metrics) return <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>

  const { users, subscriptions, contact } = metrics

  return (
    <div style={styles.grid}>
      <StatCard label={t('admin.metric.totalUsers', undefined, lang)} value={users.total} />
      <StatCard label={t('admin.metric.mrrBrl', undefined, lang)} value={formatAmount(subscriptions.mrrCents.brl, 'brl')} />
      <StatCard label={t('admin.metric.mrrUsd', undefined, lang)} value={formatAmount(subscriptions.mrrCents.usd, 'usd')} />
      <StatCard
        label={t('admin.metric.activeByPlan', undefined, lang)}
        value={`${subscriptions.activeByPlan.brl.monthly + subscriptions.activeByPlan.usd.monthly} ${t('admin.metric.monthly', undefined, lang)} · ${subscriptions.activeByPlan.brl.annual + subscriptions.activeByPlan.usd.annual} ${t('admin.metric.annual', undefined, lang)}`}
      />
      <StatCard label={t('admin.metric.legacyFree', undefined, lang)} value={subscriptions.free} />
      <StatCard label={t('admin.metric.legacyLifetime', undefined, lang)} value={subscriptions.lifetime} />
      <StatCard label={t('admin.metric.contactTotal', undefined, lang)} value={contact.total} />
      <StatCard label={t('admin.metric.contactUnanswered', undefined, lang)} value={contact.unanswered} highlight={contact.unanswered > 0} />
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={{ ...styles.statCard, ...(highlight ? styles.statCardHighlight : null) }}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  )
}

function ContactTab({ lang }) {
  const [filter, setFilter] = useState('unanswered')
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const [replyingId, setReplyingId] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)

  function reload() {
    setMessages(null)
    listContactMessages({ filter }).then(setMessages).catch(err => setError(err.message))
  }

  useEffect(reload, [filter])

  function startReply(msg) {
    setReplyingId(msg.id)
    setReplyBody('')
  }

  async function submitReply(id) {
    if (!replyBody.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await replyToContactMessage({ id, replyBody: replyBody.trim() })
      setReplyingId(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={styles.filterRow}>
        {['unanswered', 'all'].map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : null) }}
            onClick={() => setFilter(f)}
          >
            {t(`admin.contact.filter.${f}`, undefined, lang)}
          </button>
        ))}
      </div>

      {error && <p style={styles.errorMsg}>{error}</p>}
      {!messages && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
      {messages?.length === 0 && <p style={styles.hint}>{t('admin.contact.empty', undefined, lang)}</p>}

      {messages?.map(msg => (
        <div key={msg.id} style={styles.messageCard}>
          <div style={styles.messageHeader}>
            <div>
              <p style={styles.messageName}>{msg.name}</p>
              <p style={styles.messageEmail}>{msg.email}</p>
            </div>
            {msg.replied_at
              ? <span style={styles.answeredBadge}>{t('admin.contact.answered', undefined, lang)}</span>
              : <span style={styles.pendingBadge}>{t('admin.contact.pending', undefined, lang)}</span>}
          </div>
          <p style={styles.messageBody}>{msg.message}</p>

          {msg.admin_reply && (
            <div style={styles.replyPreview}>
              <p style={styles.replyPreviewLabel}>{t('admin.contact.yourReply', undefined, lang)}</p>
              <p style={styles.replyPreviewBody}>{msg.admin_reply}</p>
            </div>
          )}

          {!msg.replied_at && (
            replyingId === msg.id ? (
              <div style={styles.replyForm}>
                <textarea
                  style={styles.textarea}
                  rows={4}
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder={t('admin.contact.replyPlaceholder', undefined, lang)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1 }} disabled={sending} onClick={() => submitReply(msg.id)}>
                    {sending ? t('admin.sending', undefined, lang) : t('admin.contact.sendReplyBtn', undefined, lang)}
                  </button>
                  <button className="btn-secondary" style={{ width: 'auto', padding: '9px 16px' }} onClick={() => setReplyingId(null)}>
                    {t('admin.cancelBtn', undefined, lang)}
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginTop: 4 }} onClick={() => startReply(msg)}>
                {t('admin.contact.replyBtn', undefined, lang)}
              </button>
            )
          )}
        </div>
      ))}
    </div>
  )
}

function BroadcastTab({ lang }) {
  const [titlePt, setTitlePt] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyPt, setBodyPt] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [alsoEmail, setAlsoEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const canSubmit = titlePt.trim() && titleEn.trim() && bodyPt.trim() && bodyEn.trim() && !sending

  async function handleSubmit() {
    if (!canSubmit) return
    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await sendBroadcast({ titlePt, titleEn, bodyPt, bodyEn, sendEmail: alsoEmail })
      setResult(res)
      setTitlePt(''); setTitleEn(''); setBodyPt(''); setBodyEn('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.form}>
      <label style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('admin.broadcast.titlePt', undefined, lang)}</span>
        <input style={styles.input} type="text" value={titlePt} onChange={e => setTitlePt(e.target.value)} />
      </label>
      <label style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('admin.broadcast.bodyPt', undefined, lang)}</span>
        <textarea style={styles.textarea} rows={4} value={bodyPt} onChange={e => setBodyPt(e.target.value)} />
      </label>
      <label style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('admin.broadcast.titleEn', undefined, lang)}</span>
        <input style={styles.input} type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
      </label>
      <label style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('admin.broadcast.bodyEn', undefined, lang)}</span>
        <textarea style={styles.textarea} rows={4} value={bodyEn} onChange={e => setBodyEn(e.target.value)} />
      </label>

      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} />
        <span style={styles.checkboxLabel}>{t('admin.broadcast.alsoEmail', undefined, lang)}</span>
      </label>

      {error && <p style={styles.errorMsg}>{error}</p>}
      {result && (
        <p style={styles.resultMsg}>
          {t('admin.broadcast.result', { recipients: result.recipients, sent: result.emailsSent, failed: result.emailsFailed }, lang)}
        </p>
      )}

      <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
        {sending ? t('admin.sending', undefined, lang) : t('admin.broadcast.sendBtn', undefined, lang)}
      </button>
    </div>
  )
}

const styles = {
  body:               { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  tabBar:             { display: 'flex', gap: 6, background: 'var(--g1)', borderRadius: 12, padding: 4 },
  tabBtn:             { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', background: 'none', borderRadius: 9, padding: '9px 6px', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer' },
  tabBtnActive:       { background: 'var(--bk)', color: 'white' },
  grid:               { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  statCard:           { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: '14px 14px', boxShadow: 'var(--shadow-card)' },
  statCardHighlight:  { background: 'var(--rel)', border: '0.5px solid rgba(220,38,38,.2)' },
  statLabel:          { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 6px' },
  statValue:          { fontSize: 17, fontWeight: 800, color: 'var(--bk)', margin: 0, lineHeight: 1.3 },
  hint:               { fontSize: 12.5, fontWeight: 500, color: 'var(--g4)', padding: '10px 2px' },
  errorMsg:           { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  resultMsg:          { fontSize: 12.5, fontWeight: 600, color: 'var(--gr)', background: 'var(--grl)', borderRadius: 8, padding: '8px 10px' },
  filterRow:          { display: 'flex', gap: 6 },
  filterBtn:          { border: '0.5px solid var(--g2)', background: 'white', borderRadius: 9, padding: '7px 14px', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer' },
  filterBtnActive:    { background: 'var(--bk)', color: 'white', border: '0.5px solid var(--bk)' },
  messageCard:        { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 8 },
  messageHeader:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  messageName:        { fontSize: 13, fontWeight: 800, color: 'var(--bk)', margin: 0 },
  messageEmail:       { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', margin: '2px 0 0' },
  messageBody:        { fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' },
  answeredBadge:      { fontSize: 10, fontWeight: 700, color: 'var(--gr)', background: 'var(--grl)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 },
  pendingBadge:       { fontSize: 10, fontWeight: 700, color: 'var(--or)', background: 'var(--olt)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 },
  replyPreview:       { background: 'var(--g1)', borderRadius: 10, padding: 10 },
  replyPreviewLabel:  { fontSize: 9.5, fontWeight: 700, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 4px' },
  replyPreviewBody:   { fontSize: 12, fontWeight: 500, color: 'var(--g6)', margin: 0, whiteSpace: 'pre-wrap' },
  replyForm:          { display: 'flex', flexDirection: 'column', gap: 8 },
  form:               { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-card)' },
  fieldWrap:          { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel:         { fontSize: 10, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  input:              { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', boxSizing: 'border-box' },
  textarea:           { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', resize: 'vertical', boxSizing: 'border-box' },
  checkboxRow:        { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  checkboxLabel:       { fontSize: 12.5, fontWeight: 600, color: 'var(--g6)' },
}
