import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

// Cartão de bloqueio compacto, pra usar INLINE dentro de uma tela que
// continua acessível (ex: dentro da Home, do Progresso, ou de um painel de
// ReadingBlockView) — diferente do PremiumRequired em App.jsx, que ocupa a
// tela inteira e é usado quando a ABA inteira está bloqueada.
//
// variant: 'premium' (recursos do plano Premium) ou 'ai' (recursos que
// exigem Premium + IA). title/sub aceitam texto customizado por chamada;
// sem eles, cai no texto genérico da variante.
export default function PremiumLockCard({ lang, onNavigate, title, sub, variant = 'premium' }) {
  const ai = variant === 'ai'
  return (
    <div style={styles.card}>
      <div style={styles.iconWrap}>
        <AppIcon name={ai ? 'Sparkles' : 'Crown'} size={18} color="var(--bento-accent)" />
      </div>
      <p style={styles.title}>{title ?? t(ai ? 'billing.lock.aiTitle' : 'billing.lock.premiumTitle', undefined, lang)}</p>
      <p style={styles.sub}>{sub ?? t(ai ? 'billing.lock.aiSub' : 'billing.lock.premiumSub', undefined, lang)}</p>
      <button onClick={() => onNavigate?.('upgrade')} style={styles.btn}>
        {t('billing.lock.cta', undefined, lang)}
      </button>
    </div>
  )
}

const styles = {
  card:     { background: 'var(--bento-sand)', border: 'none', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  title:    { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)' },
  sub:      { fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', lineHeight: 1.5, maxWidth: 260 },
  btn:      { marginTop: 6, border: 'none', background: 'var(--bento-accent)', color: 'var(--bento-ink)', borderRadius: 12, padding: '9px 18px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-bento)' },
}
