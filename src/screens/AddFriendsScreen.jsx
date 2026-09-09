// AddFriendsScreen.jsx — "Adicionar amigos" (quadro 24c, Bloco 10). Tela
// própria, alcançada pelo cartão "Amigos" de 24a (GroupsScreen.jsx) e pela
// linha "Amigos e convites" do Perfil. Antes disso, adicionar amigo vivia
// só embutido na lista da Comunidade (FriendsSection) — esta tela reusa a
// mesma lógica de pedidos (friendsStore.js), mas no layout de 24c: pedidos
// primeiro, link de convite pessoal, depois sugestões dos seus grupos.
//
// "Talvez você conheça" (dos seus grupos, não de contatos do telefone —
// aquilo é opcional/pulável no próprio mockup e não foi construído aqui):
// olha os membros de cada grupo que a pessoa já está, tira quem já é amigo
// ou já tem pedido pendente, e sugere o resto.
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { getFriends, getPendingRequests, sendFriendRequest, sendFriendRequestByUserId, respondToFriendRequest, removeFriend } from '../friends/friendsStore'
import { getMyGroups, getGroupDetail } from '../groups/groupsStore'
import { getOrCreateMyUsername, inviteLinkFor, sendFriendRequestByUsername } from '../friends/inviteLinkStore'
import { FriendProfilePanel } from '../components/FriendProfilePanel'

const FONT = 'var(--font-bento)'

