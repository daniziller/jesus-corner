import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

// Cartão de bloqueio compacto, pra usar INLINE dentro de uma tela que
// continua acessível (ex: dentro de Comunidade, Progresso, ou um painel de
// ReadingBlockView) — diferente do PremiumRequired em App.jsx, que ocupa a
// tela inteira e é usado quando a ABA inteira está bloqueada. title/sub
// aceitam texto customizado por chamada; sem eles, cai no texto genérico.
export default function PremiumLockCard({ lang, onNavigate, title, sub }) {
  return (
    <div style={styles.card}>
      <div style={styles.iconWrap}><AppIcon name="Crown" size={18} color="var(--or)" /></div>
      <p style={styles.title}>{title ?? t('billing.premiumRequiredTitle', undefined, lang)}</p>
      <p style={styles.sub}>{sub ?? t('billing.premiumRequiredSub', undefined, lang)}</p>
      <button onClick={() => onNavigate?.('upgrade')} style={styles.btn}>
        {t('billing.premiumRequiredCta', undefined, lang)}
      </button>
    </div>
  )
}

const styles = {
  card:     { background: 'var(--olt)', border: '0.5px dashed rgba(249,115,22,.4)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 11, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3, boxShadow: 'var(--shadow-card)' },
  title:    { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  sub:      { fontSize: 11, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, maxWidth: 260 },
  btn:      { marginTop: 6, border: 'none', background: 'var(--grad-vivid)', color: 'white', borderRadius: 11, padding: '9px 18px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' },
}
