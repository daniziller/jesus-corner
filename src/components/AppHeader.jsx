import NotificationBell from './NotificationBell'
import AppIcon from '../icons/AppIcon'
import BrandMark from './BrandMark'
import BrandLogo from './BrandLogo'
import { t } from '../i18n'

export default function AppHeader({ avatarInitials, avatarUrl, onNavigate, onBack, canGoBack, pendingCount = 0, lang, largeText, onToggleLargeText }) {
  return (
    <div className="app-header" style={styles.header}>
      <div style={styles.leftGroup}>
        {canGoBack && (
          <button
            style={styles.backBtn} onClick={onBack}
            aria-label={t('a11y.goBack', undefined, lang)} title={t('a11y.goBack', undefined, lang)}
          >
            <AppIcon name="ArrowLeft" size={19} color="var(--bk)" />
          </button>
        )}
        <div style={styles.brand} onClick={() => onNavigate?.('home')}>
          {/* Marca nova (quadro 16b, "cabeçalho"): símbolo 34 + logotipo 17/800 −.8px. */}
          <BrandMark size={34} />
          <BrandLogo size={17} letterSpacing="-.8px" />
        </div>
      </div>
      <div style={styles.actions}>
        <button
          style={{ ...styles.iconBtn, ...(largeText ? styles.iconBtnActive : null) }}
          onClick={onToggleLargeText}
          aria-pressed={largeText}
          aria-label={t('a11y.largeTextToggle', undefined, lang)}
          title={t('a11y.largeTextToggle', undefined, lang)}
        >
          <AppIcon name="Type" size={20} color={largeText ? 'var(--brand-deep)' : 'var(--bk)'} />
        </button>
        <NotificationBell pendingCount={pendingCount} onNavigate={onNavigate} lang={lang} variant="header" />
        <div style={styles.avatarSlot}>
          <div style={styles.avatar} onClick={() => onNavigate?.('profile')}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={styles.avatarImg} />
              : avatarInitials
                ? <span style={styles.avatarInitials}>{avatarInitials}</span>
                : <AppIcon name="User" size={12} color="var(--white)" />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Baseado no frame "Header" do Figma (node 1:1595): barra de 64px com
// fundo translúcido + blur e as ações à direita como alvos de toque de
// 44px sem chrome (sem borda/fundo). Wordmark em preto+laranja (mesmo
// tratamento da sidebar desktop — "JESUS'" em --bk, "CORNER" em --or) em
// vez do --brand-deep único do Figma, pra usar só o laranja puro como
// cor de marca/ação (ver separação --grad-primary vs --grad-vivid).
const styles = {
  header:     { alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 20px', flexShrink: 0, background: 'var(--header-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
  leftGroup:  { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  backBtn:    { width: 34, height: 34, marginLeft: -6, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, borderRadius: '50%' },
  brand:      { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 0 },
  logo:       { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  brandName:  { fontSize: 18, fontWeight: 700, lineHeight: '28px', color: 'var(--bk)', letterSpacing: -0.45, whiteSpace: 'nowrap' },
  actions:    { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn:    { width: 44, height: 44, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'opacity .15s' },
  iconBtnActive: { opacity: 1 },
  avatarSlot: { width: 40, height: 32, paddingLeft: 8, flexShrink: 0, boxSizing: 'border-box' },
  avatar:     { width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' },
  avatarInitials: { fontSize: 11, fontWeight: 800, color: 'var(--white)' },
  avatarImg:  { width: '100%', height: '100%', objectFit: 'cover' },
}
