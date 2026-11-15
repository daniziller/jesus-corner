// GrupoPessoas.jsx — as pessoas de um grupo: quem está nele (com o selo de
// moderador), tornar alguém moderador ou tirar a moderação (só quem
// modera) e convidar os amigos que ainda não estão no grupo.
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n'
import Cabecalho from './Cabecalho'
import { e, Esqueleto } from './estilos'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { getFriends } from '../../friends/friendsStore'
import { setMemberRole, inviteFriendToGroup } from '../../groups/groupsStore'
import { plural, invitableFriends } from '../../comunidade/comunidadeMath'

const realApi = { friends: getFriends, setRole: setMemberRole, invite: inviteFriendToGroup }

export default function GrupoPessoas({ lang, groupId, groupName, members, isModerator, myUserId, focusInvite = false, onBack, onChange, api = realApi }) {
  const L = (k, vars) => t(`community.${k}`, vars, lang)
  const [friends, setFriends] = useState(null)
  const [invited, setInvited] = useState([])
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(false)
  const inviteRef = useRef(null)

  useEffect(() => {
    api.friends().then(setFriends).catch(err => { console.error('[grupo] amigos', err); setFriends([]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Vindo do "Convidar" do grupo, a tela já abre na parte de convidar.
  useEffect(() => {
    if (focusInvite && friends) inviteRef.current?.scrollIntoView({ block: 'start' })
  }, [focusInvite, friends])

  async function act(id, action) {
    setBusy(id)
    setFailed(false)
    try {
      await action()
    } catch (err) {
      console.error('[grupo] pessoas', err)
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }
  const changeRole = m => act(m.userId, async () => { await api.setRole(groupId, m.userId, m.role === 'moderator' ? 'member' : 'moderator'); onChange() })
  const invite = f => act(f.userId, async () => { await api.invite(groupId, f.userId); setInvited(list => [...list, f.userId]) })

  const canInvite = invitableFriends(friends, members)

  return (
    <div style={e.screen} data-comunidade="pessoas">
      <Cabecalho lang={lang} title={L('peopleTitle')} sub={`${groupName} · ${t(plural('community.people', members.length).key, { n: members.length }, lang)}`} onBack={onBack} />
      <div style={e.body}>
        <section style={e.listCard} aria-label={L('peopleTitle')}>
          {members.map((m, i) => (
            <div key={m.userId} style={{ ...e.row, ...(i === members.length - 1 ? e.rowLast : null) }} data-pessoa={m.userId}>
              <span aria-hidden="true" style={e.avatar}>{avatarInitialsOf(m.name).slice(0, 1)}</span>
              <span style={e.rowText}>
                <span style={e.rowTitle}>{m.userId === myUserId ? L('you') : m.name}</span>
                {/* O papel vai embaixo do nome: ao lado, com o botão, o nome era cortado. */}
                {m.role === 'moderator' && <span style={e.rowSub}>{L('moderator')}</span>}
              </span>
              {isModerator && m.userId !== myUserId && (
                <button type="button" style={e.textBtn} disabled={busy === m.userId} onClick={() => changeRole(m)}>
                  {L(m.role === 'moderator' ? 'demote' : 'promote')}
                </button>
              )}
            </div>
          ))}
        </section>
        {failed && <p style={e.error} role="alert">{L('actionFailed')}</p>}

        <h2 style={e.label} ref={inviteRef}>{L('inviteFriendsLabel')}</h2>
        {friends === null ? <Esqueleto heights={[124]} /> : canInvite.length === 0 ? (
          <section style={e.card}><p style={e.empty}>{L(friends.length === 0 ? 'inviteNoFriends' : 'inviteAllIn')}</p></section>
        ) : (
          <section style={e.listCard} aria-label={L('inviteFriendsLabel')}>
            {canInvite.map((f, i) => (
              <div key={f.userId} style={{ ...e.row, ...(i === canInvite.length - 1 ? e.rowLast : null) }} data-convidar={f.userId}>
                <span aria-hidden="true" style={{ ...e.avatar, overflow: 'hidden' }}>
                  {f.avatarUrl ? <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarInitialsOf(f.name).slice(0, 1)}
                </span>
                <span style={e.rowText}><span style={e.rowTitle}>{f.name}</span></span>
                {invited.includes(f.userId)
                  ? <p style={{ ...e.rowSub, fontWeight: 700, padding: '0 6px' }}>{L('inviteSent')}</p>
                  : <button type="button" style={e.small} disabled={busy === f.userId} onClick={() => invite(f)}>{L('invite')}</button>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
