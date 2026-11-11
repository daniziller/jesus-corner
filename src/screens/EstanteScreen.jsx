// EstanteScreen.jsx — Minha estante (G9, HANDOFF §6.2): os 66 selos em
// oito prateleiras na ordem canônica, com a escada "Livros completos" e
// "O próximo selo" no topo. Aberta por "Ver livros" (Hoje), pelas linhas
// de bloco de G2 (rolada até a prateleira, `scrollToBlock`), e pelos
// cartões Livros completos / Blocos da Bíblia de G5.
//   selo cheio → G10 · selo em andamento ou tracejado → abre o livro na
//   Bíblia · "O próximo selo" → abre o livro no próximo capítulo não lido.
import { useEffect, useMemo, useRef } from 'react'
import AppIcon from '../icons/AppIcon'
import Medalha from '../components/gamificacao/Medalha'
import SeloDeLivro from '../components/gamificacao/SeloDeLivro'
import { GAMIFICATION_BLOCKS, blockColorVar } from '../data/gamificationBlocks'
import { FAMILIES, familyAchievementId } from '../data/achievements'
import { computeBibleProgress, closestSeal, nextUnreadChapter } from '../gamification/bibleProgressMath'
import { formatInt, deOf, faltamPhrase } from '../gamification/format'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'
const LIVROS = FAMILIES.find(f => f.id === 'livros')

export default function EstanteScreen({ session, completedSet, gamification, scrollToBlock = null, onBack, onOpenSelo, onOpenBook, onOpenBookAt }) {
  const { lang } = session
  const store = gamification?.achievements ?? {}
  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const next = closestSeal(progress)
  const earnedN = LIVROS.degraus.filter(d => store[familyAchievementId('livros', d.degrau)]).length
  const nextDegrau = LIVROS.degraus[earnedN] ?? null
  const shelfRefs = useRef({})

  useEffect(() => {
    if (!scrollToBlock) return
    const el = shelfRefs.current[scrollToBlock]
    if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [scrollToBlock])

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>Minha estante</p>
        <p style={s.count}>{deOf(progress.livrosCompletos, progress.totalLivros)}</p>
      </div>

      <div style={s.body}>
        <div style={s.hero}>
          <div style={s.heroHead}>
            <p style={s.heroLabel}>LIVROS COMPLETOS</p>
            {nextDegrau && <p style={s.heroNext}>próxima: {formatInt(nextDegrau.limiar)} {nextDegrau.limiar === 1 ? 'livro' : 'livros'}</p>}
          </div>
          <div style={s.ladder}>
            {LIVROS.degraus.map(d => {
              const ganha = !!store[familyAchievementId('livros', d.degrau)]
              const isNext = nextDegrau?.degrau === d.degrau
              return (
                <div key={d.degrau} style={s.ladderItem}>
                  <Medalha familia="livros" degrau={d.degrau} size={42} ganha={ganha} sobreEscuro />
                  <p style={{ ...s.ladderLabel, color: isNext ? 'var(--bento-accent)' : ganha ? '#fff' : 'rgba(255,255,255,.45)' }}>{formatInt(d.limiar)}</p>
                </div>
              )
            })}
          </div>
          {next && (
            <button type="button" style={s.nextSeal} onClick={() => onOpenBookAt?.(next.nome, nextUnreadChapter(next.nome, next.total, completedSet))}>
              <SeloDeLivro sigla={GAMIFICATION_BLOCKS.flatMap(b => b.livros).find(l => l.nome === next.nome).sigla} blocoId={GAMIFICATION_BLOCKS.find(b => b.livros.some(l => l.nome === next.nome)).id} lidos={next.lidos} total={next.total} size={36} ariaLabel={`${next.nome}, ${next.lidos} de ${next.total} capítulos`} />
              <span style={s.nextText}>
                <span style={s.nextLabel}>O PRÓXIMO SELO</span>
                <span style={s.nextPhrase}>{next.nome} — {faltamPhrase(next.faltam, 'capítulo', 'capítulos')}</span>
              </span>
            </button>
          )}
        </div>

        <div style={s.shelves}>
          {GAMIFICATION_BLOCKS.map((block, i) => {
            const bp = progress.porBloco[i]
            return (
              <div key={block.id} ref={el => { shelfRefs.current[block.id] = el }} style={{ ...s.shelf, ...(i > 0 ? s.shelfDivider : {}) }}>
                <div style={s.shelfHead}>
                  <span style={{ ...s.swatch, background: blockColorVar(block.id) }} />
                  <span style={s.shelfName}>{block.nome}</span>
                  <span style={{ ...s.shelfCount, color: bp.livrosCompletos > 0 ? 'var(--bento-ink)' : 'var(--bento-t5)' }}>{deOf(bp.livrosCompletos, bp.livrosTotal)}</span>
                </div>
                <div style={s.grid}>
                  {block.livros.map(l => {
                    const p = progress.porLivro[l.nome]
                    return (
                      <SeloDeLivro
                        key={l.nome} sigla={l.sigla} blocoId={block.id} lidos={p.lidos} total={p.total} size={44}
                        ariaLabel={`${l.nome}, ${p.completo ? 'completo' : `${p.lidos} de ${p.total} capítulos`}`}
                        onClick={() => (p.completo ? onOpenSelo?.(l.nome) : onOpenBook?.(l.nome))}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 12px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  count: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  hero: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 16px' },
  heroHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  heroLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', margin: 0 },
  heroNext: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-accent)', margin: 0 },
  ladder: { display: 'flex', justifyContent: 'space-between', marginBottom: 14 },
  ladderItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  ladderLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, margin: 0 },
  nextSeal: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: 'rgba(255,255,255,.06)', border: 'none', padding: 12, cursor: 'pointer', textAlign: 'left', minHeight: 44 },
  nextText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  nextLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)' },
  nextPhrase: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 },
  shelves: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  shelf: { padding: '14px 0' },
  shelfDivider: { borderTop: '1px solid var(--bento-line)' },
  shelfHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  swatch: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  shelfName: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)' },
  shelfCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 7, justifyItems: 'start' },
}
