import { useState } from 'react'
import { logout, passwordRequirements, isValidPassword, needsPasswordChange, changePassword } from '../auth/authStore'
import { t } from '../i18n'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'
import { getAppLanguage } from '../i18n/appLanguageStore'
import AppIcon from '../icons/AppIcon'
import { needsConsentRefresh } from '../privacy/consent'
import ConsentRefreshScreen from './ConsentRefreshScreen'
import LoginScreen from './LoginScreen'
import SignupScreen from './SignupScreen'
import ForgotPasswordScreen from './ForgotPasswordScreen'
import { HAS_AUTH_KEY } from '../auth/hasAuthKey'

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

  return (
    <div className="auth-screen" style={styles.screen}>
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <BrandMark size={34} variant="plate" style={{ position: 'relative' }} />
        <BrandLogo size={15.5} onDark style={{ position: 'relative' }} />
      </div>

      <div className="auth-sheet" style={styles.sheet}>
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
  )
}

// Forçado no login de quem já tinha conta quando a senha deixou de ser um
// PIN de 6 dígitos — ver needsPasswordChange/changePassword em
// src/auth/authStore.js e a migration 0026. Sem opção de recusar (like
// ConsentRefreshScreen tem): isso não é uma escolha de consentimento, é
// segurança da própria conta — mas ainda oferece "Sair" pra quem não quiser
// trocar agora, em vez de prender a pessoa na tela sem saída nenhuma.
function ForceChangePasswordStep({ onDone }) {
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
    <div style={styles.form}>
      <h1 style={styles.title}>{t('auth.forceChangeTitle')}</h1>
      <p style={styles.subtitle}>{t('auth.forceChangeBody')}</p>

      <PasswordField label={t('auth.newPasswordLabel')} value={password} onChange={setPassword} showRequirements autoComplete="new-password" />
      <PasswordField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="button" className="btn-primary" style={{ marginTop: 6 }}
        onClick={confirmChange} disabled={loading || signingOut || !isValidPassword(password)}
      >
        {loading ? t('auth.loading') : t('onboarding.continueBtn')}
      </button>

      <div style={styles.linksRow}>
        <span style={styles.link} onClick={signOut}>
          {signingOut ? t('auth.loading') : t('auth.forceChangeSignOut')}
        </span>
      </div>
    </div>
  )
}

/* ── Campos reutilizáveis ── */
function Field({ label, value, onChange, type = 'text', placeholder, autoFocus, max, hint }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        style={styles.input}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        max={max}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <span style={styles.fieldHint}>{hint}</span>}
    </label>
  )
}

// Campo de senha de verdade (texto livre, não mais um PIN numérico) — botão
// pra mostrar/ocultar e, quando showRequirements, um checklist ao vivo das 5
// regras (ver passwordRequirements em src/auth/authStore.js). Só os campos
// de CRIAR senha nova mostram o checklist; confirmar e logar não precisam.
function PasswordField({ label, value, onChange, showRequirements, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const reqs = showRequirements ? passwordRequirements(value) : null

  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={styles.passwordInputWrap}>
        <input
          style={{ ...styles.input, paddingRight: 42 }}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
        />
        <button
          type="button"
          style={styles.passwordToggle}
          onClick={() => setVisible(v => !v)}
          aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        >
          <AppIcon name={visible ? 'EyeOff' : 'Eye'} size={17} color="var(--g4)" />
        </button>
      </div>
      {reqs && (
        <div style={styles.passwordChecklist}>
          <PasswordRequirementRow ok={reqs.length} label={t('auth.passwordReqLength')} />
          <PasswordRequirementRow ok={reqs.upper} label={t('auth.passwordReqUpper')} />
          <PasswordRequirementRow ok={reqs.lower} label={t('auth.passwordReqLower')} />
          <PasswordRequirementRow ok={reqs.number} label={t('auth.passwordReqNumber')} />
          <PasswordRequirementRow ok={reqs.special} label={t('auth.passwordReqSpecial')} />
        </div>
      )}
    </label>
  )
}

function PasswordRequirementRow({ ok, label }) {
  return (
    <span style={{ ...styles.passwordReqItem, color: ok ? 'var(--gr)' : 'var(--g4)' }}>
      <AppIcon name={ok ? 'CheckCircle2' : 'Circle'} size={12} color={ok ? 'var(--gr)' : 'var(--g3)'} />
      {label}
    </span>
  )
}

