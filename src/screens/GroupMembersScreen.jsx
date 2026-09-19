// GroupMembersScreen.jsx — 42j "Membros" (handoff-admin-42, Bloco 2).
// Tela própria, aberta a partir da linha "Membros" de 42i (antes, a lista
// vivia dentro da 19c, com "ver todos" pra não estourar a tela — agora tem
// espaço de sobra por ser uma tela dedicada, então mostra todo mundo).
//
// Código de convite realocado pra cá (decisão dela, 2026-09-13) — fazia
// parte da 19c antiga, fora do quadro de 42j, mas é sobre trazer gente pro
// grupo, o mesmo assunto desta tela.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getGroupDetail, getPendingJoinRequests, respondToJoinRequest, setMemberRole, removeGroupMember, silenceGroupMember } from '../groups/groupsStore'
import { getGroupReadingActivity } from '../groups/readingActivityStore'

const FONT = 'var(--font-bento)'
const SILENCE_DURATIONS = [1, 7, 30]

function initialsOf(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function relativeRequestTime(iso, L) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return L('requestedNow')
  if (hours < 24) return L('requestedHoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return L('requestedYesterday')
  return L('requestedDaysAgo', { n: days })
}

function formatShortDate(iso, lang) {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export default function GroupMembersScreen({ session, authUser, groupId, onBack }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupAdmin.${k}`, vars, lang)

  const [group, setGroup] = useState(null)
  const [requests, setRequests] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busyUserId, setBusyUserId] = useState(null)
  const [shareState, setShareState] = useState('idle')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [actionSheetMember, setActionSheetMember] = useState(null)

  function reload() {
    setLoading(true)
    setLoadError(false)
    Promise.all([getGroupDetail(groupId), getPendingJoinRequests(groupId), getGroupReadingActivity(groupId)]).then(([detail, pending, activityRows]) => {
      setGroup(detail)
      setRequests(pending)
      setActivity(activityRows)
      setLoading(false)
    }).catch(err => {
      // Mesmo bug/mesmo conserto de GroupAdminScreen.jsx — ver comentário
      // lá (varredura geral, 2026-09-19).
      console.error('Failed to load group members', err)
      setLoading(false)
      setLoadError(true)
    })
  }

  useEffect(() => {
    if (!groupId) { setLoading(false); return }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function handleShare() {
    const message = L('shareMessage', { group: group.name, code: group.inviteCode })
    if (navigator.share) {
      try { await navigator.share({ text: message }) } catch { /* usuário cancelou — sem erro */ }
      return
    }
    try {
      await navigator.clipboard?.writeText(message)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 1800)
    } catch (err) {
      console.error('Failed to copy invite message', err)
    }
  }

  async function handleRequest(userId, accept) {
    setBusyUserId(userId)
    try {
      await respondToJoinRequest(groupId, userId, accept)
      setRequests(r => r.filter(req => req.userId !== userId))
      if (accept) reload()
    } catch (err) {
      console.error('Failed to respond to join request', err)
    } finally {
      setBusyUserId(null)
    }
  }

  async function handlePromote(userId) {
    setBusyUserId(userId)
    try {
      await setMemberRole(groupId, userId, 'moderator')
      setGroup(g => ({ ...g, members: g.members.map(m => m.userId === userId ? { ...m, role: 'moderator' } : m) }))
      setActionSheetMember(null)
    } catch (err) {
      console.error('Failed to promote member', err)
    } finally {
      setBusyUserId(null)
    }
  }

  async function handleSilence(userId, days, reason) {
    setBusyUserId(userId)
    try {
      await silenceGroupMember(groupId, userId, days, reason)
      reload()
      setActionSheetMember(null)
    } catch (err) {
      throw err
    } finally {
      setBusyUserId(null)
    }
  }

  async function handleRemove(userId, reason) {
    setBusyUserId(userId)
    try {
      await removeGroupMember(groupId, userId, reason)
      setGroup(g => ({ ...g, members: g.members.filter(m => m.userId !== userId) }))
      setActionSheetMember(null)
    } catch (err) {
      throw err
    } finally {
      setBusyUserId(null)
    }
  }

  if (loadError) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <p style={styles.emptyHint}>{L('loadError')}</p>
          <button type="button" style={styles.retryBtn} onClick={reload}>{L('retryBtn')}</button>
        </div>
      </div>
    )
  }

  if (loading || !group) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
      </div>
    )
  }

  const activityByUserId = new Map(activity.map(a => [a.userId, a]))
  const members = group.members ?? []
  const filteredMembers = query.trim()
    ? members.filter(m => m.name.toLowerCase().includes(query.trim().toLowerCase()))
    : members

  function memberSubLabel(m) {
    if (m.role === 'moderator') return m.userId === authUser?.id ? L('roleAdminSelf') : L('roleAdminOther')
    if (m.silencedUntil) return { text: L('silencedUntil', { date: formatShortDate(m.silencedUntil, lang) }), color: 'var(--bento-destructive)' }
    const act = activityByUserId.get(m.userId)
    if (act?.status === 'stopped') {
      const n = act.daysSinceLastRead ?? 0
      return { text: L(n === 1 ? 'stoppedDaysAgoOne' : 'stoppedDaysAgoMany', { n }), color: 'var(--bento-t3)' }
    }
    const days = act?.planDayCount ?? 0
    const isSelf = m.userId === authUser?.id
    const key = days === 1
      ? (isSelf ? 'readingDaysAgoSelfOne' : 'readingDaysAgoOne')
      : (isSelf ? 'readingDaysAgoSelfMany' : 'readingDaysAgoMany')
    return { text: L(key, { n: days }), color: 'var(--bento-t3)' }
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <BackBtn onBack={onBack} lang={lang} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.headerTitle}>{L('membersHeaderTitle')}</p>
          <p style={styles.headerSub}>{L(requests.length === 1 ? 'membersHeaderSubOne' : 'membersHeaderSubMany', { n: members.length, pending: requests.length })}</p>
        </div>
        <button type="button" style={styles.searchBtn} onClick={() => setSearchOpen(v => !v)} aria-label={L('searchAria')}>
          <AppIcon name="Search" size={16} color="#fff" />
        </button>
      </div>

      {searchOpen && (
        <div style={styles.searchWrap}>
          <input
            style={styles.searchInput} autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder={L('searchPlaceholder')}
          />
        </div>
      )}

      <div style={styles.body}>
        <div style={styles.inviteCard}>
          <div style={styles.inviteLabelRow}>
            <span style={styles.inviteDot} />
            <p style={styles.inviteLabel}>{L('inviteCodeLabel')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={styles.inviteCode}>{group.inviteCode}</p>
            <button style={styles.shareBtn} onClick={handleShare}>
              {shareState === 'copied' ? L('shareCopiedBtn') : L('shareBtn')}
            </button>
          </div>
        </div>

        {requests.length > 0 && (
          <div style={styles.card}>
            <p style={styles.cardLabel}>{L('joinRequestsLabel')}</p>
            {requests.map((req, i) => (
              <div key={req.userId} style={{ ...styles.memberRow, borderBottom: i === requests.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <span style={{ ...styles.avatarCircle, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' }}>{initialsOf(req.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.memberName}>{req.name}</p>
                  <p style={styles.memberSub}>{L('requestedByCode', { time: relativeRequestTime(req.requestedAt, L) })}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={styles.declineBtn} disabled={busyUserId === req.userId} onClick={() => handleRequest(req.userId, false)} aria-label={L('declineAction')}>
                    <AppIcon name="X" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
                  </button>
                  <button style={styles.acceptBtn} disabled={busyUserId === req.userId} onClick={() => handleRequest(req.userId, true)} aria-label={L('acceptAction')}>
                    <AppIcon name="Check" size={13} strokeWidth={2.8} color="var(--bento-accent)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.card}>
          {filteredMembers.map((m, i) => {
            const isModerator = m.role === 'moderator'
            const sub = memberSubLabel(m)
            return (
              <div key={m.userId} style={{ ...styles.memberRow, borderBottom: i === filteredMembers.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <span style={{ ...styles.avatarCircle, ...(isModerator ? { background: 'var(--bento-accent)', color: 'var(--bento-ink)' } : { background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' }) }}>
                  {initialsOf(m.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.memberName}>{m.name}</p>
                  <p style={{ ...styles.memberSub, color: typeof sub === 'string' ? 'var(--bento-t3)' : sub.color }}>{typeof sub === 'string' ? sub : sub.text}</p>
                </div>
                {isModerator
                  ? <span style={styles.adminBadge}>{L('adminBadge')}</span>
                  : (
                    <button style={styles.moreBtn} onClick={() => setActionSheetMember(m)} aria-label={L('moreActionsAria')}>
                      <AppIcon name="MoreVertical" size={16} color="var(--bento-t4)" />
                    </button>
                  )}
              </div>
            )
          })}
        </div>
      </div>

      {actionSheetMember && (
        <MemberActionSheet
          L={L} lang={lang} member={actionSheetMember} busy={busyUserId === actionSheetMember.userId}
          onPromote={() => handlePromote(actionSheetMember.userId)}
          onSilence={(days, reason) => handleSilence(actionSheetMember.userId, days, reason)}
          onRemove={reason => handleRemove(actionSheetMember.userId, reason)}
          onClose={() => setActionSheetMember(null)}
        />
      )}
    </div>
  )
}

function BackBtn({ onBack, lang }) {
  return (
    <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
      <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="#fff" />
    </button>
  )
}

// Folha de ações (42j) — "repete de quem se trata" antes de qualquer coisa
// (a mesma regra da 19c antiga: no celular o toque erra de linha). Silenciar
// e remover pedem motivo (obrigatório, checklist do HANDOFF); tornar admin
// não (não é uma ação corretiva).
function MemberActionSheet({ L, lang, member, busy, onPromote, onSilence, onRemove, onClose }) {
  const [step, setStep] = useState('menu') // 'menu' | 'silenceDuration' | 'silenceReason' | 'removeReason'
  const [duration, setDuration] = useState(7)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function confirmSilence() {
    setError('')
    try {
      await onSilence(duration, reason)
    } catch (err) {
      setError(err.message)
    }
  }

  async function confirmRemove() {
    setError('')
    try {
      await onRemove(reason)
    } catch (err) {
      setError(err.message)
    }
  }

  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <div style={styles.sheetMemberRow}>
          <span style={styles.avatarCircle}>{initialsOf(member.name)}</span>
          <div>
            <p style={styles.sheetMemberName}>{member.name}</p>
            <p style={styles.sheetMemberSub}>{L('memberSince', { date: new Date(member.joinedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR') })}</p>
          </div>
        </div>

        {step === 'menu' && (
          <>
            <button style={styles.sheetOptionBtn} onClick={onPromote} disabled={busy}>{L('promoteAction')}</button>
            <button style={styles.sheetOptionBtn} onClick={() => setStep('silenceDuration')} disabled={busy}>
              {L('silenceAction')} <span style={{ float: 'right', color: 'var(--bento-t3)', fontWeight: 600 }}>{L('silenceDurationHint')}</span>
            </button>
            <button style={{ ...styles.sheetOptionBtn, color: 'var(--bento-destructive)' }} onClick={() => setStep('removeReason')} disabled={busy}>{L('removeMemberAction')}</button>
            <button style={styles.secondarySmallBtn} onClick={onClose} disabled={busy}>{L('cancelAction')}</button>
          </>
        )}

        {step === 'silenceDuration' && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {SILENCE_DURATIONS.map(d => (
                <button key={d} style={{ ...styles.durationPill, ...(duration === d ? styles.durationPillOn : {}) }} onClick={() => setDuration(d)}>
                  {d === 1 ? L('silenceDurationDayOne') : L('silenceDurationDaysMany', { n: d })}
                </button>
              ))}
            </div>
            <button style={styles.primarySmallBtn} onClick={() => setStep('silenceReason')}>{L('continueAction')}</button>
            <button style={styles.secondarySmallBtn} onClick={onClose} disabled={busy}>{L('cancelAction')}</button>
          </>
        )}

        {(step === 'silenceReason' || step === 'removeReason') && (
          <>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>{L('reasonRequiredLabel')}</span>
              <input style={styles.fieldInput} value={reason} onChange={e => setReason(e.target.value)} autoFocus />
            </label>
            {error && <p style={styles.errorText}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.secondarySmallBtn} onClick={onClose} disabled={busy}>{L('cancelAction')}</button>
              <button
                style={{ ...styles.primarySmallBtn, ...(step === 'removeReason' ? { background: 'var(--bento-destructive)' } : {}) }}
                onClick={step === 'silenceReason' ? confirmSilence : confirmRemove}
                disabled={busy || !reason.trim()}
              >
                {busy ? L('savingGroupInfo') : (step === 'silenceReason' ? L('silenceAction') : L('removeMemberAction'))}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 18px', background: 'var(--bento-ink)', borderRadius: '0 0 24px 24px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  emptyHint: { fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '0 20px' },
  retryBtn: { height: 40, padding: '0 20px', borderRadius: 14, border: 'none', background: 'var(--bento-ink)', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff' },
  searchBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '3px 0 0' },
  searchWrap: { flexShrink: 0, padding: '10px 20px 0' },
  searchInput: { width: '100%', height: 42, border: 'none', borderRadius: 14, padding: '0 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  inviteCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  inviteLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  inviteDot: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  inviteLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  inviteCode: { flex: 1, fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: '.1em', color: '#fff', margin: 0 },
  shareBtn: { flexShrink: 0, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 20px 4px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },

  memberRow: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 58, padding: '10px 0' },
  avatarCircle: { width: 36, height: 36, borderRadius: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, background: 'var(--bento-line)', color: 'var(--bento-t3)' },
  memberName: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  memberSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, margin: 0 },
  adminBadge: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)', flexShrink: 0 },
  moreBtn: { width: 32, height: 32, flexShrink: 0, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  declineBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  acceptBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },

  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetMemberRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  sheetMemberName: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 2px' },
  sheetMemberSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  sheetOptionBtn: { width: '100%', textAlign: 'left', border: 'none', background: 'var(--bento-card)', borderRadius: 14, padding: '14px 16px', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  durationPill: { flex: 1, height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-line)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  durationPillOn: { background: 'var(--bento-ink)', color: '#fff' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  fieldInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },
  secondarySmallBtn: { flex: 1, height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-line)', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t2)', cursor: 'pointer' },
  primarySmallBtn: { flex: 1, height: 44, border: 'none', borderRadius: 13, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' },
}
