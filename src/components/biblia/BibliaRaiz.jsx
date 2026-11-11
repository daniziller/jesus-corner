// BibliaRaiz.jsx — a raiz da aba Bíblia (handoff-biblia-52, B1): busca,
// progresso geral, o cartão preto "continuar", os dois testamentos e os
// livros do testamento selecionado, por bloco, com o nome por extenso.
// Substitui 39a e 39b (a lista de livros deixou de ser uma tela à parte).
//
// A pessoa navega pelo próprio progresso: cada livro é uma pastilha que
// enche na cor do seu bloco. Nada é contado aqui — o progresso vem de
// computeBibleProgress (o mesmo da roda e da estante), calculado UMA vez
// por mudança de capítulos lidos; trocar de testamento só troca a lista.
// As frases e os estados vêm de src/biblia/bibliaMath.js.
//
// Navegação (tudo por props, quem chama é o JourneyScreen): campo de
// busca → busca; cartão de progresso → Sua Bíblia; "Ler" → a sessão do
// plano (o único caminho desta aba que conta no plano); linha da leitura
// livre → a leitura naquele capítulo; pastilha → o livro.
//
// `sessionTitle`: undefined enquanto os dias do plano carregam (o cartão
// preto fica em esqueleto), null sem sessão hoje, ou o trecho.
import { useMemo, useState } from 'react'
import AppIcon from '../../icons/AppIcon'
import BibleVersionChip from '../bible/BibleVersionChip'
import { blockColorVar, blockToneVar } from '../../data/gamificationBlocks'
import { computeBibleProgress } from '../../gamification/bibleProgressMath'
import { getTestamentChoice, setTestamentChoice } from '../../bible/testamentChoiceStore'
import {
  TESTAMENTS, blocksOfTestament, initialTestament, testamentProgress, testamentTexts,
  progressCardTexts, blockBarSegments, blockBooksCount, bookTile, continueCard,
} from '../../biblia/bibliaMath'

const FONT = 'var(--font-bento)'

function activate(fn) {
  return e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn?.() } }
}

