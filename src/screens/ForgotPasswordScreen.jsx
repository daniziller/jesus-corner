// ForgotPasswordScreen.jsx — Recuperar senha (quadro 13d), pedido e
// confirmação.
//
// Dois estados na mesma tela: o cartão branco com o e-mail + botão laranja
// (pedido) e, depois de enviar, o bloco escuro que os substitui, com o
// contador de reenvio (evita o toque repetido — e o limite do Supabase, que
// rejeita um segundo pedido em menos de ~60s). A nota areia é a promessa que
// o app cumpre: recuperar senha não bloqueia a leitura local.
//
// O e-mail de redefinição do projeto (supabase/email-templates/
// reset-password.html) manda um CÓDIGO de 12 dígitos (com o link como
// alternativa), válido por 1 hora — por isso o texto fala em código, e o
// estado "depois de enviar" traz o cartão pra digitar o código e a senha
// nova (ver resetPassword em authStore.js: verifyOtp type 'recovery').
import { useState, useEffect, useRef } from 'react'
import { requestPasswordReset, resetPassword, isValidPassword } from '../auth/authStore'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { AccountShell, AccountField, AccountPasswordField, AccountPrimaryButton, AccountError, SentCard, formatCountdown, FONT, ui } from './accountUi'

const RESEND_COOLDOWN = 60
const CODE_LENGTH = 12

export default function ForgotPasswordScreen({ onAuthenticated, onBack, onGoLogin }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`account.${k}`, vars, lang)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(intervalRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  async function send(e) {
    e?.preventDefault?.()
    if (loading) return
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setError('')
      setSent(true)
      startCooldown()
    } catch (err) {
      if (err.message === 'rate_limited') {
        // Um código já foi mandado há pouco — segue pro estado "enviado"
        // mesmo assim (o código que está no e-mail continua valendo).
        setError('')
        setSent(true)
        startCooldown()
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (cooldown > 0 || loading) return
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setError('')
    } catch (err) {
      if (err.message !== 'rate_limited') setError(err.message)
    } finally {
      setLoading(false)
      startCooldown()
    }
  }

  async function saveNewPassword(e) {
    e?.preventDefault?.()
    if (loading) return
    if (!isValidPassword(password)) { setError(L('passwordRule')); return }
    setLoading(true)
    try {
      const user = await resetPassword({ email, code, newPassword: password })
      setError('')
      onAuthenticated(user)
    } catch (err) {
      setError(err.message === 'same_as_old_password' ? t('auth.samePasswordError', undefined, lang) : err.message)
    } finally {
      setLoading(false)
    }
  }

  const body = (
    <>
      <div>
        <p style={styles.title}>{L('forgotTitle')}</p>
        <p style={styles.subtitle}>{L('forgotSubtitle')}</p>
      </div>

      {!sent ? (
        <form onSubmit={send} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.card}>
            <AccountField label={L('accountEmailLabel')} type="email" value={email} onChange={setEmail} height={52} autoComplete="email" inputMode="email" autoFocus />
            <AccountError text={error} />
          </div>
          <AccountPrimaryButton type="submit" label={loading ? t('auth.loading', undefined, lang) : L('sendCodeBtn')} disabled={loading} />
        </form>
      ) : (
        <>
          <SentCard
            label={L('afterSending')}
            title={L('codeSentTo', { email: email.trim() })}
            body={L('codeValidity')}
            buttonLabel={cooldown > 0 ? L('resendIn', { time: formatCountdown(cooldown) }) : L('resend')}
            onButton={resend}
            buttonDisabled={cooldown > 0 || loading}
            style={{ marginTop: 4 }}
          />
          <form onSubmit={saveNewPassword} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={styles.card}>
              <AccountField label={L('codeLabel')} value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))} height={52} marginBottom={16} inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} />
              <AccountPasswordField label={L('newPasswordLabel')} value={password} onChange={setPassword} height={52} autoComplete="new-password" hint={L('passwordHint')} />
              <AccountError text={error} />
            </div>
            <AccountPrimaryButton type="submit" label={loading ? t('auth.loading', undefined, lang) : L('saveNewPasswordBtn')} disabled={loading} />
          </form>
        </>
      )}

      <div style={styles.noteCard}>
        <p style={styles.noteText}>{L('forgotNote')}</p>
      </div>
    </>
  )

  const footer = (
    <button type="button" style={{ ...ui.footLink, fontWeight: 700 }} onClick={onGoLogin}>
      {L('backToLoginPrefix')}<span style={ui.footAccent}>{L('backToLoginLink')}</span>
    </button>
  )

  return (
    <AccountShell
      onBack={onBack}
      body={body}
      bodyStyle={{ padding: '26px 20px 0', gap: 10 }}
      footer={footer}
      footerStyle={{ padding: '12px 20px calc(26px + var(--safe-bottom))', textAlign: 'center' }}
    />
  )
}

// Medidas do quadro 13d.
const styles = {
  title: { fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: 0 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  noteCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 18px' },
  noteText: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },
}
