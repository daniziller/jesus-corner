// LoginScreen.jsx — Entrar (quadro 13b do redesign Bento).
//
// Cartão branco com e-mail e senha, "Esqueci minha senha" dentro do cartão,
// botão laranja "Entrar" (o único elemento colorido), divisor "ou" e os dois
// botões brancos de Google/Apple (ver loginWithProvider em authStore.js —
// dependem do provedor estar ativado no projeto Supabase). Rodapé
// "Não tem conta? Criar conta" leva ao 13c.
import { useState } from 'react'
import { login, loginWithProvider } from '../auth/authStore'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { AccountShell, AccountField, AccountPasswordField, AccountPrimaryButton, AccountError, FONT, ui } from './accountUi'

export default function LoginScreen({ onAuthenticated, onBack, onGoSignup, onGoForgot }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`account.${k}`, vars, lang)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const user = await login({ email, password })
      setError('')
      onAuthenticated(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function withProvider(provider) {
    setError('')
    try {
      await loginWithProvider(provider)
    } catch (err) {
      setError(err.message === 'provider_unavailable'
        ? L('providerUnavailable', { provider: provider === 'google' ? 'Google' : 'Apple' })
        : err.message)
    }
  }

  const body = (
    <>
      <p style={styles.title}>{L('loginTitle')}</p>
      <p style={styles.subtitle}>{L('loginSubtitle')}</p>

      <form onSubmit={submit} style={{ margin: 0 }}>
        <div style={styles.card}>
          <AccountField label={L('emailLabel')} type="email" value={email} onChange={setEmail} height={52} marginBottom={16} autoComplete="email" inputMode="email" />
          <AccountPasswordField label={L('passwordLabel')} value={password} onChange={setPassword} height={52} autoComplete="current-password" />
          <button type="button" style={styles.forgotLink} onClick={onGoForgot}>{L('forgotLink')}</button>
          <AccountError text={error} />
        </div>
        <AccountPrimaryButton type="submit" label={loading ? t('auth.loading', undefined, lang) : L('loginBtn')} disabled={loading} style={{ margin: '0 0 22px' }} />
      </form>

      <div style={styles.dividerRow}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>{L('or')}</span>
        <div style={styles.dividerLine} />
      </div>

      <div style={styles.providers}>
        <button type="button" style={styles.providerBtn} onClick={() => withProvider('google')}>
          <span style={styles.providerDot} />
          <span style={styles.providerText}>{L('google')}</span>
        </button>
        <button type="button" style={styles.providerBtn} onClick={() => withProvider('apple')}>
          <span style={styles.providerDot} />
          <span style={styles.providerText}>{L('apple')}</span>
        </button>
      </div>
    </>
  )

  const footer = (
    <button type="button" style={{ ...ui.footLink, fontWeight: 600 }} onClick={onGoSignup}>
      {L('noAccount')}<span style={ui.footAccent}>{L('createAccount')}</span>
    </button>
  )

  return (
    <AccountShell
      onBack={onBack}
      body={body}
      bodyStyle={{ padding: '26px 20px 0' }}
      footer={footer}
      footerStyle={{ padding: '0 20px calc(30px + var(--safe-bottom))', textAlign: 'center' }}
    />
  )
}

// Medidas do quadro 13b.
const styles = {
  title: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.3px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '0 0 24px' },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20, margin: '0 0 12px' },
  forgotLink: { display: 'block', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-accent)', margin: '16px 0 0', textAlign: 'left' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 14, margin: '0 0 16px' },
  dividerLine: { flex: 1, height: 1, background: 'var(--bento-divider)' },
  dividerText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },
  providers: { display: 'flex', flexDirection: 'column', gap: 10 },
  providerBtn: { height: 54, borderRadius: 18, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', width: '100%' },
  providerDot: { width: 20, height: 20, borderRadius: 99, background: 'var(--bento-line)', flex: 'none' },
  providerText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)' },
}
