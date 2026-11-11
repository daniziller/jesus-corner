// CartaoSuaBiblia.jsx — o cartão SUA BÍBLIA do Hoje (G1, HANDOFF §3.1):
// rótulo + "Ver livros", a roda em 250px no modo livros, a legenda dos 8
// blocos em duas colunas e a linha de rodapé com o livro atual. Toque em
// qualquer ponto (fora "Ver livros") → Sua Bíblia (G2); "Ver livros" →
// Minha estante (G9).
//
// Todo número vem de `progress` (computeBibleProgress) — nada fixo. A
// frase do rodapé muda com o número ("falta 1 capítulo"); conta nova e
// Bíblia inteira têm as frases de HANDOFF §8.
import RodaDaBiblia from './RodaDaBiblia'
import { GAMIFICATION_BLOCKS, blockColorVar, bookInfo } from '../../data/gamificationBlocks'
import { footerBook } from '../../gamification/bibleProgressMath'
import { formatInt, formatPct, deOf, faltamPhrase, dayMonthLong } from '../../gamification/format'

const FONT = 'var(--font-bento)'

// Livro da linha de rodapé: o atual do plano se ainda falta algo nele;
// senão o selo em andamento mais adiantado; senão o primeiro livro ainda
// não lido na ordem canônica.
export default function CartaoSuaBiblia({ progress, reads, currentBook, completedAtIso, onOpen, onOpenEstante }) {
  const pct = formatPct(progress.percent)
  const ariaLabel = `${pct} da Bíblia lida, ${deOf(progress.capitulosLidos, progress.totalCapitulos)} capítulos`
  const book = progress.bibliaInteira ? null : footerBook(progress, currentBook)
  const bp = book ? progress.porLivro[book] : null

  let footer
  if (progress.bibliaInteira) footer = completedAtIso ? `Bíblia inteira · terminada em ${dayMonthLong(completedAtIso)}` : 'Bíblia inteira'
  else if (progress.capitulosLidos === 0) footer = 'Comece por onde quiser — cada capítulo lido aparece aqui'
  else footer = `${book} ${bp.lidos} de ${bp.total} · ${faltamPhrase(bp.faltam, 'capítulo', 'capítulos')} para completar o livro`

  return (
    <div style={s.card} role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      aria-label="Sua Bíblia"
    >
      <div style={s.head}>
        <p style={s.label}>SUA BÍBLIA</p>
        <button type="button" style={s.link} onClick={e => { e.stopPropagation(); onOpenEstante?.() }}>Ver livros</button>
      </div>
      <div style={s.wheelWrap}>
        <RodaDaBiblia
          reads={reads} mode="livros" size={250}
          currentBook={progress.bibliaInteira ? null : (currentBook && bookInfo(currentBook) ? currentBook : null)}
          centerLine1={pct} centerLine2={deOf(progress.capitulosLidos, progress.totalCapitulos)} centerSize={40}
          ariaLabel={ariaLabel} animateKey="hoje"
        />
      </div>
      <div style={s.legend}>
        {GAMIFICATION_BLOCKS.map(block => {
          const b = progress.porBloco.find(x => x.id === block.id)
          return (
            <div key={block.id} style={s.legendItem}>
              <span style={{ ...s.swatch, background: blockColorVar(block.id) }} />
              <span style={s.legendName}>{block.nome}</span>
              <span style={{ ...s.legendCount, color: b.lidos > 0 ? 'var(--bento-ink)' : 'var(--bento-t5)' }}>{formatInt(b.lidos)}/{formatInt(b.total)}</span>
            </div>
          )
        })}
      </div>
      <div style={s.footer}>
        <span style={s.dot} />
        <p style={s.footerText}>{footer}</p>
      </div>
    </div>
  )
}

const s = {
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '17px 18px 18px', cursor: 'pointer' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  link: { border: 'none', background: 'none', padding: '4px 0', minHeight: 44, display: 'flex', alignItems: 'center', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
  wheelWrap: { display: 'flex', justifyContent: 'center', padding: '4px 0 10px' },
  legend: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '9px 12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 },
  swatch: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  legendName: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-quote-ink)' },
  legendCount: { fontFamily: FONT, fontSize: 10.5, fontWeight: 700, flexShrink: 0 },
  footer: { marginTop: 14, borderRadius: 14, background: 'var(--bento-line)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0 },
  footerText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-quote-ink)', margin: 0 },
}
