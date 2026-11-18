// Tela de assinatura — duas versões (pedido dela, 2026-11-18): a grátis,
// com recursos limitados, e o Premium, um plano só, mensal — R$27 no
// Brasil, US$7 no resto do mundo (PAID_PLAN em ../billing/storeTiers, o
// mesmo valor das lojas nativas e do Stripe/web). O comparativo vem de
// ../billing/planFeatures, a mesma lista que o onboarding mostra.
//
// Aparece tanto pra quem está no grátis e quer assinar (via aba
// "Assinatura" ou por um cadeado de recurso Premium) quanto pelo link
// "Minha assinatura" no Perfil (pra quem já assina, ver e gerenciar).
// Quem assinou um plano que não se vende mais (anual, "Premium + IA")
// continua nele, no preço que paga — a tela só mostra o que é e o caminho
// pra gerenciar.
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
import { PAID_PLAN, GOOGLE_PLAY_SUBSCRIPTION_ID, paidPlanCents, currencyForCountry } from '../billing/storeTiers'
import { FREE_FEATURES, PREMIUM_FEATURES } from '../billing/planFeatures'
import { formatAmount } from '../billing/formatAmount'
import { redeemInviteCode } from '../invites/inviteStore'
import { trackOnboardingEvent } from '../analytics/onboardingEvents'
import Cabecalho from '../components/comunidade/Cabecalho'

