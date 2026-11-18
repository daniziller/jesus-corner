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
//
// Revisão de LGPD (2026-11-18): as mesmas caixas do cadastro
// (ConsentChoices — idade, termos, dados sobre a fé, escrita assistida,
// e-mails). Conta que nunca consentiu nada (criada agora pelo Google/Apple
// sem passar pelo cadastro) e recusa: a conta é apagada, não só desfeita a
// sessão — não fica conta guardada sem consentimento.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import { getAppLanguage } from '../i18n/appLanguageStore'
import { logout } from '../auth/authStore'
import { recordConsents, getMyConsents, PURPOSES } from '../privacy/consent'
import { deleteMyAccount } from '../privacy/privacyStore'
import { supabase } from '../lib/supabaseClient'
import ConsentChoices, { EMPTY_CHOICES, requiredChecked, consentRecords } from '../privacy/ConsentChoices'
import { AccountPrimaryButton, AccountError, FONT, ui } from './accountUi'

export default function ConsentRefreshScreen({ onAccepted, onDeclined, embedded = false }) {
  const [consent, setConsent] = useState(EMPTY_CHOICES)
  const [loading, setLoading] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')
  const [isNewAccount, setIsNewAccount] = useState(false)
  const lang = getAppLanguage() ?? 'pt'

  // Já consentiu alguma vez? Se não, é conta nova (Google/Apple). Na dúvida
  // (erro de leitura), trata como conta antiga — recusar só sai.
  useEffect(() => {
    getMyConsents().then(latest => setIsNewAccount(!latest[PURPOSES.TERMS])).catch(() => {})
  }, [])

  async function confirm() {
    if (!requiredChecked(consent)) { setError(t('auth.mustAgreeToTerms', undefined, lang)); return }
    setLoading(true)
    setError('')
    try {
      await recordConsents(consentRecords(consent), { silent: false })
      onAccepted()
    } catch (err) {
      console.error('Falha ao registrar consentimento', err)
      setError(t('auth.consentRefreshError', undefined, lang))
      setLoading(false)
    }
  }

  async function decline() {
    setDeclining(true)
    if (isNewAccount) {
      const { data } = await supabase.auth.getSession()
      const email = data?.session?.user?.email
      if (email) await deleteMyAccount(email).catch(err => console.error('Falha ao apagar a conta recusada', err))
    }
    await logout().catch(() => {})
    onDeclined()
  }

  const form = (
    <>
      <p style={s.title}>{t('auth.consentRefreshTitle', undefined, lang)}</p>
      <p style={s.subtitle}>{t('auth.consentRefreshBody', undefined, lang)}</p>

      <ConsentChoices value={consent} onChange={setConsent} lang={lang} />

      <AccountError text={error} />

      <AccountPrimaryButton
        label={loading ? t('auth.loading', undefined, lang) : t('onboarding.continueBtn', undefined, lang)}
        onClick={confirm}
        disabled={loading || declining || !requiredChecked(consent)}
        style={{ margin: '16px 0 0' }}
      />

      <button type="button" style={{ ...ui.footLink, marginTop: 14 }} onClick={decline} disabled={declining}>
        {declining ? t('auth.loading', undefined, lang) : t(isNewAccount ? 'auth.consentRefreshDeleteNew' : 'auth.consentRefreshDecline', undefined, lang)}
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
}
