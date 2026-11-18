// OnboardingPlans.jsx — "Grátis e Premium", a parada do onboarding logo
// antes do resultado (pedido dela, 2026-11-18: o onboarding precisa deixar
// claro o que o app oferece). Até aqui a pessoa montou um plano com
// oração, leitura e reflexão e viu uma demonstração — sem saber que parte
// disso é paga. Esta tela diz, antes do cadastro: o que é grátis para
// sempre, o que o Premium acrescenta e quanto custa (R$27/mês no Brasil,
// US$7/mês no resto do mundo).
//
// A lista é a mesma da tela de assinatura (billing/planFeatures.js), pra
// as duas nunca prometerem coisas diferentes. Ninguém assina aqui: a conta
// ainda não existe; o botão só segue para o resultado.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { FREE_FEATURES, PREMIUM_FEATURES } from '../billing/planFeatures'
import { paidPlanCents, currencyForCountry } from '../billing/storeTiers'
import { formatAmount } from '../billing/formatAmount'

const FONT = 'var(--font-bento)'

export default function OnboardingPlans({ lang, onContinue, onBack }) {
  const L = k => t(`onb.${k}`, undefined, lang)
  const B = k => t(`billing.${k}`, undefined, lang)
  // Brasil paga em reais; o resto do mundo, em dólar. Até o país chegar,
  // o idioma decide.
  const [currency, setCurrency] = useState(() => currencyForCountry(null, lang))
  useEffect(() => {
    let cancelled = false
    fetch('/api/geo').then(res => res.json()).then(({ country }) => {
      if (!cancelled && country) setCurrency(currencyForCountry(country, lang))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [lang])
  const price = formatAmount(paidPlanCents(currency), currency)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={L('back')}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
      </div>
      <div style={s.body}>
        <p style={s.kicker}>{L('plansKicker')}</p>
        <p style={s.title}>{L('plansTitle')}</p>
        <p style={s.sub}>{L('plansSub')}</p>

        <section style={s.freeCard} aria-labelledby="plano-gratis">
          <div style={s.cardTop}>
            <p style={s.freeLabel} id="plano-gratis">{L('plansFreeLabel')}</p>
            <p style={s.freePrice}>{L('plansFreePrice')}</p>
          </div>
          {FREE_FEATURES.map(key => (
            <div key={key} style={s.row}>
              <span style={s.dotFree} aria-hidden="true"><AppIcon name="Check" size={11} strokeWidth={3} color="var(--bento-ink)" /></span>
              <p style={s.rowText}>{B(`features.${key}`)}</p>
            </div>
          ))}
        </section>

        <section style={s.premiumCard} aria-labelledby="plano-premium">
          <div style={s.cardTop}>
            <p style={s.premiumLabel} id="plano-premium">{B('tiers.premium')}</p>
            <p style={s.premiumPrice}>{price}<span style={s.premiumUnit}>{B('perMonth')}</span></p>
          </div>
          <p style={s.premiumLead}>{L('plansPremiumLead')}</p>
          {PREMIUM_FEATURES.map(key => (
            <div key={key} style={s.row}>
              <span style={s.dotPremium} aria-hidden="true"><AppIcon name="Plus" size={11} strokeWidth={3} color="var(--bento-ink)" /></span>
              <p style={s.rowTextDark}>{B(`features.${key}`)}</p>
            </div>
          ))}
        </section>
        <p style={s.note}>{L('plansNote')}</p>
      </div>
      <div style={s.footer}>
        <button type="button" style={s.btn} onClick={onContinue}>
          <span style={s.btnText}>{L('plansBtn')}</span>
          <span style={s.btnArrow}><AppIcon name="ArrowRight" size={16} strokeWidth={2.4} style={{ verticalAlign: '-3px' }} /></span>
        </button>
      </div>
    </div>
  )
}

// Mesma casca das perguntas do onboarding (OnboardingFlow.jsx): fundo
// creme, voltar no alto, botão escuro no rodapé.
const s = {
  screen: { height: '100%', minHeight: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  header: { flex: 'none', display: 'flex', alignItems: 'center', padding: '22px 22px 0' },
  backBtn: { width: 44, height: 44, borderRadius: 14, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 22px 0', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box' },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 4px' },
  title: { fontFamily: FONT, fontSize: 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: 0, textWrap: 'pretty' },
  sub: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-t3)', margin: '0 0 8px', textWrap: 'pretty' },

  cardTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 0 8px' },
  freeCard: { flex: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px 10px' },
  freeLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  freePrice: { fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', margin: 0 },
  premiumCard: { flex: 'none', borderRadius: 22, background: 'var(--bento-ink)', padding: '16px 18px 10px' },
  premiumLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  premiumPrice: { fontFamily: FONT, fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-.6px', color: '#fff', margin: 0, display: 'flex', alignItems: 'baseline', gap: 2 },
  premiumUnit: { fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.5)' },
  premiumLead: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'rgba(255,255,255,.55)', margin: '0 0 4px' },

  row: { display: 'flex', alignItems: 'flex-start', gap: 11, padding: '7px 0' },
  dotFree: { width: 20, height: 20, borderRadius: 7, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  dotPremium: { width: 20, height: 20, borderRadius: 7, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  rowText: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-ink)', margin: '1px 0 0' },
  rowTextDark: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,.85)', margin: '1px 0 0' },
  note: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: '2px 2px 0', textAlign: 'center' },

  footer: { flex: 'none', padding: '16px 22px calc(30px + var(--safe-bottom))' },
  btn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', padding: 0 },
  btnText: { fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: '#fff' },
  btnArrow: { fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-accent)' },
}
