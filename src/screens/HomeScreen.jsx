// HomeScreen.jsx
// Tela inicial com % da Bíblia em destaque, sessão do dia e stats

import { useState } from 'react'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function HomeScreen({ session, onContinueSession }) {
  const {
    userName, biblePercent, atPercent, ntPercent,
    streak, daysLeft, todaySession, chaptersRead,
    level, nextLevel, levelPercent, xpForNext, lang,
  } = session

  // Calcula o offset do anel SVG (circunferência = 2π×38 ≈ 238.76)
  const CIRCUMFERENCE = 238.76
  const offset = CIRCUMFERENCE - (biblePercent / 100) * CIRCUMFERENCE

  const ctaLabel =
    todaySession.progress === 100 ? translate('home.reviewSession', undefined, lang)
    : todaySession.progress > 0   ? translate('home.continueSession', undefined, lang)
    : translate('home.startSession', undefined, lang)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: 83 }}>

      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <div style={styles.heroContent}>

          {/* Saudação + slogan do app */}
          <div>
            <p style={styles.greeting}>{translate('home.greeting', { name: userName }, lang)}</p>
            <h2 style={styles.sessionTitle}>{translate('auth.tagline', undefined, lang)}</h2>
          </div>

        </div>
      </div>

      {/* ── Corpo (sheet flutuante sobre o hero) ── */}
      <div style={styles.body}>
        <div className="dashboard-grid">

          {/* Coluna esquerda: status geral (% da Bíblia + nível) */}
          <div className="dashboard-col">

            {/* Destaque % da Bíblia */}
            <div style={styles.pctHero}>
              <div style={styles.pctHeroGlow} />

              {/* Anel SVG */}
              <div style={styles.ringWrap}>
                <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
                  <circle cx="44" cy="44" r="38" fill="none" stroke="white" strokeWidth="7"
                    strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div style={styles.ringText}>
                  <span style={styles.ringNum}>{biblePercent}</span>
                  <span style={styles.ringPct}>%</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                <div>
                  <p style={styles.pctLabel}>{translate('home.bibleReadLabel', undefined, lang)}</p>
                  <p style={styles.pctTitle}>{translate('progress.bibleComplete', undefined, lang)}: {biblePercent}%</p>
                  <p style={styles.pctSub}>{translate('home.chaptersRead', { n: chaptersRead }, lang)} · {streak} {lang === 'en' ? 'days' : 'dias'} <AppIcon name="Flame" size={11} style={{ verticalAlign: 'middle' }} /></p>
                </div>
                {/* Barras AT/NT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <BarRow label="AT" pct={atPercent}  color="#FFFFFF" />
                  <BarRow label="NT" pct={ntPercent}  color="#FFFFFF" />
                </div>
              </div>
            </div>

            {/* Nível e XP */}
            <LevelCard level={level} nextLevel={nextLevel} percent={levelPercent} xpForNext={xpForNext} lang={lang} />
          </div>

          {/* Coluna direita: ação do dia + stats + tutorial */}
          <div className="dashboard-col">

            {/* Card de hoje */}
            <div>
              <div className="section-header">
                <h3 className="section-title">{translate('home.todaySessionHeader', { n: todaySession.number }, lang)}</h3>
              </div>
              <div style={styles.todayCard}>
                <div style={styles.todayAccent} />
                <div style={styles.todayBadge}>
                  <span style={styles.todayDot} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--or)' }}>{todaySession.block}</span>
                </div>
                <h3 style={styles.todayTitle}>{todaySession.title}</h3>
                <p style={styles.todaySub}>{todaySession.subtitle}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)' }}>{translate('home.todayProgress', undefined, lang)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--or)' }}>{todaySession.progress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${todaySession.progress}%` }} />
                </div>
                <button style={styles.continueBtn} onClick={onContinueSession}>
                  {ctaLabel}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="section-header"><h3 className="section-title">{translate('home.thisWeek', undefined, lang)}</h3></div>
              <div style={styles.statsRow}>
                <StatCard value={streak}       suffix={<AppIcon name="Flame" size={12} />} label={translate('home.streakLabel', undefined, lang)}  theme="orange" />
                <StatCard value={level.level}  suffix=""   label={level.title}    theme="purple" />
                <StatCard value={daysLeft} suffix={lang === 'en' ? '' : ' d'} label={translate('home.daysLeftLabel', undefined, lang)} theme="green"  />
              </div>
            </div>

            {/* Tutorial do método (recolhido por padrão) */}
            <TutorialCard lang={lang} />
          </div>

        </div>
      </div>
    </div>
  )
}

function LevelCard({ level, nextLevel, percent, xpForNext, lang }) {
  return (
    <div style={styles.levelCard}>
      <div style={styles.levelEmoji}><AppIcon name={level.icon} size={24} color="var(--or)" /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={styles.levelTitle}>{lang === 'en' ? 'Level' : 'Nível'} {level.level} · {level.title}</span>
        </div>
        <div style={styles.levelBar}>
          <div style={{ ...styles.levelBarFill, width: `${percent}%` }} />
        </div>
        <p style={styles.levelSub}>
          {nextLevel
            ? <>{translate('home.xpToNext', { n: xpForNext, title: nextLevel.title }, lang)} <AppIcon name={nextLevel.icon} size={11} style={{ verticalAlign: 'middle' }} /></>
            : translate('home.maxLevel', undefined, lang)}
        </p>
      </div>
    </div>
  )
}

function TutorialCard({ lang }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={styles.tutorialCard}>
      <button style={styles.tutorialToggle} onClick={() => setOpen(v => !v)}>
        <span style={styles.tutorialEmoji}><AppIcon name="Lightbulb" size={20} color="var(--or)" /></span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={styles.tutorialToggleTitle}>{translate('home.tutorialToggleTitle', undefined, lang)}</p>
          <p style={styles.tutorialToggleSub}>{translate('home.tutorialToggleSub', undefined, lang)}</p>
        </div>
        <span style={{ fontSize: 14, color: 'var(--g4)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>

      {open && (
        <div style={styles.tutorialBody}>
          <p style={styles.tutorialIntro}>
            {translate('home.tutorialIntro', undefined, lang)}
          </p>

          <TutorialStep
            icon="HandHeart" time={translate('home.stepPrayerTime', undefined, lang)} title={translate('home.stepPrayerTitle', undefined, lang)} theme="orange"
            desc={translate('home.stepPrayerDesc', undefined, lang)}
          />
          <TutorialStep
            icon="BookOpen" time={translate('home.stepReadingTime', undefined, lang)} title={translate('home.stepReadingTitle', undefined, lang)} theme="purple"
            desc={translate('home.stepReadingDesc', undefined, lang)}
          />
          <TutorialStep
            icon="PenLine" time={translate('home.stepReflectionTime', undefined, lang)} title={translate('home.stepReflectionTitle', undefined, lang)} theme="green"
            desc={translate('home.stepReflectionDesc', undefined, lang)}
          />

          <div style={styles.tutorialTip}>
            {translate('home.tutorialTip', undefined, lang)}
          </div>

          <div style={styles.tutorialTipPurple}>
            {translate('home.tutorialTipBonus', undefined, lang)}
          </div>

          <p style={styles.tutorialOutro}>{translate('home.tutorialOutro', undefined, lang)}</p>
        </div>
      )}
    </div>
  )
}

function TutorialStep({ icon, time, title, desc, theme }) {
  const t = STAT_THEMES[theme]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ ...styles.tutorialStepIcon, background: t.bg }}><AppIcon name={icon} size={16} color={t.color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={styles.tutorialStepTitle}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{time}</span>
        </div>
        <p style={styles.tutorialStepDesc}>{desc}</p>
      </div>
    </div>
  )
}

function BarRow({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, width: 26, flexShrink: 0, color }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, width: 28, textAlign: 'right', color }}>{pct}%</span>
    </div>
  )
}

const STAT_THEMES = {
  orange: { bg: 'linear-gradient(135deg,#FFF3E8,#FFDDB8)', border: 'rgba(249,115,22,.25)', color: '#EA580C' },
  purple: { bg: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: 'rgba(168,85,247,.25)', color: '#9333EA' },
  green:  { bg: 'linear-gradient(135deg,#E4FBEC,#C7F5D6)', border: 'rgba(22,163,74,.25)',  color: '#16A34A' },
}

function StatCard({ value, suffix, label, theme }) {
  const t = STAT_THEMES[theme]
  return (
    <div style={{ flex: 1, background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 15, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 21, fontWeight: 900, color: t.color, lineHeight: 1, marginBottom: 2, letterSpacing: '-1px' }}>
        {value}<span style={{ fontSize: 12, fontWeight: 700 }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--g6)' }}>{label}</div>
    </div>
  )
}

const styles = {
  tutorialCard:  { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  tutorialToggle:{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
  tutorialEmoji: { fontSize: 22, flexShrink: 0 },
  tutorialToggleTitle: { fontSize: 13, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  tutorialToggleSub:   { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 1 },
  tutorialBody:  { padding: '2px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid var(--g1)', paddingTop: 13 },
  tutorialIntro: { fontSize: 11.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.55 },
  tutorialStepIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  tutorialStepTitle: { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  tutorialStepDesc:  { fontSize: 11, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginTop: 2 },
  tutorialTip:   { background: 'var(--olt)', border: '0.5px dashed rgba(249,115,22,.4)', borderRadius: 11, padding: 11, fontSize: 11, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5 },
  tutorialTipPurple: { background: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: '0.5px dashed rgba(168,85,247,.4)', borderRadius: 11, padding: 11, fontSize: 11, fontWeight: 500, color: '#6B21A8', lineHeight: 1.5 },
  tutorialOutro: { fontSize: 11, fontWeight: 700, color: 'var(--or)', textAlign: 'center' },
  hero:          { minHeight: 150, background: '#141414', position: 'relative', overflow: 'hidden', flexShrink: 0 },
  heroOrbOrange: { position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: '#F97316', filter: 'blur(70px)', opacity: 0.55, top: -80, right: -60 },
  heroOrbPink:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#EC4899', filter: 'blur(70px)', opacity: 0.35, bottom: -70, left: -50 },
  heroContent:   { position: 'relative', zIndex: 2, padding: '18px 20px 30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' },
  greeting:      { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginBottom: 3 },
  sessionTitle:  { fontSize: 19, fontWeight: 800, color: 'white', lineHeight: 1.3, letterSpacing: '-0.2px' },
  body:          { flex: 1, background: 'var(--white)', borderRadius: '26px 26px 0 0', marginTop: -22, position: 'relative', zIndex: 3, boxShadow: '0 -12px 30px rgba(0,0,0,.05)', padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  pctHero:       { background: 'var(--grad-vivid)', borderRadius: 22, padding: 20, display: 'flex', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  pctHeroGlow:   { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(50px)', top: -70, right: -40 },
  ringWrap:      { position: 'relative', width: 88, height: 88, flexShrink: 0 },
  ringText:      { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  ringNum:       { fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-1px' },
  ringPct:       { fontSize: 10, fontWeight: 700, color: 'white' },
  pctLabel:      { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.75)', letterSpacing: 1.5, textTransform: 'uppercase' },
  pctTitle:      { fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.25, letterSpacing: '-0.2px' },
  pctSub:        { fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.7)' },
  todayCard:     { position: 'relative', background: 'var(--white)', border: '0.5px solid var(--g1)', borderRadius: 20, padding: '16px 16px 16px 21px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  todayAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: 'var(--grad-vivid)' },
  todayBadge:    { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(249,115,22,.12)', border: '0.5px solid rgba(249,115,22,.25)', borderRadius: 20, padding: '3px 9px', marginBottom: 10 },
  todayDot:      { width: 5, height: 5, borderRadius: '50%', background: 'var(--or)', animation: 'pulse 2s infinite' },
  todayTitle:    { fontSize: 16, fontWeight: 800, color: 'var(--bk)', marginBottom: 4, lineHeight: 1.3, letterSpacing: '-0.2px' },
  todaySub:      { fontSize: 11, fontWeight: 500, color: 'var(--g5)', marginBottom: 12 },
  progressBar:   { height: 3, background: 'var(--g2)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: '100%', background: 'var(--grad-primary)', borderRadius: 99, transition: 'width 0.6s ease' },
  continueBtn:   { width: '100%', background: 'var(--grad-vivid)', border: 'none', borderRadius: 14, padding: 13, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-glow)' },
  statsRow:      { display: 'flex', gap: 8 },
  levelCard:     { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-card)' },
  levelEmoji:    { fontSize: 26, flexShrink: 0 },
  levelTitle:    { fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  levelBar:      { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  levelBarFill:  { height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  levelSub:      { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 5 },
}
