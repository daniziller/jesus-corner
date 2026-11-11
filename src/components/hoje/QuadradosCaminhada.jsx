// QuadradosCaminhada.jsx — os três quadrados do Hoje (handoff-hoje-50
// §3.2): Semanas · Dias · Selos. Mesma estrutura e mesma altura nos três
// (rótulo, número que nunca quebra, legenda, complemento de 22px), cada
// um com o SEU número e mais nenhum. Tudo vem das funções que o contador
// de semanas e a estante já usam (weeksMath, recentSeals) — aqui só se
// desenha. Semanas e Dias → Minhas métricas; Selos → Minha estante.
//
// `goalHistory` e `sealNames` chegam `null` enquanto carregam: o número e
// o complemento que dependem deles viram esqueleto (nunca um zero falso).
import { useMemo } from 'react'
import CapsulasDeSemanas from '../gamificacao/CapsulasDeSemanas'
import SeloDeLivro from '../gamificacao/SeloDeLivro'
import { bookInfo } from '../../data/gamificationBlocks'
import { formatInt } from '../../gamification/format'
import { computeWeeksInGoal, computeWeekCapsules, computeWeekDayStates, computeCurrentWeekGoal } from '../../gamification/weeksMath'
import { weeksAria, daysAria, sealsAria, dayDotKind } from '../../hoje/hojeMath'

const FONT = 'var(--font-bento)'

function Quadrado({ label, number, caption, ariaLabel, onOpen, children }) {
  return (
    <div
      style={s.square} role="button" tabIndex={0} aria-label={ariaLabel} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
    >
      <p style={s.label}>{label}</p>
      {number == null
        ? <span className="rb-context-skeleton" style={s.numberSkeleton} />
        : <p style={s.number}>{number}</p>}
      <p style={s.caption}>{caption}</p>
      <div style={s.complement}>{children}</div>
    </div>
  )
}

export default function QuadradosCaminhada({
  dailyRoutine, goalHistory, weeklyGoalDays, weeklyDays, firstActivityKey,
  livrosCompletos, totalLivros, sealNames, onOpenMetrics, onOpenEstante,
}) {
  const weeks = useMemo(() => {
    if (!goalHistory) return null
    const today = new Date()
    return {
      total: computeWeeksInGoal(dailyRoutine, goalHistory, weeklyGoalDays, today),
      capsules: computeWeekCapsules(dailyRoutine, goalHistory, weeklyGoalDays, firstActivityKey, today, 12),
      week: computeCurrentWeekGoal(dailyRoutine, goalHistory, weeklyGoalDays, today),
    }
  }, [dailyRoutine, goalHistory, weeklyGoalDays, firstActivityKey])
  const days = useMemo(() => computeWeekDayStates(dailyRoutine, weeklyDays, new Date()), [dailyRoutine, weeklyDays])
  const bar = <span className="rb-context-skeleton" style={s.barSkeleton} />

  return (
    <div style={s.row}>
      <Quadrado
        label="SEMANAS" caption="na meta" onOpen={onOpenMetrics}
        number={weeks ? formatInt(weeks.total) : null} ariaLabel={weeks ? weeksAria(weeks.total) : 'Semanas na meta'}
      >
        {weeks ? <CapsulasDeSemanas capsules={weeks.capsules} height={10} gap={2} /> : bar}
      </Quadrado>

      <Quadrado
        label="DIAS" caption="esta semana" onOpen={onOpenMetrics}
        number={weeks ? `${weeks.week.feitos} de ${weeks.week.meta}` : null}
        ariaLabel={weeks ? daysAria(weeks.week.feitos, weeks.week.meta) : 'Dias na meta esta semana'}
      >
        <span style={s.dots} aria-hidden="true">
          {days.map(d => <span key={d.key} style={{ ...s.dot, ...s.dot_[dayDotKind(d.state)] }} />)}
        </span>
      </Quadrado>

      <Quadrado
        label="SELOS" caption={`de ${totalLivros} livros`} onOpen={onOpenEstante}
        number={formatInt(livrosCompletos)} ariaLabel={sealsAria(livrosCompletos, totalLivros)}
      >
        {livrosCompletos === 0
          ? <SeloDeLivro size={22} radius={7} />
          : sealNames
            ? (
              <span style={s.seals} aria-hidden="true">
                {sealNames.map(nome => {
                  const info = bookInfo(nome)
                  return <SeloDeLivro key={nome} sigla={info.sigla} blocoId={info.blocoId} lidos={1} total={1} size={22} radius={7} siglaSize={9} />
                })}
              </span>
            )
            : bar}
      </Quadrado>
    </div>
  )
}

const s = {
  row: { display: 'flex', gap: 8 },
  square: { flex: 1, minWidth: 0, borderRadius: 22, background: 'var(--bento-card)', padding: '14px 13px 13px', cursor: 'pointer', boxSizing: 'border-box' },
  label: { fontFamily: FONT, fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  number: { fontFamily: FONT, fontSize: 26, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-1.1px', color: 'var(--bento-ink)', whiteSpace: 'nowrap', margin: '0 0 6px' },
  numberSkeleton: { display: 'block', width: 44, height: 23, borderRadius: 8, background: 'var(--bento-line)', margin: '0 0 6px' },
  caption: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--bento-t3)', margin: '0 0 11px' },
  complement: { height: 22, display: 'flex', alignItems: 'center' },
  barSkeleton: { display: 'block', width: '100%', height: 10, borderRadius: 99, background: 'var(--bento-line)' },
  dots: { display: 'flex', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: '50%', boxSizing: 'border-box', flexShrink: 0 },
  dot_: {
    done: { background: 'var(--bento-ink)' },
    today: { background: 'var(--bento-accent)' },
    upcoming: { boxShadow: 'inset 0 0 0 1.5px var(--bento-t4)' },
    off: { background: 'var(--bento-bg)' },
  },
  seals: { display: 'flex', gap: 4 },
}
