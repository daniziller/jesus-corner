import { useState } from 'react'
import { logout, isValidPassword, needsPasswordChange, changePassword } from '../auth/authStore'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { needsConsentRefresh } from '../privacy/consent'
import ConsentRefreshScreen from './ConsentRefreshScreen'
import LoginScreen from './LoginScreen'
import SignupScreen from './SignupScreen'
import ForgotPasswordScreen from './ForgotPasswordScreen'
import { HAS_AUTH_KEY } from '../auth/hasAuthKey'
import { AccountPasswordField, AccountPrimaryButton, AccountError, FONT, ui } from './accountUi'

// Ver src/auth/hasAuthKey.js — re-exportado porque App.jsx importa daqui.
export { HAS_AUTH_KEY }

// `onBack` — botão de voltar das telas de conta (13b/13c/13d) quando não há
// tela anterior dentro daqui (leva de volta às boas-vindas, ver App.jsx);
// `onContinueWithoutAccount` — "Continuar sem conta" do 13c, segue lendo
// como convidado. `planId`/`chaptersRead` alimentam o cartão areia do 13c.
export default function AuthScreen({ onAuthenticated, initialMode, onBack, onContinueWithoutAccount, planId, chaptersRead = 0 }) {
  // Abre sempre no login (13b): quem nunca autenticou neste aparelho nem
  // chega aqui — vê as boas-vindas e o onboarding (ver App.jsx). O
  // onboarding antigo (11 páginas + cadastro) saiu com o redesign.
  const [mode, setMode] = useState(initialMode ?? 'login') // 'login' | 'signup' | 'forgot' | 'forcePasswordChange' | 'consentRefresh'
  // Guardado durante 'forcePasswordChange'/'consentRefresh': a pessoa já
  // está autenticada no Supabase nesse ponto, só falta o app "liberar" a
  // sessão (chamar onAuthenticated) depois de resolver as pendências.
  const [pendingUser, setPendingUser] = useState(null)

  // Encadeia as checagens pós-login: senha fraca primeiro (mais urgente,
  // segurança da conta), depois consentimento. Cada etapa, ao terminar,
  // chama handleAuthenticated(user) de novo — na segunda passada a
  // pendência que acabou de ser resolvida já não bloqueia mais, então o
  // fluxo naturalmente avança pra próxima checagem (ou libera o app).
  async function handleAuthenticated(user) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HAS_AUTH_KEY, '1')

    // Quem já tinha conta quando a senha deixou de ser um PIN de 6 dígitos
    // (ver migration 0026) precisa trocar antes de continuar.
    const needsPwChange = await needsPasswordChange().catch(() => false)
    if (needsPwChange) {
      setPendingUser(user)
      setMode('forcePasswordChange')
      return
    }

    // Quem se cadastrou agora mesmo já sai com o consentimento em dia (ver
    // SignupStep), então isso na prática só pega quem loga numa conta criada
    // antes desse sistema existir, ou depois de a política mudar de versão.
    const needsRefresh = await needsConsentRefresh().catch(() => false)
    if (needsRefresh) {
      setPendingUser(user)
      setMode('consentRefresh')
      return
    }

    onAuthenticated(user)
  }

  // Telas de conta do redesign Bento (13b/13c/13d) — tela cheia, sem o
  // hero escuro + folha branca de antes.
  if (mode === 'login') {
    return (
      <LoginScreen
        onAuthenticated={handleAuthenticated}
        onBack={onBack}
        onGoSignup={() => setMode('signup')}
        onGoForgot={() => setMode('forgot')}
      />
    )
  }
  if (mode === 'signup') {
    return (
      <SignupScreen
        chaptersRead={chaptersRead}
        planId={planId}
        onAuthenticated={handleAuthenticated}
        onBack={() => setMode('login')}
        onContinueWithoutAccount={onContinueWithoutAccount}
        onGoLogin={() => setMode('login')}
      />
    )
  }
  if (mode === 'forgot') {
    return (
      <ForgotPasswordScreen
        onAuthenticated={handleAuthenticated}
        onBack={() => setMode('login')}
        onGoLogin={() => setMode('login')}
      />
    )
  }

  // 'forcePasswordChange' e 'consentRefresh' — sem quadro próprio no
  // handoff (não são um passo do fluxo normal de conta, só pendências
  // pontuais); usam a mesma casca --bento-bg/coluna central de
  // accountUi.jsx, sem botão de voltar (não há pra onde voltar — sair é a
  // única saída, ver ForceChangePasswordStep/ConsentRefreshScreen).
  return (
    <div style={ui.screen}>
      <div style={{ ...ui.body, padding: '52px 20px 0' }}>
        <div style={{ ...ui.col, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {mode === 'forcePasswordChange' && (
            <ForceChangePasswordStep onDone={() => handleAuthenticated(pendingUser)} />
          )}
          {mode === 'consentRefresh' && (
            <ConsentRefreshScreen
              embedded
              onAccepted={() => onAuthenticated(pendingUser)}
              onDeclined={() => { setPendingUser(null); setMode('login') }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Forçado no login de quem já tinha conta quando a senha deixou de ser um
// PIN de 6 dígitos — ver needsPasswordChange/changePassword em
// src/auth/authStore.js e a migration 0026. Sem opção de recusar (como
// ConsentRefreshScreen tem): isso não é uma escolha de consentimento, é
// segurança da própria conta — mas ainda oferece "Sair" pra quem não quiser
// trocar agora, em vez de prender a pessoa na tela sem saída nenhuma.
function ForceChangePasswordStep({ onDone }) {
  const lang = getAppLanguage() ?? 'pt'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  async function confirmChange() {
    if (password !== confirm) { setError(t('auth.passwordsDontMatch')); return }
    setLoading(true)
    setError('')
    try {
      await changePassword(password)
      onDone()
    } catch (err) {
      setError(err.message === 'same_as_old_password' ? t('auth.samePasswordError') : err.message)
      setLoading(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    await logout().catch(() => {})
    window.location.reload()
  }

  return (
    <>
      <p style={s.title}>{t('auth.forceChangeTitle')}</p>
      <p style={s.subtitle}>{t('auth.forceChangeBody')}</p>

      <AccountPasswordField label={t('auth.newPasswordLabel')} value={password} onChange={setPassword} height={50} marginBottom={16} autoComplete="new-password" hint={t('account.passwordHint', undefined, lang)} />
      <AccountPasswordField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChange={setConfirm} height={50} marginBottom={16} autoComplete="new-password" />

      <AccountError text={error} />

      <AccountPrimaryButton
        label={loading ? t('auth.loading') : t('onboarding.continueBtn')}
        onClick={confirmChange}
        disabled={loading || signingOut || !isValidPassword(password)}
        style={{ margin: '4px 0 0' }}
      />

      <button type="button" style={{ ...ui.footLink, marginTop: 14 }} onClick={signOut} disabled={signingOut}>
        {signingOut ? t('auth.loading') : t('auth.forceChangeSignOut')}
      </button>
    </>
  )
}

const s = {
  title: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '0 0 20px' },
}
