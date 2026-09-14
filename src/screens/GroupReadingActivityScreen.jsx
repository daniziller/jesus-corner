// GroupReadingActivityScreen.jsx — 42k "Quem está lendo" (handoff-admin-42,
// Bloco 2). Só o moderador chega aqui (get_group_reading_activity é um RPC
// privilegiado, migration 0066) — os membros nunca têm acesso a esta tela
// (Regra 6.7), e o próprio quadro diz isso na cara ("O que o grupo não
// vê"). "Escrever para os N" manda uma notificação individual por pessoa
// (sino, notifications) — não existe conversa 1:1 no app ainda; ver
// comentário da RPC send_group_encouragement.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getGroupReadingActivity, sendGroupEncouragement } from '../groups/readingActivityStore'

const FONT = 'var(--font-bento)'

function initialsOf(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Junta os nomes em português/inglês correto — "Cláudia, Marcos e Felipe"
// / "Cláudia e Marcos" / "Cláudia" (Regra 4: a frase muda com a contagem).
function joinNames(names, lang) {
  const first = n => (n ?? '').trim().split(/\s+/)[0] ?? ''
  const firsts = names.map(first)
  if (firsts.length === 0) return ''
  if (firsts.length === 1) return firsts[0]
  const and = lang === 'en' ? 'and' : 'e'
  return `${firsts.slice(0, -1).join(', ')} ${and} ${firsts[firsts.length - 1]}`
}

export default function GroupReadingActivityScreen({ session, groupId, onBack }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupReadingActivity.${k}`, vars, lang)

  const [activity, setActivity] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    if (!groupId) return
    getGroupReadingActivity(groupId).then(setActivity)
  }, [groupId])

  if (!activity) {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <BackBtn onBack={onBack} lang={lang} />
        </div>
      </div>
    )
  }

  const onTrack = activity.filter(a => a.status === 'onTrack')
  const behind = activity.filter(a => a.status === 'behind')
  const stopped = activity.filter(a => a.status === 'stopped')
  const sorted = [...activity].sort((a, b) => (b.planDayCount ?? 0) - (a.planDayCount ?? 0))

  function statusColor(status) {
    if (status === 'onTrack') return 'var(--bento-ink)'
    if (status === 'behind') return 'var(--bento-t3)'
    return 'var(--bento-destructive)'
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <BackBtn onBack={onBack} lang={lang} />
        <div>
          <p style={styles.headerTitle}>{L('headerTitle')}</p>
          <p style={styles.headerSub}>{L('headerSub')}</p>
        </div>
      </div>
      <div style={styles.statRow}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>{L('onTrackLabel')}</p>
          <p style={styles.statValue}>{onTrack.length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>{L('behindLabel')}</p>
          <p style={styles.statValue}>{behind.length}</p>
        </div>
        <div style={{ ...styles.statCard, background: 'rgba(240,102,43,.16)' }}>
          <p style={{ ...styles.statLabel, color: 'var(--bento-accent)' }}>{L('stoppedLabel')}</p>
          <p style={{ ...styles.statValue, color: 'var(--bento-accent)' }}>{stopped.length}</p>
        </div>
      </div>

      <div style={styles.body}>
        {stopped.length > 0 && (
          <div style={styles.sandCard}>
            <p style={styles.sandLabel}>{L('stoppedCardLabel')}</p>
            <p style={styles.sandText}>{L('stoppedCardText', { names: joinNames(stopped.map(s => s.name), lang) })}</p>
            <button type="button" style={styles.writeBtn} onClick={() => setComposeOpen(true)}>
              {L(stopped.length === 1 ? 'writeToOneBtn' : 'writeToManyBtn', { n: stopped.length, name: stopped[0]?.name?.trim().split(/\s+/)[0] })}
            </button>
          </div>
        )}

        <div style={styles.card}>
          {sorted.map((m, i) => (
            <div key={m.userId} style={{ ...styles.memberRow, borderBottom: i === sorted.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
              <span style={styles.avatarCircle}>{initialsOf(m.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.memberName}>{m.name}</p>
                <div style={styles.ruler}>
                  {m.daysActiveLast7.map((active, di) => (
                    <span key={di} style={{ ...styles.tick, background: active ? 'var(--bento-ink)' : 'var(--bento-t6)' }} />
                  ))}
                </div>
              </div>
              <span style={{ ...styles.dayLabel, color: statusColor(m.status) }}>{L('dayLabel', { n: m.planDayCount })}</span>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <p style={styles.hiddenLabel}>{L('hiddenCardLabel')}</p>
          <p style={styles.hiddenText}>{L('hiddenCardText')}</p>
        </div>
      </div>

      {composeOpen && (
        <ComposeSheet
          L={L} recipientNames={joinNames(stopped.map(s => s.name), lang)}
          onClose={() => setComposeOpen(false)}
          onSend={message => sendGroupEncouragement(groupId, stopped.map(s => s.userId), message)}
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

function ComposeSheet({ L, recipientNames, onClose, onSend }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      await onSend(message)
      setSent(true)
      setTimeout(onClose, 1100)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div style={styles.sheetBackdrop} onClick={onClose}>
      <div style={styles.sheetPanel} onClick={e => e.stopPropagation()}>
        <p style={styles.sheetTitle}>{L('composeTitle')}</p>
        <p style={styles.sheetSub}>{L('composeSub', { names: recipientNames })}</p>
        {sent ? (
          <p style={styles.sentText}>{L('composeSent')}</p>
        ) : (
          <>
            <textarea style={styles.composeInput} rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder={L('composePlaceholder')} autoFocus />
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="button" style={{ ...styles.sendBtn, ...(sending || !message.trim() ? styles.btnDisabled : {}) }} onClick={handleSend} disabled={sending || !message.trim()}>
              {L('composeSendBtn')}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 18px', background: 'var(--bento-ink)' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '3px 0 0' },

  statRow: { flexShrink: 0, display: 'flex', gap: 8, padding: '14px 20px 20px', background: 'var(--bento-ink)' },
  statCard: { flex: 1, background: 'rgba(255,255,255,.07)', borderRadius: 16, padding: '12px 12px' },
  statLabel: { fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', margin: '0 0 4px' },
  statValue: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },

  sandCard: { background: 'var(--bento-sand)', borderRadius: 22, padding: '18px 18px' },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 8px' },
  sandText: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-sand-ink)', margin: '0 0 14px' },
  writeBtn: { width: '100%', height: 48, border: 'none', borderRadius: 16, background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  card: { background: 'var(--bento-card)', borderRadius: 22, padding: '6px 18px' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 0' },
  avatarCircle: { width: 34, height: 34, borderRadius: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, background: 'var(--bento-line)', color: 'var(--bento-t3)' },
  memberName: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 6px' },
  ruler: { display: 'flex', gap: 3 },
  tick: { width: 14, height: 5, borderRadius: 99 },
  dayLabel: { flexShrink: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800 },

  hiddenLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '10px 0 8px' },
  hiddenText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: '0 0 10px' },

  sheetBackdrop: { position: 'fixed', inset: 0, zIndex: 170, background: 'rgba(26,23,20,.34)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-card)', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, animation: 'bookOpenIn .22s cubic-bezier(.32,.72,0,1)' },
  sheetTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  sheetSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 4px' },
  composeInput: { width: '100%', border: 'none', borderRadius: 14, padding: '12px 14px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', resize: 'none' },
  errorText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },
  sentText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', textAlign: 'center', padding: '10px 0' },
  sendBtn: { width: '100%', height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  btnDisabled: { opacity: .5, cursor: 'default' },
}
