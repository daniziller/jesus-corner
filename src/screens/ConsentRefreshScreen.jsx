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
//
// Sem quadro próprio no handoff — reaproveita as peças de accountUi.jsx
// (13b/13c/13d) em vez de inventar um visual novo. Sem botão "voltar" no
// modo tela cheia (diferente de AccountShell): não existe pra onde voltar
// aqui, "recusar" (que desfaz a sessão) já é a saída.
import { useState } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { logout } from '../auth/authStore'
import { recordConsents, PURPOSES } from '../privacy/consent'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import { AccountPrimaryButton, AccountError, FONT, ui } from './accountUi'

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
    <>
      <p style={s.title}>{t('auth.consentRefreshTitle')}</p>
      <p style={s.subtitle}>{t('auth.consentRefreshBody')}</p>

      <div style={s.card}>
        <label style={s.agreeRow}>
          <input type="checkbox" style={s.agreeCheckbox} checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
          <span style={s.agreeText}>
            {t('auth.agreeToTermsPrefix')}
            <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={s.agreeLink}>{t('profile.termsLabel')}</a>
            {t('auth.agreeToTermsMiddle')}
            <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={s.agreeLink}>{t('profile.privacyLabel')}</a>
            {t('auth.agreeToTermsSuffix')}
          </span>
        </label>

        <label style={{ ...s.agreeRow, borderTop: '1px solid var(--bento-divider)', paddingTop: 14, marginTop: 14 }}>
          <input type="checkbox" style={s.agreeCheckbox} checked={agreedToSensitive} onChange={e => setAgreedToSensitive(e.target.checked)} />
          <span style={s.agreeText}>{t('auth.agreeToSensitiveData')}</span>
        </label>

        <label style={{ ...s.agreeRow, borderTop: '1px solid var(--bento-divider)', paddingTop: 14, marginTop: 14 }}>
          <input type="checkbox" style={s.agreeCheckbox} checked={agreedToMarketing} onChange={e => setAgreedToMarketing(e.target.checked)} />
          <span style={s.agreeText}>{t('auth.agreeToMarketing')}</span>
        </label>
      </div>

      <AccountError text={error} />

      <AccountPrimaryButton
        label={loading ? t('auth.loading') : t('onboarding.continueBtn')}
        onClick={confirm}
        disabled={loading || declining || !agreedToTerms || !agreedToSensitive}
        style={{ margin: '16px 0 0' }}
      />

      <button type="button" style={{ ...ui.footLink, marginTop: 14 }} onClick={decline} disabled={declining}>
        {declining ? t('auth.loading') : t('auth.consentRefreshDecline')}
      </button>
    </>
  )

  if (embedded) return form

  return (
    <div style={ui.screen}>
      <div style={{ ...ui.body, padding: '52px 20px 0' }}>
        <div style={{ ...ui.col, display: 'flex', flexDirection: 'column', flex: 1 }}>{form}</div>
      </div>
    </div>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '0 0 20px' },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 18 },
  agreeRow: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' },
  agreeCheckbox: { width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: 'var(--bento-accent)', cursor: 'pointer' },
  agreeText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)' },
  agreeLink: { color: 'var(--bento-accent)', fontWeight: 700, textDecoration: 'none' },
}
