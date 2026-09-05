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
    <div style={s.screen}>
      <div style={s.body}>

        <div style={s.hero}>
          <span style={s.heroIcon}><AppIcon name="Crown" size={22} color="var(--bento-ink)" /></span>
          <p style={s.heroTitle}>{t('billing.heroTitle', undefined, lang)}</p>
          <p style={s.heroSub}>{t('billing.heroSub', undefined, lang)}</p>
        </div>

        <div style={s.card}>
          <p style={s.missionTitle}>{t('billing.missionTitle', undefined, lang)}</p>
          <p style={s.missionBody}>{t('billing.missionBody', undefined, lang)}</p>
        </div>

        {/* Comparativo dos 3 níveis */}
        <div style={s.card}>
          {COMPARE.map(row => {
            const inFree = row.tier === 'free'
            const inPremium = TIER_RANK[row.tier] <= 1
            return (
              <div key={row.key} style={s.compareRow}>
                <span style={s.compareLabel}>{t(`billing.compare.${row.key}`, undefined, lang)}</span>
                <span style={s.compareCell}>{inFree ? <AppIcon name="Check" size={13} color="var(--bento-t4)" /> : <span style={s.compareDash}>–</span>}</span>
                <span style={s.compareCell}>{inPremium ? <AppIcon name="Check" size={13} color="var(--bento-accent)" /> : <span style={s.compareDash}>–</span>}</span>
                <span style={s.compareCell}><AppIcon name="Check" size={13} color="var(--bento-accent)" /></span>
              </div>
            )
          })}
          <div style={{ ...s.compareRow, ...s.compareHeadRow }}>
            <span style={s.compareLabel} />
            <span style={s.compareCellHead}>{t('billing.tiers.free', undefined, lang)}</span>
            <span style={s.compareCellHead}>{t('billing.tiers.premium', undefined, lang)}</span>
            <span style={s.compareCellHead}>{t('billing.tiers.premiumAi', undefined, lang)}</span>
          </div>
        </div>

        {isLifetime && (
          <div style={s.statusCard}>
            <AppIcon name="Crown" size={20} color="var(--bento-accent)" />
            <p style={s.statusTitle}>{t('billing.alreadyLifetimeTitle', undefined, lang)}</p>
            <p style={s.statusSub}>{t('billing.alreadyLifetimeSub', undefined, lang)}</p>
          </div>
        )}

        {isRecurringActive && !changingPlan && (
          <div style={s.statusCard}>
            <p style={s.statusLabel}>{t('billing.currentContributionTitle', undefined, lang)}</p>
            <p style={s.statusTitle}>
              {t(entitlement.tier === 'premium' ? 'billing.tiers.premium' : 'billing.tiers.premiumAi', undefined, lang)}
            </p>
            <p style={s.statusAmount}>
              {subscription.amount_cents != null && subscription.currency
                ? `${formatAmount(subscription.amount_cents, subscription.currency)}${t(subscription.plan === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}`
                : '—'}
            </p>
            <div style={s.statusActions}>
              <button style={s.secondaryBtn} onClick={startChangingPlan}>
                {t('billing.changeAmountBtn', undefined, lang)}
              </button>
              <button style={s.secondaryBtn} onClick={handleManagePayment}>
                {t('billing.managePaymentBtn', undefined, lang)}
              </button>
            </div>
          </div>
        )}

        {subscription?.access_type === 'free' && subscription?.status === 'active' && (
          <div style={s.statusCard}>
            <p style={s.statusTitle}>{t('billing.alreadyFreeTitle', undefined, lang)}</p>
            <p style={s.statusSub}>{t('billing.alreadyFreeSub', undefined, lang)}</p>
          </div>
        )}

        {showPicker && (
          <>
            {/* Escolha do tier */}
            <div style={s.tierRow}>
              {['premium', 'premium_ai'].map(tr => {
                const active = selectedTier === tr
                const priceTier = getStoreTier(tr, mode)
                return (
                  <button
                    key={tr}
                    style={{ ...s.tierCard, ...(active ? s.tierCardActive : {}) }}
                    onClick={() => { setSelectedTier(tr); setError('') }}
                  >
                    {tr === 'premium_ai' && <span style={s.tierBadge}>{t('billing.mostPopular', undefined, lang)}</span>}
                    <span style={{ ...s.tierName, color: active ? '#fff' : 'var(--bento-ink)' }}>{t(tr === 'premium' ? 'billing.tiers.premium' : 'billing.tiers.premiumAi', undefined, lang)}</span>
                    <span style={{ ...s.tierPrice, color: active ? 'var(--bento-accent)' : 'var(--bento-ink)' }}>
                      {formatAmount(Math.round(priceTier[currency] * 100), currency)}
                      <span style={{ ...s.tierPriceUnit, color: active ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>{t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}</span>
                    </span>
                    <span style={{ ...s.tierDesc, color: active ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{t(tr === 'premium' ? 'billing.tiers.premiumDesc' : 'billing.tiers.premiumAiDesc', undefined, lang)}</span>
                  </button>
                )
              })}
            </div>

            {!isStoreContext && (
              <>
                <div style={s.currencyRow}>
                  <p style={s.currencyLabel}>{t('billing.currencyLabel', undefined, lang)}</p>
                  <div style={s.segmentToggle}>
                    <button style={{ ...s.segmentBtn, ...(currency === 'brl' ? s.segmentBtnActive : {}) }} onClick={() => switchCurrency('brl')}>R$</button>
                    <button style={{ ...s.segmentBtn, ...(currency === 'usd' ? s.segmentBtnActive : {}) }} onClick={() => switchCurrency('usd')}>US$</button>
                  </div>
                </div>
                <p style={s.modeNote}>{t('billing.currencyHint', undefined, lang)}</p>
              </>
            )}

            <div style={s.segmentToggleWide}>
              <button style={{ ...s.segmentBtnWide, ...(mode === 'monthly' ? s.segmentBtnActive : {}) }} onClick={() => { setMode('monthly'); setError('') }}>
                {t('billing.modeMonthly', undefined, lang)}
              </button>
              <button style={{ ...s.segmentBtnWide, ...(mode === 'annual' ? s.segmentBtnActive : {}) }} onClick={() => { setMode('annual'); setError('') }}>
                {t('billing.modeAnnual', undefined, lang)}
                {annualSavingPct > 0 && <span style={s.saveTag}>{t('billing.savePct', { pct: annualSavingPct }, lang)}</span>}
              </button>
            </div>

            <div style={s.amountSection}>
              <p style={s.fixedPrice}>
                {formatAmount(amountCents, displayCurrency)}
                <span style={s.fixedPriceUnit}>{t(mode === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}</span>
              </p>
            </div>

            <button style={{ ...s.primaryBtn, opacity: submitting ? .6 : 1 }} disabled={submitting} onClick={handleSubmit}>
              {submitLabel}
            </button>
          </>
        )}

        {error && <p style={s.errorMsg}>{error}</p>}

        {!showRedeem ? (
          <button style={s.redeemLink} onClick={() => setShowRedeem(true)}>
            {t('billing.redeemCodeLink', undefined, lang)}
          </button>
        ) : (
          <div style={s.redeemBox}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={s.redeemInput}
                type="text"
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value)}
                placeholder={t('billing.redeemCodePlaceholder', undefined, lang)}
              />
              <button style={{ ...s.secondaryBtn, flex: 'none', padding: '0 16px' }} disabled={redeeming} onClick={handleRedeem}>
                {redeeming ? t('billing.redeemCodeRedeeming', undefined, lang) : t('billing.redeemCodeBtn', undefined, lang)}
              </button>
            </div>
            {redeemError && <p style={s.errorMsg}>{redeemError}</p>}
            {redeemResult === 'free' && <p style={s.redeemSuccess}>{t('billing.redeemCodeFreeSuccess', undefined, lang)}</p>}
            {redeemResult === 'discount_pending' && <p style={s.redeemSuccess}>{t('billing.redeemCodeDiscountSuccess', undefined, lang)}</p>}
          </div>
        )}

        <p style={s.disclaimer}>{t(isStoreContext ? 'billing.storePaymentDisclaimer' : 'billing.securePaymentDisclaimer', undefined, lang)}</p>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'

const s = {
  screen:      { overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 83, height: '100%', background: 'var(--bento-bg)' },
  body:        { padding: '20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  hero:        { borderRadius: 24, padding: '22px 20px', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' },
  heroIcon:    { width: 40, height: 40, borderRadius: 13, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroTitle:   { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 4, letterSpacing: '-0.2px' },
  heroSub:     { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, maxWidth: 280, margin: 0 },

  card:        { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px' },
  missionTitle:{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 6 },
  missionBody: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.55, margin: 0 },

  compareRow:  { display: 'grid', gridTemplateColumns: '1fr 42px 52px 66px', alignItems: 'center', gap: 4, padding: '7px 0', borderBottom: '1px solid var(--bento-line)' },
  compareHeadRow: { order: -1, borderBottom: '1px solid var(--bento-divider)', borderTop: 'none' },
  compareLabel:{ fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-ink)' },
  compareCell: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
  compareCellHead: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, color: 'var(--bento-t4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.2, lineHeight: 1.15 },
  compareDash: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t5)' },

  statusCard:  { borderRadius: 24, background: 'var(--bento-card)', padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' },
  statusLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusAmount:{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-0.3px' },
  statusTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  statusSub:   { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, maxWidth: 280 },
  statusActions:{ display: 'flex', gap: 8, width: '100%', marginTop: 8 },

  tierRow:     { display: 'flex', gap: 10 },
  tierCard:    { position: 'relative', flex: 1, minWidth: 0, background: 'var(--bento-card)', border: 'none', borderRadius: 20, padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' },
  tierCardActive: { background: 'var(--bento-ink)' },
  tierBadge:   { position: 'absolute', top: -9, right: 10, background: 'var(--bento-accent)', color: 'var(--bento-ink)', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, padding: '3px 7px', borderRadius: 7 },
  tierName:    { fontSize: 12.5, fontWeight: 800 },
  tierPrice:   { fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px', display: 'flex', alignItems: 'baseline', gap: 3 },
  tierPriceUnit: { fontSize: 10, fontWeight: 700 },
  tierDesc:    { fontSize: 10.5, fontWeight: 500, lineHeight: 1.4 },

  currencyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  currencyLabel:{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)' },
  segmentToggle:{ display: 'flex', gap: 4, background: 'var(--bento-line)', borderRadius: 12, padding: 3 },
  segmentBtn:  { padding: '7px 14px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'transparent' },
  segmentBtnActive:{ color: '#fff', background: 'var(--bento-ink)' },
  segmentToggleWide: { display: 'flex', gap: 4, background: 'var(--bento-line)', borderRadius: 14, padding: 4 },
  segmentBtnWide: { flex: 1, textAlign: 'center', padding: '10px 8px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 10, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveTag:     { fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.22)', borderRadius: 5, padding: '1px 4px' },
  modeNote:    { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', marginTop: -6 },
  amountSection:{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', padding: '8px 0 4px' },
  fixedPrice:  { fontFamily: FONT, fontSize: 30, fontWeight: 900, color: 'var(--bento-ink)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'baseline', gap: 4 },
  fixedPriceUnit: { fontSize: 14, fontWeight: 700, color: 'var(--bento-t3)' },

  primaryBtn:  { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  secondaryBtn:{ flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  errorMsg:    { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--re)', margin: 0, textAlign: 'center' },
  disclaimer:  { fontFamily: FONT, fontSize: 10, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'center', lineHeight: 1.5 },
  redeemLink:  { alignSelf: 'center', border: 'none', background: 'none', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', textDecoration: 'underline', cursor: 'pointer', padding: 4 },
  redeemBox:   { display: 'flex', flexDirection: 'column', gap: 8 },
  redeemInput: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', boxSizing: 'border-box' },
  redeemSuccess:{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: 0, textAlign: 'center' },
}
