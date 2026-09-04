import { t } from '../i18n'
import BrandMark from './BrandMark'
import BrandLogo from './BrandLogo'
import AppIcon from '../icons/AppIcon'
import NotificationBell from './NotificationBell'

// Navegação lateral exibida só em telas ≥768px (ver index.css) — substitui
// o AppHeader + BottomNav do layout de celular por uma coluna fixa com logo,
// abas e o usuário logado, no formato comum de dashboards desktop.
// 5 abas, iguais às do BottomNav mobile (ver comentário lá, inclusive a
// troca de Progresso por Biblioteca na etapa 6 do redesign). Oração e
// Estudos não têm slot fixo: vivem dentro de "Meu Plano" (Oração e um card
// de Estudos) e também aparecem como itens em Perfil.
const TAB_IDS = ['home', 'routine', 'journey', 'notes', 'groups']
const TAB_ICONS = { home: 'Home', journey: 'BookOpen', routine: 'ClipboardList', groups: 'Users', notes: 'Library' }

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
          <BrandMark size={34} />
          <BrandLogo size={17} letterSpacing="-.8px" />
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
          const tooltip = disabled ? t('groups.minAgeRestricted', undefined, lang) : undefined
          return (
            <button
              key={id}
              className={`sidebar-item ${active ? 'active' : ''}`}
              onClick={() => !disabled && onNavigate(id)}
              disabled={disabled}
              style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              title={tooltip}
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
