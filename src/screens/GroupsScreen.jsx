import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../data/bibleBlocks'
import { computeBookChapterCounts, deriveProgress, computeOverallStats, pickActiveBlock } from '../utils/progress'
import {
  getFriends, getPendingRequests, sendFriendRequest, respondToFriendRequest, removeFriend,
  getFriendFriendsList, sendFriendRequestByUserId,
} from '../friends/friendsStore'
import {
  getMyGroups, getPendingGroupInvites, getGroupDetail, createGroup,
  inviteFriendToGroup, respondToGroupInvite, leaveGroup, setMemberRole,
} from '../groups/groupsStore'
import { createChallenge, getChallengesForGroup, getChallengeLeaderboard, completeChallenge } from '../groups/challengesStore'
import { getComments, postComment, deleteComment, toggleCommentLike, setCommentPinned } from '../groups/commentsStore'
import { getFriendProfile, getFriendProgressSummary } from '../profile/profileStore'
import { logActivity, getFriendsActivity } from '../activity/activityStore'
import {
  getPrayerRequests, postPrayerRequest, deletePrayerRequest, togglePraying,
  getPrayerComments, postPrayerComment, deletePrayerComment, toggleCommentLike as togglePrayerCommentLike,
} from '../groups/prayerRequestsStore'
import ActivityFeedItem from '../components/ActivityFeedItem'

// Todos os 66 livros (pt/en), na mesma ordem/nomes usados em completed_keys
// — reaproveitado do mesmo dado que já alimenta a Jornada, pra montar o
// seletor de livros ao propor um desafio.
const ALL_BLOCKS_WITH_BOOKS = BIBLE_BLOCKS.map(b => ({ id: b.id, name: b.name, nameEn: b.nameEn, books: b.books, booksEn: b.booksEn }))
// Contagem de capítulos por livro independe do plano escolhido (o texto é
// sempre o mesmo) — usa o plano 'standard' só como fonte dos dados brutos.
const BOOK_CHAPTER_COUNTS = computeBookChapterCounts(SESSIONS_BY_PLAN.standard)

const DURATION_PRESETS = [
  { id: '7d', days: 7 },
  { id: '14d', days: 14 },
  { id: '30d', days: 30 },
]

function formatDate(iso, lang) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')
}

