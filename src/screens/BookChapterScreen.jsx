// BookChapterScreen.jsx — O livro (handoff-biblia-52, B2): o selo do livro
// enchendo, três números do livro, a grade de capítulos na cor do bloco,
// as duas ações e um botão fixo que abre o próximo capítulo. Substitui o
// quadro 39c (bloco preto com anel, grade preta/cinza de 6 colunas, cartão
// de legenda e cartões soltos de ação).
//
// O que NÃO mudou (regras de 39c): tocar um número abre a leitura livre
// de verdade (ReadingBlockView mode="browse", que troca a tela inteira —
// "voltar" fecha só o capítulo); SEGURAR um número não lido (~450ms, com
// haptic) marca na hora, sem diálogo — "toque abre · segure marca".
// Segurar só MARCA, nunca desmarca (regra dela, 2026-09-09): desmarcar é
// deliberado, de dentro do capítulo. "Marcar o livro inteiro" marca tudo
// como marcado à mão; "Começar meu plano aqui" leva a Organizar a leitura.
//
// Duas origens na grade — lido no app (cor do bloco) e marcado à mão (tom
// do bloco) — vêm de chapters_read (bible/chapterOrigin.js), não de
// completedSet. "Próximo" (laranja) é o primeiro capítulo não lido. Tudo
// o que a tela escreve (frase do selo, números, casas, legenda, rodapé)
// sai de src/biblia/bibliaMath.js.
import { useState, useRef, useEffect, useMemo } from 'react'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { buildChapterOriginMap } from '../bible/chapterOrigin'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { getNotes } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { getGamificationRow } from '../gamification/achievementsStore'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookInfo, blockColorVar, blockToneVar } from '../data/gamificationBlocks'
import { deOf } from '../gamification/format'
import BibleVersionChip from '../components/bible/BibleVersionChip'
import SeloDeLivro from '../components/gamificacao/SeloDeLivro'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'
import {
  bookHeaderSub, bookSealLine, bookNumbers, chapterCells, chapterCellAria, chapterLegend, bookFooterButton, bookActions,
} from '../biblia/bibliaMath'

const HOLD_MS = 450
const FONT = 'var(--font-bento)'

