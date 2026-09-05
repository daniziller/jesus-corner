// Reapresentação do consentimento obrigatório — mostrada quando o
// consentimento em vigor está faltando ou é de uma versão anterior da
// política (ver POLICY_VERSION / needsConsentRefresh em
// src/privacy/consent.js). Aparece em dois momentos:
//   1. logo após o login, dentro do AuthScreen (prop `embedded`);
//   2. na abertura do app, pra quem já estava com sessão ativa quando a
//      política mudou de versão (App.jsx, tela cheia).
// A sessão do Supabase já existe nos dois casos — esta tela só decide se o
// app "libera" o acesso (onAccepted) ou desfaz a sessão (onDeclined),
// porque consentimento não pode ser imposto sem alternativa real de recusa.
import { useState } from 'react'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { logout } from '../auth/authStore'
import { recordConsents, PURPOSES } from '../privacy/consent'
import { termsUrl, privacyUrl } from '../utils/legalLinks'

export default function ConsentRefreshScreen({ onAccepted, onDeclined, embedded = false }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToSensitive, setAgreedToSensitive] = useState(false)
  const [agreedToMarketing, setAgreedToMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')
  const lang = getAppLanguage() ?? 'pt'

  async function confirm() {
    if (!agreedToTerms || !agreedToSensitive) { setError(t('auth.mustAgreeToTerms')); return }
    setLoading(true)
    setError('')
    try {
      await recordConsents([
        { purpose: PURPOSES.TERMS, granted: true },
        { purpose: PURPOSES.SENSITIVE_DATA, granted: true },
        { purpose: PURPOSES.MARKETING_EMAIL, granted: agreedToMarketing },
      ], { silent: false })
      onAccepted()
    } catch (err) {
      console.error('Falha ao registrar consentimento', err)
      setError(t('auth.consentRefreshError'))
      setLoading(false)
    }
  }

  async function decline() {
    setDeclining(true)
    await logout().catch(() => {})
    onDeclined()
  }

  const form = (
    <div style={styles.form}>
      <h1 style={styles.title}>{t('auth.consentRefreshTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.consentRefreshBody')}</p>

      <div style={styles.agreeRow}>
        <input type="checkbox" style={styles.agreeCheckbox} checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
        <span style={styles.agreeText}>
          {t('auth.agreeToTermsPrefix')}
          <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.termsLabel')}</a>
          {t('auth.agreeToTermsMiddle')}
          <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.agreeLink}>{t('profile.privacyLabel')}</a>
          {t('auth.agreeToTermsSuffix')}
        </span>
      </div>

      <div style={styles.agreeRow}>
        <input type="checkbox" style={styles.agreeCheckbox} checked={agreedToSensitive} onChange={e => setAgreedToSensitive(e.target.checked)} />
        <span style={styles.agreeText}>{t('auth.agreeToSensitiveData')}</span>
      </div>

      <div style={styles.agreeRow}>
        <input type="checkbox" style={styles.agreeCheckbox} checked={agreedToMarketing} onChange={e => setAgreedToMarketing(e.target.checked)} />
        <span style={styles.agreeText}>{t('auth.agreeToMarketing')}</span>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="button" className="btn-primary" style={{ marginTop: 6 }}
        onClick={confirm} disabled={loading || declining || !agreedToTerms || !agreedToSensitive}
      >
        {loading ? t('auth.loading') : t('onboarding.continueBtn')}
      </button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={decline}>
          {declining ? t('auth.loading') : t('auth.consentRefreshDecline')}
        </span>
      </div>
    </div>
  )

  if (embedded) return form

  return (
    <div style={styles.screen}>
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <BrandMark size={34} variant="plate" style={{ position: 'relative', marginBottom: 0 }} />
        <BrandLogo size={15.5} onDark style={{ position: 'relative' }} />
      </div>
      <div style={styles.sheet}>{form}</div>
    </div>
  )
}

const styles = {
  screen:        { display: 'flex', flexDirection: 'column', height: '100%' },
  hero:          { background: 'var(--bk-hero)', padding: '18px 24px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.5, top: -100, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.32, bottom: -90, left: -50 },
  logo:          { position: 'relative', width: 34, height: 34, borderRadius: 9, boxShadow: '0 6px 14px rgba(0,0,0,.35)', flexShrink: 0 },
  brandName:     { position: 'relative', fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 800, color: 'var(--white)', letterSpacing: 0.5 },
  sheet:         { flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', marginTop: -14, padding: '24px 22px 32px' },
  form:          { display: 'flex', flexDirection: 'column', gap: 12 },
  title:         { fontSize: 25, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  subtitle:      { fontSize: 15.5, fontWeight: 500, color: 'var(--g5)', marginTop: -6, marginBottom: 4, lineHeight: 1.5 },
  error:         { fontSize: 13.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  linksRow:      { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  link:          { fontSize: 13, fontWeight: 700, color: 'var(--or)', cursor: 'pointer' },
  agreeRow:      { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '2px 1px' },
  agreeCheckbox: { width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: 'var(--or)', cursor: 'pointer' },
  agreeText:     { fontSize: 13.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  agreeLink:     { color: 'var(--or)', fontWeight: 700, textDecoration: 'none' },
}
