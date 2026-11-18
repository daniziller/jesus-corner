// AddFriendsScreen.jsx — "Amigos" (redesenho da Comunidade, 2026-11):
// procurar alguém, responder aos pedidos de amizade, a lista de amigos com
// o que cada um está lendo, sugestões dos grupos da pessoa e o convite
// pessoal. Aberta pela fileira de amigos da tela inicial da Comunidade.
//
// As regras (quem sugerir, de onde é um pedido, o que a busca envia) são
// de comunidadeMath.js. `api` é trocável na pré-visualização.
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import Cabecalho from '../components/comunidade/Cabecalho'
import { e, Esqueleto } from '../components/comunidade/estilos'
import { FriendProfilePanel } from '../components/FriendProfilePanel'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { deriveProgress, pickActiveBlock, computeOverallStats } from '../utils/progress'
import { getFriends, getPendingRequests, sendFriendRequest, sendFriendRequestByUserId, respondToFriendRequest, removeFriend } from '../friends/friendsStore'
import { getMyGroups, getGroupDetail } from '../groups/groupsStore'
import { getOrCreateMyUsername, inviteLinkFor, sendFriendRequestByUsername } from '../friends/inviteLinkStore'
import { getFriendProgressSummary } from '../profile/profileStore'
import { friendsHeader, friendLine, friendSuggestions, requestOrigin, friendSearch } from '../comunidade/comunidadeMath'

const TONES = ['var(--bento-accent)', 'var(--bento-sand)', 'var(--bento-mark)', 'var(--bento-select)', 'var(--bento-line)']

const realApi = {
  friends: getFriends,
  pending: getPendingRequests,
  // Os grupos da pessoa com os membros de cada um (pras sugestões).
  groups: async () => {
    const groups = await getMyGroups()
    const details = await Promise.all(groups.map(g => getGroupDetail(g.groupId).catch(() => null)))
    return groups.map((g, i) => ({ name: g.name, members: details[i]?.members ?? [] }))
  },
  summary: getFriendProgressSummary,
  respond: respondToFriendRequest,
  requestByEmail: sendFriendRequest,
  requestByUsername: sendFriendRequestByUsername,
  requestByUserId: sendFriendRequestByUserId,
  remove: removeFriend,
  inviteLink: async name => inviteLinkFor(await getOrCreateMyUsername(name)),
}

// O que um amigo de perfil público está lendo: o bloco em andamento e o
// percentual da Bíblia.
function readingOf(summary) {
  if (!summary?.isPublic) return null
  const { blocks } = deriveProgress(new Set(summary.completedKeys), summary.planId)
  const block = pickActiveBlock(blocks)
  return { block: block.name, blockEn: block.nameEn, percent: computeOverallStats(blocks).biblePercent }
}

