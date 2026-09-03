import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 5 abas — o máximo que cabe com alvos de toque e rótulos legíveis nessa
// largura. "journey" (Bíblia) fica no centro da fileira, com o selo
// elevado, por ser a ação principal do app. À esquerda dela: "home" e
// "routine" ("Meu Plano" — montar o dia antes de agir). À direita: "notes"
// (Biblioteca) e "groups" (Comunidade).
// Redesign 1e/etapa 6 — Progresso saiu da barra (decisão confirmada com a
// autora) pra abrir espaço pra Biblioteca: o resumo da semana e o bloco
// atual já aparecem na Home, e o detalhe completo continua a 1 toque dali
// (ver HomeScreen.jsx). Biblioteca (antes só "Notas") reúne notas,
// marcações, sermões e estudos — ver NotesScreen.jsx.
// O que mais saiu da barra e onde vive agora:
//  - Estudos → dentro da própria Biblioteca (não tem slot próprio) + card
//    em "Meu Plano" (RoutineScreen) + item em Perfil.
//  - Oração → dentro de "Meu Plano" (é o passo 1 do dia) e do card de
//    rotina da Home.
// Todas continuam navegáveis por navigateTo(), só não ocupam mais um
// slot fixo na barra.
const TAB_IDS = ['home', 'routine', 'journey', 'notes', 'groups']
const TAB_ICONS = { home: 'Home', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', notes: 'Library' }

// A aba Admin não fica mais na nav — vira um item da lista de Configurações
// no Perfil, visível só pra quem tem a permissão (ver ProfileScreen.jsx).
// disabledTabs — a aba nem funciona (idade); fica esmaecida e sem clique.
// lockedTabs — a aba existe mas exige Premium (App.navigateTo encaminha o
// clique pra 'upgrade'); o cadeado em si NÃO aparece mais aqui (redesign
// 1e — "tirar os cadeados da barra", confirmado com a autora): o gate
// continua ao clicar, só o selo visual saiu, pra barra não anunciar limite
// nenhum antes da pessoa nem ter tentado usar o recurso.
export default function BottomNav({ activeTab, onNavigate, groupsHasPending, disabledTabs = [], lang }) {
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
