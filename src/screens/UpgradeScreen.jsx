// Tela de assinatura — o app inteiro exige assinatura ativa, então essa
// tela aparece tanto como paywall de tela cheia (PaywallGate em App.jsx,
// pra quem ainda não assinou) quanto pelo link "Minha assinatura" no
// Perfil (pra quem já assina, ver/gerenciar o plano). Preço mostrado já
// reflete a moeda certa (BRL Brasil, USD resto), mas quem decide de
// verdade a moeda cobrada é o backend (api/create-checkout-session.js,
// mesmo header x-vercel-ip-country) — aqui é só pra mostrar o preço certo
// antes da pessoa clicar.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { startCheckout } from '../billing/subscriptionStore'

const PRICES = {
  brl: { monthly: 'R$19,90', annual: 'R$159,90', symbol: 'R$' },
  usd: { monthly: '$6.99', annual: '$59.99', symbol: '$' },
}

const FEATURES = [
  { icon: 'BookOpen', key: 'featureReading' },
  { icon: 'HandHeart', key: 'featurePrayer' },
  { icon: 'GraduationCap', key: 'featureStudies' },
  { icon: 'Users', key: 'featureCommunity' },
]

export default function UpgradeScreen({ session }) {
  const { lang } = session
  const [currency, setCurrency] = useState('brl')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && country && country !== 'BR') setCurrency('usd')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function handleSubscribe(plan) {
    setLoadingPlan(plan)
    setError('')
    try {
      const url = await startCheckout(plan)
      window.location.href = url
    } catch {
      setError(t('billing.checkoutError', undefined, lang))
      setLoadingPlan(null)
    }
  }

  const prices = PRICES[currency]

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

        <div style={styles.featureList}>
          {FEATURES.map(f => (
            <div key={f.key} style={styles.featureRow}>
              <div style={styles.featureIcon}><AppIcon name={f.icon} size={16} color="var(--or)" /></div>
              <p style={styles.featureText}>{t(`billing.${f.key}`, undefined, lang)}</p>
            </div>
          ))}
        </div>

        <div style={styles.plans}>
          <div style={styles.planCard}>
            <p style={styles.planLabel}>{t('billing.planMonthly', undefined, lang)}</p>
            <p style={styles.planPrice}>{prices.monthly}<span style={styles.planPeriod}>{t('billing.perMonth', undefined, lang)}</span></p>
            <button className="btn-primary" disabled={loadingPlan !== null} onClick={() => handleSubscribe('monthly')}>
              {loadingPlan === 'monthly' ? t('billing.redirecting', undefined, lang) : t('billing.subscribeBtn', undefined, lang)}
            </button>
          </div>
          <div style={{ ...styles.planCard, ...styles.planCardFeatured }}>
            <span style={styles.planBadge}>{t('billing.bestValue', undefined, lang)}</span>
            <p style={styles.planLabel}>{t('billing.planAnnual', undefined, lang)}</p>
            <p style={styles.planPrice}>{prices.annual}<span style={styles.planPeriod}>{t('billing.perYear', undefined, lang)}</span></p>
            <button className="btn-primary" disabled={loadingPlan !== null} onClick={() => handleSubscribe('annual')}>
              {loadingPlan === 'annual' ? t('billing.redirecting', undefined, lang) : t('billing.subscribeBtn', undefined, lang)}
            </button>
          </div>
        </div>

        {error && <p style={styles.errorMsg}>{error}</p>}

        <p style={styles.disclaimer}>{t('billing.testModeDisclaimer', undefined, lang)}</p>
      </div>
    </div>
  )
}

const styles = {
  body:        { padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  hero:        { position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '22px 20px', background: 'var(--grad-vivid)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', boxShadow: 'var(--shadow-glow)' },
  heroOrb:     { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -50 },
  heroTitle:   { fontSize: 15, fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: '-0.2px' },
  heroSub:     { fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.85)', lineHeight: 1.5, maxWidth: 280 },
  featureList: { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-card)' },
  featureRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  featureIcon: { width: 30, height: 30, borderRadius: 9, background: 'var(--olt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { fontSize: 12.5, fontWeight: 600, color: 'var(--bk)' },
  plans:       { display: 'flex', gap: 10 },
  planCard:    { flex: 1, background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-card)', position: 'relative' },
  planCardFeatured: { border: '1.5px solid var(--or)', boxShadow: 'var(--shadow-premium)' },
  planBadge:   { position: 'absolute', top: -10, background: 'var(--grad-vivid)', color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, boxShadow: '0 3px 8px rgba(249,115,22,.35)' },
  planLabel:   { fontSize: 12, fontWeight: 700, color: 'var(--g5)', marginTop: 4 },
  planPrice:   { fontSize: 19, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' },
  planPeriod:  { fontSize: 10.5, fontWeight: 600, color: 'var(--g4)', marginLeft: 3 },
  errorMsg:    { fontSize: 12.5, fontWeight: 600, color: 'var(--re)', background: 'var(--rel)', borderRadius: 8, padding: '8px 10px' },
  disclaimer:  { fontSize: 10, fontWeight: 500, color: 'var(--g4)', textAlign: 'center', lineHeight: 1.5 },
}