export default function AddFriendsScreen({ session, authUser, onBack, onChange, api = realApi }) {
  const { lang } = session
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const say = piece => t(piece.key, piece.vars, lang)
  const [friends, setFriends] = useState(null)
  const [pending, setPending] = useState([])
  const [groups, setGroups] = useState([])
  const [summaries, setSummaries] = useState({})
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState({ state: 'idle', message: null }) // 'idle' | 'sending' | 'sent' | 'error'
  const [inviteLink, setInviteLink] = useState(null)
  const [sentIds, setSentIds] = useState([])
  const [openFriendId, setOpenFriendId] = useState(null)
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(false)

  function reload() {
    api.friends().then(setFriends).catch(err => { console.error('[amigos] lista', err); setFriends(list => list ?? []) })
    api.pending().then(setPending).catch(err => console.error('[amigos] pedidos', err))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); api.groups().then(setGroups).catch(err => console.error('[amigos] grupos', err)) }, [])

  // O link pessoal é criado na primeira vez que a tela abre.
  useEffect(() => {
    let alive = true
    api.inviteLink(authUser?.name).then(link => { if (alive) setInviteLink(link) }).catch(err => console.error('[amigos] link', err))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.name])

  // O que cada amigo está lendo chega depois da lista, um por um.
  useEffect(() => {
    let alive = true
    for (const f of friends ?? []) {
      if (summaries[f.userId]) continue
      api.summary(f.userId).then(summary => { if (alive) setSummaries(all => ({ ...all, [f.userId]: summary })) }).catch(() => { if (alive) setSummaries(all => ({ ...all, [f.userId]: { isPublic: false } })) })
    }
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends])

  const friendIds = useMemo(() => new Set((friends ?? []).map(f => f.userId)), [friends])
  const suggestions = friendSuggestions(groups, authUser?.id, friends, pending)

  async function act(id, action) {
    setBusy(id)
    setFailed(false)
    try {
      await action()
    } catch (err) {
      console.error('[amigos] ação', err)
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }
  const respond = (req, accept) => act(req.friendshipId, async () => { await api.respond(req.friendshipId, accept); reload(); onChange?.() })
  const add = sug => act(sug.userId, async () => { await api.requestByUserId(sug.userId); setSentIds(list => [...list, sug.userId]); onChange?.() })
  const unfriend = f => act(f.friendshipId, async () => { await api.remove(f.friendshipId); setOpenFriendId(null); reload(); onChange?.() })

  async function submitSearch(ev) {
    ev.preventDefault()
    const target = friendSearch(query)
    if (!target || search.state === 'sending') return
    setSearch({ state: 'sending', message: null })
    try {
      await (target.by === 'email' ? api.requestByEmail : api.requestByUsername)(target.value)
      setQuery('')
      setSearch({ state: 'sent', message: L(target.by === 'email' ? 'requestSentEmail' : 'requestSent') })
      onChange?.()
      reload()
    } catch (err) {
      setSearch({ state: 'error', message: err.message === 'username_not_found' ? L('usernameNotFound') : err.message === 'rate_limited' ? L('requestRateLimited') : L('requestFailed') })
    }
  }

  // Envia o convite pelo compartilhar do aparelho; sem ele, pelo WhatsApp.
  function shareInvite() {
    const text = L('shareMessage', { link: inviteLink })
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const lineOf = f => {
    const line = friendLine(summaries[f.userId], readingOf(summaries[f.userId]))
    if (!line) return ' '
    return line.key === 'community.friendReading' ? L('friendReading', { block: lang === 'en' ? line.vars.blockEn : line.vars.block, percent: line.vars.percent.toLocaleString(lang === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 }) }) : say(line)
  }

  return (
    <div style={e.screen} data-comunidade="amigos-tela">
      <Cabecalho lang={lang} title={L('friendsTitle')} sub={friends ? friendsHeader(friends.length, pending.length).map(say).join(' · ') : null} onBack={onBack} />
      <div style={e.body}>
        <form onSubmit={submitSearch} style={s.search} role="search">
          <AppIcon name="Search" size={17} strokeWidth={2} color="var(--bento-ink)" />
          <label style={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <span style={s.hidden}>{L('searchLabel')}</span>
            <input className="passo-campo" style={s.searchInput} value={query} onChange={ev => { setQuery(ev.target.value); setSearch({ state: 'idle', message: null }) }} placeholder={L('searchPlaceholder')} autoCapitalize="none" autoComplete="off" />
          </label>
          {query.trim() && (
            <button type="submit" style={s.searchSend} disabled={search.state === 'sending'} aria-label={L('sendRequest')}>
              <AppIcon name="ArrowUp" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
            </button>
          )}
        </form>
        {search.message && <p style={{ ...e.error, ...(search.state === 'sent' ? { color: 'var(--bento-t2)' } : null) }} role={search.state === 'sent' ? 'status' : 'alert'}>{search.message}</p>}

        {pending.length > 0 && (
          <section style={{ ...e.inkCard, gap: 4, padding: '16px 18px 8px' }} aria-label={L('requestsLabel', { n: pending.length })} data-amigos="pedidos">
            <p style={{ ...e.inkLabel, marginBottom: 4 }}>{L(pending.length === 1 ? 'requestsLabelOne' : 'requestsLabel', { n: pending.length })}</p>
            {pending.map((req, i) => (
              <div key={req.friendshipId} style={{ ...s.pendingRow, ...(i === pending.length - 1 ? e.rowLast : null) }}>
                <span aria-hidden="true" style={{ ...e.avatar, width: 40, height: 40, background: 'rgba(255,255,255,.14)', color: '#fff', overflow: 'hidden' }}>
                  {req.avatarUrl ? <img src={req.avatarUrl} alt="" style={s.img} /> : avatarInitialsOf(req.name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...e.rowTitle, color: '#fff' }}>{req.name}</p>
                  <p style={{ ...e.rowSub, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{requestOrigin(req, groups) ? L('fromGroup', { group: requestOrigin(req, groups) }) : L('waitingFriend')}</p>
                </div>
                <button type="button" style={s.decline} disabled={busy === req.friendshipId} onClick={() => respond(req, false)} aria-label={L('declineAria', { title: req.name })}>
                  <AppIcon name="X" size={16} strokeWidth={2.4} color="#fff" />
                </button>
                <button type="button" style={s.accept} disabled={busy === req.friendshipId} onClick={() => respond(req, true)} aria-label={L('acceptAria', { title: req.name })}>{L('accept')}</button>
              </div>
            ))}
          </section>
        )}
        {failed && <p style={e.error} role="alert">{L('actionFailed')}</p>}

        <h2 style={e.label}>{L('yourFriends')}</h2>
        {friends === null ? <Esqueleto heights={[190]} /> : friends.length === 0 ? (
          <section style={e.card}><p style={e.empty}>{L('noFriendsYet')}</p></section>
        ) : (
          <section style={e.listCard} aria-label={L('yourFriends')} data-amigos="lista">
            {friends.map((f, i) => (
              <button key={f.friendshipId} type="button" style={{ ...e.row, ...s.friendRow, ...(i === friends.length - 1 ? e.rowLast : null) }} onClick={() => setOpenFriendId(id => (id === f.userId ? null : f.userId))} aria-expanded={openFriendId === f.userId} data-amigo={f.userId}>
                <span aria-hidden="true" style={{ ...e.avatar, width: 40, height: 40, overflow: 'hidden', background: TONES[i % TONES.length] }}>
                  {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={s.img} /> : avatarInitialsOf(f.name).slice(0, 1)}
                </span>
                <span style={e.rowText}><span style={e.rowTitle}>{f.name}</span><span style={{ ...e.rowSub, minHeight: 15 }}>{lineOf(f)}</span></span>
                <AppIcon name={openFriendId === f.userId ? 'ChevronUp' : 'ChevronRight'} size={15} strokeWidth={2.4} color="var(--bento-t2)" />
              </button>
            ))}
          </section>
        )}
        {(friends ?? []).filter(f => f.userId === openFriendId).map(f => (
          <FriendProfilePanel key={f.userId} friendUserId={f.userId} lang={lang} authUser={authUser} myFriendIds={friendIds} onUnfriend={() => unfriend(f)} onFriendAdded={reload} />
        ))}

        {suggestions.length > 0 && (
          <>
            <h2 style={e.label}>{L('maybeKnow')}</h2>
            <section style={e.listCard} aria-label={L('maybeKnow')} data-amigos="sugestoes">
              {suggestions.map((sug, i) => (
                <div key={sug.userId} style={{ ...e.row, ...(i === suggestions.length - 1 ? e.rowLast : null) }}>
                  <span aria-hidden="true" style={{ ...e.avatar, width: 40, height: 40, background: 'var(--bento-line)' }}>{avatarInitialsOf(sug.name).slice(0, 1)}</span>
                  <span style={e.rowText}><span style={e.rowTitle}>{sug.name}</span><span style={e.rowSub}>{sug.groupName}</span></span>
                  {sentIds.includes(sug.userId)
                    ? <p style={{ ...e.rowSub, fontWeight: 700, padding: '0 6px' }}>{L('requestSentShort')}</p>
                    : <button type="button" style={e.small} disabled={busy === sug.userId} onClick={() => add(sug)}>{L('addFriend')}</button>}
                </div>
              ))}
            </section>
          </>
        )}

        <section style={{ ...e.sandCard, display: 'flex', alignItems: 'center', gap: 12 }} data-amigos="convite">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.inviteTitle}>{L('inviteTitle')}</p>
            <p style={s.inviteText}>{L('inviteText')}</p>
            <p style={s.inviteLink}>{inviteLink ? inviteLink.replace('https://', '') : L('inviteLinkLoading')}</p>
          </div>
          <button type="button" style={{ ...s.inviteBtn, ...(inviteLink ? null : { opacity: 0.45 }) }} disabled={!inviteLink} onClick={shareInvite}>{L('send')}</button>
        </section>

        <p style={s.privacy}>{L('friendsPrivacy')}</p>
      </div>
    </div>
  )
}

const s = {
  search: { flexShrink: 0, height: 50, borderRadius: 17, background: 'var(--bento-card)', padding: '0 6px 0 15px', display: 'flex', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: e.font, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)' },
  searchSend: { width: 44, height: 44, flexShrink: 0, margin: '0 -3px 0 0', border: 'none', borderRadius: 14, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
  pendingRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.1)' },
  decline: { width: 44, height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  accept: { height: 44, flexShrink: 0, border: 'none', borderRadius: 14, background: 'var(--bento-accent)', color: 'var(--bento-ink)', padding: '0 16px', fontFamily: e.font, fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  friendRow: { width: '100%', borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', textAlign: 'left', fontFamily: e.font, cursor: 'pointer', minHeight: 62 },
  inviteTitle: { fontFamily: e.font, fontSize: 14, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 3px' },
  inviteText: { fontFamily: e.font, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },
  inviteLink: { fontFamily: e.font, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-ink-strong)', margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  inviteBtn: { height: 44, flexShrink: 0, border: 'none', borderRadius: 15, background: 'var(--bento-sand-icon)', color: '#fff', padding: '0 16px', fontFamily: e.font, fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  privacy: { fontFamily: e.font, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: '2px 4px 0' },
}
