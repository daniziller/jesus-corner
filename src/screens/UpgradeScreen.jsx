// Tela de assinatura — dois tiers pagos (Premium e Premium + IA), cada um
// com plano mensal ou anual, em BRL ou USD (ver STORE_TIERS em
// ../billing/storeTiers, mesmos valores usados nas lojas nativas e no
// Stripe/web).
//
// Aparece tanto pra quem está no tier grátis e quer assinar (via aba
// "Assinatura" ou por um cadeado de recurso Premium) quanto pelo link
// "Minha assinatura" no Perfil (pra quem já assina, ver/trocar o plano).
//
// Contribuição única (acesso vitalício) e o acesso grátis concedido pelo
// admin (`access_type: 'free'`) não são mais formas de compra — só o
// tratamento de quem já tem (blocos `isLifetime` / `alreadyFree*`), pra
// essas contas seguirem funcionando.
import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import {
  startCheckout, isPremiumActive, getManageSubscriptionUrl,
  getDigitalGoodsService, getPlaySkuDetails, startPlayBillingPurchase,
  isIOSApp, getIOSProducts, startIOSPurchase,
} from '../billing/subscriptionStore'
import { STORE_TIERS, getStoreTier, GOOGLE_PLAY_SUBSCRIPTION_ID } from '../billing/storeTiers'
import { resolveEntitlement } from '../billing/entitlement'
import { formatAmount } from '../billing/formatAmount'
import { redeemInviteCode } from '../invites/inviteStore'

// Comparativo curto — o que cada tier entrega. `tier` marca a partir de
// qual nível o item está incluído.
const COMPARE = [
  { key: 'reading', tier: 'free' },
  { key: 'prayer', tier: 'free' },
  { key: 'basicProgress', tier: 'free' },
  { key: 'voice', tier: 'premium' },
  { key: 'guided', tier: 'premium' },
  { key: 'achievements', tier: 'premium' },
  { key: 'chrono', tier: 'premium' },
  { key: 'community', tier: 'premium' },
  { key: 'ai', tier: 'premium_ai' },
]

const TIER_RANK = { free: 0, premium: 1, premium_ai: 2 }

