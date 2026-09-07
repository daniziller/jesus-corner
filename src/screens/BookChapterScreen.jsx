// BookChapterScreen.jsx — Página do livro, capítulos (quadros 18a/32c, e o
// modo "Marcando" de 28c).
//
// Alcançada tocando um livro na grade de 5f (JourneyScreen.jsx) — substitui
// o antigo comportamento de expandir a lista de sessões embutida ali mesmo.
// Mostra a posição do livro no bloco + progresso (anel), depois TODOS os
// capítulos do livro numa grade de 6 colunas (código de cor: preto = lido,
// laranja = onde você parou, cinza-claro = por ler). No modo padrão, tocar
// um capítulo ABRE a leitura dele embutida abaixo da grade (32c: "toque
// abre, não marca") — marcar como lido nunca acontece por toque solto
// fora do modo opt-in "Marcando" (28c), aberto pelo chip do cabeçalho.
//
// No modo Marcando (chip do cabeçalho vira preto), tocar um número liga/
// desliga um rascunho local (pendingMarks — "2 marcados agora, ainda não
// salvos"), e só "Salvar N capítulos" grava de vez, via
// markChaptersManually (Bloco 2) — a mesma trilha de auditoria que
// distingue "lido numa sessão" de "marcado à mão", sem tocar rotina/
// sequência/último-texto-lido (a marcação livre é só o mapa, não conta
// como sessão nem como hábito).
import { useState, useRef, useEffect } from 'react'
import { computeBookChapterCounts } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

