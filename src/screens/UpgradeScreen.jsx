// Tela de assinatura — modelo de valor livre: a pessoa escolhe quanto quer
// contribuir (inclusive R$0, que libera acesso total sem tocar o Stripe —
// ver activateFreeAccess em ../billing/subscriptionStore) de forma
// recorrente, mensal ou anual. Contribuição única (pagamento avulso,
// acesso vitalício) foi descontinuada como opção de compra — só fica o
// tratamento de quem já tinha (`isLifetime` abaixo), pra essas contas
// continuarem funcionando normalmente.
// Aparece tanto como paywall de tela cheia (PaywallGate em App.jsx, pra
// quem ainda não ativou acesso algum) quanto pelo link "Minha assinatura"
// no Perfil (pra quem já tem acesso, ver/trocar o valor). Moeda mostrada já
// reflete BRL/USD certo, mas quem decide de verdade a moeda cobrada é o
// backend (api/create-checkout-session.js, mesmo header x-vercel-ip-country).
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { startCheckout, activateFreeAccess, openBillingPortalUrl, isPremiumActive } from '../billing/subscriptionStore'
import { formatAmount } from '../billing/formatAmount'

// Mesmos valores numéricos pras duas moedas (sem conversão de câmbio) —
// R$5/R$10/R$20/R$30 e $5/$10/$20/$30, etc.
const PRESETS = {
  brl: { monthly: [0, 5, 10, 20, 30], annual: [0, 50, 100, 200, 300] },
  usd: { monthly: [0, 5, 10, 20, 30], annual: [0, 50, 100, 200, 300] },
}
// Mínimo real de cobrança do Stripe (valor > 0 — R$0 vira grátis).
const MIN_MAJOR = { brl: 0.5, usd: 0.5 }

const FEATURES = [
  { icon: 'BookOpen', key: 'featureReading' },
  { icon: 'HandHeart', key: 'featurePrayer' },
  { icon: 'GraduationCap', key: 'featureStudies' },
  { icon: 'Users', key: 'featureCommunity' },
]

