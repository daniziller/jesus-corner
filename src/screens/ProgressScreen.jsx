import { ACCENT_MAP } from '../utils/blockColors'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ProgressScreen({ session, blocks, onNavigate }) {
  const { lang } = session
  const CIRC = 408.41  // 2π×65
  const offset = CIRC - (session.biblePercent / 100) * CIRC

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div style={{ padding: '20px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Título + subtítulo — só no desktop (≥1024px), igual Rotina/Início.
            No mobile o Figma não mostra esse cabeçalho. */}
        <div className="page-header hide-on-mobile" style={{ padding: 0, marginBottom: 4 }}>
          <h1 className="page-title">{translate('progress.pageTitleLong', undefined, lang)}</h1>
          <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--g5)' }}>{translate('progress.pageSubtitle', undefined, lang)}</p>
        </div>

        <div className="dashboard-grid">

          {/* Coluna esquerda: destaque % + progresso por bloco + stats +
              nível. Constância da rotina agora mora na aba Rotina. */}
          <div className="dashboard-col">

            {/* ── Destaque % ── */}
            <div style={styles.bigRingCard}>
              <div style={styles.bigRingGlow} />

              <p style={{ ...styles.bigLabel, color: 'rgba(255,255,255,.9)' }}>{translate('progress.bibleComplete', undefined, lang)}</p>

              {/* Anel grande — só no mobile; o desktop troca por um número
                  simples + selo com ícone (ver .progress-hero-desktop-icon
                  abaixo), igual ao frame "Progresso - Desktop". */}
              <div className="hide-on-desktop" style={{ position: 'relative', width: 155, height: 155, margin: '6px 0 4px' }}>
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

              <div className="hide-on-mobile" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--white)', letterSpacing: '-1.5px', display: 'block' }}>{session.biblePercent}%</span>
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.85)', marginTop: 4 }}>{translate('progress.heroTagline', undefined, lang)}</p>
                </div>
                <div style={styles.heroIconCircle}>
                  <AppIcon name="BookOpen" size={22} color="white" />
                </div>
              </div>

              {/* Barras AT/NT — só no mobile; no desktop viram o card
                  "Testamentos" separado, abaixo do bloco. */}
              <div className="hide-on-desktop" style={{ width: '100%' }}>
                <p style={styles.testLabel}>{translate('progress.testaments', undefined, lang)}</p>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7, position: 'relative', marginTop: 7 }}>
                  <TestBar label="AT" pct={session.atPercent} color="var(--white)" />
                  <TestBar label="NT" pct={session.ntPercent} color="var(--white)" />
                </div>
              </div>
            </div>

            {/* Testamentos — card próprio, só no desktop */}
            <div className="hide-on-mobile" style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, padding: 18, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AppIcon name="BookOpen" size={15} color="var(--or)" /> {translate('progress.testaments', undefined, lang)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <LightTestBar label={translate('journey.oldTestament', undefined, lang)} pct={session.atPercent} color="var(--or)" />
                <LightTestBar label={translate('journey.newTestament', undefined, lang)} pct={session.ntPercent} color="#B5005D" />
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

            {/* Stats secundárias — 3 caixas iguais com selo de ícone
                colorido, igual ao frame "Progresso - Desktop" (essa seção
                nem aparece no frame mobile, então não há um layout mobile
                do Figma pra preservar — mesmo visual nos dois tamanhos). */}
            <div style={{ display: 'flex', gap: 8 }}>
              <StatBox icon="Flame" iconBg="var(--card-highlight-bg)" iconColor="#EA580C" value={session.streak} label={translate('progress.streakLabel', undefined, lang)} />
              <StatBox icon="BookMarked" iconBg="var(--g1)" iconColor="var(--g6)" value={`${session.chaptersRead}/${session.totalChapters}`} label={translate('progress.chaptersRead', undefined, lang)} />
              <StatBox icon="Library" iconBg="rgba(181,0,93,.08)" iconColor="#B5005D" value={`${session.booksCompleted}/${session.totalBooks}`} label={translate('progress.booksCompleted', undefined, lang)} />
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

            {/* Sessões restantes — versão compacta no mobile (só o número,
                não tinha frame do Figma pra essa tela) e versão completa
                no desktop (título+texto+botão, igual ao Figma). */}
            <div className="hide-on-desktop" style={{ background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 16, padding: 13, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginBottom: 3 }}>{translate('progress.sessionsLeftLabel', undefined, lang)}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.3px' }}>{session.sessionsLeft}</p>
            </div>
            <div className="hide-on-mobile" style={{ background: 'var(--card-highlight-bg)', border: 'var(--card-highlight-border)', borderRadius: 20, padding: 18 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--bk)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AppIcon name="Calendar" size={16} color="var(--or)" /> {translate('progress.sessionsLeftLabel', undefined, lang)}
              </p>
              <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--g6)', lineHeight: 1.5, marginBottom: 14 }}>
                {translate('progress.sessionsLeftDesc', undefined, lang)}
              </p>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => onNavigate?.('routine')}>
                {translate('progress.viewActivePlan', undefined, lang)}
              </button>
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

// Barra AT/NT do card "Testamentos" desktop — fundo claro (var(--g1)),
// diferente do TestBar acima que assume texto branco sobre o hero escuro.
function LightTestBar({ label, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bk)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Caixa de estatística com selo de ícone — streak/capítulos/livros, mesmo
// visual do frame "Progresso - Desktop" (essa seção não existe no frame
// mobile, então vale pros dois tamanhos).
function StatBox({ icon, iconBg, iconColor, value, label }) {
  return (
    <div style={{ flex: 1, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, boxShadow: 'var(--shadow-card)' }}>
      <span style={{ width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={icon} size={16} color={iconColor} />
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.3px' }}>{value}</span>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g5)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
    </div>
  )
}

const styles = {
  bigRingCard: { background: 'var(--grad-vivid)', borderRadius: 32, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  bigRingGlow: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 240, height: 240, background: 'radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 65%)', borderRadius: '50%' },
  bigLabel:    { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: 2, textTransform: 'uppercase', position: 'relative' },
  testLabel:   { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.9)', alignSelf: 'flex-start', letterSpacing: 1, textTransform: 'uppercase', marginTop: 7, position: 'relative' },
  heroIconCircle: { width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
