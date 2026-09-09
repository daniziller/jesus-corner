// BookChapterScreen.jsx — O livro: grade de capítulos e marcação livre
// (39c, pacote 39). Substitui por inteiro a versão anterior (18b/28c/32a
// — modo "Marcando" opt-in com rascunho + "Salvar N capítulos"): agora
// SEGURAR um número não lido (~450ms, com haptic) marca na hora, sem
// diálogo nem modo à parte — "toque abre · segure marca", igual ao
// quadro. "Marcar sem abrir é requisito, não atalho" (regra 2 da aba).
//
// Ajustado (2026-09-09, regra dela): segurar só MARCA — nunca desmarca.
// Um toque (curto ou longo) num capítulo JÁ lido sempre abre a leitura,
// nunca desfaz a marcação; desmarcar é deliberado, só de dentro do
// capítulo, desligando o botão "Marcar como lido" — nunca pela grade.
//
// Duas origens distintas na grade (preto = lido no app / cinza escuro
// `#6E655C` = marcado à mão) — vêm de chapters_read (chapterReadLog.js,
// bible/chapterOrigin.js), não de completedSet (que só sabe "lido ou
// não", igual pras duas). "Próximo do plano" (laranja) é
// session.currentBlock quando bate com ESTE livro — o mesmo capítulo que
// "Você está em Gênesis 41" mostra em 39a; não existe por conta própria
// aqui, Meu Plano continua sendo quem decide.
//
// Bloco 2 (39d): tocar um capítulo agora troca a tela inteira pela
// leitura livre de verdade (ReadingBlockView mode="browse", NÃO embutida
// — vira imersiva sozinha, ver `freeReading` em ReadingBlockView.jsx),
// no lugar da leitura embutida abaixo da grade que existia até aqui.
// Mesmo padrão que JourneyScreen.jsx já usa pra leitura guiada: o próprio
// componente troca o que retorna, sem precisar de uma rota nova em
// App.jsx. "Voltar" (onBack do ReadingBlockView) fecha só o capítulo,
// volta pra grade — não sai do livro.
import { useState, useRef, useEffect } from 'react'
import { computeBookChapterCounts } from '../utils/progress'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { buildChapterOriginMap, originOf } from '../bible/chapterOrigin'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import BibleVersionChip from '../components/bible/BibleVersionChip'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

const HOLD_MS = 450

