import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import NotificationBell from './NotificationBell'

// Navegação lateral exibida só em telas ≥1024px (ver index.css) — substitui
// o AppHeader + BottomNav do layout de celular por uma coluna fixa com logo,
// abas e o usuário logado, no formato comum de dashboards desktop.
const TAB_IDS = ['home', 'prayer', 'journey', 'routine', 'groups', 'studies', 'stats']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'Compass', routine: 'ClipboardList', groups: 'Users', studies: 'GraduationCap', stats: 'BarChart3' }

export default function Sidebar({ activeTab, onNavigate, avatarInitials, avatarUrl, userName, groupsHasPending, groupsDisabled, pendingCount = 0, lang }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => onNavigate('home')}>
          <img src="/icons/icon-192.png" alt="" className="sidebar-logo" />
          <span className="sidebar-brand-name">JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
        </div>
        <NotificationBell pendingCount={pendingCount} onNavigate={onNavigate} lang={lang} variant="sidebar" />
      </div>

      <div className="sidebar-nav" data-tour="nav-tabs">
        {TAB_IDS.map(id => {
          const label = t(`nav.${id}`)
          const active = activeTab === id
          const disabled = id === 'groups' && groupsDisabled
          return (
            <button
              key={id}
              className={`sidebar-item ${active ? 'active' : ''}`}
              onClick={() => !disabled && onNavigate(id)}
              disabled={disabled}
              style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              title={disabled ? t('groups.minAgeRestricted') : undefined}
            >
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <AppIcon name={TAB_ICONS[id]} size={18} color={active ? 'var(--or)' : 'var(--g4)'} />
                {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      <button className="sidebar-profile" data-tour="profile-avatar" onClick={() => onNavigate('profile')}>
        <div className="sidebar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitials}</div>
        <span className="sidebar-username">{userName}</span>
      </button>
    </nav>
  )
}
