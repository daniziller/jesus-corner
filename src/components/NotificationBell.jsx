// Sino de notificações — reaproveitado tanto no AppHeader (celular) quanto
// na Sidebar (desktop). Ao clicar, mostra uma prévia: pedidos de amizade e
// convites de grupo pendentes (acionáveis — clicar leva pra Comunidade,
// onde dá pra responder) e a atividade recente dos amigos (só informativa,
// não é clicável — "permanece sem ser clicada", como pedido).
import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ActivityFeedItem from './ActivityFeedItem'
import { getPendingRequests } from '../friends/friendsStore'
import { getPendingGroupInvites } from '../groups/groupsStore'
import { getFriendsActivity } from '../activity/activityStore'

export default function NotificationBell({ pendingCount, onNavigate, lang, variant = 'header' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState([])
  const [invites, setInvites] = useState([])
  const [activity, setActivity] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([getPendingRequests(), getPendingGroupInvites(), getFriendsActivity(5)])
      .then(([r, i, a]) => { setRequests(r); setInvites(i); setActivity(a) })
      .catch(err => console.error('Failed to load notification preview', err))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function goToCommunity() {
    setOpen(false)
    onNavigate?.('groups')
  }

  const isEmpty = !loading && requests.length === 0 && invites.length === 0 && activity.length === 0
  const panelStyle = variant === 'sidebar'
    ? { ...styles.panel, top: 38, left: 0 }
    : { ...styles.panel, top: 38, right: 0 }

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <button style={styles.bellBtn} onClick={() => setOpen(v => !v)} aria-label={t('notifications.title', undefined, lang)}>
        <AppIcon name="Bell" size={variant === 'sidebar' ? 17 : 19} color="var(--g5)" />
        {pendingCount > 0 && (
          <span style={styles.bellBadge}>{pendingCount > 9 ? '9+' : pendingCount}</span>
        )}
      </button>

      {open && (
        <div style={panelStyle}>
          <p style={styles.panelTitle}>{t('notifications.title', undefined, lang)}</p>

          {loading && <p style={styles.emptyHint}>{t('groups.loading', undefined, lang)}</p>}

          {isEmpty && <p style={styles.emptyHint}>{t('notifications.empty', undefined, lang)}</p>}

          {(requests.length > 0 || invites.length > 0) && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>{t('notifications.actionableTitle', undefined, lang)}</p>
              {requests.map(r => (
                <button key={r.friendshipId} style={styles.item} onClick={goToCommunity}>
                  <div style={styles.itemAvatar}>
                    {r.avatarUrl
                      ? <img src={r.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <AppIcon name="UserPlus" size={14} color="var(--or)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.itemText}>
                      <strong>{r.name}</strong> {t('groups.friendRequestReceived', undefined, lang)}
                    </p>
                  </div>
                  <AppIcon name="ChevronRight" size={14} color="var(--g4)" />
                </button>
              ))}
              {invites.map(inv => (
                <button key={inv.groupId} style={styles.item} onClick={goToCommunity}>
                  <div style={{ ...styles.itemIcon, background: 'var(--olt)' }}>
                    <AppIcon name="Users" size={14} color="var(--or)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.itemText}>
                      <strong>{inv.groupName}</strong> — {t('groups.invitedBy', { name: inv.invitedByName }, lang)}
                    </p>
                  </div>
                  <AppIcon name="ChevronRight" size={14} color="var(--g4)" />
                </button>
              ))}
            </div>
          )}

          {activity.length > 0 && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>{t('notifications.activityTitle', undefined, lang)}</p>
              {activity.map(a => (
                <div key={a.id} style={styles.infoItem}>
                  <ActivityFeedItem activity={a} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  bellBtn:    { position: 'relative', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 },
  bellBadge:  { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--re)', color: 'white', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid white' },
  panel:      { position: 'absolute', width: 320, maxWidth: '85vw', maxHeight: 420, overflowY: 'auto', background: 'white', border: '0.5px solid var(--g2)', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,.15)', padding: 12, zIndex: 50 },
  panelTitle: { fontSize: 13, fontWeight: 800, color: 'var(--bk)', marginBottom: 8 },
  emptyHint:  { fontSize: 11.5, fontWeight: 500, color: 'var(--g4)', padding: '10px 2px' },
  section:    { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 },
  sectionLabel: { fontSize: 9.5, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.5, textTransform: 'uppercase', margin: '6px 2px 2px' },
  item:       { display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: 'none', borderRadius: 10, padding: '8px 6px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  itemIcon:   { width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  itemAvatar: { width: 26, height: 26, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--olt)' },
  itemText:   { fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.4 },
  infoItem:   { padding: '8px 6px', cursor: 'default' },
}
