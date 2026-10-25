// ReadingChoiceScreen.jsx — "Onde você vai ler hoje?" (pedido dela,
// 2026-10-25). Abre ANTES do leitor toda vez que o plano manda pra
// Leitura (ver goToReadingStep em App.jsx): ler no app (o leitor de
// sempre, com marcações/anotações/contexto) ou ler na Bíblia física
// (PhysicalReadingScreen.jsx: só o que ler hoje e o botão de marcar).
// Só existe pro plano fixo com sessão de leitura de verdade — tema/
// cronológico/grupo e "sem plano" continuam abrindo direto (ver
// readingChoiceApplies em App.jsx).
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ReadingChoiceScreen({ session, onReadInApp, onReadPhysical, onBackToPlan }) {
  const { lang, todaySession } = session
  const L = (k, vars) => t(`readingChoice.${k}`, vars, lang)

  return (
    <div style={styles.screen}>
      <div style={styles.body}>
        <p style={styles.eyebrow}>{L('pageTitle')}</p>
        <p style={styles.headline}>{L('question')}</p>
        {todaySession?.title && (
          <p style={styles.context}>{todaySession.title}{todaySession.subtitle ? ` · ${todaySession.subtitle}` : ''}</p>
        )}

        <button style={styles.optionCard} onClick={onReadInApp}>
          <span style={styles.optionIcon}><AppIcon name="BookOpen" size={20} strokeWidth={2} color="var(--bento-ink)" /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.optionTitle}>{L('appTitle')}</span>
            <span style={styles.optionSub}>{L('appSub')}</span>
          </span>
          <AppIcon name="ChevronRight" size={16} strokeWidth={2} color="var(--bento-t4)" />
        </button>

        <button style={styles.optionCard} onClick={onReadPhysical}>
          <span style={styles.optionIcon}><AppIcon name="BookMarked" size={20} strokeWidth={2} color="var(--bento-ink)" /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={styles.optionTitle}>{L('physicalTitle')}</span>
            <span style={styles.optionSub}>{L('physicalSub')}</span>
          </span>
          <AppIcon name="ChevronRight" size={16} strokeWidth={2} color="var(--bento-t4)" />
        </button>
      </div>

      <div style={styles.footer}>
        <button style={styles.backLink} onClick={onBackToPlan}>{L('backToPlanLink')}</button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  eyebrow: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  headline: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  context: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 10px' },

  optionCard: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 24, border: 'none', background: 'var(--bento-card)', padding: '18px 18px', cursor: 'pointer', textAlign: 'left' },
  optionIcon: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { display: 'block', fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 3px' },
  optionSub: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  backLink: { border: 'none', background: 'none', padding: '8px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t3)', textAlign: 'center' },
}