export default function GroupsScreen({ session, authUser, onSocialChange }) {
  const { lang } = session
  const [myGroups, setMyGroups] = useState([])
  const [groupInvites, setGroupInvites] = useState([])
  const [openGroupId, setOpenGroupId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [friendActivity, setFriendActivity] = useState([])

  function reload() {
    setReloadKey(k => k + 1)
    onSocialChange?.()
  }

  useEffect(() => {
    getMyGroups().then(setMyGroups).catch(err => console.error('Failed to load groups', err))
    getPendingGroupInvites().then(setGroupInvites).catch(err => console.error('Failed to load group invites', err))
    getFriendsActivity(20).then(setFriendActivity).catch(err => console.error('Failed to load friend activity', err))
  }, [reloadKey])

  const openGroup = myGroups.find(g => g.groupId === openGroupId) ?? null

  async function handleCreateGroup(name) {
    await createGroup(name)
    reload()
  }

  async function handleRespondInvite(groupId, accept, groupName) {
    await respondToGroupInvite(groupId, accept)
    if (accept) logActivity('joined_group', { groupName }).catch(err => console.error('Failed to log activity', err))
    reload()
  }

  return (
    <div className="master-detail">
      {/* Master: convites pendentes + meus grupos + amigos */}
      <div className={`master-pane${openGroupId ? ' hide-on-mobile' : ''}`} style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
        <div className="page-header"><h1 className="page-title">{t('groups.pageTitle', undefined, lang)}</h1></div>

        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groupInvites.length > 0 && (
            <div>
              <div className="section-header"><h3 className="section-title">{t('groups.pendingInvitesTitle', undefined, lang)}</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupInvites.map(inv => (
                  <div key={inv.groupId} style={styles.inviteCard}>
                    <div style={{ flex: 1 }}>
                      <p style={styles.inviteTitle}>{inv.groupName}</p>
                      <p style={styles.inviteSub}>{t('groups.invitedBy', { name: inv.invitedByName }, lang)}</p>
                    </div>
                    <button style={styles.acceptBtn} onClick={() => handleRespondInvite(inv.groupId, true, inv.groupName)}>
                      <AppIcon name="Check" size={14} />
                    </button>
                    <button style={styles.declineBtn} onClick={() => handleRespondInvite(inv.groupId, false)}>
                      <AppIcon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GroupsListSection groups={myGroups} lang={lang} onOpen={setOpenGroupId} onCreate={handleCreateGroup} />
          <FriendsSection lang={lang} onChange={reload} authUser={authUser} />

          <div>
            <div className="section-header"><h3 className="section-title">{t('groups.activityTitle', undefined, lang)}</h3></div>
            {friendActivity.length === 0 ? (
              <p style={styles.emptyHint}>{t('groups.activityEmpty', undefined, lang)}</p>
            ) : (
              <div style={styles.friendProfileCard}>
                {friendActivity.map((a, i) => (
                  <div key={a.id} style={{ paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? '0.5px solid var(--g1)' : 'none' }}>
                    <ActivityFeedItem activity={a} lang={lang} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail: grupo selecionado */}
      <div className={`detail-pane${!openGroupId ? ' hide-on-mobile' : ''}`}>
        {openGroup ? (
          <GroupDetailView
            key={openGroupId}
            groupId={openGroupId}
            groupName={openGroup.name}
            lang={lang}
            authUser={authUser}
            onBack={() => setOpenGroupId(null)}
            onLeft={() => { setOpenGroupId(null); reload() }}
          />
        ) : (
          <GroupsEmptyState lang={lang} />
        )}
      </div>
    </div>
  )
}

function GroupsEmptyState({ lang }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
      <AppIcon name="Users" size={30} color="var(--g4)" />
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g5)' }}>{t('groups.emptyStateTitle', undefined, lang)}</p>
      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--g4)', maxWidth: 260 }}>{t('groups.emptyStateSub', undefined, lang)}</p>
    </div>
  )
}

/* ── Lista de grupos + criar grupo ── */
function GroupsListSection({ groups, lang, onOpen, onCreate }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onCreate(name.trim())
      setName('')
      setCreating(false)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <h3 className="section-title">{t('groups.myGroupsTitle', undefined, lang)}</h3>
        <span className="section-link" data-tour="groups-create-button" onClick={() => setCreating(v => !v)}>
          {creating ? t('groups.cancel', undefined, lang) : t('groups.createGroup', undefined, lang)}
        </span>
      </div>

      {creating && (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            style={styles.input}
            placeholder={t('groups.groupNamePlaceholder', undefined, lang)}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }} disabled={loading}>
            {loading ? t('groups.loading', undefined, lang) : t('groups.create', undefined, lang)}
          </button>
        </form>
      )}
      {error && <p style={styles.error}>{error}</p>}

      {groups.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noGroupsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map(g => (
            <button key={g.groupId} style={styles.groupCard} onClick={() => onOpen(g.groupId)}>
              <div style={styles.groupIcon}><AppIcon name="Users" size={18} color="var(--or)" /></div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={styles.groupName}>{g.name}</p>
                {g.myRole === 'moderator' && <p style={styles.groupRoleTag}>{t('groups.youAreModerator', undefined, lang)}</p>}
              </div>
              <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Amigos: lista, pedidos pendentes, adicionar por email ── */
function FriendsSection({ lang, onChange, authUser }) {
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitedMsg, setInvitedMsg] = useState('')
  const [expandedFriendId, setExpandedFriendId] = useState(null)

  function reload() {
    getFriends().then(setFriends).catch(err => console.error('Failed to load friends', err))
    getPendingRequests().then(setPending).catch(err => console.error('Failed to load friend requests', err))
  }

  useEffect(() => { reload() }, [])

  async function submitAdd(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setInvitedMsg('')
    try {
      const result = await sendFriendRequest(email.trim())
      setEmail('')
      if (result?.invited) {
        setInvitedMsg(t('groups.inviteSent', undefined, lang))
      } else {
        setAdding(false)
      }
      onChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function respond(friendshipId, accept) {
    await respondToFriendRequest(friendshipId, accept)
    reload()
    onChange?.()
  }

  async function unfriend(friendshipId) {
    await removeFriend(friendshipId)
    reload()
  }

  return (
    <div>
      <div className="section-header">
        <h3 className="section-title">{t('groups.myFriendsTitle', undefined, lang)}</h3>
        <span className="section-link" onClick={() => setAdding(v => !v)}>
          {adding ? t('groups.cancel', undefined, lang) : t('groups.addFriend', undefined, lang)}
        </span>
      </div>

      {adding && (
        <form onSubmit={submitAdd} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            style={styles.input}
            type="email"
            placeholder={t('groups.friendEmailPlaceholder', undefined, lang)}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }} disabled={loading}>
            {loading ? t('groups.loading', undefined, lang) : t('groups.send', undefined, lang)}
          </button>
        </form>
      )}
      {error && <p style={styles.error}>{error}</p>}
      {invitedMsg && <p style={styles.inviteSentMsg}>{invitedMsg}</p>}

      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {pending.map(req => (
            <div key={req.friendshipId} style={styles.inviteCard}>
              <div style={styles.friendAvatar}>
                {req.avatarUrl ? <img src={req.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (req.name?.[0]?.toUpperCase() ?? '?')}
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.inviteTitle}>{req.name}</p>
                <p style={styles.inviteSub}>{t('groups.friendRequestReceived', undefined, lang)}</p>
              </div>
              <button style={styles.acceptBtn} onClick={() => respond(req.friendshipId, true)}><AppIcon name="Check" size={14} /></button>
              <button style={styles.declineBtn} onClick={() => respond(req.friendshipId, false)}><AppIcon name="X" size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noFriendsYet', undefined, lang)}</p>
      ) : (
        <>
          <div style={styles.friendsGrid}>
            {friends.map(f => {
              const expanded = expandedFriendId === f.userId
              return (
                <button
                  key={f.friendshipId}
                  style={styles.friendGridItem}
                  onClick={() => setExpandedFriendId(expanded ? null : f.userId)}
                >
                  <div style={{ ...styles.friendAvatarCircle, ...(expanded ? styles.friendAvatarCircleActive : {}) }}>
                    {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.name?.[0]?.toUpperCase() ?? '?')}
                  </div>
                  <span style={styles.friendGridName}>{f.name}</span>
                </button>
              )
            })}
          </div>
          {friends.map(f => expandedFriendId === f.userId && (
            <FriendProfilePanel
              key={f.userId}
              friendUserId={f.userId}
              lang={lang}
              authUser={authUser}
              myFriendIds={new Set(friends.map(fr => fr.userId))}
              onUnfriend={() => unfriend(f.friendshipId)}
              onFriendAdded={reload}
            />
          ))}
        </>
      )}
    </div>
  )
}

/* ── Painel de perfil de um amigo (expande abaixo do nome, na lista de
   amigos) — nome/foto/mensagem sempre aparecem pra amigos; progresso, o que
   está estudando, os grupos e a lista de amigos dele só aparecem se o dono
   marcou o perfil como público (ver get_friend_progress_summary e
   get_friend_friends_list em 0004/0012_*.sql). ── */
function FriendProfilePanel({ friendUserId, lang, authUser, myFriendIds, onUnfriend, onFriendAdded }) {
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [friendsOfFriend, setFriendsOfFriend] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [addedIds, setAddedIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFriendProfile(friendUserId).then(async p => {
      if (cancelled) return
      setProfile(p)
      if (p?.isPublic) {
        const [s, f] = await Promise.all([
          getFriendProgressSummary(friendUserId),
          getFriendFriendsList(friendUserId),
        ])
        if (!cancelled) { setSummary(s); setFriendsOfFriend(f) }
      }
      setLoading(false)
    }).catch(err => { console.error('Failed to load friend profile', err); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [friendUserId])

  async function handleAddFriend(targetUserId) {
    setAddingId(targetUserId)
    try {
      await sendFriendRequestByUserId(targetUserId)
      setAddedIds(prev => new Set(prev).add(targetUserId))
      onFriendAdded?.()
    } catch (err) {
      console.error('Failed to send friend request', err)
    } finally {
      setAddingId(null)
    }
  }

  if (loading) return <div style={styles.friendProfileCard} />
  if (!profile) return null

  let activeBlockName = null
  let biblePercent = null
  if (summary?.isPublic) {
    const { blocks } = deriveProgress(new Set(summary.completedKeys), summary.planId)
    const overall = computeOverallStats(blocks)
    const activeBlock = pickActiveBlock(blocks)
    activeBlockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name
    biblePercent = overall.biblePercent
  }

  const otherFriends = (friendsOfFriend?.friends ?? []).filter(f => f.userId !== authUser?.id)

  return (
    <div style={styles.friendProfileCard}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={styles.friendAvatar}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--bk)' }}>{profile.name}</p>
          {profile.bio && <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginTop: 2 }}>{profile.bio}</p>}
        </div>
      </div>

      {summary?.isPublic ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatItemSmall value={`${biblePercent}%`} label={t('groups.friendBibleLabel', undefined, lang)} />
            <StatItemSmall value={summary.studiesCompletedCount} label={t('groups.friendStudiesLabel', undefined, lang)} />
            <StatItemSmall value={otherFriends.length} label={t('groups.friendFriendsCountLabel', undefined, lang)} />
          </div>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--g5)' }}>
            {t('groups.friendCurrentlyReading', { block: activeBlockName }, lang)}
          </p>
          {summary.groups.length > 0 && (
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--g5)' }}>
              {t('groups.friendGroupsLabel', { groups: summary.groups.map(g => g.name).join(', ') }, lang)}
            </p>
          )}

          {otherFriends.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <p style={styles.friendOfFriendTitle}>{t('groups.friendFriendsListTitle', { name: profile.name }, lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {otherFriends.map(f => {
                  const alreadyFriend = myFriendIds?.has(f.userId) || addedIds.has(f.userId)
                  return (
                    <div key={f.userId} style={styles.friendOfFriendRow}>
                      <div style={styles.friendOfFriendAvatar}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.name?.[0]?.toUpperCase() ?? '?')}
                      </div>
                      <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--bk)' }}>{f.name}</span>
                      {alreadyFriend ? (
                        <span style={styles.friendOfFriendAdded}>{t('groups.alreadyFriends', undefined, lang)}</span>
                      ) : (
                        <button
                          style={styles.smallLinkBtn}
                          disabled={addingId === f.userId}
                          onClick={() => handleAddFriend(f.userId)}
                        >
                          {addingId === f.userId ? t('groups.loading', undefined, lang) : t('groups.addFriend', undefined, lang)}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ ...styles.emptyHint, marginTop: 8 }}>{t('groups.friendProfilePrivate', undefined, lang)}</p>
      )}

      <button style={styles.unfriendLink} onClick={onUnfriend}>{t('groups.removeFriend', undefined, lang)}</button>
    </div>
  )
}

function StatItemSmall({ value, label }) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--bk)', letterSpacing: '-0.3px' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--g4)' }}>{label}</p>
    </div>
  )
}

/* ── Detalhe de um grupo: sub-abas Desafio / Discussão ── */
function GroupDetailView({ groupId, groupName, lang, authUser, onBack, onLeft }) {
  const [tab, setTab] = useState('challenge')
  const [detail, setDetail] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  function reload() { setReloadKey(k => k + 1) }

  useEffect(() => {
    getGroupDetail(groupId).then(setDetail).catch(err => console.error('Failed to load group detail', err))
  }, [groupId, reloadKey])

  const myMembership = detail?.members.find(m => m.userId === authUser?.id)
  const isModerator = myMembership?.role === 'moderator'

  async function handleLeave() {
    if (!window.confirm(t('groups.leaveConfirm', undefined, lang))) return
    await leaveGroup(groupId)
    onLeft()
  }

  if (!detail) {
    return <div style={{ padding: 20 }} />
  }

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={styles.backBtn} aria-label="back">
          <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
        </button>
        <h1 className="page-title">{groupName}</h1>
      </div>

      <div style={{ padding: '0 14px 4px', display: 'flex', gap: 8 }}>
        <button style={{ ...styles.subTab, ...(tab === 'challenge' ? styles.subTabActive : {}) }} onClick={() => setTab('challenge')}>
          {t('groups.challengeTab', undefined, lang)}
        </button>
        <button style={{ ...styles.subTab, ...(tab === 'prayer' ? styles.subTabActive : {}) }} onClick={() => setTab('prayer')}>
          {t('groups.prayerTab', undefined, lang)}
        </button>
        <button style={{ ...styles.subTab, ...(tab === 'discussion' ? styles.subTabActive : {}) }} onClick={() => setTab('discussion')}>
          {t('groups.discussionTab', undefined, lang)}
        </button>
      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        {tab === 'challenge' && (
          <ChallengeTab
            groupId={groupId}
            members={detail.members}
            isModerator={isModerator}
            authUser={authUser}
            lang={lang}
            onChange={reload}
            onLeave={handleLeave}
          />
        )}
        {tab === 'prayer' && (
          <GroupPrayerTab groupId={groupId} isModerator={isModerator} authUser={authUser} lang={lang} />
        )}
        {tab === 'discussion' && (
          <DiscussionTab groupId={groupId} members={detail.members} isModerator={isModerator} authUser={authUser} lang={lang} />
        )}
      </div>
    </div>
  )
}

