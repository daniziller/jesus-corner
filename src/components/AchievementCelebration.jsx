// Folha de celebração de uma conquista recém-desbloqueada (redesign 1f/
// etapa 5) — substitui a grade permanente de conquistas na aba Progresso:
// uma conquista agora só aparece no INSTANTE em que é ganha, não como lista
// de troféus sempre visível (ver README do handoff). Disparada pelo App.jsx
// comparando session.achievements com src/achievements/seenAchievementsStore.js.
import { createPortal } from 'react-dom'
import AchievementBadge from './AchievementBadge'
import { t } from '../i18n'

export default function AchievementCelebration({ achievement, lang, onClose }) {
  if (!achievement) return null

  return createPortal(
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <p style={styles.eyebrow}>{t('progress.achievementUnlocked', undefined, lang)}</p>
        <AchievementBadge icon={achievement.icon} tone={achievement.tone} unlocked size={72} style={{ margin: '4px 0 16px' }} />
        <p style={styles.title}>{achievement.title}</p>
        <p style={styles.desc}>{achievement.desc}</p>
        <span style={styles.xp}>+{achievement.xp} XP</span>
        <button style={styles.btn} onClick={onClose}>{t('progress.achievementContinue', undefined, lang)}</button>
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(18,18,18,.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 320, background: 'var(--white)', borderRadius: 26,
    padding: '30px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', boxShadow: 'var(--shadow-premium)',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'var(--or)', margin: '0 0 2px',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--bk)', margin: '0 0 6px' },
  desc: { fontSize: 13, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, margin: '0 0 14px' },
  xp: {
    fontSize: 12, fontWeight: 800, color: 'var(--or)', background: 'rgba(157,67,0,.1)',
    borderRadius: 99, padding: '5px 14px', marginBottom: 22,
  },
  btn: {
    width: '100%', height: 48, borderRadius: 99, border: 'none', background: 'var(--grad-primary)',
    color: 'white', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
}
