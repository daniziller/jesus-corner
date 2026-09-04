import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

// 5 abas — o máximo que cabe com alvos de toque e rótulos legíveis nessa
// largura. "journey" (Bíblia) fica no centro da fileira. À esquerda dela:
// "home" ("Hoje") e "routine" ("Meu Plano" — montar o dia antes de agir).
// À direita: "notes" (Biblioteca) e "groups" (Comunidade).
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
//
// Visual: identidade Bento (rodapé dos quadros 3c/4b/4c/5b/5f do
// design_handoff_jesus_corner/Jesus Corner Redesign.dc.html) — barra branca
// de 76px, ícones 20px de traço 1.9, rótulo Manrope 10px; ativo #1A1714,
// inativo #BDB5AC. Sem botão central elevado e sem pílula de fundo: a aba
// ativa se marca só pela cor/peso (medidas em index.css, .bottom-nav).
const TAB_IDS = ['home', 'routine', 'journey', 'notes', 'groups']
// Equivalentes Lucide dos traçados do protótipo: casa, prancheta com
// linhas, livro aberto, capelo (Biblioteca) e pessoas.
const TAB_ICONS = { home: 'Home', routine: 'ClipboardList', journey: 'BookOpen', notes: 'GraduationCap', groups: 'Users' }

// A aba Admin não fica mais na nav — vira um item da lista de Configurações
// no Perfil, visível só pra quem tem a permissão (ver ProfileScreen.jsx).
// disabledTabs — a aba nem funciona (idade); fica esmaecida e sem clique.
// lockedTabs — a aba existe mas exige Premium (App.navigateTo encaminha o
// clique pra 'upgrade'); o cadeado em si NÃO aparece aqui (redesign 1e —
// "tirar os cadeados da barra", confirmado com a autora).
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
              <AppIcon name={TAB_ICONS[id]} size={20} strokeWidth={1.9} color={active ? 'var(--bento-ink)' : 'var(--bento-t5)'} />
              {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
