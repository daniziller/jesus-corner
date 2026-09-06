// SupplicationCard.jsx — a metade de baixo da Súplica (25a, Bloco 11):
// "Esperando oração" (até 3 pedidos, ver get_supplication_requests na
// migration 0052) + "Fazer um pedido" (abre AddPrayerRequestSheet, 25b).
// Renderizado só quando a etapa em vista é Súplica — ver PrayerScreen.jsx.
import { useState, useEffect, useCallback } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import { avatarInitialsOf } from '../../utils/avatarInitials'
import { formatRelativeTime } from '../../utils/time'
import { getSupplicationRequests, togglePraying, closePrayerRequest } from '../../groups/prayerRequestsStore'
import AddPrayerRequestSheet from './AddPrayerRequestSheet'

export default function SupplicationCard({ lang, authUser, hasAI, onViewAll, onCountChange }) {
  const L = (k, vars) => t(`prayer.${k}`, vars, lang)
  const [requests, setRequests] = useState(null) // null = ainda carregando
  const [addOpen, setAddOpen] = useState(false)

  const reload = useCallback(() => {
    getSupplicationRequests(3).then(list => {
      setRequests(list)
      onCountChange?.(list.length)
    }).catch(err => console.error('Failed to load supplication requests', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { reload() }, [reload])

  function handlePray(request) {
    setRequests(prev => prev.map(r => r.id === request.id
      ? { ...r, prayingByMe: !r.prayingByMe, prayCount: r.prayCount + (r.prayingByMe ? -1 : 1) }
      : r))
    togglePraying(request.id).catch(err => console.error('Failed to toggle praying', err))
  }

  function handleClose(request) {
    if (!window.confirm(L('closeRequestConfirm'))) return
    setRequests(prev => prev.filter(r => r.id !== request.id))
    closePrayerRequest(request.id).catch(err => console.error('Failed to close prayer request', err))
  }

  function whoTag(r) {
    if (r.scope === 'group') return r.groupName
    if (r.scope === 'friends') return L('friendTag')
    return L('personalReminderTag')
  }

  const prayCountLabel = (n) => n === 0 ? L('peoplePrayedZero') : t(n === 1 ? 'prayer.peoplePrayedOne' : 'prayer.peoplePrayedMany', { n }, lang)

  return (
    <>
      <div style={s.card}>
        <div style={s.headRow}>
          <p style={s.label}>{L('waitingTitle', { n: requests?.length ?? 0 })}</p>
          {(requests?.length ?? 0) > 0 && (
            <button type="button" style={s.viewAllBtn} onClick={onViewAll}>{L('viewAllBtn')}</button>
          )}
        </div>

        {requests === null ? null : requests.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>{L('waitingEmptyTitle')}</p>
            <p style={s.emptySub}>{L('waitingEmptySub')}</p>
          </div>
        ) : requests.map((r, i) => {
          const displayName = r.anonymous ? L('anonymousLabel') : r.authorName
          return (
            <div key={r.id} style={{ ...s.row, borderBottom: i === requests.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
              <div style={s.avatar}>{avatarInitialsOf(displayName)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <p style={s.name}>{displayName}</p>
                  <span style={s.tag}>{whoTag(r)} · {formatRelativeTime(r.createdAt, lang)}</span>
                </div>
                <p style={s.reqBody}>{r.body}</p>
                {r.scope === 'only_me' ? (
                  <button type="button" style={s.closeBtn} onClick={() => handleClose(r)}>{L('closeRequestBtn')}</button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      style={{ ...s.prayBtn, ...(r.prayingByMe ? s.prayBtnDone : {}) }}
                      onClick={() => handlePray(r)}
                    >
                      <AppIcon name="Check" size={12} strokeWidth={2.8} color={r.prayingByMe ? 'var(--bento-sand-ink)' : '#fff'} />
                      <span>{r.prayingByMe ? L('prayedByMeBtn') : L('prayedBtn')}</span>
                    </button>
                    <span style={s.countText}>{prayCountLabel(r.prayCount)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" style={s.addRow} onClick={() => setAddOpen(true)}>
        <div style={s.addIcon}><AppIcon name="Plus" size={15} strokeWidth={2.2} color="var(--bento-accent)" /></div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p style={s.addTitle}>{L('addRequestRowTitle')}</p>
          <p style={s.addSub}>{L('addRequestRowSub')}</p>
        </div>
        <span style={s.chevron}>›</span>
      </button>

      {addOpen && (
        <AddPrayerRequestSheet
          lang={lang}
          authUser={authUser}
          hasAI={hasAI}
          onClose={() => setAddOpen(false)}
          onCreated={reload}
        />
      )}
    </>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 4px' },
  headRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 4px' },
  label: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  viewAllBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)' },
  empty: { padding: '10px 0 16px' },
  emptyTitle: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  emptySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: 0 },
  row: { display: 'flex', gap: 12, padding: '12px 0' },
  avatar: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: '34px', textAlign: 'center' },
  name: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  tag: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t5)' },
  reqBody: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: '0 0 10px' },
  prayBtn: { height: 32, padding: '0 14px', flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: '#fff' },
  prayBtnDone: { background: 'var(--bento-sand)', color: 'var(--bento-sand-ink)' },
  countText: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t5)' },
  closeBtn: { height: 32, padding: '0 14px', borderRadius: 11, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  addRow: { width: '100%', borderRadius: 22, background: 'rgba(255,255,255,.6)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 13, border: 'none', cursor: 'pointer' },
  addIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: 11, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  addSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  chevron: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)' },
}
