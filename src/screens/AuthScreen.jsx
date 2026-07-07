import { useState } from 'react'
import { signup, login, requestPasswordReset, resetPassword } from '../auth/authStore'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'

  return (
    <div style={styles.screen}>
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <img src="/icons/icon-192.png" alt="" style={styles.logo} />
        <span style={styles.brandName}>JESUS' <span style={{ color: 'var(--or)' }}>CORNER</span></span>
        <span style={styles.brandTagline}>{t('auth.tagline')}</span>
      </div>

      <div style={styles.sheet}>
        {mode === 'login'  && <LoginView    onAuthenticated={onAuthenticated} onGoSignup={() => setMode('signup')} onGoForgot={() => setMode('forgot')} />}
        {mode === 'signup' && <SignupView   onAuthenticated={onAuthenticated} onGoLogin={() => setMode('login')} />}
        {mode === 'forgot' && <ForgotView   onAuthenticated={onAuthenticated} onGoLogin={() => setMode('login')} />}
      </div>
    </div>
  )
}

/* ── Login ── */
function LoginView({ onAuthenticated, onGoSignup, onGoForgot }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e) {
    e.preventDefault()
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

  return (
    <form style={styles.form} onSubmit={submit}>
      <h1 style={styles.title}>{t('auth.loginTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.loginSubtitle')}</p>

      <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
      <PinField label={t('auth.passwordLabel')} value={password} onChange={setPassword} />

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitLogin')}</button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={onGoForgot}>{t('auth.forgotPassword')}</span>
        <span style={styles.link} onClick={onGoSignup}>{t('auth.createAccount')}</span>
      </div>
    </form>
  )
}

/* ── Cadastro ── */
function SignupView({ onAuthenticated, onGoLogin }) {
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  // Preenchido só quando o projeto exige confirmação de email — nesse caso a
  // conta foi criada mas ainda não existe sessão, então não dá pra tratar
  // como logado (ver needsEmailConfirmation em authStore.signup).
  const [confirmationEmail, setConfirmationEmail] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'))
      return
    }
    setLoading(true)
    try {
      // O idioma já foi escolhido na tela inicial do app (ver LanguageSelectScreen);
      // a conta nasce nesse mesmo idioma, ajustável depois no Perfil.
      const user = await signup({ name, email, password, language: getAppLanguage() ?? 'pt' })
      setError('')
      if (user.needsEmailConfirmation) {
        setConfirmationEmail(user.email)
      } else {
        onAuthenticated(user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (confirmationEmail) {
    return (
      <div style={styles.form}>
        <h1 style={styles.title}>{t('auth.confirmEmailTitle')}</h1>
        <p style={styles.subtitle}>{t('auth.confirmEmailSubtitle', { email: confirmationEmail })}</p>
        <button type="button" className="btn-primary" style={{ marginTop: 6 }} onClick={onGoLogin}>{t('auth.backToLogin')}</button>
      </div>
    )
  }

  return (
    <form style={styles.form} onSubmit={submit}>
      <h1 style={styles.title}>{t('auth.signupTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.signupSubtitle')}</p>

      <Field label={t('auth.nameLabel')} value={name} onChange={setName} placeholder={t('auth.namePlaceholder')} autoFocus />
      <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
      <PinField label={t('auth.createPasswordLabel')} value={password} onChange={setPassword} />
      <PinField label={t('auth.confirmPasswordLabel')} value={confirm} onChange={setConfirm} />

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitSignup')}</button>

      <div style={styles.linksRow}>
        <span />
        <span style={styles.link} onClick={onGoLogin}>{t('auth.alreadyHaveAccount')}</span>
      </div>
    </form>
  )
}

/* ── Esqueci a senha ── */
function ForgotView({ onAuthenticated, onGoLogin }) {
  const [step, setStep]           = useState('request') // 'request' | 'reset'
  const [email, setEmail]         = useState('')
  const [code, setCode]           = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function submitRequest(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setError('')
      setStep('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'))
      return
    }
    setLoading(true)
    try {
      const user = await resetPassword({ email, code, newPassword: password })
      setError('')
      onAuthenticated(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'request') {
    return (
      <form style={styles.form} onSubmit={submitRequest}>
        <h1 style={styles.title}>{t('auth.forgotTitle')}</h1>
        <p style={styles.subtitle}>{t('auth.forgotSubtitle')}</p>

        <Field label={t('auth.emailLabel')} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitSendCode')}</button>

        <div style={styles.linksRow}>
          <span />
          <span style={styles.link} onClick={onGoLogin}>{t('auth.backToLogin')}</span>
        </div>
      </form>
    )
  }

  return (
    <form style={styles.form} onSubmit={submitReset}>
      <h1 style={styles.title}>{t('auth.resetTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.resetSubtitle', { email })}</p>

      <PinField label={t('auth.codeLabel')} value={code} onChange={setCode} length={12} />
      <PinField label={t('auth.newPasswordLabel')} value={password} onChange={setPassword} />
      <PinField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChange={setConfirm} />

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>{loading ? t('auth.loading') : t('auth.submitReset')}</button>

      <div style={styles.linksRow}>
        <span />
        <span style={styles.link} onClick={onGoLogin}>{t('auth.backToLogin')}</span>
      </div>
    </form>
  )
}

/* ── Campos reutilizáveis ── */
function Field({ label, value, onChange, type = 'text', placeholder, autoFocus }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        style={styles.input}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

// length é 6 por padrão (nossa própria senha numérica), mas o código de
// verificação por email é gerado pelo Supabase — o tamanho dele é definido
// nas configurações do projeto, não pelo app, então não dá pra travar em 6.
function PinField({ label, value, onChange, length = 6 }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        style={{ ...styles.input, ...styles.pinInput }}
        type="password"
        inputMode="numeric"
        maxLength={length}
        placeholder={'•'.repeat(length)}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
      />
    </label>
  )
}

const styles = {
  screen:        { display: 'flex', flexDirection: 'column', height: '100%' },
  hero:          { background: '#141414', padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: '#F97316', filter: 'blur(70px)', opacity: 0.5, top: -80, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#EC4899', filter: 'blur(70px)', opacity: 0.32, bottom: -70, left: -50 },
  logo:          { position: 'relative', width: 60, height: 60, borderRadius: 15, marginBottom: 10, boxShadow: '0 10px 24px rgba(0,0,0,.35)' },
  brandName:     { position: 'relative', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1 },
  brandTagline:  { position: 'relative', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: 0.2, textAlign: 'center', maxWidth: 240 },
  sheet:         { flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', marginTop: -14, padding: '24px 22px 32px' },
  form:          { display: 'flex', flexDirection: 'column', gap: 12 },
  title:         { fontSize: 21, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  subtitle:      { fontSize: 12, fontWeight: 500, color: 'var(--g5)', marginTop: -6, marginBottom: 4, lineHeight: 1.5 },
  fieldWrap:     { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel:    { fontSize: 10.5, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  input:         { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '12px 13px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)' },
  pinInput:      { letterSpacing: 6, fontSize: 16, textAlign: 'center' },
  error:         { fontSize: 11, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  linksRow:      { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  link:          { fontSize: 11.5, fontWeight: 700, color: 'var(--or)', cursor: 'pointer' },
}
