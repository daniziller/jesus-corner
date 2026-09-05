// GroupAdminScreen.jsx — "Administração do grupo" (quadro 19c). Só entra
// pra quem modera algum grupo (ver Row "Administração do grupo" em
// ProfileSheet.jsx — session.myGroups?.[0]?.myRole === 'moderator').
//
// Backend novo (ver supabase/migrations/0046_group_invite_codes.sql e
// 0047_group_remove_member.sql, PRs #47/#49): código de convite, pedidos
// de entrada por código, editar nome/descrição, remover um membro comum.
// Promover/rebaixar (set_group_member_role) e a sala do capítulo (17a)
// já existiam antes deste quadro.
//
// Regra Zero, documentado: o quadro mostra "Gênesis 41 · em dia" como
// subtítulo de um membro comum — progresso de leitura de outra pessoa.
// De verdade, isso só existe via get_friend_progress_summary, que exige
// AMIZADE aceita (não só ser do mesmo grupo) e perfil público — não dá
// pra buscar de forma confiável (nem barata: seria 1 RPC por membro) pra
// qualquer um dos N membros do grupo. Por isso o subtítulo real aqui é
// "membro desde {data}" — o dado que sempre existe, sem fingir progresso
// que a maioria das vezes nem estaria disponível. Mesma razão, o
// "líder" ao lado de "admin" no mockup (papel extra que só o app não
// tem) virou só "admin" pros moderadores que não são você.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import {
  getGroupDetail, getPendingJoinRequests, respondToJoinRequest,
  setMemberRole, removeGroupMember, updateGroupInfo,
} from '../groups/groupsStore'

const FONT = 'var(--font-bento)'
const MEMBERS_COLLAPSED_COUNT = 4

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

