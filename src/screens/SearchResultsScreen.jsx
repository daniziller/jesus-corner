// SearchResultsScreen.jsx — "Resultados da busca" (39k, Bloco 6/último do
// pacote 39). Aberta pelo campo de busca de 39a (JourneyScreen.jsx) — até
// aqui esse campo era só visual (ver o comentário que este bloco substitui
// lá). Três tipos de resposta na MESMA rolagem (versículos/livros/temas),
// mais o bloco "Ir direto" quando a busca parece uma referência.
//
// Índice de texto: um array plano com TODO versículo da versão ativa,
// carregado uma vez (loadSearchIndex, cacheado em memória do módulo — ver
// src/bible/bibleSearch.js) a partir do arquivo agregado gerado por
// scripts/build-bible-search-index.mjs (não existia; não dava pra
// pesquisar 66 arquivos por livro a cada busca sem isso). Normalizado
// (sem acento/caixa) uma vez, na carga — ver searchNormalize.js pra por
// que a mesma posição no texto normalizado bate com o texto original.
//
// Tocar num cartão de versículo (aqui e em ThemeAsStudyScreen.jsx) abre a
// leitura de verdade (39d) já rolada até aquele versículo, com o mesmo
// realce de seleção de 39e — SEM abrir a folha (ver initialFocusVerse em
// ReadingBlockView.jsx). O quadro só descreve esse comportamento
// explicitamente pra 39l ("trecho abre 39d rolado até o versículo"); usei
// o mesmo aqui pros cartões de versículo por consistência — não tinha
// nenhuma outra ação óbvia pra um toque no cartão.
import { useState, useEffect, useMemo } from 'react'
import { computeBookChapterCounts } from '../utils/progress'
import { loadSearchIndex, guessReference, searchVerses, searchBooks, searchThemes, splitHighlightSegments, bookEnFor } from '../bible/bibleSearch'
import { THEMES } from '../bible/themes'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const FONT = 'var(--font-bento)'

function sectionLabelFor(block, lang) {
  if (block.id === 4) return lang === 'en' ? 'Prophets' : 'Profetas'
  return lang === 'en' ? block.shortNameEn ?? block.nameEn : block.shortName ?? block.name
}

