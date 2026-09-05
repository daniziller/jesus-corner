// SignupScreen.jsx — Criar conta, depois de já ter lido (quadro 13c).
//
// Aparece pela primeira vez quando a pessoa termina a primeira leitura como
// convidada (ver o gate em App.jsx e src/onboarding/guestInviteStore.js) e
// também pelo "Criar conta" da tela de entrar (13b). O cartão areia mostra o
// que vai para a conta — é o argumento, e só funciona porque a pessoa já
// leu. Consentimento e idade mínima ficam aqui, não antes da leitura.
// "Continuar sem conta" nunca desaparece: o progresso já está salvo neste
// aparelho (userDataStore.js), a conta só o leva para outros.
import { useState, useEffect, useRef } from 'react'
import { signup, resendConfirmationEmail, isValidPassword } from '../auth/authStore'
import { markHasAuthenticated } from '../auth/hasAuthKey'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { termsUrl, privacyUrl } from '../utils/legalLinks'
import AppIcon from '../icons/AppIcon'
import { PLANS } from '../data/bibleBlocks'
import { setSelectedPlanId } from '../plan/planStore'
import { setReadingOrder } from '../reading/readingOrderStore'
import { setSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { setSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { savePendingOnboardingChoices } from '../onboarding/pendingOnboardingChoices'
import { trackOnboardingEvent } from '../analytics/onboardingEvents'
import { recordConsents, PURPOSES } from '../privacy/consent'
import { migrateGuestRow, hasGuestRow } from '../backend/userDataStore'
import { clearGuestInviteState } from '../onboarding/guestInviteStore'
import { AccountShell, AccountField, AccountPasswordField, AccountPrimaryButton, AccountError, SentCard, formatCountdown, FONT, ui } from './accountUi'

const RESEND_COOLDOWN = 60

export default function SignupScreen({ chaptersRead = 0, planId, onAuthenticated, onBack, onContinueWithoutAccount, onGoLogin }) {
  const lang = getAppLanguage() ?? 'pt'
  const L = (k, vars) => t(`account.${k}`, vars, lang)
  const plan = PLANS.find(p => p.id === planId) ?? PLANS.find(p => p.id === 'standard')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Consentimento por finalidade — ver src/privacy/consent.js. Os dois são
  // obrigatórios e começam desmarcados. O quadro 13c traz uma única linha
  // (idade + termos + privacidade); a segunda linha, no mesmo estilo, é o
  // consentimento específico para dados de convicção religiosa, que a LGPD
  // (art. 11) exige destacado e separado — por isso não foi fundido.
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToSensitive, setAgreedToSensitive] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState(null)

  async function submit(e) {
    e?.preventDefault?.()
    if (loading) return
    if (!isValidPassword(password)) { setError(L('passwordRule')); return }
    if (!agreedToTerms || !agreedToSensitive) { setError(t('auth.mustAgreeToTerms', undefined, lang)); return }
    setLoading(true)
    try {
      // O quadro não tem o toggle de perfil público: a conta nasce privada
      // (dá pra abrir depois em Perfil), e ninguém recebe e-mail de
      // novidades sem ter pedido (opt-in, nunca opt-out).
      const hadGuestRow = hasGuestRow()
      const user = await signup({ name: name.trim(), email, password, language: lang, isPublic: false, ageConfirmed: true })
      setError('')

      // Migra o progresso feito sem conta neste aparelho (leitura/plano já
      // guardados em localStorage). Sem linha de convidado não faz nada.
      // Falha aqui não pode travar o cadastro — o pior caso é reler.
      await migrateGuestRow().catch(err => console.error('Failed to migrate guest progress', err))
      clearGuestInviteState()
      markHasAuthenticated()

      // Registra o consentimento assim que existe sessão, e espera terminar:
      // sem isso, o handleAuthenticated do AuthScreen chamaria
      // needsConsentRefresh() antes da linha existir no banco.
      await recordConsents([
        { purpose: PURPOSES.TERMS, granted: true },
        { purpose: PURPOSES.SENSITIVE_DATA, granted: true },
        { purpose: PURPOSES.MARKETING_EMAIL, granted: false },
        { purpose: PURPOSES.PUBLIC_PROFILE, granted: false },
      ])

      // Tempos de oração/reflexão são só localStorage — não dependem de
      // sessão. Plano/ordem exigem sessão de verdade, por isso o "pendente"
      // quando o e-mail ainda precisa de confirmação.
      setSavedPrayerMinutes(plan.prayerMinutes)
      setSavedReflectionMinutes(plan.reflectionMinutes)

      if (user.needsEmailConfirmation) {
        if (!hadGuestRow) savePendingOnboardingChoices({ planId: plan.id, readingOrder: 'ot_first' })
        setConfirmationEmail(user.email)
        setLoading(false)
        return
      }

      // Quem já tinha linha de convidado acabou de migrá-la com plano e
      // ordem dentro — só quem chegou sem nada precisa dos padrões aqui.
      if (!hadGuestRow) {
        setSelectedPlanId(user.email, plan.id).catch(() => {})
        setReadingOrder(user.email, 'ot_first').catch(() => {})
      }
      trackOnboardingEvent('signup_completed', { userId: user.id })
      onAuthenticated(user)
    } catch (err) {
      setError(err.message === 'rate_limited' ? t('auth.signupRateLimited', undefined, lang) : err.message)
      setLoading(false)
    }
  }

  if (confirmationEmail) {
    return <ConfirmEmailScreen email={confirmationEmail} onBack={() => setConfirmationEmail(null)} onGoLogin={onGoLogin} lang={lang} />
  }

  const body = (
    <>
      <div>
        <p style={styles.title}>{L('signupTitle')}</p>
        <p style={styles.subtitle}>{L('signupSubtitle')}</p>
      </div>

      <div style={styles.sandCard}>
        <p style={styles.sandLabel}>{L('goesToAccount')}</p>
        {/* Quem chega pelo "Criar conta" do login sem ter lido nada não tem
            capítulo pra mostrar — a linha some, o plano fica. */}
        {chaptersRead > 0 && (
          <div style={{ ...styles.sandRow, margin: '0 0 9px' }}>
            <span style={styles.sandDot} />
            <p style={styles.sandText}>{chaptersRead === 1 ? L('chapterThisWeek') : L('chaptersThisWeek', { n: chaptersRead })}</p>
          </div>
        )}
        <div style={styles.sandRow}>
          <span style={styles.sandDot} />
          <p style={styles.sandText}>{plan.minutesPerDay ? L('planBuilt', { min: plan.minutesPerDay }) : L('planBuiltFree')}</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={styles.card}>
          <AccountField label={L('nameLabel')} value={name} onChange={setName} height={50} marginBottom={14} autoComplete="name" />
          <AccountField label={L('emailLabel')} type="email" value={email} onChange={setEmail} height={50} marginBottom={14} autoComplete="email" inputMode="email" />
          <AccountPasswordField label={L('passwordLabel')} value={password} onChange={setPassword} height={50} autoComplete="new-password" hint={L('passwordHint')} />
        </div>

        <ConsentRow checked={agreedToTerms} onToggle={() => setAgreedToTerms(v => !v)}>
          {L('consentPrefix')}
          <a href={termsUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.consentLink} onClick={e => e.stopPropagation()}>{L('consentTerms')}</a>
          {L('consentMiddle')}
          <a href={privacyUrl(lang)} target="_blank" rel="noopener noreferrer" style={styles.consentLink} onClick={e => e.stopPropagation()}>{L('consentPrivacy')}</a>
          {L('consentSuffix')}
        </ConsentRow>
        <ConsentRow checked={agreedToSensitive} onToggle={() => setAgreedToSensitive(v => !v)}>
          {t('auth.agreeToSensitiveData', undefined, lang)}
        </ConsentRow>

        <AccountError text={error} style={{ margin: 0 }} />
        {/* Enter no formulário envia; o botão visível fica no rodapé. */}
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      </form>
    </>
  )

  const footer = (
    <>
      <AccountPrimaryButton label={loading ? t('auth.loading', undefined, lang) : L('signupBtn')} onClick={submit} disabled={loading} style={{ margin: '0 0 14px' }} />
      <button type="button" style={{ ...ui.footLink, fontWeight: 700 }} onClick={onContinueWithoutAccount}>{L('continueWithoutAccount')}</button>
    </>
  )

  return (
    <AccountShell
      onBack={onBack}
      body={body}
      bodyStyle={{ padding: '22px 20px 0', gap: 10 }}
      footer={footer}
      footerStyle={{ padding: '12px 20px calc(26px + var(--safe-bottom))' }}
    />
  )
}

// Linha de consentimento: quadradinho 26px raio 9 (laranja com check quando
// marcado; vazio, na cor de campo, quando não) + texto 12px.
function ConsentRow({ checked, onToggle, children }) {
  return (
    <div style={styles.consentCard} role="checkbox" aria-checked={checked} tabIndex={0} onClick={onToggle}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle() } }}>
      <div style={{ ...styles.consentBox, background: checked ? 'var(--bento-accent)' : 'var(--bento-line)' }}>
        {checked && <AppIcon name="Check" size={14} strokeWidth={2.8} color="var(--bento-ink)" />}
      </div>
      <p style={styles.consentText}>{children}</p>
    </div>
  )
}

