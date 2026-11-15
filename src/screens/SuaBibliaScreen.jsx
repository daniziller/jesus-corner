// SuaBibliaScreen.jsx — Sua Bíblia (G2, HANDOFF §4): a roda em 300px com
// seletor Livros | Capítulos, três números, uma linha por bloco e "Como a
// roda vai ficando" (projeção no ritmo dos últimos 60 dias). Aberta pelo
// cartão SUA BÍBLIA do Hoje. Mesmo padrão de tela empilhada de
// MetricsScreen.jsx (cabeçalho com voltar, sem barra de abas).
//
// Toque numa fatia → G10 se o livro está completo, senão abre o livro na
// aba Bíblia. Linha de um bloco → Minha estante rolada até a prateleira
// daquele bloco.
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import RodaDaBiblia from '../components/gamificacao/RodaDaBiblia'
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS, blockColorVar, blockToneVar, bookInfo } from '../data/gamificationBlocks'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookCompletionDates } from '../gamification/familiesMath'
import { readingRatePerDay, projectPercentInOneYear, projectBookReads, estimateBibleCompletion, firstActivityIso } from '../gamification/projectionMath'
import { getWheelMode, setWheelMode } from '../gamification/wheelModeStore'
import { formatInt, formatPct, deOf, monthYearLong } from '../gamification/format'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { t } from '../i18n'
import ReiniciarLeituraSheet from '../components/biblia/ReiniciarLeituraSheet'
import { blockLabel } from '../data/achievements'

const FONT = 'var(--font-bento)'
const MODES = ['livros', 'capitulos']

function readsOf(progress) {
  const out = {}
  for (const nome in progress.porLivro) out[nome] = progress.porLivro[nome].lidos
  return out
}

// Último livro completado: o de maior data de conclusão conhecida; sem
// datas, o último completo na ordem canônica.
function lastCompletedBook(progress, completionDates) {
  let best = null
  for (const nome of progress.completos) {
    const iso = completionDates[nome]
    if (iso && (!best || iso > best.iso)) best = { nome, iso }
  }
  return best?.nome ?? progress.completos[progress.completos.length - 1] ?? null
}