export default function BibliaRaiz({
  lang, completedSet, versionId, onChangeVersion, sessionTitle, free, currentBook,
  onOpenSearch, onOpenSuaBiblia, onRead, onOpenFree, onOpenBook,
}) {
  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const [testament, setTestament] = useState(() => initialTestament(getTestamentChoice(), currentBook))
  function selectTestament(id) {
    setTestament(id)
    setTestamentChoice(id)
  }

  const card = useMemo(() => progressCardTexts(progress), [progress])
  const segments = useMemo(() => blockBarSegments(progress), [progress])
  // As 66 pastilhas, montadas uma vez por mudança de progresso — a troca
  // de testamento só escolhe qual metade mostrar.
  const blocksByTestament = useMemo(() => Object.fromEntries(TESTAMENTS.map(t => [t.id, blocksOfTestament(t.id).map(block => ({
    block,
    bp: progress.porBloco.find(b => b.id === block.id),
    books: block.livros.map(l => ({ nome: l.nome, ...bookTile(l.nome, progress.porLivro[l.nome]) })),
  }))])), [progress])

  const loadingContinue = sessionTitle === undefined
  const cont = loadingContinue ? null : continueCard({ sessionTitle, free })

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <p style={s.title}>Bíblia</p>
        <BibleVersionChip lang={lang} versionId={versionId} onChange={onChangeVersion} />
      </div>

      <div style={s.body}>
        <button type="button" style={s.search} onClick={onOpenSearch}>
          <AppIcon name="Search" size={17} strokeWidth={2} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
          <span style={s.searchText}>Livro, referência, palavra ou tema</span>
        </button>

        <div style={s.progressCard} role="button" tabIndex={0} aria-label={card.aria} onClick={onOpenSuaBiblia} onKeyDown={activate(onOpenSuaBiblia)}>
          <div style={s.progressTop} aria-hidden="true">
            <span style={s.progressPct}>{card.percent}</span>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 1 }}>
              <p style={s.progressChapters}>{card.chapters}</p>
              <p style={s.progressLine}>{card.line}</p>
            </div>
          </div>
          <div style={s.blockBar} aria-hidden="true">
            {segments.map(seg => (
              <div key={seg.id} style={{ ...s.blockBarSeg, flex: seg.flex, background: blockToneVar(seg.id) }}>
                {seg.started && <div style={{ ...s.blockBarFill, width: `${seg.ratio * 100}%`, background: blockColorVar(seg.id) }} />}
              </div>
            ))}
          </div>
        </div>

        {loadingContinue && <div className="rb-context-skeleton" style={s.continueSkeleton} />}
        {cont && (
          <div style={s.continue}>
            {cont.sessionTitle ? (
              <div style={s.sessionRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.continueLabel}>{cont.label}</p>
                  <p style={s.sessionTitle}>{cont.sessionTitle}</p>
                </div>
                <button type="button" style={s.readBtn} onClick={onRead}>
                  Ler
                  <AppIcon name="ArrowRight" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
                </button>
              </div>
            ) : (
              <button type="button" style={s.freeAlone} onClick={onOpenFree}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...s.continueLabel, display: 'block' }}>{cont.label}</span>
                  <span style={{ ...s.sessionTitle, display: 'block' }}>{cont.free.passage}</span>
                  {cont.free.verse && <span style={s.freeAloneVerse}>versículo {cont.free.verse}</span>}
                </span>
                <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="rgba(255,255,255,.5)" />
              </button>
            )}
            {cont.sessionTitle && cont.free && (
              <button type="button" style={s.freeRow} onClick={onOpenFree}>
                <span style={s.freeText}>
                  Leitura livre · <strong style={s.freeStrong}>{cont.free.passage}</strong>{cont.free.verse ? `, versículo ${cont.free.verse}` : ''}
                </span>
                <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="rgba(255,255,255,.5)" />
              </button>
            )}
          </div>
        )}

        <div style={s.testaments} role="tablist" aria-label="Testamento">
          {TESTAMENTS.map(t => {
            const on = t.id === testament
            const tx = testamentTexts(testamentProgress(progress, t.id))
            const tp = testamentProgress(progress, t.id)
            return (
              <button
                key={t.id} type="button" role="tab" aria-selected={on} aria-controls="biblia-livros"
                aria-label={`${t.nome}, ${tx.percent} lido, ${tx.chapters}, ${tx.remaining}`}
                style={{ ...s.testament, background: on ? 'var(--bento-ink)' : 'var(--bento-card)' }}
                onClick={() => selectTestament(t.id)}
              >
                <span style={{ ...s.testamentName, color: on ? '#fff' : 'var(--bento-ink)' }}>{t.linhas[0]}<br />{t.linhas[1]}</span>
                <span style={{ ...s.testamentPct, color: on ? 'var(--bento-accent)' : 'var(--bento-ink)' }}>
                  {tx.percent} <span style={s.testamentPctWord}>lido</span>
                </span>
                <span style={{ ...s.testamentTrack, background: on ? 'rgba(255,255,255,.14)' : 'var(--bento-line)' }}>
                  {tp.lidos > 0 && <span style={{ ...s.testamentFill, width: `${tp.percent}%` }} />}
                </span>
                <span style={{ ...s.testamentChapters, color: on ? 'rgba(255,255,255,.85)' : 'var(--bento-quote-ink)' }}>{tx.chapters}</span>
                <span style={{ ...s.testamentRemaining, color: on ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{tx.remaining}</span>
              </button>
            )
          })}
        </div>

        <div id="biblia-livros" role="tabpanel" style={s.blocks}>
          {blocksByTestament[testament].map(({ block, bp, books }) => (
            <div key={block.id} style={s.block}>
              <div style={s.blockHead}>
                <span style={{ ...s.blockSwatch, background: blockColorVar(block.id) }} />
                <span style={s.blockName}>{block.nome}</span>
                <span style={{ ...s.blockCount, color: bp.livrosCompletos > 0 ? 'var(--bento-ink)' : 'var(--bento-t5)' }}>{blockBooksCount(bp)}</span>
              </div>
              <div style={{ ...s.blockTrack, background: blockToneVar(block.id) }}>
                {bp.lidos > 0 && <div style={{ ...s.blockFill, width: `${(bp.lidos / bp.total) * 100}%`, background: blockColorVar(block.id) }} />}
              </div>
              <div style={s.books}>
                {books.map(b => <Pastilha key={b.nome} book={b} blockId={block.id} onOpen={onOpenBook} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// A pastilha de um livro: não começado (neutra), em andamento (borda na
// cor do bloco e uma faixa no tom, da esquerda, na proporção lida) ou
// completo (a cor do bloco). Nome sempre por extenso; se precisar, quebra.
function Pastilha({ book, blockId, onOpen }) {
  const cor = blockColorVar(blockId)
  const done = book.state === 'completo'
  const going = book.state === 'andamento'
  const style = done
    ? { ...s.tile, background: cor }
    : going ? { ...s.tile, background: 'var(--bento-card)', border: `2px solid ${cor}` } : { ...s.tile, background: 'var(--bento-line)' }
  return (
    <button type="button" style={style} aria-label={book.aria} onClick={() => onOpen?.(book.nome)}>
      {going && <span aria-hidden="true" style={{ ...s.tileStrip, width: `${book.ratio * 100}%`, background: blockToneVar(blockId) }} />}
      <span style={s.tileNameRow}>
        <span style={{ ...s.tileName, color: done ? '#fff' : 'var(--bento-ink)' }}>{book.nome}</span>
        {done && <AppIcon name="Check" size={12} strokeWidth={1.7} absoluteStrokeWidth color="#fff" style={{ flexShrink: 0 }} />}
      </span>
      <span style={{ ...s.tileSupport, fontWeight: going ? 700 : 600, color: done ? 'rgba(255,255,255,.75)' : going ? cor : 'var(--bento-t3)' }}>{book.support}</span>
    </button>
  )
}

const label = { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase' }
const s = {
  screen: { background: 'var(--bento-bg)', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '22px 20px 0' },
  title: { flex: 1, fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: 0 },
  body: { padding: '16px 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  search: { height: 50, borderRadius: 17, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 15px', cursor: 'pointer', textAlign: 'left', flexShrink: 0 },
  searchText: { flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t3)' },
  progressCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px 17px', cursor: 'pointer' },
  progressTop: { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 },
  progressPct: { fontFamily: FONT, fontSize: 40, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-2px', color: 'var(--bento-ink)' },
  progressChapters: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--bento-ink)', margin: 0 },
  progressLine: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },
  blockBar: { display: 'flex', gap: 3 },
  blockBarSeg: { height: 8, borderRadius: 99, overflow: 'hidden', minWidth: 0 },
  blockBarFill: { height: '100%', minWidth: 5, borderRadius: 99 },
  continueSkeleton: { height: 126, borderRadius: 24, background: 'var(--bento-line)', flexShrink: 0 },
  continue: { borderRadius: 24, background: 'var(--bento-ink)', padding: '16px 18px 6px' },
  sessionRow: { display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14 },
  continueLabel: { ...label, color: 'var(--bento-accent)', margin: 0 },
  sessionTitle: { fontFamily: FONT, fontSize: 20, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: '#fff', margin: '8px 0 0' },
  readBtn: { height: 44, padding: '0 16px', borderRadius: 15, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer', flexShrink: 0 },
  freeRow: { width: '100%', boxSizing: 'content-box', display: 'flex', alignItems: 'center', gap: 12, height: 50, border: 'none', borderTop: '1px solid rgba(255,255,255,.1)', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' },
  freeText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,.7)' },
  freeStrong: { fontWeight: 800, color: '#fff' },
  freeAlone: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', padding: '0 0 10px', textAlign: 'left', cursor: 'pointer', minHeight: 44 },
  freeAloneVerse: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: 'rgba(255,255,255,.7)', marginTop: 4 },
  testaments: { display: 'flex', gap: 8, marginTop: 6 },
  testament: { flex: 1, minWidth: 0, borderRadius: 22, border: 'none', padding: '14px 14px 13px', textAlign: 'left', cursor: 'pointer', display: 'block' },
  testamentName: { display: 'block', fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.6px', marginBottom: 12 },
  testamentPct: { display: 'block', fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: 1, letterSpacing: '-.3px', marginBottom: 8 },
  testamentPctWord: { fontWeight: 600, fontSize: 11, letterSpacing: 0, opacity: 0.7 },
  testamentTrack: { display: 'block', height: 5, borderRadius: 99, overflow: 'hidden', marginBottom: 9 },
  testamentFill: { display: 'block', height: '100%', minWidth: 6, borderRadius: 99, background: 'var(--bento-accent)' },
  testamentChapters: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1.35 },
  testamentRemaining: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.35 },
  blocks: { display: 'flex', flexDirection: 'column', gap: 10 },
  block: { borderRadius: 24, background: 'var(--bento-card)', padding: '15px 14px 14px' },
  blockHead: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 6px' },
  blockSwatch: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  blockName: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.2px', color: 'var(--bento-ink)' },
  blockCount: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1 },
  blockTrack: { height: 5, borderRadius: 99, overflow: 'hidden', margin: '0 2px 12px' },
  blockFill: { height: '100%', minWidth: 6, borderRadius: 99 },
  books: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 },
  tile: { position: 'relative', overflow: 'hidden', boxSizing: 'border-box', minHeight: 52, borderRadius: 15, border: 'none', padding: '9px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, textAlign: 'left', cursor: 'pointer' },
  tileStrip: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  tileNameRow: { position: 'relative', display: 'flex', alignItems: 'center', gap: 6 },
  tileName: { fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.2px' },
  tileSupport: { position: 'relative', fontFamily: FONT, fontSize: 10.5, lineHeight: 1 },
}
