// CartaoBiblia.jsx — o cartão da Bíblia do Hoje (handoff-hoje-50 §3.1): a
// MESMA RodaDaBiblia, em 132px, com o percentual no centro; ao lado,
// "{lidos} de 1.189 capítulos" e o livro atual. Sem legenda e sem "Ver
// livros" (ficam em Sua Bíblia). O cartão inteiro é um alvo → Sua Bíblia.
import RodaDaBiblia from '../gamificacao/RodaDaBiblia'
import AppIcon from '../../icons/AppIcon'
import { bookInfo } from '../../data/gamificationBlocks'
import { formatPct } from '../../gamification/format'
import { chaptersLine, bibleBookLine, bibleCardAria } from '../../hoje/hojeMath'

const FONT = 'var(--font-bento)'

export default function CartaoBiblia({ progress, reads, currentBook, finishedIso, onOpen }) {
  const marker = !progress.bibliaInteira && currentBook && bookInfo(currentBook) ? currentBook : null
  const line = bibleBookLine(progress, currentBook, finishedIso)
  return (
    <div
      style={s.card} role="button" tabIndex={0} aria-label={bibleCardAria(progress)} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
    >
      <span style={s.wheel} aria-hidden="true">
        <RodaDaBiblia
          reads={reads} mode="livros" size={132} currentBook={marker}
          centerLine1={formatPct(progress.percent)} centerSize={54} centerSpacing={-2}
          centerLine2="da Bíblia" centerLine2Size={24} centerLine2Weight={700} centerLine2Y={184}
          animateKey="hoje"
        />
      </span>
      <div style={s.text}>
        <p style={s.label}>SUA BÍBLIA</p>
        <p style={s.chapters}>{chaptersLine(progress)}</p>
        {line && <p style={s.book}>{line}</p>}
      </div>
      <AppIcon name="ChevronRight" size={14} strokeWidth={2.2} color="var(--bento-t5)" />
    </div>
  )
}

const s = {
  card: { borderRadius: 26, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' },
  wheel: { display: 'block', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  chapters: { fontFamily: FONT, fontSize: 17, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '9px 0 5px' },
  book: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t2)', margin: 0 },
}