export default function UpgradeScreen({ session, subscription }) {
  const { lang } = session
  const [currency, setCurrency] = useState('brl')
  const [mode, setMode] = useState('monthly') // 'monthly' | 'annual'
  const [selectedAmount, setSelectedAmount] = useState(null) // valor em unidade cheia (reais/dólares), null = nada escolhido
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [changingAmount, setChangingAmount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && country && country !== 'BR') setCurrency('usd')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const isLifetime = subscription?.access_type === 'lifetime' && subscription?.status === 'active'
  const isRecurringActive = subscription?.access_type === 'recurring' && isPremiumActive(subscription)

  const presets = PRESETS[currency][mode]
  const minMajor = MIN_MAJOR[currency]

  const amountMajor = isCustom ? (parseFloat(customValue.replace(',', '.')) || 0) : selectedAmount
  const amountCents = amountMajor != null ? Math.round(amountMajor * 100) : null
  // R$0 é válido (vira grátis) — só valores entre 0 e o mínimo do Stripe
  // ficam bloqueados.
  const belowMinimum = amountCents !== null && amountCents > 0 && amountCents < minMajor * 100
  const canSubmit = amountCents !== null && !belowMinimum && !submitting

  function switchMode(next) {
    setMode(next)
    setSelectedAmount(null)
    setIsCustom(false)
    setCustomValue('')
    setError('')
  }

  function switchCurrency(next) {
    setCurrency(next)
    setSelectedAmount(null)
    setIsCustom(false)
    setCustomValue('')
    setError('')
  }

  function pickPreset(value) {
    setIsCustom(false)
    setSelectedAmount(value)
    setError('')
  }

  function pickCustom() {
    setIsCustom(true)
    setSelectedAmount(null)
    setError('')
  }

  function startChangingAmount() {
    const currentMajor = (subscription.amount_cents ?? 0) / 100
    const currentMode = subscription.plan === 'annual' ? 'annual' : 'monthly'
    setMode(currentMode)
    if (PRESETS[currency][currentMode].includes(currentMajor)) {
      setIsCustom(false)
      setSelectedAmount(currentMajor)
    } else {
      setIsCustom(true)
      setCustomValue(String(currentMajor))
    }
    setChangingAmount(true)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      if (amountCents === 0) {
        await activateFreeAccess()
        window.location.href = '/?checkout=success'
      } else {
        const url = await startCheckout({ interval: mode === 'annual' ? 'year' : 'month', amountCents, currency })
        window.location.href = url
      }
    } catch {
      setError(t(amountCents === 0 ? 'billing.activationError' : 'billing.checkoutError', undefined, lang))
      setSubmitting(false)
    }
  }

  async function handleManagePayment() {
    setError('')
    try {
      const url = await openBillingPortalUrl()
      window.location.href = url
    } catch {
      // Sem portal pra abrir (ex: customer do Stripe não existe mais nesse
      // modo — ver api/create-portal-session.js) não é um beco sem saída:
      // abre o seletor de valor de novo, pra reestabelecer a contribuição.
      setError(t('billing.managePortalFallbackError', undefined, lang))
      startChangingAmount()
    }
  }

  const submitBtnKey = mode === 'annual' ? 'billing.subscribeAnnualBtn' : 'billing.subscribeMonthlyBtn'
  const submitLabel = submitting
    ? t(amountCents === 0 ? 'billing.activating' : 'billing.redirecting', undefined, lang)
    : amountCents === 0
      ? t('billing.freeBtn', undefined, lang)
      : amountCents !== null
        ? t(submitBtnKey, { amount: formatAmount(amountCents, currency) }, lang)
        : t(submitBtnKey, { amount: '—' }, lang)

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{t('billing.pageTitle', undefined, lang)}</h1></div>

      <div style={styles.body}>
        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <span style={{ position: 'relative' }}><AppIcon name="Crown" size={26} color="white" /></span>
          <p style={{ position: 'relative', ...styles.heroTitle }}>{t('billing.heroTitle', undefined, lang)}</p>
          <p style={{ position: 'relative', ...styles.heroSub }}>{t('billing.heroSub', undefined, lang)}</p>
        </div>

        <div style={styles.missionCard}>
          <p style={styles.missionTitle}>{t('billing.missionTitle', undefined, lang)}</p>
          <p style={styles.missionBody}>{t('billing.missionBody', undefined, lang)}</p>
        </div>

        <div style={styles.featureList}>
          {FEATURES.map(f => (
            <div key={f.key} style={styles.featureRow}>
              <div style={styles.featureIcon}><AppIcon name={f.icon} size={16} color="var(--or)" /></div>
              <p style={styles.featureText}>{t(`billing.${f.key}`, undefined, lang)}</p>
            </div>
          ))}
        </div>

        {isLifetime && (
          <div style={styles.statusCard}>
            <AppIcon name="Crown" size={22} color="var(--or)" />
            <p style={styles.statusTitle}>{t('billing.alreadyLifetimeTitle', undefined, lang)}</p>
            <p style={styles.statusSub}>{t('billing.alreadyLifetimeSub', undefined, lang)}</p>
          </div>
        )}

        {isRecurringActive && !changingAmount && (
          <div style={styles.statusCard}>
            <p style={styles.statusLabel}>{t('billing.currentContributionTitle', undefined, lang)}</p>
            <p style={styles.statusAmount}>
              {subscription.amount_cents != null && subscription.currency
                ? `${formatAmount(subscription.amount_cents, subscription.currency)}${t(subscription.plan === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}`
                : '—'}
            </p>
            <div style={styles.statusActions}>
              <button className="btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={startChangingAmount}>
                {t('billing.changeAmountBtn', undefined, lang)}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={handleManagePayment}>
                {t('billing.managePaymentBtn', undefined, lang)}
              </button>
            </div>
          </div>
        )}

        {subscription?.access_type === 'free' && subscription?.status === 'active' && (
          <div style={styles.statusCard}>
            <p style={styles.statusTitle}>{t('billing.alreadyFreeTitle', undefined, lang)}</p>
            <p style={styles.statusSub}>{t('billing.alreadyFreeSub', undefined, lang)}</p>
          </div>
        )}

        {!isLifetime && (!isRecurringActive || changingAmount) && (
          <>
            <div style={styles.missionCard}>
              <p style={styles.missionTitle}>{t('billing.contributionTitle', undefined, lang)}</p>
              <p style={styles.missionBody}>{t('billing.contributionBody', undefined, lang)}</p>
            </div>

            <div style={styles.currencyRow}>
              <p style={styles.currencyLabel}>{t('billing.currencyLabel', undefined, lang)}</p>
              <div style={styles.currencyToggle}>
                <button
                  style={{ ...styles.currencyBtn, ...(currency === 'brl' ? styles.currencyBtnActive : {}) }}
                  onClick={() => switchCurrency('brl')}
                >
                  R$
                </button>
                <button
                  style={{ ...styles.currencyBtn, ...(currency === 'usd' ? styles.currencyBtnActive : {}) }}
                  onClick={() => switchCurrency('usd')}
                >
                  US$
                </button>
              </div>
            </div>
            <p style={styles.modeNote}>{t('billing.currencyHint', undefined, lang)}</p>

            <div style={styles.modeToggle}>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'monthly' ? styles.modeBtnActive : {}) }}
                onClick={() => switchMode('monthly')}
              >
                {t('billing.modeMonthly', undefined, lang)}
              </button>
              <button
                style={{ ...styles.modeBtn, ...(mode === 'annual' ? styles.modeBtnActive : {}) }}
                onClick={() => switchMode('annual')}
              >
                {t('billing.modeAnnual', undefined, lang)}
              </button>
            </div>

            <div style={styles.amountSection}>
              <p style={styles.amountLabel}>{t('billing.amountLabel', undefined, lang)}</p>
              <div style={styles.amountGrid}>
                {presets.map(value => (
                  <button
                    key={value}
                    style={{ ...styles.amountChip, ...(!isCustom && selectedAmount === value ? styles.amountChipActive : {}) }}
                    onClick={() => pickPreset(value)}
                  >
                    {value === 0 ? formatAmount(0, currency) : formatAmount(value * 100, currency)}
                  </button>
                ))}
                <button
                  style={{ ...styles.amountChip, ...(isCustom ? styles.amountChipActive : {}) }}
                  onClick={pickCustom}
                >
                  {t('billing.customAmountLabel', undefined, lang)}
                </button>
              </div>
              {isCustom && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  autoFocus
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  placeholder={formatAmount(0, currency)}
                  style={styles.customInput}
                />
              )}
              {belowMinimum && (
                <p style={styles.hint}>
                  {t('billing.belowMinimumHint', { min: formatAmount(minMajor * 100, currency) }, lang)}
                </p>
              )}
            </div>

            <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
              {submitLabel}
            </button>
          </>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}

        <p style={styles.disclaimer}>{t('billing.securePaymentDisclaimer', undefined, lang)}</p>
      </div>
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '22px 20px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTitle:   { fontSize: 15, fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: '-0.2px' },
  missionCard: { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: 15 },
  missionTitle:{ fontSize: 12, fontWeight: 800, color: 'var(--bk)', marginBottom: 6 },
  missionBody: { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.55 },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.85)', lineHeight: 1.5, maxWidth: 280 },
  featureList: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-card)' },
  featureRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  featureIcon: { width: 30, height: 30, borderRadius: 9, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { fontSize: 12.5, fontWeight: 600, color: 'var(--bk)' },
  statusCard:  { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  statusLabel: { fontSize: 11, fontWeight: 700, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusAmount:{ fontSize: 22, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  statusTitle: { fontSize: 13.5, fontWeight: 800, color: 'var(--bk)' },
  statusSub:   { fontSize: 12, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, maxWidth: 280 },
  statusActions:{ display: 'flex', gap: 8, width: '100%', marginTop: 8 },
  currencyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  currencyLabel:{ fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  currencyToggle:{ display: 'flex', gap: 6, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 10, padding: 3 },
  currencyBtn: { padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 7, border: 'none', background: 'transparent', fontFamily: 'var(--font)' },
  currencyBtnActive:{ color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  modeToggle:  { display: 'flex', gap: 6, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: 4 },
  modeBtn:     { flex: 1, textAlign: 'center', padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'transparent', fontFamily: 'var(--font)' },
  modeBtnActive:{ color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  modeNote:    { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', marginTop: -6 },
  amountSection:{ display: 'flex', flexDirection: 'column', gap: 8 },
  amountLabel: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  amountGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  amountChip:  { textAlign: 'center', padding: '11px 6px', fontSize: 12.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 12, border: '0.5px solid var(--g2)', background: 'var(--g1)', fontFamily: 'var(--font)' },
  amountChipActive: { color: 'white', background: 'var(--grad-primary)', borderColor: 'transparent', boxShadow: 'var(--shadow-glow)' },
  customInput: { width: '100%', border: '0.5px solid var(--g2)', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: 'var(--bk)', outline: 'none', background: 'white' },
  hint:        { fontSize: 11, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5 },
  errorMsg:    { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  disclaimer:  { fontSize: 10, fontWeight: 500, color: 'var(--g4)', textAlign: 'center', lineHeight: 1.5 },
}
