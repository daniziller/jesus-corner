import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// "journey" (Leitura Bíblica) fica centralizada na fileira — é a ação
// principal do app — com o ícone um pouco maior pra se destacar das outras
// abas. "routine" logo depois de "home", pra montar o dia antes de agir.
const TAB_IDS = ['home', 'routine', 'prayer', 'journey', 'groups', 'studies', 'stats']
const TAB_ICONS = { home: 'Home', prayer: 'HandHeart', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', studies: 'GraduationCap', stats: 'BarChart3' }

export default function BottomNav({ activeTab, onNavigate, groupsHasPending, groupsDisabled, lang }) {
  return (
    <nav className="bottom-nav" data-tour="nav-tabs">
      {TAB_IDS.map(id => {
        // Passa lang explícito (vem de session.lang, que já atualiza na hora
        // ao trocar idioma) em vez de deixar t() cair no fallback
        // currentLanguage() — esse fallback lê um cache que só é atualizado
        // depois que o Supabase confirma a troca, alguns instantes depois do
        // resto da UI já ter mudado.
        const label = t(`nav.${id}`, undefined, lang)
        const active = activeTab === id
        const disabled = id === 'groups' && groupsDisabled
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
            <span className="nav-icon" style={{ position: 'relative' }}>
              <AppIcon name={TAB_ICONS[id]} size={featured ? 26 : 20} color={active ? 'var(--or)' : 'var(--g4)'} />
              {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
