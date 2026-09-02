import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 5 abas — o máximo que cabe com alvos de toque e rótulos legíveis nessa
// largura. "journey" (Bíblia) fica no centro da fileira, com o selo
// elevado, por ser a ação principal do app. À esquerda dela: "home" e
// "routine" ("Meu Plano" — montar o dia antes de agir). À direita:
// "stats" (Progresso) e "groups" (Comunidade).
// O que saiu da barra e onde vive agora:
//  - Notas → botão no topo da aba Bíblia (JourneyScreen) + item em Perfil.
//    As marcações/anotações de leitura são criadas lá dentro.
//  - Estudos → card na aba "Meu Plano" (RoutineScreen) + item em Perfil.
//  - Oração → dentro de "Meu Plano" (é o passo 1 do dia) e do card de
//    rotina da Home.
// Todas continuam navegáveis por navigateTo(), só não ocupam mais um
// slot fixo na barra.
const TAB_IDS = ['home', 'routine', 'journey', 'stats', 'groups']
const TAB_ICONS = { home: 'Home', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', stats: 'BarChart3' }

// A aba Admin não fica mais na nav — vira um item da lista de Configurações
// no Perfil, visível só pra quem tem a permissão (ver ProfileScreen.jsx).
// disabledTabs — a aba nem funciona (idade); fica esmaecida e sem clique.
// lockedTabs — a aba existe mas exige Premium: mostra um cadeadinho e o
// clique é encaminhado normalmente (App.navigateTo leva pra 'upgrade').
export default function BottomNav({ activeTab, onNavigate, groupsHasPending, disabledTabs = [], lockedTabs = [], lang }) {
  return (
    <nav className="bottom-nav">
      {TAB_IDS.map(id => {
        // Passa lang explícito (vem de session.lang, que já atualiza na hora
        // ao trocar idioma) em vez de deixar t() cair no fallback
        // currentLanguage() — esse fallback lê um cache que só é atualizado
        // depois que o Supabase confirma a troca, alguns instantes depois do
        // resto da UI já ter mudado.
        const label = t(`nav.${id}`, undefined, lang)
        const active = activeTab === id
        const disabled = disabledTabs.includes(id)
        const locked = !disabled && lockedTabs.includes(id)
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
              {id === 'groups' && groupsHasPending && !disabled && !locked && <span className="nav-pending-dot" />}
              {locked && (
                <span style={{ position: 'absolute', top: -3, right: -6, width: 13, height: 13, borderRadius: 99, background: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="Lock" size={8} color="white" />
                </span>
              )}
            </span>
            <span className={`nav-label ${featured ? 'nav-label-featured' : ''}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
