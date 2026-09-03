// ProgressScreen.jsx — "Sua caminhada" (redesign 1f, reskin Bento — tela 5b)
//
// Dois placares, não sete: constância (semanal) e caminhada pela Bíblia
// (bloco/livro atual). Nível e XP viram consequência silenciosa, revelada
// discretamente no fim da tela — Conquistas saem da grade permanente e
// passam a aparecer só no instante em que são ganhas (ver
// AchievementCelebration.jsx, disparada pelo App.jsx). Entra por "Sua
// caminhada" na Home, não por aba própria (ver comentário no HTML do
// handoff) — a barra continua com Biblioteca no lugar de Progresso.
import { t as translate } from '../i18n'
import PremiumLockCard from '../components/PremiumLockCard'
import { pickActiveBlock, computeBookChapterCounts } from '../utils/progress'
import { computeRecentWeeksStatus } from '../routine/routineStreak'

export default function ProgressScreen({ session, blocks, sessionsByBlock, onNavigate }) {
  const { lang, hasPremium, weeklyGoalDays, weeksInGoal, dailyRoutine } = session
  const L = (k, vars) => translate(`progress.${k}`, vars, lang)

  // "Desde {mês}" — dado real (o dia mais antigo com algo registrado na
  // rotina), não um valor ilustrativo inventado; sem nenhum dia registrado
  // ainda, a linha simplesmente não aparece.
  const earliestKey = Object.keys(dailyRoutine ?? {}).sort()[0]
  const sinceLabel = (() => {
    if (!earliestKey) return null
    const [y, m] = earliestKey.split('-').map(Number)
    const monthName = new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long' })
    return L('sinceMonth', { month: monthName.charAt(0).toUpperCase() + monthName.slice(1) })
  })()

  // ── Caminhada pela Bíblia: bloco/livro em foco ──
  // Sempre a partir da leitura canônica (mesmos `blocks`/`sessionsByBlock`
  // que a lista abaixo usa), independente de um plano por tema/cronológico
  // estar ativo — é "onde você está na Bíblia", não na sessão de hoje.
  const activeBlock = pickActiveBlock(blocks)
  const activeIdx = blocks.indexOf(activeBlock)
  const activeBlockName = lang === 'en' ? activeBlock.nameEn : activeBlock.name
  const activeSessions = sessionsByBlock?.[activeBlock.id] ?? []
  const currentSession = activeSessions.find(s => s.status === 'current')
    ?? activeSessions.find(s => s.status !== 'done')
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock ?? {})

  const positionLine = currentSession
    ? (lang === 'en'
      ? `${currentSession.bookEn || currentSession.book} ${currentSession.chStart} of ${bookChapterCounts[currentSession.book] ?? '?'}`
      : `${currentSession.book} ${currentSession.chStart} de ${bookChapterCounts[currentSession.book] ?? '?'}`)
    : L('bibleFinished')

  // ── Constância: últimas 9 semanas em relação à meta ──
  const weeks = computeRecentWeeksStatus(dailyRoutine ?? {}, weeklyGoalDays)

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <p style={styles.title}>{L('title')}</p>
        {sinceLabel && <p style={styles.subtitle}>{sinceLabel}</p>}
      </div>

      <div style={styles.body}>
        {/* Cartão de constância — fundo escuro, o placar "de esforço". */}
        <div style={styles.consistencyCard}>
          <p style={styles.consistencyLabel}>{L('consistencyLabel')}</p>
          <div style={styles.consistencyRow}>
            <span style={styles.consistencyNumber}>{weeksInGoal}</span>
            <span style={styles.consistencySub}>{L('weeksInGoal')}</span>
          </div>

          <div style={styles.weekChart}>
            {weeks.map((w, i) => {
              const pct = Math.max(14, Math.min(100, Math.round((w.daysMet / weeklyGoalDays) * 100)))
              const color = w.isCurrent
                ? 'rgba(255,255,255,.14)'
                : w.met ? 'var(--bento-accent)' : 'rgba(240,102,43,.4)'
              return (
                <span key={i} style={styles.weekBarTrack}>
                  <span style={{ ...styles.weekBarFill, height: `${pct}%`, background: color }} />
                </span>
              )
            })}
          </div>
          <p style={styles.consistencyLegend}>{L('recentWeeksNote')}</p>
        </div>

        {/* Cartão de posição na Bíblia — o placar "de trajeto". */}
        <div style={styles.bibleCard}>
          <p style={styles.bibleLabel}>{L('whereYouAre')}</p>
          <p style={styles.biblePosition}>{positionLine}</p>
          <p style={styles.bibleBlockLine}>{L('blockOfTotal', { block: activeBlockName, i: activeIdx + 1, total: blocks.length })}</p>

          <div style={styles.bibleProgressTrack}>
            <div style={{ ...styles.bibleProgressFill, width: `${activeBlock.percent}%` }} />
          </div>

          <div style={styles.blockList}>
            {blocks.map(block => {
              const todo = block.status === 'todo'
              const name = lang === 'en' ? block.nameEn : block.name
              return (
                <div key={block.id} style={styles.blockRow}>
                  <span style={{ ...styles.blockRowName, ...(todo ? styles.blockRowNameTodo : {}) }}>{name}</span>
                  <span style={{ ...styles.blockRowTrack, ...(todo ? styles.blockRowTrackTodo : {}) }}>
                    {!todo && <span style={{ ...styles.blockRowFill, width: `${block.percent}%` }} />}
                  </span>
                  <span style={{ ...styles.blockRowPct, ...(todo ? styles.blockRowPctTodo : {}) }}>
                    {todo ? '—' : `${block.percent}%`}
                  </span>
                </div>
              )
            })}
          </div>

          <p style={styles.bibleFooter}>
            {L('wholeBibleFooter', { pct: session.biblePercent, done: session.chaptersRead, total: session.totalChapters })}
          </p>
        </div>

        {/* Nível — consequência silenciosa, só pra quem já desbloqueou XP/
            conquistas (Premium). Sem grade de conquistas: elas agora só
            aparecem no instante em que são ganhas (ver App.jsx). */}
        {hasPremium ? (
          <div style={styles.levelCard}>
            <span style={styles.levelBadge}>{session.level.level}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.levelTitle}>{session.level.title}</p>
              <p style={styles.levelSub}>
                {session.nextLevel
                  ? L('xpToNextEmph', { n: session.xpForNext.toLocaleString(lang === 'en' ? 'en' : 'pt-BR'), level: session.nextLevel.level })
                  : L('maxLevel')}
              </p>
            </div>
          </div>
        ) : (
          <PremiumLockCard lang={lang} onNavigate={onNavigate} variant="premium" />
        )}
      </div>
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, padding: '22px 20px 0' },
  title: { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, letterSpacing: '-0.7px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '4px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '18px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 },

  consistencyCard: { background: 'var(--bento-ink)', borderRadius: 28, padding: 24, color: 'white' },
  consistencyLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,.45)', margin: 0,
  },
  consistencyRow: { display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 18px' },
  consistencyNumber: { fontFamily: 'var(--font-bento)', fontSize: 44, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1 },
  consistencySub: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,.5)' },
  weekChart: { display: 'flex', alignItems: 'flex-end', gap: 5, height: 42 },
  weekBarTrack: { flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' },
  weekBarFill: { width: '100%', borderRadius: 6, transition: 'height 0.4s ease' },
  consistencyLegend: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.45)', margin: '14px 0 0' },

  bibleCard: { background: 'var(--bento-card)', borderRadius: 24, padding: 22 },
  bibleLabel: {
    fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'var(--bento-t4)', margin: '0 0 14px',
  },
  biblePosition: { fontFamily: 'var(--font-bento)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'var(--bento-ink)', margin: '0 0 4px' },
  bibleBlockLine: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 18px' },
  bibleProgressTrack: { height: 12, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden', marginBottom: 22 },
  bibleProgressFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },

  blockList: { display: 'flex', flexDirection: 'column', gap: 13 },
  blockRow: { display: 'flex', alignItems: 'center', gap: 12 },
  blockRowName: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  blockRowNameTodo: { color: 'var(--bento-t5)', fontWeight: 600 },
  blockRowTrack: { width: 104, height: 7, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden', flexShrink: 0 },
  blockRowTrackTodo: {},
  blockRowFill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  blockRowPct: { width: 36, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)' },
  // #D6CFC7 do mock não tem token exato — --bento-t5 é a aproximação mais
  // próxima (diferença imperceptível num "—" discreto).
  blockRowPctTodo: { color: 'var(--bento-t5)', fontWeight: 600 },
  bibleFooter: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t5)', margin: '18px 0 0' },

  levelCard: {
    background: 'var(--bento-sand)', borderRadius: 24, padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: 14,
  },
  levelBadge: {
    width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-sand-icon)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand)',
  },
  levelTitle: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 3px' },
  levelSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-label)', margin: 0 },
}
