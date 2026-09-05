// BookChapterScreen.jsx — Página do livro, capítulos (quadro 18a).
//
// Alcançada tocando um livro na grade de 5f (JourneyScreen.jsx) — substitui
// o antigo comportamento de expandir a lista de sessões embutida ali mesmo.
// Mostra a posição do livro no bloco + progresso (anel), depois TODOS os
// capítulos do livro numa grade de 6 colunas (código de cor de 18a: preto =
// lido, laranja = onde você parou, cinza-claro = por ler — o mesmo do
// rodapé de 5f). Tocar um capítulo abre a leitura dele embutida abaixo da
// grade (mesmo ReadingBlockView embutido que 5f já usava); o botão fixo no
// rodapé pula direto pro capítulo onde a pessoa parou, sem precisar caçar o
// laranja na grade.
import { useState, useRef, useEffect } from 'react'
import { computeBookChapterCounts } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

export default function BookChapterScreen({
  session, authUser, block, bookName, displayName,
  sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onGoToReflectionFrom, onNavigate,
  onBack, initialSessionId, initialTextOpen,
}) {
  const { lang } = session
  const L = (k, vars) => t(`bookChapters.${k}`, vars, lang)

  const [openSessionId, setOpenSessionId] = useState(initialSessionId ?? null)
  const [openTextOpen, setOpenTextOpen] = useState(!!initialTextOpen)

  const total = computeBookChapterCounts(sessionsByBlock)[bookName] ?? 0
  const bookSessions = (browseSessionsByBlock[block.id] ?? []).filter(s => s.book === bookName && s.type !== 'reflection')

  let doneCount = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${bookName}:${ch}`)) doneCount++
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  // Capítulo "onde você parou" — o 1º ainda não lido, ou o último se o
  // livro inteiro já foi concluído (mesmo critério do "onde você parou" da
  // grade de 5f/4a).
  let currentCh = total
  for (let ch = 1; ch <= total; ch++) { if (!completedSet.has(`${bookName}:${ch}`)) { currentCh = ch; break } }

  const bookIdx = block.books.indexOf(bookName)
  const blockName = lang === 'en' ? block.nameEn : block.name

  function openChapter(ch) {
    const target = bookSessions.find(s => s.chStart <= ch && ch <= s.chEnd)
    if (!target) return
    setOpenSessionId(target.id)
    setOpenTextOpen(true)
  }

  const openEntry = openSessionId ? bookSessions.find(s => s.id === openSessionId) : null
  const expandRef = useRef(null)
  useEffect(() => {
    if (openSessionId && expandRef.current) expandRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [openSessionId])

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.headerTitle}>{t('nav.journey', undefined, lang)}</p>
      </div>

      <div style={s.body}>
        <div style={s.hero}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.heroLabel}>{L('bookPosition', { block: blockName, n: bookIdx + 1 })}</p>
            <p style={s.heroTitle}>{displayName}</p>
            <p style={s.heroSub}>{L('chaptersReadOf', { total, done: doneCount })}</p>
          </div>
          <div style={{ ...s.ring, background: `conic-gradient(var(--bento-accent) 0 ${pct * 3.6}deg, rgba(255,255,255,.1) ${pct * 3.6}deg 360deg)` }}>
            <div style={s.ringInner}><span style={s.ringPct}>{pct}%</span></div>
          </div>
        </div>

        <div style={s.grid}>
          <div style={s.gridHeader}>
            <p style={s.gridLabel}>{L('chaptersLabel')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-ink)' }} />{L('legendRead')}</span>
              <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-accent)' }} />{L('legendCurrent')}</span>
            </div>
          </div>
          <div style={s.chapterGrid}>
            {Array.from({ length: total }, (_, i) => i + 1).map(ch => {
              const done = completedSet.has(`${bookName}:${ch}`)
              const isCurrent = ch === currentCh
              return (
                <button
                  key={ch}
                  style={{
                    ...s.chapterCell,
                    background: isCurrent ? 'var(--bento-accent)' : done ? 'var(--bento-ink)' : 'var(--bento-line)',
                    color: isCurrent ? 'var(--bento-ink)' : done ? '#fff' : 'var(--bento-ink)',
                    fontWeight: isCurrent ? 800 : 700,
                  }}
                  onClick={() => openChapter(ch)}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>

        {openEntry && (
          <div ref={expandRef} style={s.expandWrap}>
            <ReadingBlockView
              key={`${block.id}:${bookName}:${openSessionId}:${openTextOpen}`}
              embedded
              mode="browse"
              session={session}
              authUser={authUser}
              onNavigate={onNavigate}
              blockId={block.id}
              blocks={[block]}
              sessionsByBlock={{ [block.id]: bookSessions }}
              completedSet={completedSet}
              onToggleSession={onToggleSession}
              onToggleChapter={onToggleChapter}
              initialSessionId={openSessionId}
              initialTextOpen={openTextOpen}
              onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: block.id, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, type: heroSession.type })}
            />
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.continueBtn} onClick={() => openChapter(currentCh)}>
          <span>{L('continueBtn', { ref: `${displayName} ${currentCh}` })}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>→</span>
        </button>
      </div>
    </div>
  )
}

// Medidas do quadro 18a.
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  hero: { borderRadius: 24, background: 'var(--bento-ink)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  heroLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 8px' },
  heroTitle: { fontFamily: 'var(--font-bento)', fontSize: 30, fontWeight: 800, letterSpacing: '-1.3px', color: '#fff', margin: '0 0 8px' },
  heroSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  ring: { flexShrink: 0, width: 58, height: 58, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 46, height: 46, borderRadius: 99, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: '#fff' },

  grid: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 18px' },
  gridHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' },
  gridLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)' },
  legendDot: { width: 8, height: 8, borderRadius: 3 },
  chapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 },
  chapterCell: { height: 44, borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, textAlign: 'center' },

  expandWrap: { background: 'var(--bento-line)', borderRadius: 16, overflow: 'hidden' },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  continueBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