export default function SearchResultsScreen({ session, initialQuery, sessionsByBlock, completedSet, onBack, onOpenChapter, onOpenBook, onOpenTheme }) {
  const { lang } = session
  const L = (k, vars) => t(`search.${k}`, vars, lang)
  const count = (n, base, vars) => (n === 1 ? L(`${base}One`, { n, ...vars }) : L(`${base}Many`, { n, ...vars }))

  const [query, setQuery] = useState(initialQuery ?? '')
  const [chip, setChip] = useState('all') // all | verses | books | themes
  const [entries, setEntries] = useState(null) // null enquanto carrega

  useEffect(() => {
    let cancelled = false
    loadSearchIndex(lang).then(data => { if (!cancelled) setEntries(data) }).catch(() => { if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [lang])

  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock ?? {})
  const trimmed = query.trim()

  const guess = useMemo(() => (entries && trimmed ? guessReference(trimmed, entries) : null), [entries, trimmed])
  const verseMatches = useMemo(() => (entries && trimmed ? searchVerses(trimmed, entries, completedSet) : []), [entries, trimmed, completedSet])
  const bookMatches = useMemo(() => (trimmed ? searchBooks(trimmed, lang) : []), [trimmed, lang])
  const themeMatches = useMemo(() => (trimmed ? searchThemes(trimmed, THEMES, lang) : []), [trimmed, lang])

  const VERSES_PREVIEW = 3
  const showAllVerses = chip === 'verses'
  const showAllBooks = chip === 'books' || chip === 'all'
  const showAllThemes = chip === 'themes' || chip === 'all'
  const visibleVerses = chip === 'all' ? verseMatches.slice(0, VERSES_PREVIEW) : chip === 'verses' ? verseMatches : []
  const visibleBooks = chip === 'books' || chip === 'all' ? bookMatches : []
  const visibleThemes = chip === 'themes' || chip === 'all' ? themeMatches : []

  function verseCard(m) {
    const displayBook = lang === 'en' ? m.bookEn : m.book
    const done = completedSet?.has(`${m.book}:${m.chapter}`)
    const segments = splitHighlightSegments(m.text, m.positions, m.termLength)
    return (
      <button key={`${m.book}:${m.chapter}:${m.verse}`} style={s.verseCard} onClick={() => onOpenChapter(m.book, m.chapter, m.verse)}>
        <div style={s.verseCardHead}>
          <span style={s.verseRef}>{displayBook} {m.chapter}:{m.verse}</span>
          {done && <span style={s.donePill}>{L('donePill')}</span>}
        </div>
        <p style={s.verseText}>
          {segments.map((seg, i) => seg.highlighted
            ? <mark key={i} style={s.verseHighlight}>{seg.text}</mark>
            : <span key={i}>{seg.text}</span>)}
        </p>
      </button>
    )
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={s.searchWrap}>
          <AppIcon name="Search" size={16} strokeWidth={2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setChip('all') }}
            placeholder={t('journey.searchPlaceholder', undefined, lang)}
            style={s.searchInput}
          />
          {query && (
            <button style={s.clearBtn} onClick={() => setQuery('')} aria-label="clear">
              <AppIcon name="X" size={13} color="var(--bento-t4)" />
            </button>
          )}
        </div>
      </div>

      <div style={s.chipsRow}>
        {[
          { id: 'all', label: L('chipAll') },
          { id: 'verses', label: `${L('chipVerses')} ${verseMatches.length}` },
          { id: 'books', label: `${L('chipBooks')} ${bookMatches.length}` },
          { id: 'themes', label: `${L('chipThemes')} ${themeMatches.length}` },
        ].map(c => (
          <button key={c.id} style={{ ...s.chip, ...(chip === c.id ? s.chipOn : {}) }} onClick={() => setChip(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {!trimmed ? (
          <p style={s.emptyHint}>{L('emptyPrompt')}</p>
        ) : entries === null ? (
          <p style={s.emptyHint}>{L('loading')}</p>
        ) : (
          <>
            {chip === 'all' && guess && (
              <div style={s.directCard}>
                <p style={s.directEyebrow}>{L('directEyebrow')}</p>
                <div style={s.directRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.directTitle}>{(lang === 'en' ? guess.bookEn : guess.book)} {guess.chapter}</p>
                    <p style={s.directSub}>&ldquo;{guess.firstLine}&rdquo; · {count(guess.verseCount, 'verseCount')}</p>
                  </div>
                  <button style={s.directOpenBtn} onClick={() => onOpenChapter(guess.book, guess.chapter, guess.verse ?? undefined)}>
                    {L('directOpenBtn')}
                  </button>
                </div>
              </div>
            )}

            {(chip === 'all' || chip === 'verses') && verseMatches.length > 0 && (
              <div>
                <div style={s.sectionHeadRow}>
                  <p style={s.sectionLabel}>{L('sectionVerses')}</p>
                  <span style={s.sectionCount}>{count(verseMatches.length, 'inText')}</span>
                </div>
                <div style={s.cardsCol}>{visibleVerses.map(verseCard)}</div>
                {chip === 'all' && verseMatches.length > VERSES_PREVIEW && (
                  <button style={s.moreBtn} onClick={() => setChip('verses')}>
                    {count(verseMatches.length, 'seeAllVerses')}
                  </button>
                )}
              </div>
            )}

            {showAllBooks && bookMatches.length > 0 && (
              <div>
                <p style={s.sectionLabel}>{L('sectionBooks')}</p>
                <div style={s.cardsCol}>
                  {visibleBooks.map(b => {
                    const displayName = lang === 'en' ? b.bookEn : b.book
                    const total = bookChapterCounts[b.book] ?? 0
                    let done = 0
                    for (let ch = 1; ch <= total; ch++) if (completedSet?.has(`${b.book}:${ch}`)) done++
                    return (
                      <button key={b.book} style={s.bookRow} onClick={() => onOpenBook(b.block, b.book)}>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <p style={s.bookName}>{displayName}</p>
                          <p style={s.bookMeta}>{sectionLabelFor(b.block, lang)} · {count(total, 'chapters')} · {done === 0 ? L('noneRead') : count(done, 'read')}</p>
                        </div>
                        <span style={s.chevron}>›</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {showAllThemes && themeMatches.length > 0 && (
              <div>
                <p style={s.sectionLabel}>{L('sectionThemes')}</p>
                <div style={s.cardsCol}>
                  {visibleThemes.map((th, i) => {
                    const title = lang === 'en' ? th.titleEn : th.title
                    const first = th.passages[0]
                    const last = th.passages[th.passages.length - 1]
                    // O quadro escreve "do Salmo 23 a Apocalipse 7" (singular
                    // "Salmo") só nesta linha-resumo, mas usa a forma plural
                    // canônica ("Salmos 23") nos outros dois lugares da MESMA
                    // tela (Ir Direto, cartão de versículo) — e é a única
                    // forma que existe em bibleBlocks.js. Tratado como
                    // inconsistência pontual do quadro, não uma regra nova:
                    // fica sempre "Salmos", pela consistência com o resto do
                    // app (e com o resto desta própria tela).
                    const firstBook = lang === 'en' ? bookEnFor(first.book) : first.book
                    const lastBook = lang === 'en' ? bookEnFor(last.book) : last.book
                    const dark = i === 0
                    return (
                      <button key={th.id} style={{ ...s.themeRow, ...(dark ? s.themeRowDark : {}) }} onClick={() => onOpenTheme(th.id)}>
                        {dark && <span style={s.themeDiamond} />}
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <p style={{ ...s.themeTitle, color: dark ? '#fff' : 'var(--bento-ink)' }}>{title}</p>
                          <p style={{ ...s.themeMeta, color: dark ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>
                            {count(th.passages.length, 'passages')}
                            {dark ? ` · ${L('themeSpanFromTo', { from: `${firstBook} ${first.chStart}`, to: `${lastBook} ${last.chEnd}` })}` : ''}
                          </p>
                        </div>
                        {dark
                          ? <AppIcon name="ArrowRight" size={16} color="var(--bento-accent)" />
                          : <span style={s.chevron}>›</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {trimmed && !guess && verseMatches.length === 0 && bookMatches.length === 0 && themeMatches.length === 0 && (
              <div style={s.noResultsCard}>
                <p style={s.noResultsTitle}>{L('noResultsTitle', { query: trimmed })}</p>
                <p style={s.noResultsHint}>{L('noResultsHint')}</p>
                <p style={s.noResultsThemeHint}>{L('noResultsThemeHint')}</p>
              </div>
            )}

            <p style={s.themesFooter}>{L('themesDisclosure')}</p>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 10px' },
  backBtn: { width: 40, height: 40, flexShrink: 0, borderRadius: 14, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  searchWrap: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, height: 46, background: 'var(--bento-card)', borderRadius: 16, padding: '0 16px' },
  searchInput: { flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-ink)' },
  clearBtn: { border: 'none', background: 'var(--bento-line)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },

  chipsRow: { flexShrink: 0, display: 'flex', gap: 7, padding: '4px 20px 12px', overflowX: 'auto' },
  chip: { flexShrink: 0, border: 'none', borderRadius: 99, padding: '9px 14px', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: '#6E655C', background: 'var(--bento-card)', cursor: 'pointer', whiteSpace: 'nowrap' },
  chipOn: { background: 'var(--bento-ink)', color: '#fff' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 18 },
  emptyHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', textAlign: 'center', padding: '32px 12px' },

  directCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px' },
  directEyebrow: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-ink-mid)', margin: '0 0 6px' },
  directRow: { display: 'flex', alignItems: 'center', gap: 12 },
  directTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  directSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: '4px 0 0', lineHeight: 1.4 },
  directOpenBtn: { flexShrink: 0, height: 40, padding: '0 18px', borderRadius: 14, border: 'none', background: 'var(--bento-sand-icon)', color: 'var(--bento-sand)', fontFamily: FONT, fontSize: 13, fontWeight: 800, cursor: 'pointer' },

  sectionHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 10px' },
  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 2px 10px' },
  sectionCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)' },
  cardsCol: { display: 'flex', flexDirection: 'column', gap: 8 },

  verseCard: { textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
  verseCardHead: { display: 'flex', alignItems: 'center', gap: 8 },
  verseRef: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  donePill: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', color: '#fff', background: 'var(--bento-ink)', borderRadius: 99, padding: '2px 8px' },
  verseText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-ink)', margin: 0 },
  verseHighlight: { background: '#FFE3C9', color: 'var(--bento-ink)', fontWeight: 700, borderRadius: 4, padding: '1px 2px' },

  moreBtn: { marginTop: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, background: 'rgba(0,0,0,.05)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  bookRow: { textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%', borderRadius: 18, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 },
  bookName: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  bookMeta: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  chevron: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  themeRow: { textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%', borderRadius: 18, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 },
  themeRowDark: { background: 'var(--bento-ink)' },
  themeDiamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  themeTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, margin: '0 0 2px' },
  themeMeta: { fontFamily: FONT, fontSize: 11, fontWeight: 500, margin: 0 },

  noResultsCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '20px 18px', textAlign: 'center' },
  noResultsTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 6px' },
  noResultsHint: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 4px', lineHeight: 1.4 },
  noResultsThemeHint: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0, lineHeight: 1.4 },

  themesFooter: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.5, margin: '0 2px', textAlign: 'left' },
}
