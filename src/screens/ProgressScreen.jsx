import { ACCENT_MAP } from '../utils/blockColors'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ProgressScreen({ session, blocks }) {
  const { lang } = session
  const CIRC = 408.41  // 2π×65
  const offset = CIRC - (session.biblePercent / 100) * CIRC

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{translate('progress.pageTitle', undefined, lang)}</h1></div>

      <div style={{ padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dashboard-grid">

          {/* Coluna esquerda: destaque % + progresso por bloco + stats +
              nível. Constância da rotina agora mora na aba Rotina. */}
          <div className="dashboard-col">

            {/* ── Destaque % ── */}
            <div style={styles.bigRingCard}>
              <div style={styles.bigRingGlow} />

              <p style={{ ...styles.bigLabel, color: 'rgba(255,255,255,.9)' }}>{translate('progress.bibleComplete', undefined, lang)}</p>

              {/* Anel grande */}
              <div style={{ position: 'relative', width: 155, height: 155, margin: '6px 0 4px' }}>
                <svg width="155" height="155" viewBox="0 0 155 155" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="77.5" cy="77.5" r="65" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
                  <circle cx="77.5" cy="77.5" r="65" fill="none" stroke="white" strokeWidth="10"
                    strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 800, color: 'var(--white)', lineHeight: 1, letterSpacing: '-3px' }}>{session.biblePercent}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--white)', marginTop: -2 }}>%</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.9)', marginTop: 2 }}>{lang === 'en' ? 'of the Bible' : 'da Bíblia'}</span>
                </div>
              </div>

              {/* Barras AT/NT */}
              <p style={styles.testLabel}>{translate('progress.testaments', undefined, lang)}</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
                <TestBar label="AT" pct={session.atPercent} color="var(--white)" />
                <TestBar label="NT" pct={session.ntPercent} color="var(--white)" />
              </div>
            </div>

            {/* Barras por bloco — antes das stats secundárias (dias seguidos +
                capítulos/livros), pra ficar logo depois do anel grande. */}
            <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 15, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 12 }}>{translate('progress.progressByBlock', undefined, lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {blocks.map(block => (
                  <div key={block.id} style={{ display: 'flex', alignItems: block.status === 'todo' ? 'flex-start' : 'center', gap: 8, opacity: block.status === 'todo' ? 0.7 : 1 }}>
                    <AppIcon name={block.icon} size={14} style={{ flexShrink: 0, marginTop: block.status === 'todo' ? 2 : 0 }} />
                    {block.status === 'todo' ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)' }}>{lang === 'en' ? block.nameEn : block.name}</span>
                        <span className="badge badge-locked" style={{ alignSelf: 'flex-start' }}>{translate('progress.startBadge', undefined, lang)}</span>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)' }}>{lang === 'en' ? block.nameEn : block.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g4)' }}>{block.percent}%</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: ACCENT_MAP[block.gradientKey], borderRadius: 99, width: `${block.percent}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats secundárias */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={styles.streakCard}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 800, color: '#EA580C', lineHeight: 1, marginBottom: 2, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {session.streak}<AppIcon name="Flame" size={17} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--g6)' }}>{translate('progress.streakLabel', undefined, lang)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                <MiniStat value={`${session.chaptersRead}/${session.totalChapters}`} label={translate('progress.chaptersRead', undefined, lang)} theme="gray" />
                <MiniStat value={`${session.booksCompleted}/${session.totalBooks}`} label={translate('progress.booksCompleted', undefined, lang)} theme="pink" />
              </div>
            </div>

            {/* Nível e XP */}
            <div style={styles.levelCard}>
              <div style={styles.levelEmoji}><AppIcon name={session.level.icon} size={24} color="var(--or)" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={styles.levelTitle}>{lang === 'en' ? 'Level' : 'Nível'} {session.level.level} · {session.level.title}</span>
                  <span style={{ ...styles.levelXp, fontFamily: 'var(--font-display)' }}>{session.xp} XP</span>
                </div>
                <div style={styles.levelBar}>
                  <div style={{ ...styles.levelBarFill, width: `${session.levelPercent}%` }} />
                </div>
                <p style={styles.levelSub}>
                  {session.nextLevel
                    ? <>{translate('progress.xpToNext', { n: session.xpForNext, title: session.nextLevel.title }, lang)} <AppIcon name={session.nextLevel.icon} size={11} style={{ verticalAlign: 'middle' }} /></>
                    : translate('progress.maxLevel', undefined, lang)}
                </p>
              </div>
            </div>
          </div>

          {/* Coluna direita: conquistas + sessões restantes */}
          <div className="dashboard-col">

            {/* Conquistas */}
            <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 15, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 12 }}>
                {translate('progress.achievements', undefined, lang)} · {session.achievements.filter(a => a.unlocked).length}/{session.achievements.length}
              </p>
              <div style={styles.achievementsGrid}>
                {session.achievements.map(a => (
                  <div key={a.id} style={{ ...styles.achievementCard, ...(a.unlocked ? styles.achievementCardUnlocked : {}) }}>
                    <AppIcon name={a.icon} size={22} color={a.unlocked ? 'var(--or)' : 'var(--g4)'} style={{ opacity: a.unlocked ? 1 : 0.4 }} />
                    <p style={{ ...styles.achievementTitle, opacity: a.unlocked ? 1 : 0.45 }}>{a.title}</p>
                    <p style={{ ...styles.achievementDesc, opacity: a.unlocked ? 1 : 0.4 }}>{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessões restantes */}
            <div style={{ background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 16, padding: 13, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginBottom: 3 }}>{translate('progress.sessionsLeftLabel', undefined, lang)}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.3px' }}>{session.sessionsLeft}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function TestBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, width: 30, flexShrink: 0, color }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, width: 30, textAlign: 'right', color }}>{pct}%</span>
    </div>
  )
}

const MINI_THEMES = {
  gray: { bg: 'var(--g1)', color: 'var(--g6)' },
  pink: { bg: 'rgba(181,0,93,.08)', color: '#B5005D' },
}

function MiniStat({ value, label, theme }) {
  const t = MINI_THEMES[theme]
  return (
    <div style={{ background: t.bg, borderRadius: 13, padding: 11 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: t.color, lineHeight: 1, marginBottom: 1, letterSpacing: '-1px' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--g6)' }}>{label}</div>
    </div>
  )
}

const styles = {
  bigRingCard: { background: 'var(--grad-vivid)', borderRadius: 32, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  bigRingGlow: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 240, height: 240, background: 'radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 65%)', borderRadius: '50%' },
  bigLabel:    { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: 2, textTransform: 'uppercase', position: 'relative' },
  testLabel:   { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.9)', alignSelf: 'flex-start', letterSpacing: 1, textTransform: 'uppercase', marginTop: 7, position: 'relative' },
  streakCard:  { flex: 1, background: 'var(--card-highlight-bg)', borderRadius: 13, padding: 13, display: 'flex', flexDirection: 'column' },
  levelCard:   { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 20, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-card)' },
  levelEmoji:  { fontSize: 26, flexShrink: 0 },
  levelTitle:  { fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  levelXp:     { fontSize: 10.5, fontWeight: 700, color: 'var(--or)' },
  levelBar:    { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  levelBarFill:{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  levelSub:    { fontSize: 11.5, fontWeight: 500, color: 'var(--g5)', marginTop: 5 },
  achievementsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  achievementCard:  { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '11px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  achievementCardUnlocked: { background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)' },
  achievementTitle: { fontSize: 9.5, fontWeight: 700, color: 'var(--bk)', lineHeight: 1.25 },
  achievementDesc:  { fontSize: 9.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.3 },
}