export default function AddFriendsScreen({ session, authUser, onBack, onChange }) {
  const { lang } = session
  const L = (k, vars) => t(`addFriends.${k}`, vars, lang)
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [searchError, setSearchError] = useState('')
  const [inviteLink, setInviteLink] = useState(null)
  const [sentIds, setSentIds] = useState(new Set())
  const [showAllFriends, setShowAllFriends] = useState(false)
  const [expandedFriendId, setExpandedFriendId] = useState(null)

  function reload() {
    getFriends().then(setFriends).catch(err => console.error('Failed to load friends', err))
    getPendingRequests().then(setPending).catch(err => console.error('Failed to load friend requests', err))
  }

  useEffect(() => { reload() }, [])

  // Link pessoal — gerado (username incluso) na primeira vez que a tela
  // abre, não antes; ver getOrCreateMyUsername em inviteLinkStore.js.
  useEffect(() => {
    let cancelled = false
    getOrCreateMyUsername(authUser?.name).then(username => {
      if (!cancelled) setInviteLink(inviteLinkFor(username))
    }).catch(err => console.error('Failed to create invite link', err))
    return () => { cancelled = true }
  }, [authUser?.name])

  // Sugestões dos grupos — junta os membros de todo grupo que a pessoa está,
  // tira ela mesma, quem já é amigo e quem já tem pedido pendente (dos dois
  // lados), e agrupa por nome do primeiro grupo em comum encontrado.
  useEffect(() => {
    let cancelled = false
    getMyGroups().then(async groups => {
      const details = await Promise.all(groups.map(g => getGroupDetail(g.groupId).catch(() => null)))
      if (cancelled) return
      const byUser = new Map()
      details.forEach((detail, i) => {
        if (!detail) return
        for (const m of detail.members ?? []) {
          if (m.userId === authUser?.id) continue
          if (!byUser.has(m.userId)) byUser.set(m.userId, { userId: m.userId, name: m.name, groupName: groups[i].name })
        }
      })
      setSuggestions([...byUser.values()])
    }).catch(err => console.error('Failed to load group suggestions', err))
    return () => { cancelled = true }
  }, [authUser?.id])

  const friendIds = useMemo(() => new Set(friends.map(f => f.userId)), [friends])
  const pendingIds = useMemo(() => new Set(pending.map(p => p.userId)), [pending])
  const visibleSuggestions = suggestions.filter(s => !friendIds.has(s.userId) && !pendingIds.has(s.userId)).slice(0, 6)

  async function respond(friendshipId, accept) {
    await respondToFriendRequest(friendshipId, accept)
    reload()
    onChange?.()
  }

  async function unfriend(friendshipId) {
    await removeFriend(friendshipId)
    setExpandedFriendId(null)
    reload()
  }

  // Busca única: se parece e-mail, manda convite/pedido por e-mail
  // (sendFriendRequest já cobre os dois casos); senão, trata como
  // @username (sendFriendRequestByUsername). Telefone fica de fora —
  // buscar contato do aparelho é opcional no próprio mockup.
  async function submitSearch(e) {
    e.preventDefault()
    const clean = query.trim()
    if (!clean || searchState === 'sending') return
    setSearchState('sending')
    setSearchError('')
    try {
      if (clean.includes('@') && clean.includes('.')) {
        await sendFriendRequest(clean)
      } else {
        await sendFriendRequestByUsername(clean.replace(/^@/, ''))
      }
      setQuery('')
      setSearchState('sent')
      onChange?.()
      reload()
    } catch (err) {
      setSearchState('error')
      setSearchError(err.message === 'username_not_found' ? L('usernameNotFound') : err.message)
    }
  }

  async function addSuggestion(userId) {
    setSentIds(prev => new Set(prev).add(userId))
    try {
      await sendFriendRequestByUserId(userId)
      onChange?.()
    } catch (err) {
      console.error('Failed to send friend request', err)
    }
  }

  async function shareInvite() {
    if (!inviteLink) return
    const text = L('shareMessage', { link: inviteLink })
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
      return
    }
    try { await navigator.clipboard.writeText(inviteLink) } catch { /* sem clipboard — link já está visível na tela */ }
  }

  const whatsappHref = inviteLink
    ? `https://wa.me/?text=${encodeURIComponent(L('shareMessage', { link: inviteLink }))}`
    : null

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{L('title')}</p>
      </div>

      <div style={s.searchWrap}>
        <form onSubmit={submitSearch} style={s.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input
            style={s.searchInput} value={query} onChange={e => { setQuery(e.target.value); setSearchState('idle') }}
            placeholder={L('searchPlaceholder')}
          />
          {query.trim() && (
            <button type="submit" style={s.searchSend} disabled={searchState === 'sending'} aria-label={L('send')}>
              <AppIcon name="ArrowUp" size={14} color="#fff" />
            </button>
          )}
        </form>
        {searchState === 'sent' && <p style={s.searchHint}>{L('requestSent')}</p>}
        {searchState === 'error' && <p style={{ ...s.searchHint, color: 'var(--bento-accent)' }}>{searchError}</p>}
      </div>

      <div style={s.body}>
        {pending.length > 0 && (
          <div style={s.pendingCard}>
            <p style={s.pendingLabel}>{L(pending.length === 1 ? 'wantsToFollowOne' : 'wantsToFollowMany', { n: pending.length })}</p>
            {pending.map((req, i) => (
              <div key={req.friendshipId} style={{ ...s.pendingRow, borderBottom: i === pending.length - 1 ? 'none' : '1px solid rgba(255,255,255,.09)' }}>
                <span style={s.pendingAvatar}>{avatarInitialsOf(req.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.pendingName}>{req.name}</p>
                  <p style={s.pendingSub}>{L('friendRequestReceived')}</p>
                </div>
                <button type="button" style={s.acceptBtn} onClick={() => respond(req.friendshipId, true)}>{L('accept')}</button>
                <button type="button" style={s.declineBtn} onClick={() => respond(req.friendshipId, false)} aria-label={L('decline')}>
                  <AppIcon name="X" size={13} strokeWidth={2.4} color="rgba(255,255,255,.6)" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={s.linkCard}>
          <div style={s.linkIcon}><AppIcon name="Share2" size={16} strokeWidth={2} color="var(--bento-sand-icon)" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.linkTitle}>{L('shareMyInvite')}</p>
            <p style={s.linkUrl}>{inviteLink ? inviteLink.replace('https://', '') : L('generatingLink')}</p>
          </div>
          <button type="button" style={s.linkSendBtn} onClick={shareInvite} disabled={!inviteLink}>{L('send')}</button>
        </div>

        {(visibleSuggestions.length > 0 || friends.length > 0) && (
          <div style={s.suggestCard}>
            {visibleSuggestions.length > 0 && (
              <div style={s.suggestHeadRow}>
                <p style={s.suggestLabel}>{L('maybeKnow')}</p>
                <span style={s.suggestHint}>{L('fromYourGroups')}</span>
              </div>
            )}
            {visibleSuggestions.map((sug, i) => (
              <div key={sug.userId} style={{ ...s.suggestRow, borderBottom: i === visibleSuggestions.length - 1 && friends.length === 0 ? 'none' : '1px solid var(--bento-line)' }}>
                <span style={s.suggestAvatar}>{avatarInitialsOf(sug.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.suggestName}>{sug.name}</p>
                  <p style={s.suggestSub}>{sug.groupName}</p>
                </div>
                <button type="button" style={{ ...s.suggestAddBtn, ...(sentIds.has(sug.userId) ? s.suggestAddBtnDone : {}) }} disabled={sentIds.has(sug.userId)} onClick={() => addSuggestion(sug.userId)}>
                  {sentIds.has(sug.userId) ? L('sent') : L('add')}
                </button>
              </div>
            ))}
            {friends.length > 0 && (
              <button type="button" style={s.viewAllRow} onClick={() => setShowAllFriends(v => !v)}>
                <span style={s.viewAllText}>{L('viewAllFriends', { n: friends.length })}</span>
                <AppIcon name={showAllFriends ? 'ChevronUp' : 'ChevronRight'} size={14} color="var(--bento-t5)" />
              </button>
            )}
          </div>
        )}

        {showAllFriends && friends.length > 0 && (
          <>
            <div style={s.friendsGrid}>
              {friends.map(f => {
                const expanded = expandedFriendId === f.userId
                return (
                  <button
                    key={f.friendshipId}
                    type="button"
                    style={s.friendGridItem}
                    onClick={() => setExpandedFriendId(expanded ? null : f.userId)}
                  >
                    <div style={{ ...s.friendGridAvatar, ...(expanded ? s.friendGridAvatarActive : {}) }}>
                      {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : avatarInitialsOf(f.name)}
                    </div>
                    <span style={s.friendGridName}>{f.name}</span>
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
                myFriendIds={friendIds}
                onUnfriend={() => unfriend(f.friendshipId)}
                onFriendAdded={reload}
              />
            ))}
          </>
        )}

        <p style={s.privacyNote}>{L('privacyNote')}</p>
      </div>

      <div style={s.footer}>
        <a
          style={{ ...s.whatsappBtn, ...(whatsappHref ? {} : { opacity: .5, pointerEvents: 'none' }) }}
          href={whatsappHref ?? '#'} target="_blank" rel="noopener noreferrer"
        >
          <AppIcon name="MessageCircle" size={17} color="var(--bento-accent)" />
          <span>{L('inviteWhatsapp')}</span>
        </a>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },

  searchWrap: { flex: 'none', padding: '0 20px 10px' },
  searchRow: { height: 46, borderRadius: 16, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--bento-ink)' },
  searchSend: { width: 28, height: 28, flexShrink: 0, borderRadius: 9, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  searchHint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', margin: '8px 4px 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  pendingCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  pendingLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 14px' },
  pendingRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' },
  pendingAvatar: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, background: 'var(--bento-sand)', color: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: '38px', textAlign: 'center' },
  pendingName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 3px' },
  pendingSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.45)', margin: 0 },
  acceptBtn: { height: 32, padding: '0 12px', borderRadius: 11, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer', flexShrink: 0 },
  declineBtn: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  linkCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  linkIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 3px' },
  linkUrl: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-sand-label)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  linkSendBtn: { height: 34, padding: '0 14px', flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-sand)', cursor: 'pointer' },

  suggestCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 8px' },
  suggestHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 4px' },
  suggestLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  suggestHint: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t5)' },
  suggestRow: { display: 'flex', alignItems: 'center', gap: 12, height: 58 },
  suggestAvatar: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: '38px', textAlign: 'center' },
  suggestName: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  suggestSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  suggestAddBtn: { height: 32, padding: '0 14px', flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  suggestAddBtnDone: { background: 'var(--bento-line)', color: 'var(--bento-t3)', cursor: 'default' },
  viewAllRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, height: 48, border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  viewAllText: { flex: 1, textAlign: 'left', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)' },

  friendsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderRadius: 24, background: 'var(--bento-card)', padding: 18 },
  friendGridItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  friendGridAvatar: { width: 48, height: 48, borderRadius: 16, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: '48px', textAlign: 'center', overflow: 'hidden' },
  friendGridAvatarActive: { outline: '2px solid var(--bento-accent)' },
  friendGridName: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 },

  privacyNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t4)', margin: '2px 0 0' },

  footer: { flex: 'none', padding: '14px 20px calc(20px + var(--safe-bottom))' },
  whatsappBtn: { height: 54, borderRadius: 18, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff' },
}
