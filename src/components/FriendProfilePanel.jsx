// FriendProfilePanel.jsx — cartão de perfil de um amigo (nome/foto/mensagem
// sempre aparecem; progresso, o que está estudando, os grupos e a lista de
// amigos dele só aparecem se o dono marcou o perfil como público — ver
// get_friend_progress_summary e get_friend_friends_list em 0004/0012_*.sql).
//
// Extraído de GroupsScreen.jsx (2026-09-09) — vivia lá porque GroupsScreen
// é quem também renderiza a lista de amigos "de amigo em amigo", mas
// AddFriendsScreen.jsx (24c) importava este componente DE VOLTA de
// GroupsScreen.jsx, criando uma dependência circular entre os dois arquivos
// (GroupsScreen → AddFriendsScreen → GroupsScreen). Ela ficava "segura por
// acidente" — funcionava até uma mudança não relacionada na árvore de
// imports (a remoção do Estudo Indutivo) reordenar como o Rollup empacota
// os módulos, e a ordem de inicialização virar a errada: `ReferenceError:
// Cannot access '<x>' before initialization`, app inteiro travando em tela
// branca (div#root vazia) pra quem já tinha sessão salva. Um arquivo à
// parte, sem import nenhum de volta pra GroupsScreen.jsx nem
// AddFriendsScreen.jsx, elimina o ciclo de vez.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import { getFriendFriendsList, sendFriendRequestByUserId } from '../friends/friendsStore'
import { getFriendProfile, getFriendProgressSummary } from '../profile/profileStore'
import { deriveProgress, computeOverallStats, pickActiveBlock } from '../utils/progress'
import { avatarInitialsOf } from '../utils/avatarInitials'

export function FriendProfilePanel({ friendUserId, lang, authUser, myFriendIds, onUnfriend, onFriendAdded }) {
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

  if (loading) return <div style={styles.bFriendPanel} />
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
    <div style={styles.bFriendPanel}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={styles.bAvatarCircle}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : avatarInitialsOf(profile.name)}
        </span>
        <div style={{ flex: 1 }}>
          <p style={styles.bMemberName}>{profile.name}</p>
          {profile.bio && <p style={{ ...styles.bMemberSub, marginTop: 2 }}>{profile.bio}</p>}
        </div>
      </div>

      {summary?.isPublic ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatItemSmall value={`${biblePercent}%`} label={t('groups.friendBibleLabel', undefined, lang)} />
            <StatItemSmall value={summary.studiesCompletedCount} label={t('groups.friendStudiesLabel', undefined, lang)} />
            <StatItemSmall value={otherFriends.length} label={t('groups.friendFriendsCountLabel', undefined, lang)} />
          </div>
          <p style={styles.bMemberSub}>
            {t('groups.friendCurrentlyReading', { block: activeBlockName }, lang)}
          </p>
          {summary.groups.length > 0 && (
            <p style={styles.bMemberSub}>
              {t('groups.friendGroupsLabel', { groups: summary.groups.map(g => g.name).join(', ') }, lang)}
            </p>
          )}

          {otherFriends.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <p style={styles.bFriendOfFriendTitle}>{t('groups.friendFriendsListTitle', { name: profile.name }, lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {otherFriends.map(f => {
                  const alreadyFriend = myFriendIds?.has(f.userId) || addedIds.has(f.userId)
                  return (
                    <div key={f.userId} style={styles.bFriendOfFriendRow}>
                      <span style={{ ...styles.bAvatarCircle, width: 26, height: 26 }}>
                        {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : avatarInitialsOf(f.name)}
                      </span>
                      <span style={{ flex: 1, ...styles.bMemberName, fontSize: 12 }}>{f.name}</span>
                      {alreadyFriend ? (
                        <span style={styles.bFriendOfFriendAdded}>{t('groups.alreadyFriends', undefined, lang)}</span>
                      ) : (
                        <button
                          style={styles.bLinkBtn}
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
        <p style={{ ...styles.bEmptyHint, marginTop: 8 }}>{t('groups.friendProfilePrivate', undefined, lang)}</p>
      )}

      <button style={styles.bUnfriendLink} onClick={onUnfriend}>{t('groups.removeFriend', undefined, lang)}</button>
    </div>
  )
}

function StatItemSmall({ value, label }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-0.3px', margin: 0 }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-bento)', fontSize: 9, fontWeight: 700, color: 'var(--bento-t4)', margin: 0 }}>{label}</p>
    </div>
  )
}

const styles = {
  bLinkBtn: { border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  bAvatarCircle: { width: 32, height: 32, flexShrink: 0, borderRadius: 99, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, overflow: 'hidden' },
  bMemberName: { fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  bMemberSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  bEmptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '14px 4px' },
  bFriendPanel: { borderRadius: 20, background: 'var(--bento-line)', padding: '14px 16px', marginBottom: 12 },
  bFriendOfFriendTitle: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  bFriendOfFriendRow: { display: 'flex', alignItems: 'center', gap: 8 },
  bFriendOfFriendAdded: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t4)' },
  bUnfriendLink: { display: 'block', marginTop: 10, border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', cursor: 'pointer' },
}