export default function UpgradeScreen({ session, subscription, onSubscriptionRefreshed }) {
  const { lang } = session
  const [currency, setCurrency] = useState('brl')
  const currencyTouchedRef = useRef(false)
  const [selectedTier, setSelectedTier] = useState('premium_ai') // 'premium' | 'premium_ai'
  const [mode, setMode] = useState('monthly') // 'monthly' | 'annual'
  const [changingPlan, setChangingPlan] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showRedeem, setShowRedeem] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState('')
  const [redeemResult, setRedeemResult] = useState(null)
  // 'stripe' (web) | 'google_play' (TWA via Play) | 'apple' (app iOS)
  const [storeContext, setStoreContext] = useState('stripe')
  const [storePrices, setStorePrices] = useState({}) // basePlanId/productId -> preço real da loja

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && !currencyTouchedRef.current && country && country !== 'BR') setCurrency('usd')
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
      if (storeContext === 'google_play') {
        // Uma assinatura só; o Digital Goods API devolve um item por base plan.
        const details = await getPlaySkuDetails([GOOGLE_PLAY_SUBSCRIPTION_ID])
        if (!cancelled) setStorePrices(details)
      } else {
        const ids = Object.values(STORE_TIERS).map(tr => tr.appleProductId)
        const details = await getIOSProducts(ids)
        if (!cancelled) setStorePrices(details)
      }
    }
    loadStorePrices()
    return () => { cancelled = true }
  }, [storeContext])

  const entitlement = resolveEntitlement(subscription)
  const isLifetime = subscription?.access_type === 'lifetime' && subscription?.status === 'active'
  const isRecurringActive = subscription?.access_type === 'recurring' && isPremiumActive(subscription)
  const isStoreContext = storeContext !== 'stripe'

  const storeTier = getStoreTier(selectedTier, mode)
  const storeKey = storeContext === 'google_play' ? storeTier.googlePlayBasePlan : storeTier.appleProductId
  const storePrice = isStoreContext ? storePrices[storeKey] : null
  const displayCurrency = storePrice?.currency ? storePrice.currency.toLowerCase() : currency
  const amountCents = storePrice
    ? Math.round(parseFloat(storePrice.value) * 100)
    : Math.round(storeTier[currency] * 100)

  // Economia do anual vs 12× o mensal, pro selo de desconto.
  const monthlyTier = getStoreTier(selectedTier, 'monthly')
  const annualSavingPct = Math.round(100 - (getStoreTier(selectedTier, 'annual')[currency] / (monthlyTier[currency] * 12)) * 100)

  function switchCurrency(next) {
    currencyTouchedRef.current = true
    setCurrency(next)
    setError('')
  }

  function startChangingPlan() {
    setSelectedTier(entitlement.tier === 'premium' ? 'premium' : 'premium_ai')
    setMode(subscription.plan === 'annual' ? 'annual' : 'monthly')
    setChangingPlan(true)
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      if (storeContext === 'google_play') {
        await startPlayBillingPurchase({ sku: GOOGLE_PLAY_SUBSCRIPTION_ID, basePlanId: storeTier.googlePlayBasePlan })
        window.location.href = '/?checkout=success'
      } else if (storeContext === 'apple') {
        await startIOSPurchase({ productId: storeTier.appleProductId, mode })
        window.location.href = '/?checkout=success'
      } else {
        const url = await startCheckout({ interval: mode === 'annual' ? 'year' : 'month', currency, tier: selectedTier })
        window.location.href = url
      }
    } catch (err) {
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
      setError(t('billing.managePortalFallbackError', undefined, lang))
      startChangingPlan()
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
    } catch {
      setRedeemError(t('billing.redeemCodeError', undefined, lang))
    } finally {
      setRedeeming(false)
    }
  }

  const showPicker = !isLifetime && (!isRecurringActive || changingPlan)
  const submitLabel = submitting
    ? t('billing.redirecting', undefined, lang)
    : t('billing.subscribeBtn', { amount: formatAmount(amountCents, displayCurrency), unit: t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang) }, lang)

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%' }}>
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

        {/* Comparativo dos 3 níveis */}
        <div style={styles.compareCard}>
          {COMPARE.map(row => {
            const inFree = row.tier === 'free'
            const inPremium = TIER_RANK[row.tier] <= 1
            return (
              <div key={row.key} style={styles.compareRow}>
                <span style={styles.compareLabel}>{t(`billing.compare.${row.key}`, undefined, lang)}</span>
                <span style={styles.compareCell}>{inFree ? <AppIcon name="Check" size={13} color="var(--g4)" /> : <span style={styles.compareDash}>–</span>}</span>
                <span style={styles.compareCell}>{inPremium ? <AppIcon name="Check" size={13} color="var(--or)" /> : <span style={styles.compareDash}>–</span>}</span>
                <span style={styles.compareCell}><AppIcon name="Check" size={13} color="var(--or)" /></span>
              </div>
            )
          })}
          <div style={{ ...styles.compareRow, ...styles.compareHeadRow }}>
            <span style={styles.compareLabel} />
            <span style={styles.compareCellHead}>{t('billing.tiers.free', undefined, lang)}</span>
            <span style={styles.compareCellHead}>{t('billing.tiers.premium', undefined, lang)}</span>
            <span style={styles.compareCellHead}>{t('billing.tiers.premiumAi', undefined, lang)}</span>
          </div>
        </div>

        {isLifetime && (
          <div style={styles.statusCard}>
            <AppIcon name="Crown" size={22} color="var(--or)" />
            <p style={styles.statusTitle}>{t('billing.alreadyLifetimeTitle', undefined, lang)}</p>
            <p style={styles.statusSub}>{t('billing.alreadyLifetimeSub', undefined, lang)}</p>
          </div>
        )}

        {isRecurringActive && !changingPlan && (
          <div style={styles.statusCard}>
            <p style={styles.statusLabel}>{t('billing.currentContributionTitle', undefined, lang)}</p>
            <p style={styles.statusTitle}>
              {t(entitlement.tier === 'premium' ? 'billing.tiers.premium' : 'billing.tiers.premiumAi', undefined, lang)}
            </p>
            <p style={styles.statusAmount}>
              {subscription.amount_cents != null && subscription.currency
                ? `${formatAmount(subscription.amount_cents, subscription.currency)}${t(subscription.plan === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}`
                : '—'}
            </p>
            <div style={styles.statusActions}>
              <button className="btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={startChangingPlan}>
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

        {showPicker && (
          <>
            {/* Escolha do tier */}
            <div style={styles.tierRow}>
              {['premium', 'premium_ai'].map(tr => {
                const active = selectedTier === tr
                const priceTier = getStoreTier(tr, mode)
                return (
                  <button
                    key={tr}
                    style={{ ...styles.tierCard, ...(active ? styles.tierCardActive : {}) }}
                    onClick={() => { setSelectedTier(tr); setError('') }}
                  >
                    {tr === 'premium_ai' && <span style={styles.tierBadge}>{t('billing.mostPopular', undefined, lang)}</span>}
                    <span style={styles.tierName}>{t(tr === 'premium' ? 'billing.tiers.premium' : 'billing.tiers.premiumAi', undefined, lang)}</span>
                    <span style={styles.tierPrice}>
                      {formatAmount(Math.round(priceTier[currency] * 100), currency)}
                      <span style={styles.tierPriceUnit}>{t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}</span>
                    </span>
                    <span style={styles.tierDesc}>{t(tr === 'premium' ? 'billing.tiers.premiumDesc' : 'billing.tiers.premiumAiDesc', undefined, lang)}</span>
                  </button>
                )
              })}
            </div>

            {!isStoreContext && (
              <>
                <div style={styles.currencyRow}>
                  <p style={styles.currencyLabel}>{t('billing.currencyLabel', undefined, lang)}</p>
                  <div style={styles.currencyToggle}>
                    <button style={{ ...styles.currencyBtn, ...(currency === 'brl' ? styles.currencyBtnActive : {}) }} onClick={() => switchCurrency('brl')}>R$</button>
                    <button style={{ ...styles.currencyBtn, ...(currency === 'usd' ? styles.currencyBtnActive : {}) }} onClick={() => switchCurrency('usd')}>US$</button>
                  </div>
                </div>
                <p style={styles.modeNote}>{t('billing.currencyHint', undefined, lang)}</p>
              </>
            )}

            <div style={styles.modeToggle}>
              <button style={{ ...styles.modeBtn, ...(mode === 'monthly' ? styles.modeBtnActive : {}) }} onClick={() => { setMode('monthly'); setError('') }}>
                {t('billing.modeMonthly', undefined, lang)}
              </button>
              <button style={{ ...styles.modeBtn, ...(mode === 'annual' ? styles.modeBtnActive : {}) }} onClick={() => { setMode('annual'); setError('') }}>
                {t('billing.modeAnnual', undefined, lang)}
                {annualSavingPct > 0 && <span style={styles.saveTag}>{t('billing.savePct', { pct: annualSavingPct }, lang)}</span>}
              </button>
            </div>

            <div style={styles.amountSection}>
              <p style={styles.fixedPrice}>
                {formatAmount(amountCents, displayCurrency)}
                <span style={styles.fixedPriceUnit}>{t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}</span>
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

        <p style={styles.disclaimer}>{t(isStoreContext ? 'billing.storePaymentDisclaimer' : 'billing.securePaymentDisclaimer', undefined, lang)}</p>
      </div>
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '22px 20px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTitle:   { fontSize: 15, fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: '-0.2px' },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.85)', lineHeight: 1.5, maxWidth: 280 },
  missionCard: { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 16, padding: 15 },
  missionTitle:{ fontSize: 12, fontWeight: 800, color: 'var(--bk)', marginBottom: 6 },
  missionBody: { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.55 },

  compareCard: { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: '6px 12px 12px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' },
  compareRow:  { display: 'grid', gridTemplateColumns: '1fr 42px 52px 66px', alignItems: 'center', gap: 4, padding: '7px 0', borderBottom: '0.5px solid var(--g1)' },
  compareHeadRow: { order: -1, borderBottom: '1px solid var(--g2)', borderTop: 'none' },
  compareLabel:{ fontSize: 11.5, fontWeight: 600, color: 'var(--bk)' },
  compareCell: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
  compareCellHead: { fontSize: 9.5, fontWeight: 800, color: 'var(--g5)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.2, lineHeight: 1.15 },
  compareDash: { fontSize: 12, fontWeight: 700, color: 'var(--g3)' },

  statusCard:  { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  statusLabel: { fontSize: 11, fontWeight: 700, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusAmount:{ fontSize: 20, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  statusTitle: { fontSize: 13.5, fontWeight: 800, color: 'var(--bk)' },
  statusSub:   { fontSize: 12, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, maxWidth: 280 },
  statusActions:{ display: 'flex', gap: 8, width: '100%', marginTop: 8 },

  tierRow:     { display: 'flex', gap: 10 },
  tierCard:    { position: 'relative', flex: 1, minWidth: 0, background: 'var(--card-bg)', border: '1.5px solid var(--g2)', borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' },
  tierCardActive: { borderColor: 'var(--or)', boxShadow: '0 0 0 3px rgba(157,67,0,.12)' },
  tierBadge:   { position: 'absolute', top: -9, right: 10, background: 'var(--grad-vivid)', color: 'white', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, padding: '3px 7px', borderRadius: 7 },
  tierName:    { fontSize: 12.5, fontWeight: 800, color: 'var(--bk)' },
  tierPrice:   { fontSize: 17, fontWeight: 900, color: 'var(--or)', letterSpacing: '-0.4px', display: 'flex', alignItems: 'baseline', gap: 3 },
  tierPriceUnit: { fontSize: 10, fontWeight: 700, color: 'var(--g5)' },
  tierDesc:    { fontSize: 10.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.4 },

  currencyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  currencyLabel:{ fontSize: 12, fontWeight: 700, color: 'var(--bk)' },
  currencyToggle:{ display: 'flex', gap: 6, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 10, padding: 3 },
  currencyBtn: { padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 7, border: 'none', background: 'transparent', fontFamily: 'var(--font)' },
  currencyBtnActive:{ color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  modeToggle:  { display: 'flex', gap: 6, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 12, padding: 4 },
  modeBtn:     { flex: 1, textAlign: 'center', padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'transparent', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modeBtnActive:{ color: 'white', background: 'var(--grad-primary)', boxShadow: 'var(--shadow-glow)' },
  saveTag:     { fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.22)', borderRadius: 5, padding: '1px 4px' },
  modeNote:    { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', marginTop: -6 },
  amountSection:{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', padding: '8px 0 4px' },
  fixedPrice:  { fontSize: 30, fontWeight: 900, color: 'var(--bk)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'baseline', gap: 4 },
  fixedPriceUnit: { fontSize: 14, fontWeight: 700, color: 'var(--g5)' },
  errorMsg:    { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  disclaimer:  { fontSize: 10, fontWeight: 500, color: 'var(--g4)', textAlign: 'center', lineHeight: 1.5 },
  redeemLink:  { alignSelf: 'center', border: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: 'var(--g5)', textDecoration: 'underline', cursor: 'pointer', padding: 4 },
  redeemBox:   { display: 'flex', flexDirection: 'column', gap: 8 },
  redeemInput: { flex: 1, border: '0.5px solid var(--g2)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--bk)', outline: 'none', background: 'var(--g1)', boxSizing: 'border-box' },
  redeemSuccess:{ fontSize: 12.5, fontWeight: 600, color: 'var(--gr)', background: 'var(--grl)', borderRadius: 8, padding: '8px 10px' },
}
