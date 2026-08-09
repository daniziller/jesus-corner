// Tela de assinatura — preço fixo, 2 planos (mensal/anual), em BRL ou USD
// (ver STORE_TIERS em ../billing/storeTiers, mesmos valores usados nas
// lojas nativas e no Stripe/web). Contribuição única (pagamento avulso,
// acesso vitalício) foi descontinuada como opção de compra — só fica o
// tratamento de quem já tinha (`isLifetime` abaixo), pra essas contas
// continuarem funcionando normalmente. O mesmo vale pra quem já tinha
// acesso grátis (`access_type: 'free'`) de quando a contribuição era de
// valor livre — não existe mais forma de ativar isso, mas quem já tinha
// continua com o acesso intacto (ver o bloco `alreadyFree*` abaixo).
// Aparece tanto como paywall de tela cheia (PaywallGate em App.jsx, pra
// quem ainda não ativou acesso algum) quanto pelo link "Minha assinatura"
// no Perfil (pra quem já tem acesso, ver/trocar o plano). Moeda mostrada já
// reflete BRL/USD certo, mas quem decide de verdade a moeda cobrada é o
// backend (api/create-checkout-session.js, mesmo header x-vercel-ip-country).
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import {
  startCheckout, isPremiumActive, getManageSubscriptionUrl,
  getDigitalGoodsService, getPlaySkuDetails, startPlayBillingPurchase,
  isIOSApp, getIOSProducts, startIOSPurchase,
} from '../billing/subscriptionStore'
import { STORE_TIERS } from '../billing/storeTiers'
import { formatAmount } from '../billing/formatAmount'
import { redeemInviteCode } from '../invites/inviteStore'

const FEATURES = [
  { icon: 'BookOpen', key: 'featureReading' },
  { icon: 'HandHeart', key: 'featurePrayer' },
  { icon: 'GraduationCap', key: 'featureStudies' },
  { icon: 'Users', key: 'featureCommunity' },
]

