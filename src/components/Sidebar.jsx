import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import NotificationBell from './NotificationBell'

// Navegação lateral exibida só em telas ≥768px (ver index.css) — substitui
// o AppHeader + BottomNav do layout de celular por uma coluna fixa com logo,
// abas e o usuário logado, no formato comum de dashboards desktop.
// Oração não tem aba própria — mora só dentro de "Meu Plano" (rótulo de
// nav.routine, ver RoutineScreen.jsx), que já é o passo 1 do dia. Plano de
// leitura (antes PlanScreen.jsx, aba à parte) também foi absorvido pela
// mesma tela. Notas (antes só um link em Perfil, ver NotesScreen.jsx)
// agora também é aba própria, logo do lado direito da Bíblia — as
// marcações/anotações de leitura moram lá dentro, então fica perto de
// onde são criadas.
const TAB_IDS = ['home', 'routine', 'stats', 'journey', 'notes', 'studies', 'groups']
const TAB_ICONS = { home: 'Home', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', studies: 'GraduationCap', stats: 'BarChart3', notes: 'StickyNote' }

const a11yBtnStyle = { width: 30, height: 30, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background .15s, border-color .15s' }
const a11yBtnActiveStyle = { background: 'var(--grad-primary)', border: 'none', boxShadow: 'var(--shadow-premium)' }

// Selo com gradiente da marca pra dar mais destaque à aba principal
// (Bíblia) — mesma ideia do círculo elevado no BottomNav mobile, só sem
// a elevação (não faz sentido numa lista vertical).
const sidebarFeaturedIconWrap = { position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: 'var(--grad-vivid)', boxShadow: 'var(--shadow-glow)' }

// A aba Admin não fica mais na nav — vira um item da lista de Configurações
// no Perfil, visível só pra quem tem a permissão (ver ProfileScreen.jsx).
export default function Sidebar({ activeTab, onNavigate, onBack, canGoBack, avatarInitials, avatarUrl, userName, groupsHasPending, disabledTabs = [], pendingCount = 0, lang, largeText, onToggleLargeText }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => onNavigate('home')}>
          <img src="/icons/icon-192.png" alt="" className="sidebar-logo" />
          <span className="sidebar-brand-name">JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{ ...a11yBtnStyle, ...(largeText ? a11yBtnActiveStyle : null) }}
            onClick={onToggleLargeText}
            aria-pressed={largeText}
            aria-label={t('a11y.largeTextToggle', undefined, lang)}
            title={t('a11y.largeTextToggle', undefined, lang)}
          >
            <AppIcon name="Type" size={16} color={largeText ? 'white' : 'var(--g5)'} />
          </button>
          <NotificationBell pendingCount={pendingCount} onNavigate={onNavigate} lang={lang} variant="sidebar" />
        </div>
      </div>

      {/* Botão "Voltar" global — mesma pilha de navegação do AppHeader
          (celular), só que sempre visível como item de lista aqui, já que
          não tem espaço apertado de header pra disputar (ver App.jsx,
          tabHistory/goBack). Só aparece quando há pra onde voltar. */}
      {canGoBack && (
        <button className="sidebar-item" onClick={onBack} style={{ marginBottom: 2 }}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <AppIcon name="ArrowLeft" size={18} color="var(--g4)" />
          </span>
          <span>{t('a11y.goBack', undefined, lang)}</span>
        </button>
      )}

      <div className="sidebar-nav">
        {TAB_IDS.map(id => {
          // lang explícito — ver mesmo comentário em BottomNav.jsx (o
          // fallback currentLanguage() fica um instante atrasado em relação
          // ao resto da UI logo após trocar de idioma).
          const label = t(`nav.${id}`, undefined, lang)
          const active = activeTab === id
          const disabled = disabledTabs.includes(id)
          const featured = id === 'journey'
          // Hoje a única aba que pode estar em disabledTabs é 'groups', e
          // só por idade (assinatura virou granular por recurso, não trava
          // mais aba inteira nenhuma — ver App.jsx).
          const tooltip = t('groups.minAgeRestricted', undefined, lang)
          return (
            <button
              key={id}
              className={`sidebar-item ${active ? 'active' : ''}`}
              onClick={() => !disabled && onNavigate(id)}
              disabled={disabled}
              style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              title={disabled ? tooltip : undefined}
            >
              <span style={featured ? sidebarFeaturedIconWrap : { position: 'relative', display: 'inline-flex' }}>
                <AppIcon name={TAB_ICONS[id]} size={featured ? 17 : 18} color={featured ? 'white' : active ? 'var(--or)' : 'var(--g4)'} />
                {id === 'groups' && groupsHasPending && !disabled && <span className="nav-pending-dot" />}
              </span>
              <span style={featured ? { fontWeight: 700 } : undefined}>{label}</span>
            </button>
          )
        })}
      </div>

      <button className="sidebar-profile" onClick={() => onNavigate('profile')}>
        <div className="sidebar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitials}</div>
        <span className="sidebar-username">{userName}</span>
      </button>
    </nav>
  )
}