export default function BookChapterScreen({
  session, authUser, block, bookName, displayName,
  browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, onGoToReflectionFrom, onNavigate,
  onBack, onOpenSelo, initialSessionId, initialTextOpen, initialFocusVerse, onActiveChapterChange,
}) {
  const { lang } = session
  const email = authUser?.email

  const [openSessionId, setOpenSessionId] = useState(initialSessionId ?? null)
  const [openTextOpen, setOpenTextOpen] = useState(!!initialTextOpen)
  // Busca/tema: tocar um resultado chega aqui já com um versículo pra
  // focar — ver initialFocusVerse em ReadingBlockView.jsx.
  const [openFocusVerse, setOpenFocusVerse] = useState(initialFocusVerse ?? null)
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))

  const info = bookInfo(bookName)
  const total = info.capitulos
  const bookSessions = (browseSessionsByBlock[block.id] ?? []).filter(s => s.book === bookName && s.type !== 'reflection')
  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const p = progress.porLivro[bookName]

  // Origem de cada capítulo (lido no app / marcado à mão) e os dados dos
  // três números — buscados uma vez; a origem é reaplicada localmente a
  // cada marcação (a cor muda sem esperar a ida e volta). `stats` nulo =
  // ainda carregando (a linha dos números fica em esqueleto).
  const [originMap, setOriginMap] = useState(new Map())
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let alive = true
    Promise.allSettled([getAllChapterReadRows(), getAllSessions(), getNotes(email), getHighlights(email), getGamificationRow()])
      .then(([rows, sessions, notes, highlights, row]) => {
        if (!alive) return
        const chapterRows = rows.status === 'fulfilled' ? rows.value : []
        setOriginMap(buildChapterOriginMap(chapterRows))
        setStats({
          chapterRows,
          sessionRows: sessions.status === 'fulfilled' ? sessions.value : [],
          notes: notes.status === 'fulfilled' ? notes.value : {},
          highlights: highlights.status === 'fulfilled' ? highlights.value : [],
          seal: row.status === 'fulfilled' ? (row.value.bookSeals?.[bookName] ?? null) : null,
        })
      })
    return () => { alive = false }
  }, [email, bookName])

  const cells = useMemo(() => chapterCells(bookName, total, completedSet, originMap), [bookName, total, completedSet, originMap])
  const legend = chapterLegend(cells)
  const numbers = stats && p.lidos > 0 ? bookNumbers({ nome: bookName, ...stats }) : null
  const footer = bookFooterButton(displayName, p, completedSet)
  const actions = bookActions(displayName, p)
  const cor = blockColorVar(info.blocoId)
  const tom = blockToneVar(info.blocoId)

  function openChapter(ch) {
    const target = bookSessions.find(s => s.chStart <= ch && ch <= s.chEnd)
    if (!target) return
    setOpenSessionId(target.id)
    setOpenTextOpen(true)
    setOpenFocusVerse(null)
  }

  // Marcar sem abrir e sem diálogo (regra 2 da aba) — otimista no
  // originMap local (marcação nova = 'manual' na hora; se já havia uma
  // linha em chapters_read pra este capítulo, a origem original prevalece,
  // ver chapterReadLog.js).
  function markChapters(chapters) {
    if (!chapters.length) return
    onMarkChaptersManually?.(bookName, chapters, true)
    setOriginMap(prev => {
      const next = new Map(prev)
      for (const ch of chapters) if (!next.has(`${bookName}:${ch}`)) next.set(`${bookName}:${ch}`, 'manual')
      return next
    })
  }
  function markWholeBook() {
    markChapters(cells.filter(c => c.state === 'next' || c.state === 'none').map(c => c.ch))
  }
  function unmarkWholeBook() {
    if (!window.confirm(`Desmarcar todos os capítulos de ${displayName}?`)) return
    onMarkChaptersManually?.(bookName, cells.map(c => c.ch), false)
  }
  function runAction(key) {
    if (key === 'mark') markWholeBook()
    else if (key === 'unmark') unmarkWholeBook()
    else if (key === 'plan') onNavigate?.('readingOrganize')
  }

  // Só abre a leitura de tela cheia quando openTextOpen é verdadeiro —
  // chegar aqui pela pastilha do livro mostra a grade; tocar um número
  // (openChapter), o botão do rodapé ou vir de fora já num capítulo
  // (initialTextOpen) é que realmente abre a leitura.
  const openEntry = openTextOpen && openSessionId ? bookSessions.find(s => s.id === openSessionId) : null

  // Segurar ~450ms com haptic — pointer events cobrem mouse e toque num
  // gesto só. Um toque curto (solta antes do tempo) segue pro onClick
  // normal (abre); heldRef sinaliza quando o toque já virou marcação,
  // pra o click que o navegador ainda dispara na soltura não abrir junto.
  // Capítulo já lido: o timer nem começa, então a soltura sempre cai no
  // onClick normal (abre) — segurar num capítulo lido nunca desmarca.
  const holdTimerRef = useRef(null)
  const heldRef = useRef(false)
  function startHold(cell) {
    heldRef.current = false
    clearTimeout(holdTimerRef.current)
    if (cell.state === 'app' || cell.state === 'manual') return
    holdTimerRef.current = setTimeout(() => {
      heldRef.current = true
      markChapters([cell.ch])
      navigator.vibrate?.(30)
    }, HOLD_MS)
  }
  function cancelHold() {
    clearTimeout(holdTimerRef.current)
  }
  function handleChapterClick(ch) {
    if (heldRef.current) { heldRef.current = false; return }
    openChapter(ch)
  }
  // Alternativa ao toque longo pra quem usa teclado ou leitor de tela: a
  // tecla M, com o foco na casa, marca o capítulo (Enter/Espaço abrem).
  function handleCellKey(e, cell) {
    if ((e.key === 'm' || e.key === 'M') && (cell.state === 'next' || cell.state === 'none')) {
      e.preventDefault()
      markChapters([cell.ch])
    }
  }

  // Capítulo aberto de verdade troca a tela inteira pela leitura livre.
  // onBack fecha só o capítulo, não o livro: volta pra grade.
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
        <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{displayName}</p>
          <p style={s.headerSub}>{bookHeaderSub(bookName)}</p>
        </div>
        <BibleVersionChip lang={lang} versionId={versionId} onChange={setVersionId} />
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.sealRow}>
            <SeloDeLivro
              sigla={info.sigla} blocoId={info.blocoId} lidos={p.lidos} total={total} size={62} siglaSize={22}
              onClick={p.completo && onOpenSelo ? () => onOpenSelo(bookName) : undefined}
              ariaLabel={p.completo ? `Selo de ${displayName}` : undefined}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.count}>{deOf(p.lidos, total)}</p>
              <p style={s.sealLine}>{bookSealLine(p, stats?.seal)}</p>
            </div>
          </div>
          <div style={{ ...s.bar, background: tom }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={p.lidos} aria-label={`${deOf(p.lidos, total)} capítulos lidos`}>
            {p.lidos > 0 && <div style={{ ...s.barFill, width: `${(p.lidos / total) * 100}%`, background: cor }} />}
          </div>
          {p.lidos > 0 && (
            <div style={s.numbers}>
              {numbers
                ? numbers.map(n => (
                  <div key={n.key} style={s.number}>
                    <p style={s.numberValue}>{n.value}</p>
                    <p style={s.numberCaption}>{n.caption}</p>
                  </div>
                ))
                : <span className="rb-context-skeleton" style={s.numbersSkeleton} />}
            </div>
          )}
        </div>

        <div style={s.gridCard}>
          <div style={s.gridHead}>
            <p style={s.label}>CAPÍTULOS</p>
            <span style={s.gridHint}>toque abre · segure marca</span>
          </div>
          <div style={s.grid}>
            {cells.map(cell => (
              <button
                key={cell.ch} type="button" className="biblia-casa"
                aria-label={chapterCellAria(cell)} aria-keyshortcuts={cell.state === 'next' || cell.state === 'none' ? 'M' : undefined}
                style={{ ...s.cell, ...cellColors(cell.state, cor, tom) }}
                onPointerDown={() => startHold(cell)}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onContextMenu={e => e.preventDefault()}
                onKeyDown={e => handleCellKey(e, cell)}
                onClick={() => handleChapterClick(cell.ch)}
              >
                {cell.ch}
              </button>
            ))}
          </div>
          {legend.length > 0 && (
            <div style={s.legend}>
              {legend.map(item => (
                <span key={item.state} style={s.legendItem}>
                  <span style={{ ...s.legendDot, background: cellColors(item.state, cor, tom).background }} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={s.list}>
          {actions.map((a, i) => (
            <button key={a.key} type="button" style={{ ...s.listRow, borderBottom: i < actions.length - 1 ? '1px solid var(--bento-line)' : 'none' }} onClick={() => runAction(a.key)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={s.listTitle}>{a.title}</span>
                <span style={s.listSub}>{a.sub}</span>
              </span>
              <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.footerBtn} onClick={() => openChapter(footer.chapter)}>
          {footer.label}
          <AppIcon name="ArrowRight" size={16} strokeWidth={2.2} color="var(--bento-accent)" />
        </button>
      </div>
    </div>
  )
}

// Cor de uma casa: lido no app = cor do bloco; marcado à mão = tom do
// bloco com o número na cor; próximo = laranja; não lido = neutro.
function cellColors(state, cor, tom) {
  if (state === 'app') return { background: cor, color: '#fff' }
  if (state === 'manual') return { background: tom, color: cor }
  if (state === 'next') return { background: 'var(--bento-accent)', color: 'var(--bento-ink)' }
  return { background: 'var(--bento-line)', color: 'var(--bento-t3)' }
}

// Medidas do quadro B2 (handoff-biblia-52 §3).
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 0' },
  backBtn: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 3px' },
  headerSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', flexShrink: 0 },
  sealRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 },
  count: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.9px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  sealLine: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-t2)', margin: 0 },
  bar: { height: 6, borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  numbers: { display: 'flex', gap: 10, borderTop: '1px solid var(--bento-line)', padding: '14px 0 0', marginTop: 15 },
  number: { flex: 1, minWidth: 0 },
  numberValue: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 5px' },
  numberCaption: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--bento-t3)', margin: 0 },
  numbersSkeleton: { display: 'block', width: '100%', height: 35, borderRadius: 10, background: 'var(--bento-line)' },
  gridCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 16px 15px', flexShrink: 0 },
  gridHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 12px' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  gridHint: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 },
  // 40px de altura visual; a classe .biblia-casa estende a área de toque
  // pra dentro do vão de cima e de baixo (46px), ver index.css.
  cell: { height: 40, borderRadius: 12, border: 'none', padding: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1, cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'manipulation' },
  legend: { display: 'flex', flexWrap: 'wrap', gap: '8px 14px', margin: '14px 2px 0' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)' },
  legendDot: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  list: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px', flexShrink: 0 },
  listRow: { width: '100%', boxSizing: 'content-box', height: 56, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  listTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 2 },
  listSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  footer: { flexShrink: 0, padding: '12px 20px calc(22px + var(--safe-bottom))', boxShadow: '0 -1px 0 rgba(0,0,0,.06)' },
  footerBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: '#fff', cursor: 'pointer' },
}
