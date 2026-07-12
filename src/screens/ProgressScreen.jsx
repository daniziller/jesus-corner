import { ACCENT_MAP } from '../utils/blockColors'
import { t as translate } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { ROUTINE_STEP_COLORS } from '../utils/routineColors'
import { computeMonthlyRoutineStats, averageFullRoutineDays } from '../routine/routineStreak'

export default function ProgressScreen({ session, blocks }) {
  const { lang } = session
  const CIRC = 408.41  // 2π×65
  const offset = CIRC - (session.biblePercent / 100) * CIRC

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>
      <div className="page-header"><h1 className="page-title">{translate('progress.pageTitle', undefined, lang)}</h1></div>

      <div style={{ padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dashboard-grid">

          {/* Coluna esquerda: destaque % + stats + nível */}
          <div className="dashboard-col">

            {/* ── Destaque % ── */}
            <div style={styles.bigRingCard} data-tour="progress-big-ring">
              <div style={styles.bigRingGlow} />

              <p style={styles.bigLabel}>{translate('progress.bibleComplete', undefined, lang)}</p>

              {/* Anel grande */}
              <div style={{ position: 'relative', width: 155, height: 155, margin: '6px 0 4px' }}>
                <svg width="155" height="155" viewBox="0 0 155 155" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="77.5" cy="77.5" r="65" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
                  <circle cx="77.5" cy="77.5" r="65" fill="none" stroke="white" strokeWidth="10"
                    strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 46, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-3px' }}>{session.biblePercent}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', marginTop: -2 }}>%</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{lang === 'en' ? 'of the Bible' : 'da Bíblia'}</span>
                </div>
              </div>

              {/* Barras AT/NT */}
              <p style={styles.testLabel}>{translate('progress.testaments', undefined, lang)}</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
                <TestBar label="AT" pct={session.atPercent} color="#FFFFFF" />
                <TestBar label="NT" pct={session.ntPercent} color="#FFFFFF" />
              </div>
            </div>

            {/* Stats secundárias */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={styles.streakCard}>
                <span style={{ fontSize: 27, fontWeight: 900, color: '#EA580C', lineHeight: 1, marginBottom: 2, letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {session.streak}<AppIcon name="Flame" size={17} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--g6)' }}>{translate('progress.streakLabel', undefined, lang)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                <MiniStat value={`${session.chaptersRead}/${session.totalChapters}`} label={translate('progress.chaptersRead', undefined, lang)} theme="purple" />
                <MiniStat value={`${session.booksCompleted}/${session.totalBooks}`} label={translate('progress.booksCompleted', undefined, lang)} theme="green" />
              </div>
            </div>

            {/* Constância da rotina — dias/mês em que cada passo foi feito */}
            <RoutineUsageCard dailyRoutine={session.dailyRoutine} lang={lang} />

            {/* Nível e XP */}
            <div style={styles.levelCard}>
              <div style={styles.levelEmoji}><AppIcon name={session.level.icon} size={24} color="var(--or)" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={styles.levelTitle}>{lang === 'en' ? 'Level' : 'Nível'} {session.level.level} · {session.level.title}</span>
                  <span style={styles.levelXp}>{session.xp} XP</span>
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

          {/* Coluna direita: blocos + conquistas + sessões restantes */}
          <div className="dashboard-col">

            {/* Barras por bloco */}
            <div style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 12 }}>{translate('progress.progressByBlock', undefined, lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {blocks.map(block => (
                  <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', width: 90, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AppIcon name={block.icon} size={12} style={{ flexShrink: 0 }} /> {lang === 'en' ? block.nameEn : block.name}
                    </span>
                    {block.status === 'todo' ? (
                      <span className="badge badge-locked" style={{ flex: 1 }}>{translate('progress.startBadge', undefined, lang)}</span>
                    ) : (
                      <>
                        <div style={{ flex: 1, height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: ACCENT_MAP[block.gradientKey], borderRadius: 99, width: `${block.percent}%` }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--g4)', width: 26, textAlign: 'right' }}>{block.percent}%</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Conquistas */}
            <div style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 12 }}>
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
            <div style={{ background: 'linear-gradient(135deg,#FFF3E8,#FFE4CC)', border: '0.5px solid rgba(249,115,22,.2)', borderRadius: 16, padding: 13, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginBottom: 3 }}>{translate('progress.sessionsLeftLabel', undefined, lang)}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.3px' }}>{session.sessionsLeft}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Métrica de constância — um mini gráfico de barras com o número de dias
// (não %) em que cada um dos 3 passos foi feito, mês a mês, pra dar uma
// noção de uso ao longo do tempo (não só o streak atual, que zera fácil) —
// mais a média de dias/mês com a rotina completa, num bloco de métrica à
// parte, igual aos outros cards de métrica da tela.
function RoutineUsageCard({ dailyRoutine, lang }) {
  const months = computeMonthlyRoutineStats(dailyRoutine ?? {}, 6)
  const hasAnyData = months.some(m => m.prayerDays > 0 || m.readingDays > 0 || m.reflectionDays > 0)
  const MAX_DAYS = 31 // escala fixa (não o tamanho do mês) pra comparar meses de forma justa
  const avgFullDays = averageFullRoutineDays(months)
  const now = new Date()

  return (
    <div style={{ background: 'white', border: '0.5px solid var(--g1)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--bk)' }}>{translate('progress.routineUsageTitle', undefined, lang)}</p>
      <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 2, marginBottom: 12 }}>{translate('progress.routineUsageSub', undefined, lang)}</p>

      {hasAnyData ? (
        <>
          <div style={styles.routineUsageChart}>
            {months.map((m, i) => {
              const isCurrent = m.year === now.getFullYear() && m.month === now.getMonth()
              return (
                <div key={i} style={styles.routineUsageMonthCol}>
                  <span style={{ ...styles.routineUsageMonthNum, ...(isCurrent ? styles.routineUsageMonthNumCurrent : {}) }}>{m.fullDays}</span>
                  <div style={styles.routineUsageRings}>
                    <StepRing days={m.prayerDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.prayer} />
                    <StepRing days={m.readingDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.reading} />
                    <StepRing days={m.reflectionDays} maxDays={MAX_DAYS} color={ROUTINE_STEP_COLORS.reflection} />
                  </div>
                  <span style={{ ...styles.routineUsageMonthLabel, ...(isCurrent ? styles.routineUsageMonthLabelCurrent : {}) }}>
                    {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'short' }).format(new Date(m.year, m.month, 1)).replace('.', '')}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={styles.routineUsageLegend}>
            <UsageLegendDot color={ROUTINE_STEP_COLORS.prayer} label={translate('home.routinePrayer', undefined, lang)} />
            <UsageLegendDot color={ROUTINE_STEP_COLORS.reading} label={translate('home.routineReading', undefined, lang)} />
            <UsageLegendDot color={ROUTINE_STEP_COLORS.reflection} label={translate('home.routineReflection', undefined, lang)} />
          </div>

          {/* Média — bloco de métrica à parte, mesmo estilo do card "Sessões restantes" */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--g1)' }}>
            <div style={{ background: 'linear-gradient(135deg,#FFF3E8,#FFE4CC)', border: '0.5px solid rgba(249,115,22,.2)', borderRadius: 16, padding: 13, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--g5)', marginBottom: 3 }}>{translate('progress.routineAvgLabel', undefined, lang)}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.3px' }}>
                {avgFullDays.toFixed(1).replace(/\.0$/, '')}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--g5)', textAlign: 'center', padding: '10px 0' }}>
          {translate('progress.routineUsageEmpty', undefined, lang)}
        </p>
      )}
    </div>
  )
}

// Ring pequeno estilo Apple Fitness — um por passo, por mês. O preenchimento
// é só visual (dias/MAX_DAYS); o número que importa (dias do mês) já vem
// escrito em cima, então o ring não precisa carregar rótulo nenhum.
function StepRing({ days, maxDays, color, size = 16, strokeWidth = 2.5 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const frac = maxDays ? Math.min(1, days / maxDays) : 0
  const offset = c - frac * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g2)" strokeWidth={strokeWidth} />
      {frac > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      )}
    </svg>
  )
}

function UsageLegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--g5)' }}>{label}</span>
    </span>
  )
}

function TestBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 11, fontWeight: 700, width: 30, flexShrink: 0, color }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, width: 30, textAlign: 'right', color }}>{pct}%</span>
    </div>
  )
}

const MINI_THEMES = {
  purple: { bg: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', color: '#9333EA' },
  green:  { bg: 'linear-gradient(135deg,#E4FBEC,#C7F5D6)', color: '#16A34A' },
}

function MiniStat({ value, label, theme }) {
  const t = MINI_THEMES[theme]
  return (
    <div style={{ background: t.bg, borderRadius: 13, padding: 11 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: t.color, lineHeight: 1, marginBottom: 1, letterSpacing: '-1px' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--g6)' }}>{label}</div>
    </div>
  )
}

const styles = {
  bigRingCard: { background: 'var(--grad-vivid)', borderRadius: 22, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' },
  bigRingGlow: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 240, height: 240, background: 'radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 65%)', borderRadius: '50%' },
  bigLabel:    { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: 2, textTransform: 'uppercase', position: 'relative' },
  testLabel:   { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', alignSelf: 'flex-start', letterSpacing: 1, textTransform: 'uppercase', marginTop: 7, position: 'relative' },
  streakCard:  { flex: 1, background: 'linear-gradient(135deg,#FFF3E8,#FFDDB8)', borderRadius: 13, padding: 13, display: 'flex', flexDirection: 'column' },
  levelCard:   { background: 'white', border: '0.5px solid var(--g1)', borderRadius: 16, padding: 13, display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-card)' },
  levelEmoji:  { fontSize: 26, flexShrink: 0 },
  levelTitle:  { fontSize: 12.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.2px' },
  levelXp:     { fontSize: 10.5, fontWeight: 700, color: 'var(--or)' },
  levelBar:    { height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden' },
  levelBarFill:{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99, transition: 'width 0.6s ease' },
  levelSub:    { fontSize: 10, fontWeight: 500, color: 'var(--g5)', marginTop: 5 },
  achievementsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  achievementCard:  { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '11px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  achievementCardUnlocked: { background: 'linear-gradient(135deg,#FFF3E8,#FFE4CC)', border: '0.5px solid rgba(249,115,22,.3)' },
  achievementTitle: { fontSize: 9.5, fontWeight: 700, color: 'var(--bk)', lineHeight: 1.25 },
  achievementDesc:  { fontSize: 8, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.3 },
  routineUsageChart:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 },
  routineUsageMonthCol:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  routineUsageMonthNum:   { fontSize: 13, fontWeight: 800, color: 'var(--bk)', lineHeight: 1 },
  routineUsageMonthNumCurrent: { color: 'var(--or)' },
  routineUsageRings:      { display: 'flex', alignItems: 'center', gap: 2 },
  routineUsageMonthLabel: { fontSize: 8.5, fontWeight: 600, color: 'var(--g4)', textTransform: 'capitalize' },
  routineUsageMonthLabelCurrent: { color: 'var(--or)', fontWeight: 800 },
  routineUsageLegend:     { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--g1)', flexWrap: 'wrap' },
}
