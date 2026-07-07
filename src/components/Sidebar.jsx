import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// Navegação lateral exibida só em telas ≥1024px (ver index.css) — substitui
// o AppHeader + BottomNav do layout de celular por uma coluna fixa com logo,
// abas e o usuário logado, no formato comum de dashboards desktop.
const TAB_IDS = ['home', 'prayer', 'journey', 'studies', 'stats', 'profile']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'Compass', studies: 'GraduationCap', stats: 'BarChart3', profile: 'User' }

export default function Sidebar({ activeTab, onNavigate, avatarInitials, userName }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand" onClick={() => onNavigate('home')}>
        <img src="/icons/icon-192.png" alt="" className="sidebar-logo" />
        <span className="sidebar-brand-name">JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
      </div>

      <div className="sidebar-nav">
        {TAB_IDS.map(id => {
          const label = t(`nav.${id}`)
          const active = activeTab === id
          return (
            <button
              key={id}
              className={`sidebar-item ${active ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <AppIcon name={TAB_ICONS[id]} size={18} color={active ? 'var(--or)' : 'var(--g4)'} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      <button className="sidebar-profile" onClick={() => onNavigate('profile')}>
        <div className="sidebar-avatar">{avatarInitials}</div>
        <span className="sidebar-username">{userName}</span>
      </button>
    </nav>
  )
}
