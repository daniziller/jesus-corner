import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const TAB_IDS = ['home', 'prayer', 'journey', 'groups', 'studies', 'stats']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'Compass', groups: 'Users', studies: 'GraduationCap', stats: 'BarChart3' }

export default function BottomNav({ activeTab, onNavigate, groupsHasPending, groupsDisabled }) {
  return (
    <nav className="bottom-nav" data-tour="nav-tabs">
      {TAB_IDS.map(id => {
        const label = t(`nav.${id}`)
        const active = activeTab === id
        const disabled = id === 'groups' && groupsDisabled
        return (
          <button
            key={id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => !disabled && onNavigate(id)}
            disabled={disabled}
            aria-label={label}
            style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
          >
            <span className="nav-icon" style={{ position: 'relative' }}>
              <AppIcon name={TAB_ICONS[id]} size={20} color={active ? 'var(--or)' : 'var(--g4)'} />
              {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
