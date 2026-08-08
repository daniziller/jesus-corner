// Painel admin — só monta quando session.isAdmin é true (ver App.jsx), então
// as buscas abaixo já ficam restritas a quem de fato usa essa tela, sem
// guarda extra. Sub-navegação local (métricas/fale conosco/aviso geral),
// mesmo padrão sem router do resto do app.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatAmount } from '../billing/formatAmount'
import { getAdminMetrics, listContactMessages, replyToContactMessage, deleteContactMessage, sendBroadcast, searchAdminUsers, listReadingGroupsForAdmin, createInvite, listAdminInvites, revokeInvite } from '../admin/adminStore'

const TABS = ['metrics', 'contact', 'broadcast', 'invites']
const TAB_ICONS = { metrics: 'BarChart3', contact: 'Mail', broadcast: 'Megaphone', invites: 'Gift' }

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
        {tab === 'invites' && <InvitesTab lang={lang} />}
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

  async function handleDelete(msg) {
    if (!window.confirm(t('admin.contact.deleteConfirm', undefined, lang))) return
    setError('')
    try {
      await deleteContactMessage({ id: msg.id })
      reload()
    } catch (err) {
      setError(err.message)
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginTop: 4 }} onClick={() => startReply(msg)}>
                  {t('admin.contact.replyBtn', undefined, lang)}
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(msg)}>
                  {t('admin.contact.deleteBtn', undefined, lang)}
                </button>
              </div>
            )
          )}

          {msg.replied_at && (
            <button style={{ ...styles.deleteBtn, alignSelf: 'flex-start' }} onClick={() => handleDelete(msg)}>
              {t('admin.contact.deleteBtn', undefined, lang)}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const RECIPIENT_MODES = ['all', 'user', 'segment']

function RecipientSelector({ lang, mode, setMode, selectedUser, setSelectedUser, segment, setSegment }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (mode === 'segment') listReadingGroupsForAdmin().then(setGroups).catch(() => setGroups([]))
  }, [mode])

  useEffect(() => {
    if (mode !== 'user' || !query.trim()) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchAdminUsers(query.trim())
        .then(users => { if (!cancelled) setResults(users) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mode, query])

  function updateSegment(patch) {
    setSegment(prev => ({ ...prev, ...patch }))
  }

  return (
    <div style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{t('admin.broadcast.recipientLabel', undefined, lang)}</span>
      <div style={styles.filterRow}>
        {RECIPIENT_MODES.map(m => (
          <button
            key={m}
            type="button"
            style={{ ...styles.filterBtn, ...(mode === m ? styles.filterBtnActive : null) }}
            onClick={() => setMode(m)}
          >
            {t(`admin.broadcast.recipientMode.${m}`, undefined, lang)}
          </button>
        ))}
      </div>

      {mode === 'user' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <input
            style={styles.input}
            type="text"
            value={selectedUser ? selectedUser.email : query}
            onChange={e => { setSelectedUser(null); setQuery(e.target.value) }}
            placeholder={t('admin.broadcast.userSearchPlaceholder', undefined, lang)}
          />
          {selectedUser && (
            <button type="button" style={styles.clearSelectionBtn} onClick={() => { setSelectedUser(null); setQuery('') }}>
              {t('admin.broadcast.clearSelection', undefined, lang)}
            </button>
          )}
          {!selectedUser && searching && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
          {!selectedUser && results.length > 0 && (
            <div style={styles.userResults}>
              {results.map(u => (
                <button key={u.id} type="button" style={styles.userResultItem} onClick={() => { setSelectedUser(u); setResults([]) }}>
                  <span style={{ fontWeight: 700 }}>{u.name ?? u.email}</span>
                  {u.name && <span style={{ color: 'var(--g5)', marginLeft: 6 }}>{u.email}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'segment' && (
        <div style={styles.segmentGrid}>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.segment.accessType', undefined, lang)}</span>
            <select style={styles.select} value={segment.accessType ?? ''} onChange={e => updateSegment({ accessType: e.target.value || null })}>
              <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
              <option value="free">{t('admin.broadcast.segment.free', undefined, lang)}</option>
              <option value="lifetime">{t('admin.broadcast.segment.lifetime', undefined, lang)}</option>
              <option value="recurring">{t('admin.broadcast.segment.recurring', undefined, lang)}</option>
            </select>
          </label>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.segment.plan', undefined, lang)}</span>
            <select style={styles.select} value={segment.plan ?? ''} onChange={e => updateSegment({ plan: e.target.value || null })}>
              <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
              <option value="monthly">{t('admin.metric.monthly', undefined, lang)}</option>
              <option value="annual">{t('admin.metric.annual', undefined, lang)}</option>
            </select>
          </label>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.segment.currency', undefined, lang)}</span>
            <select style={styles.select} value={segment.currency ?? ''} onChange={e => updateSegment({ currency: e.target.value || null })}>
              <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
              <option value="brl">BRL</option>
              <option value="usd">USD</option>
            </select>
          </label>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.segment.language', undefined, lang)}</span>
            <select style={styles.select} value={segment.language ?? ''} onChange={e => updateSegment({ language: e.target.value || null })}>
              <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
              <option value="pt">Português</option>
              <option value="en">English</option>
            </select>
          </label>
          <label style={{ ...styles.fieldWrap, gridColumn: '1 / -1' }}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.segment.group', undefined, lang)}</span>
            <select style={styles.select} value={segment.groupId ?? ''} onChange={e => updateSegment({ groupId: e.target.value || null })}>
              <option value="">{t('admin.broadcast.segment.any', undefined, lang)}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        </div>
      )}
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
  const [checking, setChecking] = useState(false)
  const [previewCount, setPreviewCount] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [recipientMode, setRecipientMode] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [segment, setSegment] = useState({ accessType: null, plan: null, currency: null, language: null, groupId: null })
  // Nem sempre dá pra escrever nos dois idiomas — quem fala o idioma que
  // não foi escrito simplesmente não recebe nada (ver api/admin/broadcast.js).
  const [languages, setLanguages] = useState(['pt', 'en'])

  function toggleLanguage(l) {
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
    resetRecipientFeedback()
  }

  const recipientPayload = {
    recipientMode,
    recipientUserId: recipientMode === 'user' ? selectedUser?.id ?? null : null,
    segment: recipientMode === 'segment' ? segment : null,
  }

  // Os botões nunca ficam disabled por validação — um botão desabilitado
  // sem explicação parece "quebrado" (foi exatamente o que aconteceu:
  // faltava um dos 4 campos e o clique simplesmente não fazia nada). Em vez
  // disso valida no clique e mostra por que não deu.
  function validationError() {
    if (languages.length === 0) {
      return t('admin.broadcast.missingLanguageError', undefined, lang)
    }
    if (languages.includes('pt') && (!titlePt.trim() || !bodyPt.trim())) {
      return t('admin.broadcast.missingFieldsError', undefined, lang)
    }
    if (languages.includes('en') && (!titleEn.trim() || !bodyEn.trim())) {
      return t('admin.broadcast.missingFieldsError', undefined, lang)
    }
    if (recipientMode === 'user' && !selectedUser) {
      return t('admin.broadcast.missingUserError', undefined, lang)
    }
    return null
  }

  function resetRecipientFeedback() {
    setPreviewCount(null)
    setResult(null)
  }

  async function handleCheckRecipients() {
    if (checking) return
    const validationMsg = validationError()
    if (validationMsg) { setError(validationMsg); return }
    setChecking(true)
    setError('')
    try {
      const res = await sendBroadcast({ languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail: alsoEmail, ...recipientPayload, dryRun: true })
      setPreviewCount(res.recipients)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit() {
    if (sending) return
    const validationMsg = validationError()
    if (validationMsg) { setError(validationMsg); return }
    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await sendBroadcast({ languages, titlePt, titleEn, bodyPt, bodyEn, sendEmail: alsoEmail, ...recipientPayload })
      setResult(res)
      setTitlePt(''); setTitleEn(''); setBodyPt(''); setBodyEn('')
      setPreviewCount(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.form}>
      <RecipientSelector
        lang={lang}
        mode={recipientMode}
        setMode={m => { setRecipientMode(m); resetRecipientFeedback() }}
        selectedUser={selectedUser}
        setSelectedUser={u => { setSelectedUser(u); resetRecipientFeedback() }}
        segment={segment}
        setSegment={updater => { setSegment(updater); resetRecipientFeedback() }}
      />

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>{t('admin.broadcast.languageLabel', undefined, lang)}</span>
        <div style={styles.filterRow}>
          {['pt', 'en'].map(l => (
            <button
              key={l}
              type="button"
              style={{ ...styles.filterBtn, ...(languages.includes(l) ? styles.filterBtnActive : null) }}
              onClick={() => toggleLanguage(l)}
            >
              {t(`admin.broadcast.language.${l}`, undefined, lang)}
            </button>
          ))}
        </div>
      </div>

      {languages.includes('pt') && (
        <>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.titlePt', undefined, lang)}</span>
            <input style={styles.input} type="text" value={titlePt} onChange={e => setTitlePt(e.target.value)} />
          </label>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.bodyPt', undefined, lang)}</span>
            <textarea style={styles.textarea} rows={4} value={bodyPt} onChange={e => setBodyPt(e.target.value)} />
          </label>
        </>
      )}
      {languages.includes('en') && (
        <>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.titleEn', undefined, lang)}</span>
            <input style={styles.input} type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
          </label>
          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>{t('admin.broadcast.bodyEn', undefined, lang)}</span>
            <textarea style={styles.textarea} rows={4} value={bodyEn} onChange={e => setBodyEn(e.target.value)} />
          </label>
        </>
      )}

      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} />
        <span style={styles.checkboxLabel}>{t('admin.broadcast.alsoEmail', undefined, lang)}</span>
      </label>

      {error && <p style={styles.errorMsg}>{error}</p>}
      {previewCount != null && (
        <p style={styles.hint}>{t('admin.broadcast.previewCount', { count: previewCount }, lang)}</p>
      )}
      {result && (
        <p style={styles.resultMsg}>
          {t('admin.broadcast.result', { recipients: result.recipients, sent: result.emailsSent, failed: result.emailsFailed }, lang)}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1 }} disabled={checking || sending} onClick={handleCheckRecipients}>
          {checking ? t('admin.loading', undefined, lang) : t('admin.broadcast.checkBtn', undefined, lang)}
        </button>
        <button className="btn-primary" style={{ flex: 1 }} disabled={sending || checking} onClick={handleSubmit}>
          {sending ? t('admin.sending', undefined, lang) : t('admin.broadcast.sendBtn', undefined, lang)}
        </button>
      </div>
    </div>
  )
}

function InvitesTab({ lang }) {
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState('free')
  const [discountPercent, setDiscountPercent] = useState('50')
  const [discountDuration, setDiscountDuration] = useState('forever')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [invites, setInvites] = useState(null)

  function reload() {
    setInvites(null)
    listAdminInvites().then(setInvites).catch(err => setError(err.message))
  }

  useEffect(reload, [])

  async function handleCreate() {
    if (creating || !email.trim()) return
    setCreating(true)
    setError('')
    setCreated(null)
    try {
      const res = await createInvite({
        email: email.trim(),
        kind,
        discountPercent: kind === 'discount' ? Number(discountPercent) : undefined,
        discountDuration: kind === 'discount' ? discountDuration : undefined,
      })
      setCreated(res)
      setEmail('')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(invite) {
    if (!window.confirm(t('admin.invites.revokeConfirm', undefined, lang))) return
    setError('')
    try {
      await revokeInvite({ id: invite.id })
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={styles.form}>
        <label style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{t('admin.invites.emailLabel', undefined, lang)}</span>
          <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
        </label>

        <div style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{t('admin.invites.kindLabel', undefined, lang)}</span>
          <div style={styles.filterRow}>
            {['free', 'discount'].map(k => (
              <button
                key={k}
                type="button"
                style={{ ...styles.filterBtn, ...(kind === k ? styles.filterBtnActive : null) }}
                onClick={() => setKind(k)}
              >
                {t(`admin.invites.kind.${k}`, undefined, lang)}
              </button>
            ))}
          </div>
        </div>

        {kind === 'discount' && (
          <div style={styles.segmentGrid}>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{t('admin.invites.discountPercentLabel', undefined, lang)}</span>
              <input style={styles.input} type="number" min="1" max="100" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{t('admin.invites.discountDurationLabel', undefined, lang)}</span>
              <select style={styles.select} value={discountDuration} onChange={e => setDiscountDuration(e.target.value)}>
                <option value="once">{t('admin.invites.durationOnce', undefined, lang)}</option>
                <option value="forever">{t('admin.invites.durationForever', undefined, lang)}</option>
              </select>
            </label>
          </div>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}
        {created && (
          <p style={styles.resultMsg}>
            {t('admin.invites.createdResult', { code: created.code }, lang)}
            {!created.emailSent && ` ${t('admin.invites.emailFailedNote', undefined, lang)}`}
          </p>
        )}

        <button className="btn-primary" disabled={creating || !email.trim()} onClick={handleCreate}>
          {creating ? t('admin.sending', undefined, lang) : t('admin.invites.createBtn', undefined, lang)}
        </button>
      </div>

      {!invites && <p style={styles.hint}>{t('admin.loading', undefined, lang)}</p>}
      {invites?.length === 0 && <p style={styles.hint}>{t('admin.invites.empty', undefined, lang)}</p>}
      {invites?.map(inv => (
        <div key={inv.id} style={styles.messageCard}>
          <div style={styles.messageHeader}>
            <div>
              <p style={styles.messageName}>{inv.email}</p>
              <p style={styles.messageEmail}>
                {t(`admin.invites.kind.${inv.kind}`, undefined, lang)}
                {inv.kind === 'discount' && ` · ${inv.discount_percent}% · ${t(`admin.invites.duration${inv.discount_duration === 'once' ? 'Once' : 'Forever'}`, undefined, lang)}`}
                {' · '}{inv.code}
              </p>
            </div>
            <span style={inv.status === 'claimed' ? styles.answeredBadge : styles.pendingBadge}>
              {t(`admin.invites.status.${inv.status}`, undefined, lang)}
            </span>
          </div>
          {inv.status === 'pending' && (
            <button style={styles.deleteBtn} onClick={() => handleRevoke(inv)}>
              {t('admin.invites.revokeBtn', undefined, lang)}
            </button>
          )}
        </div>
      ))}
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
  deleteBtn:          { border: 'none', background: 'none', borderRadius: 8, padding: '8px 10px', marginTop: 4, fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--re)', cursor: 'pointer' },
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
  select:             { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '9px 10px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)', boxSizing: 'border-box' },
  segmentGrid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 },
  clearSelectionBtn:  { alignSelf: 'flex-start', border: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', padding: '2px 0' },
  userResults:        { display: 'flex', flexDirection: 'column', gap: 2, background: 'white', border: '0.5px solid var(--g2)', borderRadius: 10, overflow: 'hidden' },
  userResultItem:     { textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontFamily: 'var(--font)', fontSize: 12.5, color: 'var(--bk)', cursor: 'pointer' },
}