/* ── Aba Desafio: membros, placar, propor desafio, convidar, sair ── */
function ChallengeTab({ groupId, members, isModerator, authUser, lang, onChange, onLeave }) {
  const [challenges, setChallenges] = useState([])
  const [leaderboards, setLeaderboards] = useState({})
  const [proposing, setProposing] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [friends, setFriends] = useState([])

  function reload() {
    getChallengesForGroup(groupId).then(async list => {
      setChallenges(list)
      const boards = {}
      for (const c of list) {
        boards[c.id] = await getChallengeLeaderboard(c.id)
      }
      setLeaderboards(boards)
    }).catch(err => console.error('Failed to load challenges', err))
  }

  useEffect(() => { reload() }, [groupId])
  useEffect(() => { if (inviting) getFriends().then(setFriends).catch(err => console.error('Failed to load friends', err)) }, [inviting])

  const memberIds = new Set(members.map(m => m.userId))
  const invitableFriends = friends.filter(f => !memberIds.has(f.userId))
  // Um grupo pode ter mais de um desafio em andamento ao mesmo tempo — todos
  // aparecem (não só "o" ativo), pra "Concluir desafio" nunca agir sobre um
  // desafio diferente do que a pessoa está de fato olhando.
  const activeChallenges = challenges.filter(c => c.active)
  const pastChallenges = challenges.filter(c => !c.active)

  async function handleInvite(friendUserId) {
    await inviteFriendToGroup(groupId, friendUserId)
    setInviting(false)
  }

  async function handlePromote(userId, currentRole) {
    await setMemberRole(groupId, userId, currentRole === 'moderator' ? 'member' : 'moderator')
    onChange()
  }

  async function handleCompleteChallenge(challengeId) {
    if (!window.confirm(t('groups.completeChallengeConfirm', undefined, lang))) return
    try {
      await completeChallenge(challengeId)
      reload()
    } catch (err) {
      console.error('Failed to complete challenge', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Membros */}
      <div style={styles.card}>
        <p style={styles.cardTitle}>{t('groups.membersTitle', { n: members.length }, lang)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => (
            <div key={m.userId} style={styles.memberRow}>
              <span style={styles.friendName}>{m.name}</span>
              {m.role === 'moderator' && <span className="badge badge-orange">{t('groups.moderatorBadge', undefined, lang)}</span>}
              {isModerator && m.userId !== authUser?.id && (
                <button style={styles.smallLinkBtn} onClick={() => handlePromote(m.userId, m.role)}>
                  {m.role === 'moderator' ? t('groups.demote', undefined, lang) : t('groups.promote', undefined, lang)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desafios ativos — todos, não só o mais recente */}
      {activeChallenges.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noActiveChallenge', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeChallenges.length > 1 && (
            <p style={styles.cardTitle}>{t('groups.activeChallengesTitle', { n: activeChallenges.length }, lang)}</p>
          )}
          {activeChallenges.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              leaderboard={leaderboards[c.id] ?? []}
              lang={lang}
              isModerator={isModerator}
              onComplete={() => handleCompleteChallenge(c.id)}
            />
          ))}
        </div>
      )}

      {proposing ? (
        <ProposeChallengeForm groupId={groupId} lang={lang} onDone={() => { setProposing(false); reload() }} onCancel={() => setProposing(false)} />
      ) : (
        <button className="btn-secondary" onClick={() => setProposing(true)}>{t('groups.proposeChallenge', undefined, lang)}</button>
      )}

      {pastChallenges.length > 0 && (
        <div>
          <p style={styles.cardTitle}>{t('groups.pastChallengesTitle', undefined, lang)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} leaderboard={leaderboards[c.id] ?? []} lang={lang} ended />
            ))}
          </div>
        </div>
      )}

      {/* Convidar amigo */}
      {inviting ? (
        <div style={styles.card}>
          <p style={styles.cardTitle}>{t('groups.inviteFriendTitle', undefined, lang)}</p>
          {invitableFriends.length === 0 ? (
            <p style={styles.emptyHint}>{t('groups.noInvitableFriends', undefined, lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invitableFriends.map(f => (
                <div key={f.userId} style={styles.memberRow}>
                  <span style={styles.friendName}>{f.name}</span>
                  <button style={styles.smallLinkBtn} onClick={() => handleInvite(f.userId)}>{t('groups.invite', undefined, lang)}</button>
                </div>
              ))}
            </div>
          )}
          <button style={{ ...styles.smallLinkBtn, marginTop: 8 }} onClick={() => setInviting(false)}>{t('groups.cancel', undefined, lang)}</button>
        </div>
      ) : (
        <button className="btn-secondary" onClick={() => setInviting(true)}>{t('groups.inviteFriendTitle', undefined, lang)}</button>
      )}

      <button style={styles.leaveBtn} onClick={onLeave}>{t('groups.leaveGroup', undefined, lang)}</button>
    </div>
  )
}

