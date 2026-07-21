import NotificationBell from './NotificationBell'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

export default function AppHeader({ avatarInitials, avatarUrl, onNavigate, pendingCount = 0, lang, largeText, onToggleLargeText }) {
  return (
    <div className="app-header" style={styles.header}>
      <div style={styles.brand} onClick={() => onNavigate?.('home')}>
        <img src="/icons/icon-192.png" alt="" style={styles.logo} />
        <span style={styles.brandName}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          style={{ ...styles.a11yBtn, ...(largeText ? styles.a11yBtnActive : null) }}
          onClick={onToggleLargeText}
          aria-pressed={largeText}
          aria-label={t('a11y.largeTextToggle', undefined, lang)}
          title={t('a11y.largeTextToggle', undefined, lang)}
        >
          <AppIcon name="Type" size={16} color={largeText ? 'white' : 'var(--g5)'} />
        </button>
        <NotificationBell pendingCount={pendingCount} onNavigate={onNavigate} lang={lang} variant="header" />
        <div style={styles.avatarRing} data-tour="profile-avatar" onClick={() => onNavigate?.('profile')}>
          <div style={styles.avatar}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={styles.avatarImg} /> : avatarInitials}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  header:     { alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0, background: 'var(--white)', borderBottom: '0.5px solid var(--g1)' },
  brand:      { display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  logo:       { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  brandName:  { fontSize: 14, fontWeight: 900, color: 'var(--bk)', letterSpacing: 0.5 },
  avatarRing: { width: 32, height: 32, borderRadius: '50%', padding: 2, background: 'var(--grad-vivid)', cursor: 'pointer', flexShrink: 0 },
  avatar:     { width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', overflow: 'hidden' },
  avatarImg:  { width: '100%', height: '100%', objectFit: 'cover' },
  a11yBtn:    { width: 30, height: 30, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background .15s, border-color .15s' },
  a11yBtnActive: { background: 'var(--grad-vivid)', border: 'none', boxShadow: 'var(--shadow-glow)' },
}
