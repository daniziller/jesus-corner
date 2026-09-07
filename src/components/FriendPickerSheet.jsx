// FriendPickerSheet.jsx — folha genérica de multi-seleção de amigos.
// Primeiro uso: "Fazer junto com" (26f, Bloco 12) — quem convidar quando o
// estudo é 'invited'. Sem estado próprio de amizade nenhum: só lista
// getFriends() e devolve os ids escolhidos ao confirmar.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { getFriends } from '../friends/friendsStore'

const FONT = 'var(--font-bento)'

export default function FriendPickerSheet({ lang, initialSelectedIds = [], onClose, onConfirm }) {
  const [friends, setFriends] = useState([])
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds))

  useEffect(() => {
    getFriends().then(setFriends).catch(err => console.error('Failed to load friends', err))
  }, [])

  function toggle(userId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap}><div style={s.handle} /></div>
        <div style={s.header}>
          <p style={s.title}>{t('friendPicker.title', undefined, lang)}</p>
        </div>
        <div style={s.body}>
          {friends.length === 0 ? (
            <p style={s.emptyHint}>{t('friendPicker.emptyHint', undefined, lang)}</p>
          ) : friends.map(f => {
            const on = selected.has(f.userId)
            return (
              <button key={f.userId} type="button" style={s.row} onClick={() => toggle(f.userId)}>
                <div style={s.avatar}>{avatarInitialsOf(f.name)}</div>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)' }}>{f.name}</span>
                <span style={{ ...s.check, ...(on ? s.checkOn : {}) }} />
              </button>
            )
          })}
        </div>
        <div style={s.footer}>
          <button type="button" style={s.confirmBtn} onClick={() => onConfirm?.([...selected], friends.filter(f => selected.has(f.userId)))}>
            {t('friendPicker.confirmBtn', { n: selected.size }, lang)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '80vh', background: 'var(--bento-bg)', borderRadius: '34px 34px 0 0', display: 'flex', flexDirection: 'column' },
  handleWrap: { flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 0 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  header: { flex: 'none', padding: '16px 22px 6px' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 22px' },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: '12px 0' },
  row: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 56, border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  avatar: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: '36px', textAlign: 'center' },
  check: { width: 20, height: 20, borderRadius: 99, border: '2px solid var(--bento-t6)', flexShrink: 0, boxSizing: 'border-box' },
  checkOn: { border: 'none', background: 'var(--bento-accent)' },
  footer: { flex: 'none', padding: '12px 22px calc(20px + var(--safe-bottom))' },
  confirmBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