function ProposeChallengeForm({ groupId, lang, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])
  const [duration, setDuration] = useState('7d')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleBook(book) {
    setSelectedBooks(prev => prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book])
  }

  async function submit() {
    if (!name.trim()) { setError(t('groups.pickChallengeName', undefined, lang)); return }
    if (selectedBooks.length === 0) { setError(t('groups.pickAtLeastOneBook', undefined, lang)); return }
    let endsAt
    if (duration === 'custom') {
      if (!customDate) { setError(t('groups.pickEndDate', undefined, lang)); return }
      endsAt = new Date(customDate).toISOString()
    } else {
      const preset = DURATION_PRESETS.find(p => p.id === duration)
      endsAt = new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString()
    }
    setLoading(true)
    try {
      await createChallenge(groupId, selectedBooks, endsAt, name, description)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <p style={styles.cardTitle}>{t('groups.proposeChallenge', undefined, lang)}</p>

      <input
        type="text"
        style={{ ...styles.input, marginBottom: 8 }}
        placeholder={t('groups.challengeNamePlaceholder', undefined, lang)}
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={100}
      />
      <textarea
        style={{ ...styles.textarea, marginBottom: 10 }}
        placeholder={t('groups.challengeDescPlaceholder', undefined, lang)}
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        maxLength={500}
      />

      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {ALL_BLOCKS_WITH_BOOKS.map(block => (
          <div key={block.id}>
            <p style={styles.blockLabel}>{lang === 'en' ? block.nameEn : block.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(lang === 'en' ? block.booksEn : block.books).map((bookName, i) => {
                const bookKey = block.books[i] // sempre a chave em português, igual completed_keys
                const active = selectedBooks.includes(bookKey)
                return (
                  <span
                    key={bookKey}
                    style={{ ...styles.bookChip, ...(active ? styles.bookChipActive : {}) }}
                    onClick={() => toggleBook(bookKey)}
                  >
                    {bookName}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p style={styles.cardTitle}>{t('groups.durationLabel', undefined, lang)}</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {DURATION_PRESETS.map(p => (
          <span
            key={p.id}
            style={{ ...styles.durationChip, ...(duration === p.id ? styles.durationChipActive : {}) }}
            onClick={() => setDuration(p.id)}
          >
            {t(`groups.duration_${p.id}`, undefined, lang)}
          </span>
        ))}
        <span
          style={{ ...styles.durationChip, ...(duration === 'custom' ? styles.durationChipActive : {}) }}
          onClick={() => setDuration('custom')}
        >
          {t('groups.durationCustom', undefined, lang)}
        </span>
      </div>
      {duration === 'custom' && (
        <input
          type="date"
          style={{ ...styles.input, marginBottom: 10 }}
          value={customDate}
          onChange={e => setCustomDate(e.target.value)}
        />
      )}

      {error && <p style={styles.error}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? t('groups.loading', undefined, lang) : t('groups.startChallenge', undefined, lang)}
        </button>
        <button className="btn-secondary" onClick={onCancel}>{t('groups.cancel', undefined, lang)}</button>
      </div>
    </div>
  )
}

function ChallengeCard({ challenge, leaderboard, lang, ended, isModerator, onComplete }) {
  const totalChapters = challenge.books.reduce((sum, book) => sum + (BOOK_CHAPTER_COUNTS[book] ?? 0), 0)
  const ranked = [...leaderboard].sort((a, b) => b.completedKeys.length - a.completedKeys.length)

  return (
    <div style={{ ...styles.card, ...(ended ? styles.cardEnded : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p style={styles.cardTitle}>{challenge.name || challenge.books.join(', ')}</p>
        {ended && (
          <span className="badge badge-locked">
            {t(challenge.manuallyCompleted ? 'groups.challengeCompleted' : 'groups.challengeEnded', undefined, lang)}
          </span>
        )}
      </div>
      {challenge.name && <p style={styles.challengeBooks}>{challenge.books.join(', ')}</p>}
      {challenge.description && <p style={styles.challengeDesc}>{challenge.description}</p>}
      <p style={styles.challengeMeta}>
        {formatDate(challenge.startsAt, lang)} → {formatDate(challenge.endsAt, lang)} · {t('groups.proposedBy', { name: challenge.createdByName }, lang)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {ranked.map((p, i) => {
          const pct = totalChapters ? Math.round((p.completedKeys.length / totalChapters) * 100) : 0
          return (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.rankNumber}>{i + 1}</span>
              <span style={{ ...styles.friendName, flex: 'none', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, width: `${pct}%` }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g5)', width: 32, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
      {!ended && isModerator && (
        <button style={styles.completeChallengeBtn} onClick={onComplete}>
          <AppIcon name="Check" size={13} /> {t('groups.completeChallenge', undefined, lang)}
        </button>
      )}
    </div>
  )
}

/* ── Aba Discussão: mural tipo fórum ── */
function DiscussionTab({ groupId, members, isModerator, authUser, lang }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [pinError, setPinError] = useState('')

  const moderatorIds = new Set(members.filter(m => m.role === 'moderator').map(m => m.userId))

  function reload() {
    getComments(groupId).then(setComments).catch(err => console.error('Failed to load comments', err))
  }

  useEffect(() => { reload() }, [groupId])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    try {
      await postComment(groupId, body)
      setBody('')
      reload()
    } catch (err) {
      console.error('Failed to post comment', err)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm(t('groups.deleteCommentConfirm', undefined, lang))) return
    await deleteComment(commentId)
    reload()
  }

  async function handleLike(comment) {
    // otimista: atualiza local antes de esperar o servidor
    setComments(prev => prev.map(c => c.id === comment.id
      ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
      : c))
    toggleCommentLike(comment.id).catch(err => console.error('Failed to toggle like', err))
  }

  async function handleTogglePin(comment) {
    setPinError('')
    try {
      await setCommentPinned(comment.id, !comment.pinned)
      reload()
    } catch (err) {
      setPinError(err.message)
    }
  }

  const pinnedComments = comments.filter(c => c.pinned).sort((a, b) => new Date(a.pinnedAt) - new Date(b.pinnedAt))
  const regularComments = comments.filter(c => !c.pinned)
  const pinnedCount = pinnedComments.length

  function renderComment(c) {
    const canDelete = c.userId === authUser?.id || isModerator
    const authorIsModerator = moderatorIds.has(c.userId)
    const canPinMore = pinnedCount < 3
    return (
      <div key={c.id} style={{ ...styles.commentCard, ...(authorIsModerator ? styles.commentCardModerator : {}) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={styles.commentAuthor}>
            {c.authorName}
            {authorIsModerator && <span className="badge badge-orange" style={{ marginLeft: 6 }}>{t('groups.moderatorBadge', undefined, lang)}</span>}
          </span>
          <span style={styles.commentDate}>{formatDate(c.createdAt, lang)}</span>
        </div>
        <p style={styles.commentBody}>{c.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <button style={{ ...styles.likeBtn, ...(c.likedByMe ? styles.likeBtnActive : {}) }} onClick={() => handleLike(c)}>
            <AppIcon name="Heart" size={13} color={c.likedByMe ? 'var(--or)' : 'var(--g4)'} /> {c.likeCount}
          </button>
          {isModerator && (
            <button
              style={{ ...styles.smallLinkBtn, ...(!c.pinned && !canPinMore ? styles.smallLinkBtnDisabled : {}) }}
              onClick={() => handleTogglePin(c)}
              disabled={!c.pinned && !canPinMore}
            >
              <AppIcon name="Pin" size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {c.pinned ? t('groups.unpinComment', undefined, lang) : t('groups.pinComment', undefined, lang)}
            </button>
          )}
          {canDelete && (
            <button style={styles.smallLinkBtn} onClick={() => handleDelete(c.id)}>{t('groups.deleteComment', undefined, lang)}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          style={styles.textarea}
          placeholder={t('groups.commentPlaceholder', undefined, lang)}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
        />
        <button type="submit" className="btn-primary" disabled={posting}>
          {posting ? t('groups.loading', undefined, lang) : t('groups.postComment', undefined, lang)}
        </button>
      </form>

      {pinError && <p style={styles.error}>{pinError}</p>}

      {pinnedComments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={styles.pinnedSectionTitle}>
            <AppIcon name="Pin" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('groups.pinnedSectionTitle', undefined, lang)}
          </p>
          {pinnedComments.map(renderComment)}
        </div>
      )}

      {comments.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noCommentsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regularComments.map(renderComment)}
        </div>
      )}
    </div>
  )
}

/* ── Aba Oração: pedidos do grupo, "orando por isso" (mãos unidas) e
   comentários por pedido (com curtida) ── */
function GroupPrayerTab({ groupId, isModerator, authUser, lang }) {
  const [requests, setRequests] = useState([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedRequestId, setExpandedRequestId] = useState(null)

  function reload() {
    getPrayerRequests(groupId).then(setRequests).catch(err => console.error('Failed to load prayer requests', err))
  }

  useEffect(() => { reload() }, [groupId])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    try {
      await postPrayerRequest(groupId, body)
      setBody('')
      reload()
    } catch (err) {
      console.error('Failed to post prayer request', err)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(requestId) {
    if (!window.confirm(t('groups.deletePrayerRequestConfirm', undefined, lang))) return
    await deletePrayerRequest(requestId)
    if (expandedRequestId === requestId) setExpandedRequestId(null)
    reload()
  }

  async function handleTogglePraying(request) {
    // otimista: atualiza local antes de esperar o servidor
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayingByMe: !r.prayingByMe, prayingCount: r.prayingCount + (r.prayingByMe ? -1 : 1) }
      : r))
    togglePraying(request.id).catch(err => console.error('Failed to toggle praying', err))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          style={styles.textarea}
          placeholder={t('groups.prayerRequestPlaceholder', undefined, lang)}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
        />
        <button type="submit" className="btn-primary" disabled={posting}>
          {posting ? t('groups.loading', undefined, lang) : t('groups.postPrayerRequest', undefined, lang)}
        </button>
      </form>

      {requests.length === 0 ? (
        <p style={styles.emptyHint}>{t('groups.noPrayerRequestsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const canDelete = r.userId === authUser?.id || isModerator
            const expanded = expandedRequestId === r.id
            return (
              <div key={r.id} style={styles.commentCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={styles.commentAuthor}>{r.authorName}</span>
                  <span style={styles.commentDate}>{formatDate(r.createdAt, lang)}</span>
                </div>
                <p style={styles.commentBody}>{r.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <button style={{ ...styles.prayingBtn, ...(r.prayingByMe ? styles.prayingBtnActive : {}) }} onClick={() => handleTogglePraying(r)}>
                    <AppIcon name="HandHeart" size={13} color={r.prayingByMe ? 'var(--or)' : 'var(--g4)'} /> {t('groups.prayingCount', { n: r.prayingCount }, lang)}
                  </button>
                  <button style={styles.smallLinkBtn} onClick={() => setExpandedRequestId(expanded ? null : r.id)}>
                    <AppIcon name="MessageCircle" size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {t('groups.commentsCount', { n: r.commentCount }, lang)}
                  </button>
                  {canDelete && (
                    <button style={styles.smallLinkBtn} onClick={() => handleDelete(r.id)}>{t('groups.deleteComment', undefined, lang)}</button>
                  )}
                </div>
                {expanded && (
                  <PrayerRequestComments
                    requestId={r.id}
                    isModerator={isModerator}
                    authUser={authUser}
                    lang={lang}
                    onCountChange={n => setRequests(prev => prev.map(req => req.id === r.id ? { ...req, commentCount: n } : req))}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Comentários de um pedido de oração específico — mesma UI de
   comentário/curtida do mural de discussão, só que aninhada dentro do
   pedido em vez de num mural plano. ── */
function PrayerRequestComments({ requestId, isModerator, authUser, lang, onCountChange }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)

  function reload() {
    getPrayerComments(requestId).then(data => {
      setComments(data)
      onCountChange?.(data.length)
    }).catch(err => console.error('Failed to load prayer comments', err))
  }

  useEffect(() => { reload() }, [requestId])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    try {
      await postPrayerComment(requestId, body)
      setBody('')
      reload()
    } catch (err) {
      console.error('Failed to post prayer comment', err)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm(t('groups.deleteCommentConfirm', undefined, lang))) return
    await deletePrayerComment(commentId)
    reload()
  }

  async function handleLike(comment) {
    setComments(prev => prev.map(c => c.id === comment.id
      ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
      : c))
    togglePrayerCommentLike(comment.id).catch(err => console.error('Failed to toggle like', err))
  }

  return (
    <div style={styles.prayerCommentsWrap}>
      {comments.length === 0 ? (
        <p style={{ ...styles.emptyHint, marginBottom: 8 }}>{t('groups.noCommentsYet', undefined, lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {comments.map(c => {
            const canDelete = c.userId === authUser?.id || isModerator
            return (
              <div key={c.id} style={styles.prayerCommentItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={styles.commentAuthor}>{c.authorName}</span>
                  <span style={styles.commentDate}>{formatDate(c.createdAt, lang)}</span>
                </div>
                <p style={styles.commentBody}>{c.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <button style={{ ...styles.likeBtn, ...(c.likedByMe ? styles.likeBtnActive : {}) }} onClick={() => handleLike(c)}>
                    <AppIcon name="Heart" size={12} color={c.likedByMe ? 'var(--or)' : 'var(--g4)'} /> {c.likeCount}
                  </button>
                  {canDelete && (
                    <button style={styles.smallLinkBtn} onClick={() => handleDelete(c.id)}>{t('groups.deleteComment', undefined, lang)}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
        <input
          style={styles.input}
          placeholder={t('groups.commentPlaceholder', undefined, lang)}
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 14px' }} disabled={posting}>
          {posting ? t('groups.loading', undefined, lang) : t('groups.postComment', undefined, lang)}
        </button>
      </form>
    </div>
  )
}

const styles = {
  input: { flex: 1, border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', outline: 'none' },
  textarea: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 500, color: 'var(--bk)', resize: 'none', outline: 'none', lineHeight: 1.5 },
  error: { fontSize: 11, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 },
  inviteSentMsg: { fontSize: 11, fontWeight: 600, color: '#15803D', background: 'rgba(22,163,74,.12)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 },
  emptyHint: { fontSize: 11.5, fontWeight: 500, color: 'var(--g4)', padding: '4px 2px' },
  backBtn: { width: 32, height: 32, borderRadius: 10, border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  inviteCard: { display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '0.5px solid var(--g1)', borderRadius: 14, padding: 10, boxShadow: 'var(--shadow-card)' },
  inviteTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  inviteSub: { fontSize: 10, fontWeight: 500, color: 'var(--g5)' },
  acceptBtn: { width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(22,163,74,.12)', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  declineBtn: { width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--g1)', color: 'var(--g4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  groupCard: { display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '0.5px solid var(--g1)', borderRadius: 14, padding: 12, boxShadow: 'var(--shadow-card)', cursor: 'pointer', fontFamily: 'var(--font)', width: '100%' },
  groupIcon: { width: 38, height: 38, borderRadius: 11, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupName: { fontSize: 13, fontWeight: 700, color: 'var(--bk)' },
  groupRoleTag: { fontSize: 9.5, fontWeight: 600, color: 'var(--or)', marginTop: 2 },
  friendsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 },
  friendGridItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 },
  friendAvatarCircle: { width: 52, height: 52, borderRadius: '50%', background: 'var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: 'var(--g5)', flexShrink: 0, overflow: 'hidden', border: '2px solid transparent' },
  friendAvatarCircleActive: { border: '2px solid var(--or)' },
  friendGridName: { fontSize: 10.5, fontWeight: 600, color: 'var(--g6)', textAlign: 'center', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  friendProfileCard: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 12, padding: 12, marginTop: 4 },
  friendAvatar: { width: 38, height: 38, borderRadius: '50%', background: 'var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--g5)', flexShrink: 0, overflow: 'hidden' },
  unfriendLink: { border: 'none', background: 'none', color: 'var(--re)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, marginTop: 10 },
  friendOfFriendTitle: { fontSize: 10, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.3, textTransform: 'uppercase' },
  friendOfFriendRow: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--g1)', borderRadius: 10, padding: '6px 8px' },
  friendOfFriendAvatar: { width: 26, height: 26, borderRadius: '50%', background: 'var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--g5)', flexShrink: 0, overflow: 'hidden' },
  friendOfFriendAdded: { fontSize: 10, fontWeight: 700, color: 'var(--g4)' },
  card: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' },
  cardEnded: { background: 'var(--g1)', boxShadow: 'none', opacity: 0.75 },
  completeChallengeBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', background: 'rgba(22,163,74,.12)', color: '#15803D', borderRadius: 12, padding: '10px 12px', marginTop: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  cardTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)', marginBottom: 8 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px' },
  smallLinkBtn: { border: 'none', background: 'none', color: 'var(--or)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 },
  smallLinkBtnDisabled: { color: 'var(--g4)', cursor: 'not-allowed' },
  subTab: { flex: 1, textAlign: 'center', padding: '9px 4px', fontSize: 11.5, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer', borderRadius: 9, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  subTabActive: { color: 'white', background: 'var(--grad-primary)', border: '0.5px solid transparent', boxShadow: 'var(--shadow-glow)' },
  blockLabel: { fontSize: 9, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  bookChip: { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 20, padding: '5px 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer' },
  bookChipActive: { background: 'var(--grad-vivid)', border: '0.5px solid transparent', color: 'white' },
  durationChip: { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--g6)', cursor: 'pointer' },
  durationChipActive: { background: 'var(--grad-primary)', border: '0.5px solid transparent', color: 'white' },
  challengeMeta: { fontSize: 10, fontWeight: 500, color: 'var(--g5)' },
  challengeBooks: { fontSize: 10.5, fontWeight: 600, color: 'var(--or)', marginBottom: 6 },
  challengeDesc: { fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginBottom: 6 },
  rankNumber: { width: 18, fontSize: 11, fontWeight: 800, color: 'var(--g4)', flexShrink: 0 },
  leaveBtn: { background: 'var(--rel)', border: '0.5px solid rgba(220,38,38,.2)', borderRadius: 12, padding: 11, fontSize: 12, fontWeight: 700, color: 'var(--re)', cursor: 'pointer', fontFamily: 'var(--font)' },
  commentCard: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 14, padding: 12, boxShadow: 'var(--shadow-card)' },
  commentCardModerator: { background: 'var(--g1)', border: '0.5px solid var(--g2)' },
  pinnedSectionTitle: { fontSize: 10, fontWeight: 800, color: 'var(--g5)', letterSpacing: 0.5, textTransform: 'uppercase' },
  commentAuthor: { fontSize: 11.5, fontWeight: 700, color: 'var(--bk)' },
  commentDate: { fontSize: 9.5, fontWeight: 500, color: 'var(--g4)' },
  commentBody: { fontSize: 12, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginTop: 4 },
  likeBtn: { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--g5)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 },
  likeBtnActive: { color: 'var(--or)' },
  prayingBtn: { display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--g5)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 },
  prayingBtnActive: { color: 'var(--or)' },
  prayerCommentsWrap: { marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--g1)' },
  prayerCommentItem: { background: 'var(--g1)', borderRadius: 10, padding: 9 },
}