export default function BookChapterScreen({
  session, authUser, block, bookName, displayName,
  sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, onGoToReflectionFrom, onNavigate,
  onBack, initialSessionId, initialTextOpen,
}) {
  const { lang } = session
  const L = (k, vars) => t(`bookChapters.${k}`, vars, lang)

  const [openSessionId, setOpenSessionId] = useState(initialSessionId ?? null)
  const [openTextOpen, setOpenTextOpen] = useState(!!initialTextOpen)
  // Modo Marcando (28c) — opt-in, aberto pelo chip do cabeçalho.
  // pendingMarks: { [capítulo]: true (marcar) | false (desmarcar) } — só o
  // que DIFERE do completedSet atual; nada se aplica até "Salvar".
  const [markingMode, setMarkingMode] = useState(false)
  const [pendingMarks, setPendingMarks] = useState({})

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

  // Estado EFETIVO de um capítulo no modo Marcando — o rascunho local
  // (pendingMarks) prevalece sobre o completedSet real até salvar.
  function effectiveDone(ch) {
    return pendingMarks[ch] !== undefined ? pendingMarks[ch] : completedSet.has(`${bookName}:${ch}`)
  }
  function toggleMark(ch) {
    const real = completedSet.has(`${bookName}:${ch}`)
    const nextEffective = !effectiveDone(ch)
    setPendingMarks(prev => {
      const next = { ...prev }
      // Voltou pro estado real (ex: marcou e desmarcou de novo) — tira do
      // rascunho em vez de guardar um "sem mudança" solto.
      if (nextEffective === real) delete next[ch]
      else next[ch] = nextEffective
      return next
    })
  }
  const pendingCount = Object.keys(pendingMarks).length
  function discardPending() {
    setPendingMarks({})
    setMarkingMode(false)
  }
  function savePending() {
    const toMark = []
    const toUnmark = []
    for (const [ch, mark] of Object.entries(pendingMarks)) (mark ? toMark : toUnmark).push(Number(ch))
    if (toMark.length) onMarkChaptersManually?.(bookName, toMark, true)
    if (toUnmark.length) onMarkChaptersManually?.(bookName, toUnmark, false)
    setPendingMarks({})
    setMarkingMode(false)
  }
  // "Marcar 1 a N" (28c) — resolve o caso mais comum (já li até aqui) num
  // toque só: marca tudo antes de onde você parou. Some quando não há
  // nada pendente pra marcar dessa forma (já leu tudo, ou está no
  // capítulo 1).
  function markUpToCurrent() {
    const upTo = currentCh - 1
    if (upTo < 1) return
    setPendingMarks(prev => {
      const next = { ...prev }
      for (let ch = 1; ch <= upTo; ch++) {
        if (!completedSet.has(`${bookName}:${ch}`)) next[ch] = true
      }
      return next
    })
  }
  function markWholeBook() {
    setPendingMarks(prev => {
      const next = { ...prev }
      for (let ch = 1; ch <= total; ch++) if (!completedSet.has(`${bookName}:${ch}`)) next[ch] = true
      return next
    })
  }
  function unmarkAll() {
    setPendingMarks(prev => {
      const next = { ...prev }
      for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${bookName}:${ch}`)) next[ch] = false
      return next
    })
  }

  const openEntry = !markingMode && openSessionId ? bookSessions.find(s => s.id === openSessionId) : null
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
        <div style={{ flex: 1 }} />
        {/* Chip "Marcar lidos" (28c) — única porta pro modo de marcação;
            dentro dele, tocar um número marca/desmarca em vez de abrir. */}
        <button
          style={{ ...s.markModeBtn, ...(markingMode ? s.markModeBtnOn : {}) }}
          onClick={() => (markingMode ? discardPending() : setMarkingMode(true))}
        >
          <AppIcon name="Check" size={12} strokeWidth={2.8} color={markingMode ? 'var(--bento-accent)' : 'var(--bento-t3)'} />
          <span>{markingMode ? L('markingLabel') : L('markReadLabel')}</span>
        </button>
      </div>

      <div style={s.body}>
        <div style={s.hero}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.heroLabel}>{L('bookPosition', { block: blockName, n: bookIdx + 1 })}</p>
            <p style={s.heroTitle}>{displayName}</p>
            <p style={s.heroSub}>
              {markingMode
                ? (pendingCount === 1 ? L('pendingOne') : L('pendingMany', { n: pendingCount }))
                : L('chaptersReadOf', { total, done: doneCount })}
            </p>
          </div>
          <div style={s.ring}>
            {/* Anel de progresso em SVG (círculo + stroke-dasharray) — não
                conic-gradient: a varredura de identidade (Bloco 1) baniu
                todo `gradient` do app, então nem o sólido de 1 cor conta. */}
            <svg width="58" height="58" viewBox="0 0 58 58" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="29" cy="29" r="26" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" />
              <circle cx="29" cy="29" r="26" fill="none" stroke="var(--bento-accent)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 163.36} 163.36`} />
            </svg>
            <div style={s.ringInner}><span style={s.ringPct}>{pct}%</span></div>
          </div>
        </div>

        {markingMode && (
          <div style={s.quickRow}>
            {currentCh > 1 && (
              <button style={s.quickBtn} onClick={markUpToCurrent}>{L('markUpTo', { n: currentCh - 1 })}</button>
            )}
            <button style={s.quickBtnDark} onClick={markWholeBook}>{L('markWholeBook')}</button>
            <button style={s.quickBtnLight} onClick={unmarkAll}>{L('unmarkAll')}</button>
          </div>
        )}

        <div style={s.grid}>
          <div style={s.gridHeader}>
            <p style={s.gridLabel}>{markingMode ? L('tapToMark') : L('chaptersLabel')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-ink)' }} />{L('legendRead')}</span>
              <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-accent)' }} />{L('legendCurrent')}</span>
              {markingMode && (
                <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-line)', border: '1px solid var(--bento-t6)', boxSizing: 'border-box' }} />{L('legendUnread')}</span>
              )}
            </div>
          </div>
          <div style={s.chapterGrid}>
            {Array.from({ length: total }, (_, i) => i + 1).map(ch => {
              const done = markingMode ? effectiveDone(ch) : completedSet.has(`${bookName}:${ch}`)
              const isPending = markingMode && pendingMarks[ch] !== undefined
              const isCurrent = !markingMode && ch === currentCh
              return (
                <button
                  key={ch}
                  style={{
                    ...s.chapterCell,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    background: isCurrent ? 'var(--bento-accent)' : done ? 'var(--bento-ink)' : 'var(--bento-line)',
                    color: isCurrent ? 'var(--bento-ink)' : done ? '#fff' : 'var(--bento-ink)',
                    fontWeight: isCurrent ? 800 : 700,
                  }}
                  onClick={() => (markingMode ? toggleMark(ch) : openChapter(ch))}
                >
                  <span>{ch}</span>
                  {isPending && <AppIcon name="Check" size={9} strokeWidth={3.4} color="var(--bento-accent)" />}
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
        {markingMode ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.discardBtn} onClick={discardPending} aria-label={L('discardAria')}>
              <AppIcon name="X" size={16} strokeWidth={2.4} color="var(--bento-ink)" />
            </button>
            <button style={{ ...s.continueBtn, flex: 1, opacity: pendingCount ? 1 : 0.5 }} onClick={savePending} disabled={!pendingCount}>
              <span>{pendingCount === 1 ? L('saveOne') : L('saveMany', { n: pendingCount })}</span>
            </button>
          </div>
        ) : (
          <button style={s.continueBtn} onClick={() => openChapter(currentCh)}>
            <span>{L('continueBtn', { ref: `${displayName} ${currentCh}` })}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>→</span>
          </button>
        )}
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
  markModeBtn: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-t3)' },
  markModeBtnOn: { background: 'var(--bento-ink)', color: '#fff' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  hero: { borderRadius: 24, background: 'var(--bento-ink)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  heroLabel: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', margin: '0 0 8px' },
  heroTitle: { fontFamily: 'var(--font-bento)', fontSize: 30, fontWeight: 800, letterSpacing: '-1.3px', color: '#fff', margin: '0 0 8px' },
  heroSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  ring: { position: 'relative', flexShrink: 0, width: 58, height: 58, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringInner: { position: 'relative', width: 46, height: 46, borderRadius: 99, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, color: '#fff' },

  quickRow: { display: 'flex', gap: 8 },
  quickBtn: { flex: 1, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-card)', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 800, color: 'var(--bento-accent)', cursor: 'pointer' },
  quickBtnDark: { flex: 1, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-ink)', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },
  quickBtnLight: { flex: 1, height: 40, borderRadius: 13, border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 800, color: 'var(--bento-t3)', cursor: 'pointer' },

  grid: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 18px' },
  gridHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' },
  gridLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 600, color: 'var(--bento-t3)' },
  legendDot: { width: 8, height: 8, borderRadius: 3 },
  chapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 },
  chapterCell: { height: 44, borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, textAlign: 'center' },

  // flexShrink: 0 é o ponto central do bug corrigido aqui: sem isso, o
  // navegador dá a este item (dentro da coluna flex rolável `body` acima)
  // um tamanho mínimo automático de 0 — regra do próprio CSS pra qualquer
  // item de flex com overflow diferente de "visible" — e como `body` fica
  // menor que a soma dos filhos, TODO o encolhimento cai neste item (os
  // outros, sem overflow declarado, não encolhem abaixo do próprio
  // conteúdo). Resultado: o capítulo abria de verdade (texto no DOM,
  // "Marcar capítulo X como lido" incluso) mas com 0px de altura — some
  // sem erro nenhum no console, o mais enganoso dos bugs de layout.
  expandWrap: { background: 'var(--bento-line)', borderRadius: 16, overflow: 'hidden', flexShrink: 0 },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  continueBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  discardBtn: { flexShrink: 0, width: 54, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