export default function BookChapterScreen({
  session, authUser, block, bookName, displayName,
  sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, onGoToReflectionFrom, onNavigate,
  onBack, initialSessionId, initialTextOpen, initialFocusVerse, onActiveChapterChange,
}) {
  const { lang } = session
  const L = (k, vars) => t(`bookChapters.${k}`, vars, lang)
  const email = authUser?.email

  const [openSessionId, setOpenSessionId] = useState(initialSessionId ?? null)
  const [openTextOpen, setOpenTextOpen] = useState(!!initialTextOpen)
  // 39k/39l (Bloco 6): tocar um cartão de busca/tema chega aqui já com um
  // versículo pra focar — ver initialFocusVerse em ReadingBlockView.jsx.
  const [openFocusVerse, setOpenFocusVerse] = useState(initialFocusVerse ?? null)
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))

  const total = computeBookChapterCounts(sessionsByBlock)[bookName] ?? 0
  const bookSessions = (browseSessionsByBlock[block.id] ?? []).filter(s => s.book === bookName && s.type !== 'reflection')

  let doneCount = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${bookName}:${ch}`)) doneCount++
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  // "Próximo do plano" (laranja) — só existe quando o plano está DENTRO
  // deste livro agora; não inventa um "próximo" quando ele está noutro
  // livro (session.currentBlock é o mesmo dado que 39a usa).
  const planNextChapter = session.currentBlock?.book === bookName ? session.currentBlock.chapter : null

  const bookIdx = block.books.indexOf(bookName)
  const blockName = lang === 'en' ? block.nameEn : block.name

  // Origem de cada capítulo (lido no app / marcado à mão) — chapters_read,
  // buscado uma vez e reaplicado localmente a cada marcação (evita
  // esperar o round-trip pra cor mudar).
  const [originMap, setOriginMap] = useState(new Map())
  useEffect(() => {
    getAllChapterReadRows().then(rows => setOriginMap(buildChapterOriginMap(rows))).catch(() => {})
  }, [])
  function originFor(ch) { return originOf(originMap, bookName, ch) }
  let appReadCount = 0, manualCount = 0
  for (let ch = 1; ch <= total; ch++) {
    if (!completedSet.has(`${bookName}:${ch}`)) continue
    if (originFor(ch) === 'manual') manualCount++
    else appReadCount++
  }

  function openChapter(ch) {
    const target = bookSessions.find(s => s.chStart <= ch && ch <= s.chEnd)
    if (!target) return
    setOpenSessionId(target.id)
    setOpenTextOpen(true)
    setOpenFocusVerse(null)
  }

  // Segurar marca sem abrir e sem diálogo (regra 2 da aba) — otimista no
  // originMap local (marcação nova = 'manual' na hora; se já havia uma
  // linha em chapters_read pra este capítulo, o insert dela é ignorado —
  // a origem original prevalece, ver chapterReadLog.js). Só chamada pra
  // capítulo AINDA não lido — ver guarda em startHold.
  function markChapterReadByHold(ch) {
    onMarkChaptersManually?.(bookName, [ch], true)
    setOriginMap(prev => new Map(prev).set(`${bookName}:${ch}`, 'manual'))
    navigator.vibrate?.(30)
  }

  function markWholeBook() {
    const missing = []
    for (let ch = 1; ch <= total; ch++) if (!completedSet.has(`${bookName}:${ch}`)) missing.push(ch)
    if (!missing.length) return
    onMarkChaptersManually?.(bookName, missing, true)
    setOriginMap(prev => {
      const next = new Map(prev)
      for (const ch of missing) next.set(`${bookName}:${ch}`, 'manual')
      return next
    })
  }

  // Só abre a leitura de tela cheia quando openTextOpen é verdadeiro —
  // chegar aqui vindo de 39b (expandBook com textOpen=false) mostra a
  // grade normalmente, mesmo com um openSessionId "de partida" (o próximo
  // capítulo não lido, só pra eventual uso futuro); tocar um número
  // (openChapter) ou vir de "lidos recentemente" (initialTextOpen) é que
  // realmente abre 39d.
  const openEntry = openTextOpen && openSessionId ? bookSessions.find(s => s.id === openSessionId) : null

  // Segurar ~450ms com haptic — pointer events cobrem mouse e toque num
  // gesto só. Um toque curto (solta antes do tempo) segue pro onClick
  // normal (abre); heldRef sinaliza quando o toque já virou marcação,
  // pra o click que o navegador ainda dispara na soltura não abrir junto.
  // Capítulo já lido: o timer nem marca heldRef, então a soltura sempre
  // cai no onClick normal (abre) — segurar num capítulo lido nunca desmarca.
  const holdTimerRef = useRef(null)
  const heldRef = useRef(false)
  function startHold(ch) {
    heldRef.current = false
    clearTimeout(holdTimerRef.current)
    if (completedSet.has(`${bookName}:${ch}`)) return
    holdTimerRef.current = setTimeout(() => {
      heldRef.current = true
      markChapterReadByHold(ch)
    }, HOLD_MS)
  }
  function cancelHold() {
    clearTimeout(holdTimerRef.current)
  }
  function handleChapterClick(ch) {
    if (heldRef.current) { heldRef.current = false; return }
    openChapter(ch)
  }

  // 39d: capítulo aberto de verdade troca a tela inteira pela leitura
  // livre (mesmo padrão de JourneyScreen.jsx pra leitura guiada — ver
  // comentário no topo do arquivo). onBack fecha só o capítulo, não o
  // livro: volta pra 39c com a mesma grade.
  if (openEntry) {
    return (
      <ReadingBlockView
        key={`${block.id}:${bookName}:${openSessionId}`}
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
        initialTextOpen
        initialFocusVerse={openFocusVerse}
        onActiveChapterChange={onActiveChapterChange}
        onBack={() => { setOpenSessionId(null); setOpenTextOpen(false); setOpenFocusVerse(null) }}
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: block.id, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
      />
    )
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{displayName}</p>
          <p style={s.headerSub}>{L('bookPosition', { block: blockName, n: total })}</p>
        </div>
        <BibleVersionChip lang={lang} versionId={versionId} onChange={setVersionId} />
      </div>

      <div style={s.body}>
        <div style={s.hero}>
          <div style={s.ring}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
              <circle cx="32" cy="32" r="29" fill="none" stroke="var(--bento-accent)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 182.2} 182.2`} />
            </svg>
            <div style={s.ringInner}><span style={s.ringPct}>{pct}%</span></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.heroTitle}>{L('chaptersOf', { done: doneCount, total })}</p>
            {(appReadCount > 0 || manualCount > 0) && (
              <p style={s.heroSub}>
                {appReadCount > 0 && L(appReadCount === 1 ? 'appReadOne' : 'appReadMany', { n: appReadCount })}
                {appReadCount > 0 && manualCount > 0 ? ' · ' : ''}
                {manualCount > 0 && L(manualCount === 1 ? 'manualOne' : 'manualMany', { n: manualCount })}
              </p>
            )}
          </div>
        </div>

        <div style={s.grid}>
          <div style={s.gridHeader}>
            <p style={s.gridLabel}>{L('chaptersLabel')}</p>
            <p style={s.gridInstruction}>{L('gridInstruction')}</p>
          </div>
          <div style={s.chapterGrid}>
            {Array.from({ length: total }, (_, i) => i + 1).map(ch => {
              const done = completedSet.has(`${bookName}:${ch}`)
              const isNext = !done && ch === planNextChapter
              const origin = done ? originFor(ch) : null
              const bg = isNext ? 'var(--bento-accent)' : origin === 'manual' ? 'var(--bento-t2)' : done ? 'var(--bento-ink)' : '#F4EFE9'
              const color = isNext ? 'var(--bento-ink)' : done ? '#fff' : 'var(--bento-t3)'
              return (
                <button
                  key={ch}
                  style={{ ...s.chapterCell, background: bg, color, fontWeight: done || isNext ? 800 : 600 }}
                  onPointerDown={() => startHold(ch)}
                  onPointerUp={cancelHold}
                  onPointerLeave={cancelHold}
                  onPointerCancel={cancelHold}
                  onClick={() => handleChapterClick(ch)}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>

        <div style={s.legendCard}>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-ink)' }} />{L('legendRead')}</span>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-t2)' }} />{L('legendManual')}</span>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bento-accent)' }} />{L('legendNext')}</span>
        </div>

        <div style={s.markBookCard}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.markBookTitle}>{L('markWholeBookTitle')}</p>
            <p style={s.markBookSub}>{L('markWholeBookSub', { book: displayName })}</p>
          </div>
          <button style={s.markBookBtn} onClick={markWholeBook}>{L('markBtn')}</button>
        </div>

        <button style={s.startPlanCard} onClick={() => onNavigate?.('readingOrganize')}>
          <span style={s.startPlanIcon}><AppIcon name="FileText" size={16} strokeWidth={1.9} color="var(--bento-t3)" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={s.startPlanTitle}>{L('startPlanTitle')}</span>
            <span style={s.startPlanSub}>{L('startPlanSub', { book: displayName })}</span>
          </span>
          <span style={s.startPlanChevron}>›</span>
        </button>
      </div>
    </div>
  )
}

// Medidas do quadro 39c.
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },

  hero: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 },
  ring: { position: 'relative', flexShrink: 0, width: 64, height: 64, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringInner: { position: 'relative', width: 50, height: 50, borderRadius: 99, background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: '#fff' },
  heroTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, letterSpacing: '-.5px', color: '#fff', margin: '0 0 4px' },
  heroSub: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, color: 'rgba(255,255,255,.5)', margin: 0 },

  grid: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 18px' },
  gridHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' },
  gridLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  gridInstruction: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 },
  chapterCell: { aspectRatio: '1', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, textAlign: 'center', userSelect: 'none', touchAction: 'manipulation' },

  legendCard: { borderRadius: 18, background: 'var(--bento-card)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)' },
  legendDot: { width: 14, height: 14, borderRadius: 4, flexShrink: 0 },

  markBookCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  markBookTitle: { fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: '0 0 3px' },
  markBookSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-ink)', margin: 0 },
  markBookBtn: { flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 16, border: 'none', background: 'var(--bento-sand-icon)', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 800, color: 'var(--bento-sand)' },

  startPlanCard: { width: '100%', borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  startPlanIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  startPlanTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  startPlanSub: { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  startPlanChevron: { fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)' },
}