const styles = {
  screen:        { display: 'flex', flexDirection: 'column', height: '100%' },
  hero:          { background: 'var(--bk-hero)', padding: '18px 24px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.5, top: -100, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.32, bottom: -90, left: -50 },
  logo:          { position: 'relative', width: 34, height: 34, borderRadius: 9, boxShadow: '0 6px 14px rgba(0,0,0,.35)', flexShrink: 0 },
  brandName:     { position: 'relative', fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 800, color: 'var(--white)', letterSpacing: 0.5 },
  greeting:      { fontSize: 15, fontWeight: 800, color: 'var(--or)', margin: '2px 0 -6px' },
  sheet:         { flex: 1, overflowY: 'auto', background: 'var(--white)', borderRadius: '20px 20px 0 0', marginTop: -14, padding: '24px 22px 32px' },
  form:          { display: 'flex', flexDirection: 'column', gap: 12 },
  title:         { fontSize: 25, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  subtitle:      { fontSize: 15.5, fontWeight: 500, color: 'var(--g5)', marginTop: -6, marginBottom: 4, lineHeight: 1.5 },
  fieldWrap:     { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel:    { fontSize: 12, fontWeight: 700, color: 'var(--g5)', letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldHint:     { fontSize: 11, fontWeight: 500, color: 'var(--g4)' },
  input:         { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 10, padding: '12px 13px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: 'var(--bk)', outline: 'none', background: 'var(--g1)' },
  pinInput:      { letterSpacing: 6, fontSize: 19, textAlign: 'center' },
  checkCodeBtn:  { flexShrink: 0, border: 'none', borderRadius: 10, padding: '0 16px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'white', cursor: 'pointer', background: 'var(--grad-primary)' },
  checkCodeBtnDisabled: { background: 'var(--g2)', color: 'var(--g5)', cursor: 'default' },
  codeCheckFeedback: { fontSize: 12, fontWeight: 600, lineHeight: 1.4, margin: 0 },
  passwordInputWrap: { position: 'relative', display: 'flex' },
  passwordToggle:    { position: 'absolute', right: 4, top: 0, bottom: 0, width: 36, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  passwordChecklist: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 },
  passwordReqItem:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, transition: 'color .15s' },
  error:         { fontSize: 13.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  resendSuccess: { fontSize: 13.5, fontWeight: 600, color: 'var(--gr)', background: 'var(--grl, rgba(34,197,94,.1))', borderRadius: 8, padding: '8px 10px' },
  resendBtn:     { width: '100%', border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 13, padding: 13, fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: 'var(--bk)', cursor: 'pointer' },
  resendBtnDisabled: { opacity: 0.55, cursor: 'default' },
  linksRow:      { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  link:          { fontSize: 13, fontWeight: 700, color: 'var(--or)', cursor: 'pointer' },
  publicToggleRow:   { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '11px 13px' },
  publicToggleLabel: { fontSize: 13.5, fontWeight: 700, color: 'var(--bk)' },
  publicToggleSub:   { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', marginTop: 2, lineHeight: 1.4 },
  agreeRow:      { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '2px 1px' },
  agreeCheckbox: { width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: 'var(--or)', cursor: 'pointer' },
  agreeText:     { fontSize: 13.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  agreeLink:     { color: 'var(--or)', fontWeight: 700, textDecoration: 'none' },
  welcomeDotsRow:     { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 2 },
  welcomeDot:         { width: 6, height: 6, borderRadius: '50%' },
  tutorialIconWrap:  { width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 2px' },
  stepHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  stepCounter:   { fontSize: 12.5, fontWeight: 700, color: 'var(--g4)' },
  featureScroller: { display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '0 -22px', padding: '2px 22px 4px' },
  featureCard:   { flex: '0 0 84%', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 18, padding: '18px 16px 16px', textAlign: 'center' },
  featureCardImg: { width: '100%', maxWidth: 170, borderRadius: 16, boxShadow: '0 10px 24px rgba(0,0,0,.12)', marginBottom: 4 },
  featureCardIconWrap: { width: 30, height: 30, borderRadius: 9, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  featureCardTitle: { fontSize: 17, fontWeight: 800, color: 'var(--bk)', margin: 0 },
  featureCardDesc:  { fontSize: 14.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: 0 },
  durationSel:   { display: 'flex', flexWrap: 'wrap', gap: 8 },
  durationBtn:   { flex: '1 0 26%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)' },
  durationBtnActive: { border: 'none' },
  durationBtnNum: { fontFamily: 'var(--font-display)', fontSize: 18.5, fontWeight: 800, color: 'inherit' },
  durationBtnUnit: { fontSize: 11.5, fontWeight: 600, color: 'inherit', opacity: 0.75 },
  planSel:       { display: 'flex', gap: 8 },
  choiceCol:     { display: 'flex', flexDirection: 'column', gap: 8 },
  planBtn:       { flex: 1, padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--g6)' },
  planBtnFree:   { width: '100%', padding: '11px 6px', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--g6)' },
  planBtnActive: { border: 'none', color: 'white' },
  sectionCaption: { fontSize: 13, fontWeight: 600, color: 'var(--g5)' },
  previewCard:   { display: 'flex', flexDirection: 'column', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: '14px 16px' },
  previewRow:    { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--g2)' },
  previewIcon:   { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  previewLabel:  { flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--bk)' },
  previewValue:  { fontSize: 14, fontWeight: 600, color: 'var(--g5)' },
  previewTotalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  previewTotalLabel: { fontSize: 15, fontWeight: 800, color: 'var(--bk)' },
  previewTotalValue: { fontSize: 18.5, fontWeight: 900, color: 'var(--or)' },
  aiChip:        { display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', padding: '5px 11px', borderRadius: 999, background: '#FAE8FF', color: '#A21CAF', fontSize: 13, fontWeight: 800, marginBottom: 10 },
  verseChip:     { borderLeft: '3px solid var(--gold)', background: 'var(--olt)', borderRadius: '0 12px 12px 0', padding: '10px 14px', margin: '2px 0 4px' },
  verseChipText: { fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--g6)', margin: 0 },
  verseChipRef:  { fontSize: 12, fontWeight: 800, color: 'var(--brand-deep)', margin: '4px 0 0' },
  mockHighlightText: { fontSize: 14.5, lineHeight: 1.6, color: 'var(--bk)', margin: '2px 0 12px' },
  mockHighlightSpan: { background: 'rgba(201,154,74,.28)', borderRadius: 4, padding: '1px 2px' },
  mockNoteBubble: { fontSize: 13, fontWeight: 600, color: 'var(--g6)', background: 'var(--g1)', borderRadius: 10, padding: '8px 10px' },
  checklistCard: { display: 'flex', flexDirection: 'column', gap: 9, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: '13px 14px' },
  checklistRow:  { display: 'flex', alignItems: 'center', gap: 9 },
  checklistText: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--bk)' },
  planPickerCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: '14px', textAlign: 'center' },
}
