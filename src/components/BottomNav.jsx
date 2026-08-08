import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// "journey" (Bíblia) fica centralizada na fileira — é a ação principal do
// app — com o ícone um pouco maior pra se destacar das outras abas.
// "routine" logo depois de "home", pra montar o dia antes de agir, seguida
// de Progresso. Depois da Bíblia vem Oração, Estudos, e por último
// Comunidade.
const TAB_IDS = ['home', 'routine', 'stats', 'journey', 'prayer', 'studies', 'groups']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', studies: 'GraduationCap', stats: 'BarChart3', admin: 'Shield' }

export default function BottomNav({ activeTab, onNavigate, groupsHasPending, disabledTabs = [], isAdmin = false, lang }) {
  const tabIds = isAdmin ? [...TAB_IDS, 'admin'] : TAB_IDS
  return (
    <nav className="bottom-nav" data-tour="nav-tabs">
      {tabIds.map(id => {
        // Passa lang explícito (vem de session.lang, que já atualiza na hora
        // ao trocar idioma) em vez de deixar t() cair no fallback
        // currentLanguage() — esse fallback lê um cache que só é atualizado
        // depois que o Supabase confirma a troca, alguns instantes depois do
        // resto da UI já ter mudado.
        const label = t(`nav.${id}`, undefined, lang)
        const active = activeTab === id
        const disabled = disabledTabs.includes(id)
        const featured = id === 'journey'
        return (
          <button
            key={id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => !disabled && onNavigate(id)}
            disabled={disabled}
            aria-label={label}
            style={{ border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
          >
            <span className={`nav-icon ${featured ? 'nav-icon-featured' : ''}`} style={{ position: 'relative' }}>
              <AppIcon name={TAB_ICONS[id]} size={featured ? 22 : 20} color={featured ? 'white' : active ? 'var(--or)' : 'var(--g4)'} />
              {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
            </span>
            <span className={`nav-label ${featured ? 'nav-label-featured' : ''}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