export default function GroupAdminScreen({ session, authUser, onBack, onOpenGroupRoom }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupAdmin.${k}`, vars, lang)
  const myGroup = session.myGroups?.find(g => g.myRole === 'moderator') ?? session.myGroups?.[0]
  const groupId = myGroup?.groupId

  const [group, setGroup] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyUserId, setBusyUserId] = useState(null)
  const [shareState, setShareState] = useState('idle')
  const [membersExpanded, setMembersExpanded] = useState(false)
  const [actionSheetMember, setActionSheetMember] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!groupId) { setLoading(false); return }
    let cancelled = false
    Promise.all([getGroupDetail(groupId), getPendingJoinRequests(groupId)]).then(([detail, pending]) => {
      if (cancelled) return
      setGroup(detail)
      setRequests(pending)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [groupId])

  function startEditGroup() {
    setEditName(group.name)
    setEditDescription(group.description ?? '')
    setSaveError('')
    setEditOpen(true)
  }

  async function saveGroupInfo() {
    if (!editName.trim()) { setSaveError(L('groupNameRequiredError')); return }
    setSavingInfo(true)
    setSaveError('')
    try {
      await updateGroupInfo(groupId, editName, editDescription)
      setGroup(g => ({ ...g, name: editName.trim(), description: editDescription.trim() || null }))
      setEditOpen(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSavingInfo(false)
    }
  }

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
      if (accept) {
        const detail = await getGroupDetail(groupId)
        setGroup(detail)
      }
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
    } catch (err) {
      console.error('Failed to promote member', err)
    } finally {
      setBusyUserId(null)
      setActionSheetMember(null)
    }
  }

  async function handleRemove(userId) {
    setBusyUserId(userId)
    try {
      await removeGroupMember(groupId, userId)
      setGroup(g => ({ ...g, members: g.members.filter(m => m.userId !== userId) }))
    } catch (err) {
      console.error('Failed to remove member', err)
    } finally {
      setBusyUserId(null)
      setActionSheetMember(null)
    }
  }

  if (!groupId) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
        <p style={styles.emptyHint}>{L('noGroupHint')}</p>
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

  const members = group.members ?? []
  const visibleMembers = membersExpanded ? members : members.slice(0, MEMBERS_COLLAPSED_COUNT)
  const todaySession = session.todaySession
  const canOpenWeeklyQuestion = todaySession && !todaySession.needsThemePick

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <BackBtn onBack={onBack} lang={lang} />
        <div style={{ minWidth: 0 }}>
          <p style={styles.headerTitle}>{group.name}</p>
          <p style={styles.headerSub}>{L('pageSub', { n: members.length })}</p>
        </div>
      </div>

      <div style={styles.body}>
        {/* Código de convite (quadro 19c: "é o que o admin mais faz"). */}
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

        {/* Pedidos de entrada — antes da lista, por design (footer do
            quadro 19c: "aceitar/recusar em um toque"). Sem fila = sem
            card, em vez de mostrar "0 pedidos" à toa. */}
        {requests.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeadRow}>
              <p style={{ ...styles.cardLabel, color: 'var(--bento-accent)' }}>{L('joinRequestsLabel')}</p>
              <span style={styles.cardCount}>{requests.length}</span>
            </div>
            {requests.map((req, i) => (
              <div key={req.userId} style={{ ...styles.memberRow, borderBottom: i === requests.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <span style={{ ...styles.avatarCircle, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' }}>{initialsOf(req.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.memberName}>{req.name}</p>
                  <p style={styles.memberSub}>{relativeRequestTime(req.requestedAt, L)}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    style={styles.declineBtn} disabled={busyUserId === req.userId}
                    onClick={() => handleRequest(req.userId, false)} aria-label={L('declineAction')}
                  >
                    <AppIcon name="X" size={13} strokeWidth={2.4} color="var(--bento-t3)" />
                  </button>
                  <button
                    style={styles.acceptBtn} disabled={busyUserId === req.userId}
                    onClick={() => handleRequest(req.userId, true)} aria-label={L('acceptAction')}
                  >
                    <AppIcon name="Check" size={13} strokeWidth={2.8} color="var(--bento-accent)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Membros — tocar num comum abre a folha de opções (nunca
            inline, footer do quadro 19c: "pra evitar toque errado"). */}
        <div style={styles.card}>
          <div style={styles.cardHeadRow}>
            <p style={styles.cardLabel}>{L('membersLabel')}</p>
            {members.length > MEMBERS_COLLAPSED_COUNT && (
              <button style={styles.viewAllBtn} onClick={() => setMembersExpanded(v => !v)}>
                {membersExpanded ? L('showLessBtn') : L('viewAllBtn')}
              </button>
            )}
          </div>
          {visibleMembers.map((m, i) => {
            const isModerator = m.role === 'moderator'
            const isSelf = m.userId === authUser.id
            return (
              <button
                key={m.userId}
                style={{ ...styles.memberRow, width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: isModerator ? 'default' : 'pointer', borderBottom: i === visibleMembers.length - 1 ? 'none' : '1px solid var(--bento-line)' }}
                onClick={() => !isModerator && setActionSheetMember(m)}
                disabled={isModerator}
              >
                <span style={{ ...styles.avatarCircle, ...(isModerator ? { background: 'var(--bento-accent)', color: 'var(--bento-ink)' } : { background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' }) }}>
                  {initialsOf(m.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.memberName}>{m.name}</p>
                  <p style={styles.memberSub}>
                    {isModerator
                      ? (isSelf ? L('roleAdminSelf') : L('roleAdminOther'))
                      : L('memberSince', { date: new Date(m.joinedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR') })}
                  </p>
                </div>
                {isModerator
                  ? <span style={styles.adminBadge}>{L('adminBadge')}</span>
                  : <span style={styles.chevron}>›</span>}
              </button>
            )
          })}
        </div>

        {/* Pergunta da semana + editar grupo. */}
        <div style={styles.card}>
          {canOpenWeeklyQuestion && (
            <button
              style={{ ...styles.linkRow, borderBottom: '1px solid var(--bento-line)' }}
              onClick={() => onOpenGroupRoom?.({ group: { groupId, name: group.name, myRole: 'moderator' }, book: todaySession.book, bookEn: todaySession.bookEn, chapter: todaySession.chStart })}
            >
              <span style={styles.linkLabel}>{L('weeklyQuestionLabel')}</span>
              <span style={styles.linkSub}>{lang === 'en' ? todaySession.bookEn : todaySession.book} {todaySession.chStart}</span>
              <span style={styles.chevron}>›</span>
            </button>
          )}
          <button style={styles.linkRow} onClick={startEditGroup}>
            <span style={styles.linkLabel}>{L('editGroupLabel')}</span>
            <span style={styles.chevron}>›</span>
          </button>
        </div>
      </div>

      {editOpen && (
        <EditGroupSheet
          L={L} name={editName} description={editDescription} saving={savingInfo} error={saveError}
          onChangeName={setEditName} onChangeDescription={setEditDescription}
          onSave={saveGroupInfo} onClose={() => setEditOpen(false)}
        />
      )}

      {actionSheetMember && (
        <MemberActionSheet
          L={L} member={actionSheetMember} busy={busyUserId === actionSheetMember.userId}
          onPromote={() => handlePromote(actionSheetMember.userId)}
          onRemove={() => handleRemove(actionSheetMember.userId)}
          onClose={() => setActionSheetMember(null)}
        />
      )}
    </div>
  )
}

function BackBtn({ onBack, lang }) {
  return (
    <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
      <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
    </button>
  )
}

function EditGroupSheet({ L, name, description, saving, error, onChangeName, onChangeDescription, onSave, onClose }) {
  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{L('editGroupLabel')}</p>
        <label style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{L('groupNameFieldLabel')}</span>
          <input style={styles.fieldInput} value={name} onChange={e => onChangeName(e.target.value)} />
        </label>
        <label style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>{L('groupDescriptionFieldLabel')}</span>
          <textarea style={styles.bioInput} rows={3} value={description} onChange={e => onChangeDescription(e.target.value)} placeholder={L('groupDescriptionPlaceholder')} />
        </label>
        {error && <p style={styles.errorText}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button style={styles.secondarySmallBtn} onClick={onClose} disabled={saving}>{L('cancelAction')}</button>
          <button style={styles.primarySmallBtn} onClick={onSave} disabled={saving}>{saving ? L('savingGroupInfo') : L('saveGroupInfo')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MemberActionSheet({ L, member, busy, onPromote, onRemove, onClose }) {
  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{member.name}</p>
        <button style={styles.sheetOptionBtn} onClick={onPromote} disabled={busy}>{L('promoteAction')}</button>
        <button style={{ ...styles.sheetOptionBtn, color: 'var(--re)' }} onClick={onRemove} disabled={busy}>{L('removeMemberAction')}</button>
        <button style={styles.secondarySmallBtn} onClick={onClose} disabled={busy}>{L('cancelAction')}</button>
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  headerSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyHint: { fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '0 20px' },

  inviteCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  inviteLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  inviteDot: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  inviteLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  inviteCode: { flex: 1, fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: '.1em', color: '#fff', margin: 0 },
  shareBtn: { flexShrink: 0, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-accent)', padding: '0 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 20px 4px' },
  cardHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  cardCount: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  viewAllBtn: { border: 'none', background: 'none', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  memberRow: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 0' },
  avatarCircle: { width: 32, height: 32, borderRadius: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 10.5, fontWeight: 800 },
  memberName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  memberSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },
  adminBadge: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-accent)', flexShrink: 0 },
  declineBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  acceptBtn: { width: 36, height: 36, borderRadius: 12, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },

  linkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, minHeight: 52, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  linkLabel: { flex: 1, fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  linkSub: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t3)' },

  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  sheetOptionBtn: { width: '100%', textAlign: 'left', border: 'none', background: 'var(--bento-card)', borderRadius: 14, padding: '14px 16px', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  fieldInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)' },
  bioInput: { width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-card)', resize: 'none' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--re)', margin: 0 },
  primarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', background: 'var(--bento-accent)', cursor: 'pointer' },
  secondarySmallBtn: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 12px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-card)', cursor: 'pointer' },
}