export default function UpgradeScreen({ session, subscription, onSubscriptionRefreshed, onBack }) {
  const { lang } = session
  const [currency, setCurrency] = useState(() => currencyForCountry(null, lang))
  const currencyTouchedRef = useRef(false)
  // "Não encontramos uma cobrança ativa vinculada" (portal do Stripe sem
  // assinatura): mostra o botão de assinar de novo mesmo com o status ativo.
  const [resubscribing, setResubscribing] = useState(false)
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

  // Brasil paga em reais; o resto do mundo, em dólar.
  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && !currencyTouchedRef.current && country) setCurrency(currencyForCountry(country, lang))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [lang])

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
        const details = await getIOSProducts([PAID_PLAN.appleProductId])
        if (!cancelled) setStorePrices(details)
      }
    }
    loadStorePrices()
    return () => { cancelled = true }
  }, [storeContext])

  const isLifetime = subscription?.access_type === 'lifetime' && subscription?.status === 'active'
  const isRecurringActive = subscription?.access_type === 'recurring' && isPremiumActive(subscription)
  const isFreeGrant = subscription?.access_type === 'free' && subscription?.status === 'active'
  const isStoreContext = storeContext !== 'stripe'

  // Na loja, o preço que aparece é o que a loja vai cobrar; fora dela, o
  // de PAID_PLAN na moeda escolhida.
  const storeKey = storeContext === 'google_play' ? PAID_PLAN.googlePlayBasePlan : PAID_PLAN.appleProductId
  const storePrice = isStoreContext ? storePrices[storeKey] : null
  const displayCurrency = storePrice?.currency ? storePrice.currency.toLowerCase() : currency
  const amountCents = storePrice ? Math.round(parseFloat(storePrice.value) * 100) : paidPlanCents(currency)
  const priceLabel = formatAmount(amountCents, displayCurrency)

  function switchCurrency(next) {
    currencyTouchedRef.current = true
    setCurrency(next)
    setError('')
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    // Funil do admin (23a) — "Iniciou trial"/checkout, mesmo passo que o
    // onboarding usa (ver OnboardingFlow.jsx), best-effort.
    trackOnboardingEvent('checkout_started')
    try {
      if (storeContext === 'google_play') {
        await startPlayBillingPurchase({ sku: GOOGLE_PLAY_SUBSCRIPTION_ID, basePlanId: PAID_PLAN.googlePlayBasePlan })
        window.location.href = '/?checkout=success'
      } else if (storeContext === 'apple') {
        await startIOSPurchase({ productId: PAID_PLAN.appleProductId, mode: 'monthly' })
        window.location.href = '/?checkout=success'
      } else {
        const url = await startCheckout({ currency })
        window.location.href = url
      }
    } catch (err) {
      if (err.message === 'user_cancelled') { setSubmitting(false); return }
      setError(err.message === 'other_provider_active' ? t('billing.otherProviderActiveError', undefined, lang) : t('billing.checkoutError', undefined, lang))
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
      setResubscribing(true)
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

  const showPicker = !isLifetime && (!isRecurringActive || resubscribing)
  const perMonth = t('billing.perMonth', undefined, lang)
  const submitLabel = submitting
    ? t('billing.redirecting', undefined, lang)
    : t('billing.subscribeBtn', { amount: priceLabel, unit: perMonth }, lang)

  return (
    <div style={s.screen}>
      {/* Cabeçalho próprio (voltar + título), como as outras telas novas —
          antes era a única tela que ainda recebia o cabeçalho antigo do
          app (logo, sino, avatar) por cima. */}
      <Cabecalho lang={lang} title={t('billing.pageTitle', undefined, lang)} onBack={onBack} />
      <div style={s.body}>

        <div style={s.hero}>
          <span style={s.heroIcon}><AppIcon name="Crown" size={22} color="var(--bento-ink)" /></span>
          <p style={s.heroTitle}>{t('billing.heroTitle', undefined, lang)}</p>
          <p style={s.heroPrice}>{priceLabel}<span style={s.heroPriceUnit}>{perMonth}</span></p>
          <p style={s.heroSub}>{t('billing.heroSub', undefined, lang)}</p>
        </div>

        {/* Comparativo das duas versões: o que o grátis tem (as duas colunas
            marcadas) e o que só o Premium tem. */}
        <div style={s.card}>
          <div style={{ ...s.compareRow, ...s.compareHeadRow }}>
            <span style={s.compareLabel} />
            <span style={s.compareCellHead}>{t('billing.tiers.free', undefined, lang)}</span>
            <span style={{ ...s.compareCellHead, color: 'var(--bento-accent)' }}>{t('billing.tiers.premium', undefined, lang)}</span>
          </div>
          {[...FREE_FEATURES.map(key => ({ key, free: true })), ...PREMIUM_FEATURES.map(key => ({ key, free: false }))].map((row, i, all) => (
            <div key={row.key} style={{ ...s.compareRow, ...(i === all.length - 1 ? { borderBottom: 'none' } : null) }}>
              <span style={s.compareLabel}>{t(`billing.features.${row.key}`, undefined, lang)}</span>
              <span style={s.compareCell}>{row.free ? <AppIcon name="Check" size={13} color="var(--bento-t4)" /> : <span style={s.compareDash}>–</span>}</span>
              <span style={s.compareCell}><AppIcon name="Check" size={13} color="var(--bento-accent)" /></span>
            </div>
          ))}
        </div>

        {isLifetime && (
          <div style={s.statusCard}>
            <AppIcon name="Crown" size={20} color="var(--bento-accent)" />
            <p style={s.statusTitle}>{t('billing.alreadyLifetimeTitle', undefined, lang)}</p>
            <p style={s.statusSub}>{t('billing.alreadyLifetimeSub', undefined, lang)}</p>
          </div>
        )}

        {isRecurringActive && !resubscribing && (
          <div style={s.statusCard}>
            <p style={s.statusLabel}>{t('billing.currentContributionTitle', undefined, lang)}</p>
            <p style={s.statusTitle}>{t('billing.tiers.premium', undefined, lang)}</p>
            <p style={s.statusAmount}>
              {subscription.amount_cents != null && subscription.currency
                ? `${formatAmount(subscription.amount_cents, subscription.currency)}${t(subscription.plan === 'annual' ? 'billing.perYear' : 'billing.perMonth', undefined, lang)}`
                : '—'}
            </p>
            <p style={s.statusSub}>{t('billing.allIncludedSub', undefined, lang)}</p>
            <div style={s.statusActions}>
              <button style={s.secondaryBtn} onClick={handleManagePayment}>
                {t('billing.managePaymentBtn', undefined, lang)}
              </button>
            </div>
          </div>
        )}

        {isFreeGrant && (
          <div style={s.statusCard}>
            <p style={s.statusTitle}>{t('billing.alreadyFreeTitle', undefined, lang)}</p>
            <p style={s.statusSub}>{t('billing.alreadyFreeSub', undefined, lang)}</p>
          </div>
        )}

        {showPicker && !isFreeGrant && (
          <>
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

            <button style={{ ...s.primaryBtn, opacity: submitting ? .6 : 1 }} disabled={submitting} onClick={handleSubmit}>
              {submitLabel}
            </button>
            <p style={s.cancelNote}>{t('billing.cancelAnytime', undefined, lang)}</p>
          </>
        )}

        {error && <p style={s.errorMsg}>{error}</p>}

        <div style={s.card}>
          <p style={s.missionTitle}>{t('billing.missionTitle', undefined, lang)}</p>
          <p style={s.missionBody}>{t('billing.missionBody', undefined, lang)}</p>
        </div>

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
  heroPrice:   { fontFamily: FONT, fontSize: 30, fontWeight: 900, color: 'var(--bento-accent)', letterSpacing: '-0.6px', display: 'flex', alignItems: 'baseline', gap: 3, margin: '2px 0 4px' },
  heroPriceUnit: { fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.5)' },
  heroSub:     { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, maxWidth: 290, margin: 0 },

  card:        { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px' },
  missionTitle:{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', marginBottom: 6 },
  missionBody: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.55, margin: 0 },

  compareRow:  { display: 'grid', gridTemplateColumns: '1fr 48px 60px', alignItems: 'center', gap: 4, padding: '8px 0', borderBottom: '1px solid var(--bento-line)' },
  compareHeadRow: { borderBottom: '1px solid var(--bento-divider)', paddingTop: 0 },
  compareLabel:{ fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-ink)' },
  compareCell: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
  compareCellHead: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, color: 'var(--bento-t4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.2, lineHeight: 1.15 },
  compareDash: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t5)' },

  statusCard:  { borderRadius: 24, background: 'var(--bento-card)', padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' },
  statusLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusAmount:{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-0.3px' },
  statusTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)' },
  statusSub:   { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, maxWidth: 280 },
  statusActions:{ display: 'flex', gap: 8, width: '100%', marginTop: 8 },


  currencyRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  currencyLabel:{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)' },
  segmentToggle:{ display: 'flex', gap: 4, background: 'var(--bento-line)', borderRadius: 12, padding: 3 },
  segmentBtn:  { padding: '7px 14px', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', borderRadius: 9, border: 'none', background: 'transparent' },
  segmentBtnActive:{ color: '#fff', background: 'var(--bento-ink)' },
  cancelNote:  { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'center', margin: '-2px 0 0' },
  modeNote:    { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', marginTop: -6 },

  primaryBtn:  { width: '100%', height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  secondaryBtn:{ flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  errorMsg:    { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: 0, textAlign: 'center' },
  disclaimer:  { fontFamily: FONT, fontSize: 10, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'center', lineHeight: 1.5 },
  redeemLink:  { alignSelf: 'center', border: 'none', background: 'none', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', textDecoration: 'underline', cursor: 'pointer', padding: 4 },
  redeemBox:   { display: 'flex', flexDirection: 'column', gap: 8 },
  redeemInput: { flex: 1, border: 'none', borderRadius: 12, padding: '11px 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--bento-ink)', outline: 'none', background: 'var(--bento-line)', boxSizing: 'border-box' },
  redeemSuccess:{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-accent)', margin: 0, textAlign: 'center' },
}