// Confirmação de e-mail (quando o projeto Supabase exige confirmar antes de
// entrar). Não tem quadro próprio: usa o bloco escuro "Depois de enviar" do
// 13d, com o mesmo contador de reenvio.
function ConfirmEmailScreen({ email, onBack, onGoLogin, lang }) {
  const L = (k, vars) => t(`account.${k}`, vars, lang)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [status, setStatus] = useState('idle')
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function resend() {
    if (cooldown > 0 || status === 'sending') return
    setStatus('sending')
    try {
      await resendConfirmationEmail(email)
      setStatus('idle')
    } catch (err) {
      setStatus(err.message === 'rate_limited' ? 'idle' : 'error')
    }
    setCooldown(RESEND_COOLDOWN)
  }

  const body = (
    <>
      <div>
        <p style={styles.title}>{L('signupTitle')}</p>
        <p style={styles.subtitle}>{L('signupSubtitle')}</p>
      </div>
      <SentCard
        label={L('confirmEmailLabel')}
        title={L('confirmEmailTitle', { email })}
        body={L('confirmEmailBody')}
        buttonLabel={status === 'sending' ? t('auth.loading', undefined, lang) : cooldown > 0 ? L('resendIn', { time: formatCountdown(cooldown) }) : L('resend')}
        onButton={resend}
        buttonDisabled={cooldown > 0 || status === 'sending'}
        style={{ marginTop: 4 }}
      />
      {status === 'error' && <AccountError text={t('auth.resendEmailError', undefined, lang)} style={{ margin: 0 }} />}
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
      bodyStyle={{ padding: '22px 20px 0', gap: 10 }}
      footer={footer}
      footerStyle={{ padding: '12px 20px calc(26px + var(--safe-bottom))', textAlign: 'center' }}
    />
  )
}

// Medidas do quadro 13c.
const styles = {
  title: { fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: '0 0 8px' },
  subtitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: 0 },
  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '18px 20px' },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 12px' },
  sandRow: { display: 'flex', alignItems: 'center', gap: 11 },
  sandDot: { width: 7, height: 7, borderRadius: 99, background: 'var(--bento-sand-icon)', flex: 'none' },
  sandText: { fontFamily: FONT, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: 'var(--bento-sand-ink)', margin: 0 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  consentCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' },
  consentBox: { width: 26, height: 26, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  consentText: { flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t2)', margin: 0 },
  consentLink: { color: 'var(--bento-accent)', fontWeight: 700, textDecoration: 'none' },
}
