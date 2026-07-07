import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const TAB_IDS = ['home', 'prayer', 'journey', 'studies', 'stats', 'profile']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'Compass', studies: 'GraduationCap', stats: 'BarChart3', profile: 'User' }

export default function BottomNav({ activeTab, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {TAB_IDS.map(id => {
        const label = t(`nav.${id}`)
        const active = activeTab === id
        return (
          <button
            key={id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-label={label}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-icon"><AppIcon name={TAB_ICONS[id]} size={20} color={active ? 'var(--or)' : 'var(--g4)'} /></span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