export default function UpgradeScreen({ session, subscription, onSubscriptionRefreshed }) {
  const { lang } = session
  const [currency, setCurrency] = useState('brl')
  const [mode, setMode] = useState('monthly') // 'monthly' | 'annual'
  const [changingAmount, setChangingAmount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showRedeem, setShowRedeem] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState('')
  const [redeemResult, setRedeemResult] = useState(null)
  // 'stripe' (web) | 'google_play' (dentro do TWA via Play) | 'apple'
  // (dentro do app iOS) — ver storeTiers.js pro preço fixo de cada plano.
  const [storeContext, setStoreContext] = useState('stripe')
  const [storePrices, setStorePrices] = useState({}) // sku/productId -> {value, currency}, preço real vindo da loja

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && country && country !== 'BR') setCurrency('usd')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function detectStoreContext() {
      if (isIOSApp()) { if (!cancelled) setStoreContext('apple'); return }
      const service = await getDigitalGoodsService()
      if (!cancelled && service) setStoreContext('google_play')
    }
    detectStoreContext()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (storeContext === 'stripe') return
    let cancelled = false
    async function loadStorePrices() {
      const skus = [STORE_TIERS.monthly, STORE_TIERS.annual].map(
        tr => storeContext === 'google_play' ? tr.googlePlaySku : tr.appleProductId
      )
      const details = storeContext === 'google_play'
        ? await getPlaySkuDetails(skus)
        : await getIOSProducts(skus)
      if (!cancelled) setStorePrices(details)
    }
    loadStorePrices()
    return () => { cancelled = true }
  }, [storeContext])

  const isLifetime = subscription?.access_type === 'lifetime' && subscription?.status === 'active'
  const isRecurringActive = subscription?.access_type === 'recurring' && isPremiumActive(subscription)
  const isStoreContext = storeContext !== 'stripe'

  // Um único plano por intervalo — não há mais escolha de valor, só de
  // intervalo (mensal/anual) e moeda (BRL/USD). Ver storeTiers.js.
  const tier = STORE_TIERS[mode]
  const storeSku = storeContext === 'google_play' ? tier.googlePlaySku : tier.appleProductId
  const storePrice = isStoreContext ? storePrices[storeSku] : null
  // Preço exibido: o real vindo da loja quando já carregou (mais preciso,
  // já localizado pro país da conta), senão nossa própria tabela fixa como
  // estimativa inicial.
  const displayCurrency = storePrice?.currency ? storePrice.currency.toLowerCase() : currency
  const amountCents = storePrice
    ? Math.round(parseFloat(storePrice.value) * 100)
    : Math.round(tier[currency] * 100)

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  function switchCurrency(next) {
    setCurrency(next)
    setError('')
  }

  function startChangingAmount() {
    setMode(subscription.plan === 'annual' ? 'annual' : 'monthly')
    setChangingAmount(true)
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      if (storeContext === 'google_play') {
        await startPlayBillingPurchase({ sku: tier.googlePlaySku, mode })
        window.location.href = '/?checkout=success'
      } else if (storeContext === 'apple') {
        await startIOSPurchase({ productId: tier.appleProductId, mode })
        window.location.href = '/?checkout=success'
      } else {
        const url = await startCheckout({ interval: mode === 'annual' ? 'year' : 'month', currency })
        window.location.href = url
      }
    } catch (err) {
      // Pessoa cancelou/fechou a folha de compra nativa — não é erro,
      // só deixa escolher de novo sem alarde.
      if (err.message === 'user_cancelled') { setSubmitting(false); return }
      setError(t('billing.checkoutError', undefined, lang))
      setSubmitting(false)
    }
  }

  async function handleManagePayment() {
    setError('')
    try {
      const url = await getManageSubscriptionUrl(subscription)
      window.location.href = url
    } catch {
      // Sem portal pra abrir (ex: customer do Stripe não existe mais nesse
      // modo — ver api/create-portal-session.js) não é um beco sem saída:
      // abre o seletor de plano de novo, pra reestabelecer a assinatura.
      setError(t('billing.managePortalFallbackError', undefined, lang))
      startChangingAmount()
    }
  }

  async function handleRedeem() {
    if (redeeming || !redeemCode.trim()) return
    setRedeeming(true)
    setRedeemError('')
    setRedeemResult(null)
    try {
      const { applied } = await redeemInviteCode(redeemCode.trim())
      setRedeemResult(applied)
      setRedeemCode('')
      if (applied === 'free') await onSubscriptionRefreshed?.()
    } catch (err) {
      setRedeemError(t('billing.redeemCodeError', undefined, lang))
    } finally {
      setRedeeming(false)
    }
  }

  const submitBtnKey = mode === 'annual' ? 'billing.subscribeAnnualBtn' : 'billing.subscribeMonthlyBtn'
  const submitLabel = submitting
    ? t('billing.redirecting', undefined, lang)
    : t(submitBtnKey, { amount: formatAmount(amountCents, displayCurrency) }, lang)

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

            {!isStoreContext && (
              <>
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
              </>
            )}

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
              <p style={styles.fixedPrice}>
                {formatAmount(amountCents, displayCurrency)}
                <span style={styles.fixedPriceUnit}>
                  {t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}
                </span>
              </p>
            </div>

            <button className="btn-primary" disabled={submitting} onClick={handleSubmit}>
              {submitLabel}
            </button>
          </>
        )}

        {error && <p style={styles.errorMsg}>{error}</p>}

        {!showRedeem ? (
          <button style={styles.redeemLink} onClick={() => setShowRedeem(true)}>
            {t('billing.redeemCodeLink', undefined, lang)}
          </button>
        ) : (
          <div style={styles.redeemBox}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={styles.redeemInput}
                type="text"
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value)}
                placeholder={t('billing.redeemCodePlaceholder', undefined, lang)}
              />
              <button className="btn-secondary" style={{ width: 'auto', padding: '9px 16px' }} disabled={redeeming} onClick={handleRedeem}>
                {redeeming ? t('billing.redeemCodeRedeeming', undefined, lang) : t('billing.redeemCodeBtn', undefined, lang)}
              </button>
            </div>
            {redeemError && <p style={styles.errorMsg}>{redeemError}</p>}
            {redeemResult === 'free' && <p style={styles.redeemSuccess}>{t('billing.redeemCodeFreeSuccess', undefined, lang)}</p>}
            {redeemResult === 'discount_pending' && <p style={styles.redeemSuccess}>{t('billing.redeemCodeDiscountSuccess', undefined, lang)}</p>}
          </div>
        )}

        <p style={styles.disclaimer}>{t('billing.securePaymentDisclaimer', undefined, lang)}</p>
      </div>
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '22px 20px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-glow)' },
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
  amountSection:{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', padding: '14px 0 4px' },
  amountLabel: { fontSize: 12.5, fontWeight: 700, color: 'var(--g5)' },
  fixedPrice:  { fontSize: 32, fontWeight: 900, color: 'var(--bk)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'baseline', gap: 4 },
  fixedPriceUnit: { fontSize: 14, fontWeight: 700, color: 'var(--g5)' },
  errorMsg:    { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  disclaimer:  { fontSize: 10, fontWeight: 500, color: 'var(--g4)', textAlign: 'center', lineHeight: 1.5 },
  redeemLink:  { alignSelf: 'center', border: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: 'var(--g5)', textDecoration: 'underline', cursor: 'pointer', padding: 4 },
  redeemBox:   { display: 'flex', flexDirection: 'column', gap: 8 },
  redeemInput: { flex: 1, border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--bk)', outline: 'none', background: 'var(--g1)', boxSizing: 'border-box' },
  redeemSuccess:{ fontSize: 12.5, fontWeight: 600, color: 'var(--gr)', background: 'var(--grl)', borderRadius: 8, padding: '8px 10px' },
}
