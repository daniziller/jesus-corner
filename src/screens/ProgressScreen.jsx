// ProgressScreen.jsx — "Sua caminhada" (redesign 1f)
//
// Dois placares, não sete: constância (semanal) e caminhada pela Bíblia
// (bloco/livro atual). Nível e XP viram consequência silenciosa, revelada
// discretamente no fim da tela — Conquistas saem da grade permanente e
// passam a aparecer só no instante em que são ganhas (ver
// AchievementCelebration.jsx, disparada pelo App.jsx). Testamentos, stats
// secundárias (livros concluídos) e "Sessões restantes" saíram daqui —
// nenhuma outra tela depende desses números além desta.
import { t as translate } from '../i18n'
import PremiumLockCard from '../components/PremiumLockCard'
import { pickActiveBlock, computeBookChapterCounts } from '../utils/progress'
import { computeRecentWeeksStatus } from '../routine/routineStreak'

export default function ProgressScreen({ session, blocks, sessionsByBlock, onNavigate }) {
  const { lang, hasPremium, weeklyGoalDays, weekGoalDaysMet, weeksInGoal, dailyRoutine } = session
  const L = (k, vars) => translate(`progress.${k}`, vars, lang)

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
      <p style={styles.title}>{L('title')}</p>

      {/* Cartão de constância — fundo escuro, o placar "de esforço". */}
      <div style={styles.consistencyCard}>
        <p style={styles.consistencyLabel}>{L('consistencyLabel')}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 0 16px' }}>
          <span style={styles.consistencyNumber}>{weeksInGoal}</span>
          <span style={styles.consistencySub}>{L('weeksInGoal')}</span>
        </div>

        <div style={styles.weekChart}>
          {weeks.map((w, i) => {
            const pct = Math.max(14, Math.min(100, Math.round((w.daysMet / weeklyGoalDays) * 100)))
            const color = w.isCurrent
              ? 'rgba(245,233,222,.22)'
              : w.met ? '#E08A3C' : 'rgba(224,138,60,.5)'
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
          <span style={styles.levelCircle}>{session.level.level}</span>
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
        <div style={{ marginTop: 20 }}>
          <PremiumLockCard lang={lang} onNavigate={onNavigate} variant="premium" />
        </div>
      )}
    </div>
  )
}

const styles = {
  screen: {
    background: 'var(--olt)',
    height: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '8px 22px calc(var(--nav-height) + 24px)',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800,
    letterSpacing: '-0.6px', color: 'var(--bk)', margin: '8px 0 18px',
  },

  consistencyCard: { background: 'var(--bk)', borderRadius: 20, padding: 22 },
  consistencyLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'rgba(245,233,222,.6)', margin: 0,
  },
  consistencyNumber: {
    fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, color: 'white',
    letterSpacing: '-1.6px', lineHeight: 1,
  },
  consistencySub: { fontSize: 14, fontWeight: 500, color: 'rgba(245,233,222,.7)' },
  weekChart: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 },
  weekBarTrack: { flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' },
  weekBarFill: { width: '100%', borderRadius: 4, transition: 'height 0.4s ease' },
  consistencyLegend: { fontSize: 12.5, fontWeight: 400, lineHeight: 1.5, color: 'rgba(245,233,222,.6)', margin: '12px 0 0' },

  bibleCard: { background: 'var(--white)', borderRadius: 20, padding: 22, marginTop: 14 },
  bibleLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
    color: 'var(--or)', margin: '0 0 8px',
  },
  biblePosition: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
    letterSpacing: '-0.5px', color: 'var(--bk)', margin: '0 0 3px',
  },
  bibleBlockLine: { fontSize: 13, fontWeight: 500, color: 'var(--g5)', margin: '0 0 16px' },
  bibleProgressTrack: { height: 10, borderRadius: 99, background: 'var(--g1)', overflow: 'hidden', marginBottom: 18 },
  bibleProgressFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#B5651D,#9D4300)' },

  blockList: { display: 'flex', flexDirection: 'column', gap: 12 },
  blockRow: { display: 'flex', alignItems: 'center', gap: 10 },
  blockRowName: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  blockRowNameTodo: { color: 'var(--g4)', fontWeight: 500 },
  blockRowTrack: { width: 110, height: 6, borderRadius: 99, background: 'var(--g1)', overflow: 'hidden', flexShrink: 0 },
  blockRowTrackTodo: { background: '#F0EAE4' },
  blockRowFill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--or)' },
  blockRowPct: { width: 38, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--g5)' },
  blockRowPctTodo: { color: '#C6BFB8', fontWeight: 500 },
  bibleFooter: { fontSize: 12, fontWeight: 500, color: 'var(--g4)', margin: '18px 0 0' },

  levelCard: {
    marginTop: 14, background: 'rgba(255,255,255,.55)', borderRadius: 16, padding: '13px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  levelCircle: {
    width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: 'var(--g1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--or)',
  },
  levelTitle: { fontSize: 13.5, fontWeight: 600, color: 'var(--bk)', margin: '0 0 1px' },
  levelSub: { fontSize: 12, fontWeight: 500, color: 'var(--g5)', margin: 0 },
}