export default function SuaBibliaScreen({ session, completedSet, onBack, onOpenBook, onOpenSelo, onOpenEstante, onRestartReading, restartAuth }) {
  const { lang, todaySession, dailyRoutine } = session
  const C = (k, vars) => t(`conquistasTx.${k}`, vars, lang)
  const [mode, setMode] = useState(getWheelMode)
  const [rows, setRows] = useState(null) // { chapterRows, sessionRows } — só pra datas/ritmo
  // "Reiniciar a leitura do zero": a folha com o que reiniciar e a senha.
  const [restartOpen, setRestartOpen] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.allSettled([getAllChapterReadRows(), getAllSessions()]).then(([c, sdata]) => {
      if (!alive) return
      setRows({ chapterRows: c.status === 'fulfilled' ? c.value : [], sessionRows: sdata.status === 'fulfilled' ? sdata.value : [] })
    })
    return () => { alive = false }
  }, [])

  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const reads = useMemo(() => readsOf(progress), [progress])
  const completionDates = useMemo(() => bookCompletionDates(progress, rows?.chapterRows ?? []), [progress, rows])
  const highlightBook = lastCompletedBook(progress, completionDates)
  const currentBook = !progress.bibliaInteira && todaySession?.type !== 'reflection' && todaySession?.book && bookInfo(todaySession.book) ? todaySession.book : null

  // Projeção (HANDOFF §4.5): ritmo dos últimos 60 dias; sem ritmo, só
  // "Hoje" e "A Bíblia inteira" sem data.
  const projection = useMemo(() => {
    if (!rows) return null
    const first = firstActivityIso(rows.chapterRows, rows.sessionRows, dailyRoutine)
    const rate = readingRatePerDay(rows.chapterRows, first)
    if (!rate || progress.bibliaInteira) return { rate: null }
    return {
      rate,
      yearPercent: projectPercentInOneYear(progress.capitulosLidos, rate),
      yearReads: projectBookReads(progress.porLivro, GAMIFICATION_BOOKS, rate),
      completion: estimateBibleCompletion(progress.capitulosLidos, rate),
    }
  }, [rows, dailyRoutine, progress])
  const fullReads = useMemo(() => Object.fromEntries(GAMIFICATION_BOOKS.map(b => [b.nome, b.capitulos])), [])

  function pickMode(m) { setMode(m); setWheelMode(m) }
  const pct = formatPct(progress.percent, lang)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{C('yourBible')}</p>
        <div style={s.segment} role="tablist" aria-label={C('wheelMode')}>
          {MODES.map(id => [id, C(`mode_${id}`)]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} style={{ ...s.segBtn, ...(mode === id ? s.segBtnOn : {}) }} onClick={() => pickMode(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={s.body}>
        <div style={s.wheelWrap}>
          <RodaDaBiblia
            reads={reads} mode={mode} size={300}
            currentBook={currentBook} highlightBook={highlightBook}
            centerLine1={pct} centerLine2={C('ofBibleRead')} centerSize={44}
            ariaLabel={C('wheelAria', { pct, x: deOf(progress.capitulosLidos, progress.totalCapitulos, lang) })}
            onSliceClick={nome => (progress.porLivro[nome].completo ? onOpenSelo?.(nome) : onOpenBook?.(nome))}
          />
        </div>

        <div style={s.statsRow}>
          <div style={s.statCard}><p style={s.statLabel}>{C('statChapters')}</p><p style={s.statValue}>{formatInt(progress.capitulosLidos, lang)}</p></div>
          <div style={s.statCard}><p style={s.statLabel}>{C('statBooks')}</p><p style={s.statValue}>{deOf(progress.livrosCompletos, progress.totalLivros, lang)}</p></div>
          <div style={s.statCard}><p style={s.statLabel}>{C('statBlocks')}</p><p style={s.statValue}>{deOf(progress.blocosComecados, 8, lang)}</p></div>
        </div>

        <div style={s.blocksCard}>
          {GAMIFICATION_BLOCKS.map((block, i) => {
            const b = progress.porBloco[i]
            const ratio = b.lidos / b.total
            return (
              <button key={block.id} type="button" style={{ ...s.blockRow, ...(i > 0 ? s.blockRowDivider : {}) }} onClick={() => onOpenEstante?.(block.id)}>
                <span style={{ ...s.blockSwatch, background: blockColorVar(block.id) }} />
                <span style={s.blockMain}>
                  <span style={s.blockTop}>
                    <span style={s.blockName}>{blockLabel(block.id, lang)}</span>
                    <span style={{ ...s.blockCount, color: b.lidos > 0 ? 'var(--bento-ink)' : 'var(--bento-t5)' }}>{C('chaptersShort', { x: deOf(b.lidos, b.total, lang) })}</span>
                  </span>
                  <span style={{ ...s.bar, background: blockToneVar(block.id) }}>
                    {b.lidos > 0 && <span style={{ ...s.barFill, background: blockColorVar(block.id), width: `max(6px, ${ratio * 100}%)` }} />}
                  </span>
                  <span style={s.blockBooks}>{C('booksCompleteCount', { x: deOf(b.livrosCompletos, b.livrosTotal, lang) })}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div style={s.sandCard}>
          <p style={s.sandLabel}>{C('howWheel')}</p>
          <div style={s.miniRow}>
            <div style={s.miniCol}>
              <RodaDaBiblia reads={reads} mode="livros" size={92} ariaLabel={C('todayAria', { pct })} />
              <p style={s.miniTitle}>{C('today')}</p>
              <p style={s.miniSub}>{formatPct(Math.round(progress.percent), lang)}</p>
            </div>
            {projection?.rate && (
              <div style={s.miniCol}>
                <RodaDaBiblia reads={projection.yearReads} mode="livros" size={92} ariaLabel={C('inYearAria', { pct: formatPct(projection.yearPercent, lang) })} />
                <p style={s.miniTitle}>{C('inYear')}</p>
                <p style={s.miniSub}>{C('atYourPace', { pct: formatPct(Math.round(projection.yearPercent), lang) })}</p>
              </div>
            )}
            <div style={s.miniCol}>
              <RodaDaBiblia reads={fullReads} mode="livros" size={92} ariaLabel={C('wholeBible')} />
              <p style={s.miniTitle}>{C('wholeBible')}</p>
              {projection?.completion && <p style={s.miniSub}>{monthYearLong(projection.completion, lang)}</p>}
            </div>
          </div>
        </div>

        {onRestartReading && (
          <button type="button" style={s.restart} onClick={() => setRestartOpen(true)}>
            <AppIcon name="RefreshCw" size={14} strokeWidth={2.2} color="var(--bento-t3)" />
            {t('restartReading.open', undefined, lang)}
          </button>
        )}
      </div>
      {restartOpen && (
        <ReiniciarLeituraSheet
          lang={lang} auth={restartAuth}
          onClose={() => setRestartOpen(false)} onRestart={onRestartReading} onDone={() => setRestartOpen(false)}
        />
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 12px' },
  backBtn: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  segment: { display: 'flex', background: '#fff', borderRadius: 99, padding: 3, flexShrink: 0 },
  segBtn: { border: 'none', background: 'none', borderRadius: 99, padding: '0 14px', height: 44, fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  segBtnOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  wheelWrap: { display: 'flex', justifyContent: 'center', padding: '12px 0 14px' },
  statsRow: { display: 'flex', gap: 10 },
  statCard: { flex: 1, minWidth: 0, borderRadius: 18, background: 'var(--bento-card)', padding: '14px 14px 13px' },
  statLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 6px' },
  statValue: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', lineHeight: 1, color: 'var(--bento-ink)', margin: 0, whiteSpace: 'nowrap' },
  blocksCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px' },
  blockRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: FONT, minHeight: 44 },
  blockRowDivider: { borderTop: '1px solid var(--bento-line)' },
  blockSwatch: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  blockMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  blockTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  blockName: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  blockCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, flexShrink: 0 },
  bar: { display: 'block', height: 6, borderRadius: 99, overflow: 'hidden' },
  barFill: { display: 'block', height: '100%', borderRadius: 99 },
  blockBooks: { fontFamily: FONT, fontSize: 10.5, fontWeight: 500, color: 'var(--bento-t4)' },
  restart: { alignSelf: 'center', minHeight: 44, border: 'none', background: 'none', padding: '0 14px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px 18px' },
  sandLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 14px' },
  miniRow: { display: 'flex', justifyContent: 'space-around', gap: 8 },
  miniCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  miniTitle: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '10px 0 0', textAlign: 'center' },
  miniSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, color: 'var(--bento-sand-ink-mid)', margin: 0, textAlign: 'center' },
}
