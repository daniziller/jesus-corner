// BuscaScreen.jsx — a busca da aba Bíblia (handoff-biblia-52 §6). Uma tela
// só, sem barra de abas, com o teclado aberto ao entrar; o que aparece
// depende do que está digitado, nunca de rota separada:
//
//   campo vazio              → B5: filtros, "Ir direto a um texto", onde
//                              você estava, buscas recentes, passagens
//                              mais procuradas;
//   texto que é referência   → B7: o cartão "Ir direto" com o texto, as
//                              outras leituras possíveis e o capítulo
//                              inteiro; só o livro → o grupo LIVROS;
//   palavra ou expressão     → B6: filtros com contagem, filtro de
//                              testamento e os grupos Livros, Passagens,
//                              Versículos, Temas e Nas suas notas; sem
//                              resultado, o cartão "Nada com…".
// Um texto que é referência E palavra mostra as duas coisas, a referência
// primeiro.
//
// Substitui a tela de resultados 39k. O interpretador de referências e os
// textos vêm de src/busca/ (puros, com testes); o texto dos versículos é o
// da versão em uso (o mesmo arquivo por livro que a leitura já carrega) e
// a busca por palavra roda no índice dessa versão (bible/bibleSearch.js).
// A resposta espera ~250 ms depois da última tecla e o que chega de uma
// busca anterior é descartado — digitar nunca trava.
import { useState, useEffect, useMemo, useRef } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { loadSearchIndex } from '../bible/bibleSearch'
import { THEMES } from '../bible/themes'
import { findBibleVersion } from '../data/bibleVersions'
import { GAMIFICATION_BOOKS } from '../data/gamificationBlocks'
import { getNotes } from '../notes/notesStore'
import { getHighlights } from '../highlights/highlightsStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { NAMED_PASSAGES } from '../data/passagensComNome'
import { interpretReference, formatReference, openReferenceLabel, referencePreview, referenceKind, wholeChapterRow, bookDisplayName } from '../busca/referencia'
import { SEARCH_HINT, TYPE_FILTERS, REFERENCE_EXAMPLES, whereYouWere, passageReference, passageStart, featuredPassages } from '../busca/buscaMath'
import {
  VERSES_PREVIEW, VERSES_PAGE, TESTAMENT_FILTERS, buildMatcher, highlightSegments, searchVerses, searchBooks, searchPassages, searchThemes, searchNotes,
  searchCounts, filterPills, effectiveFilter, versesLabel, seeAllVersesLabel, themeRecentSub, emptyMessage,
} from '../busca/palavra'
import { getRecentSearches, rememberSearch, clearRecentSearches } from '../busca/recentSearchesStore'
import { GrupoRotulo, ListaCartao, ListaLinha } from '../components/biblia/BuscaPartes'

const FONT = 'var(--font-bento)'
const DEBOUNCE_MS = 250
const ALL_BOOKS = GAMIFICATION_BOOKS.map(b => b.nome)

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

const readingKey = r => `${r.book}:${r.chapter}:${r.verse ?? ''}:${r.verseEnd ?? ''}:${r.chapterEnd ?? ''}`

// O texto de cada leitura, na versão em uso: { [chave]: { status, text } }
// — 'ready' com o texto; 'missing' quando o versículo não existe nesta
// versão (a leitura sai da lista); 'error' quando o texto não pôde ser
// carregado (a leitura fica, sem o texto). Sem entrada = carregando.
function useReadingTexts(readings, versionId, lang) {
  const [texts, setTexts] = useState({})
  const signature = readings.map(readingKey).join('|')
  useEffect(() => {
    let cancelled = false
    for (const r of readings) {
      const key = `${versionId}:${readingKey(r)}`
      fetchBookText(versionId, bookDisplayName(r.book, lang))
        .then(chapters => {
          if (cancelled) return
          const preview = referencePreview(r)
          const verses = preview.verses.map(v => chapters[String(preview.chapter)]?.verses?.[String(v)]).filter(Boolean)
          const text = verses.map(v => v.replace(/\s*\n\s*/g, ' ').trim()).join(' ')
          setTexts(prev => ({ ...prev, [key]: verses.length ? { status: 'ready', text: preview.ellipsis ? `${text} …` : text } : { status: 'missing' } }))
        })
        .catch(() => { if (!cancelled) setTexts(prev => ({ ...prev, [key]: { status: 'error' } })) })
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, versionId, lang])
  return r => texts[`${versionId}:${readingKey(r)}`]
}

export default function BuscaScreen({
  session, authUser, initialQuery, completedSet, sessionTitle, free,
  onBack, onOpenChapter, onOpenBook, onOpenTheme, onReadSession, onOpenFree,
}) {
  const { lang } = session
  const email = authUser?.email
  const versionId = getSelectedVersionId(lang)
  const [query, setQuery] = useState(initialQuery ?? '')
  const [filter, setFilter] = useState('all')
  const [testament, setTestament] = useState('all')
  const [recents, setRecents] = useState(getRecentSearches)
  const inputRef = useRef(null)
  const term = useDebounced(query, DEBOUNCE_MS).trim()

  // O índice do texto (um por versão, guardado em memória depois da
  // primeira vez) começa a carregar ao abrir a tela, antes da primeira
  // tecla. null = carregando; [] = não deu para carregar.
  const [entries, setEntries] = useState(null)
  useEffect(() => {
    let cancelled = false
    setEntries(null)
    loadSearchIndex(lang).then(data => { if (!cancelled) setEntries(data) }).catch(() => { if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [lang])
  // As notas e marcações da própria pessoa, uma vez.
  const [mine, setMine] = useState(EMPTY_NOTES)
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getHighlights(email), getNotes(email)]).then(([h, n]) => {
      if (!cancelled) setMine({ highlights: h.status === 'fulfilled' ? h.value : [], notes: n.status === 'fulfilled' ? n.value : {} })
    })
    return () => { cancelled = true }
  }, [email])

  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const interpretation = useMemo(() => (term ? interpretReference(term, { lang }) : null), [term, lang])
  const candidates = interpretation?.type === 'ref' ? interpretation.readings : EMPTY
  const textOf = useReadingTexts(candidates, versionId, lang)
  // Só ficam as leituras que existem nesta versão; a primeira é a do cartão.
  const readings = candidates.filter(r => textOf(r)?.status !== 'missing')
  const primary = readings[0] ?? null
  const chapterRow = primary ? wholeChapterRow(primary, lang) : null

  // Busca por palavra (B6). Tudo é calculado duas vezes quando há filtro
  // de testamento: `whole` (a Bíblia toda) decide se há o que mostrar e
  // mantém o filtro de testamento na tela; `found` é o que o filtro deixa.
  const matcher = useMemo(() => buildMatcher(term), [term])
  const knownBooks = interpretation?.type === 'book' ? interpretation.books : EMPTY
  const whole = useMemo(() => (matcher ? {
    books: searchBooks(matcher, knownBooks, ALL_BOOKS, progress, lang),
    verses: entries ? searchVerses(matcher, entries) : EMPTY,
    passages: searchPassages(matcher, NAMED_PASSAGES, lang),
    themes: searchThemes(matcher, THEMES, lang),
    notes: searchNotes(matcher, mine, lang),
  } : NOTHING), [matcher, knownBooks, entries, progress, lang, mine])
  const found = useMemo(() => (!matcher || testament === 'all' ? whole : {
    books: searchBooks(matcher, knownBooks, ALL_BOOKS, progress, lang, testament),
    verses: entries ? searchVerses(matcher, entries, testament) : EMPTY,
    passages: searchPassages(matcher, NAMED_PASSAGES, lang, testament),
    themes: searchThemes(matcher, THEMES, lang, testament),
    notes: searchNotes(matcher, mine, lang, testament),
  }), [matcher, testament, whole, knownBooks, entries, progress, lang, mine])
  const counts = searchCounts(found)
  const anyResult = searchCounts(whole).all > 0
  const shown = effectiveFilter(filter, counts)
  const show = type => shown === 'all' || shown === type
  const loadingVerses = !!matcher && entries === null
  // Sem nada digitado — ou com um caractere só, que ainda não é busca nem
  // referência — a tela é a de abertura (B5).
  const idle = !term || (!matcher && !interpretation)
  // Nada encontrado: há o que procurar, o índice já chegou, e não há nem
  // referência nem resultado nenhum.
  const nothing = !!matcher && !loadingVerses && !anyResult && !primary

  // Versículos: os quatro primeiros em "Tudo"; todos, em páginas de 30, no
  // filtro "Versículos" — a página seguinte entra quando o fim da lista
  // aparece na tela.
  const [pages, setPages] = useState(1)
  useEffect(() => { setPages(1) }, [term, testament, shown])
  const verseLimit = shown === 'verses' ? pages * VERSES_PAGE : VERSES_PREVIEW
  const verses = found.verses.slice(0, verseLimit)
  const moreVerses = shown === 'verses' && found.verses.length > verseLimit
  const sentinelRef = useRef(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!moreVerses || !node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(items => { if (items.some(it => it.isIntersecting)) setPages(n => n + 1) })
    observer.observe(node)
    return () => observer.disconnect()
  }, [moreVerses, pages])

  function fill(text) {
    setQuery(text)
    inputRef.current?.focus()
  }
  function remember(item) {
    setRecents(rememberSearch(item))
  }
  function openReading(r, { whole = false } = {}) {
    const target = whole ? { ...r, verse: null, verseEnd: null, chapterEnd: null } : r
    remember({ text: formatReference(target, lang), sub: referenceKind(target) })
    onOpenChapter(target.book, target.chapter, target.verse ?? undefined)
  }
  function openBook(row) {
    remember({ text: row.title, sub: 'Livro' })
    onOpenBook(row.book)
  }
  // `searched`: veio de um resultado (entra nas buscas recentes); as
  // "mais procuradas" da tela vazia não são busca.
  function openPassage(p, searched = false) {
    const start = passageStart(p)
    if (searched) remember({ text: term, sub: 'Passagem' })
    onOpenChapter(start.book, start.chapter, start.verse ?? undefined)
  }
  function openVerse(e) {
    remember({ text: term, sub: versesLabel(found.verses.length) })
    onOpenChapter(e.book, e.chapter, e.verse)
  }
  function seeAllVerses() {
    remember({ text: term, sub: versesLabel(found.verses.length) })
    setFilter('verses')
  }
  function openTheme(theme) {
    remember({ text: term, sub: themeRecentSub(theme.count) })
    onOpenTheme(theme.id, query)
  }
  // Nota de versículo: a leitura abre no versículo, com a nota aberta.
  function openNote(note) {
    remember({ text: term, sub: 'Nota' })
    onOpenChapter(note.book, note.chapter, note.verse ?? undefined, note.noteId ? { noteId: note.noteId } : undefined)
  }

  // As pastilhas de tipo: as seis fixas (B5 e "nada encontrado") ou só as
  // que têm resultado, com a contagem (B6).
  function typeFilters(pills, active) {
    return (
      <div style={s.filters} role="group" aria-label="Tipo de resultado">
        {pills.map(f => (
          <button key={f.id} type="button" className="busca-filtro" style={{ ...s.filter, ...(active === f.id ? s.filterOn : null) }} aria-pressed={active === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.count != null && <span style={{ ...s.filterCount, ...(active === f.id ? s.filterCountOn : null) }}>{f.count}</span>}
          </button>
        ))}
      </div>
    )
  }
  const countAt = n => <span style={s.count}>{n}</span>
  const empty = nothing || (anyResult && counts.all === 0)
    ? emptyMessage(query, findBibleVersion(versionId)?.short ?? '', anyResult ? testament : 'all')
    : null

  const where = whereYouWere({ sessionTitle, free: free ? { ...free, book: bookDisplayName(free.book, lang) } : null })
  const featured = featuredPassages(NAMED_PASSAGES)

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" className="biblia-alvo" style={s.back} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={s.field}>
          <span style={s.lens}><AppIcon name="Search" size={14} strokeWidth={1.7} absoluteStrokeWidth color="var(--bento-ink)" /></span>
          <input
            ref={inputRef}
            className="busca-campo"
            style={s.input}
            type="text" inputMode="search" enterKeyHint="search"
            autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={SEARCH_HINT}
            aria-label="Buscar na Bíblia"
          />
          {query && (
            <button type="button" style={s.clear} onClick={() => fill('')} aria-label="Limpar a busca">
              <span style={s.clearDot}><AppIcon name="X" size={10} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-t2)" /></span>
            </button>
          )}
        </div>
      </div>

      <div style={s.body}>
        {idle ? (
          <>
            {typeFilters(TYPE_FILTERS, filter)}

            <div style={s.direct}>
              <p style={s.directLabel}>IR DIRETO A UM TEXTO</p>
              <p style={s.directText}>Escreva a referência do jeito que lembrar — com abreviação, sem acento, sem dois-pontos.</p>
              <div style={s.examples}>
                {REFERENCE_EXAMPLES.map(example => (
                  <button key={example} type="button" className="busca-exemplo" style={s.example} onClick={() => fill(example)}>{example}</button>
                ))}
              </div>
            </div>

            {where.length > 0 && (
              <>
                <GrupoRotulo>ONDE VOCÊ ESTAVA</GrupoRotulo>
                <ListaCartao>
                  {where.map((row, i) => (
                    <ListaLinha key={row.key} title={row.title} sub={row.sub} last={i === where.length - 1} onClick={row.key === 'session' ? onReadSession : onOpenFree} />
                  ))}
                </ListaCartao>
              </>
            )}

            {recents.length > 0 && (
              <>
                <GrupoRotulo right={<button type="button" className="busca-limpar" style={s.clearRecents} onClick={() => setRecents(clearRecentSearches())}>Limpar</button>}>BUSCAS RECENTES</GrupoRotulo>
                <ListaCartao>
                  {recents.map((r, i) => (
                    <ListaLinha key={r.text} icon="Clock" title={r.text} sub={r.sub} last={i === recents.length - 1} onClick={() => fill(r.text)} />
                  ))}
                </ListaCartao>
              </>
            )}

            {featured.length > 0 && (
              <>
                <GrupoRotulo>PASSAGENS MAIS PROCURADAS</GrupoRotulo>
                <ListaCartao>
                  {featured.map((p, i) => (
                    <ListaLinha key={p.nome} title={p.nome} sub={passageReference(p, lang)} last={i === featured.length - 1} onClick={() => openPassage(p)} />
                  ))}
                </ListaCartao>
              </>
            )}
          </>
        ) : (
          <>
            {primary && (
              <div style={s.go}>
                <p style={s.goLabel}>IR DIRETO</p>
                <p style={s.goTitle}>{formatReference(primary, lang)}</p>
                {textOf(primary)?.status === 'ready' && <p style={s.goText}>{textOf(primary).text}</p>}
                {!textOf(primary) && <span className="rb-context-skeleton" style={s.goSkeleton} />}
                <button type="button" style={s.goButton} onClick={() => openReading(primary)}>
                  {openReferenceLabel(primary, lang)}
                  <AppIcon name="ArrowRight" size={16} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-ink)" />
                </button>
              </div>
            )}

            {readings.length > 1 && (
              <>
                <GrupoRotulo>TAMBÉM PODE SER</GrupoRotulo>
                <ListaCartao>
                  {readings.slice(1).map((r, i, list) => (
                    <ListaLinha key={readingKey(r)} title={formatReference(r, lang)} sub={textOf(r)?.text} clamp last={i === list.length - 1} onClick={() => openReading(r)} />
                  ))}
                </ListaCartao>
              </>
            )}

            {chapterRow && (
              <>
                <GrupoRotulo>O CAPÍTULO INTEIRO</GrupoRotulo>
                <ListaCartao>
                  <ListaLinha title={chapterRow.title} sub={chapterRow.sub} last onClick={() => openReading(primary, { whole: true })} />
                </ListaCartao>
              </>
            )}

            {(anyResult || nothing) && typeFilters(nothing ? TYPE_FILTERS : filterPills(counts), nothing ? filter : shown)}

            {anyResult && (
              <div style={s.testaments} role="group" aria-label="Testamento">
                {TESTAMENT_FILTERS.map(f => (
                  <button key={f.id} type="button" className="busca-testamento" style={{ ...s.testament, ...(testament === f.id ? s.testamentOn : null) }} aria-pressed={testament === f.id} onClick={() => setTestament(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {empty && (
              <div style={s.empty} role="status">
                <p style={s.emptyTitle}>{empty.title}</p>
                <p style={s.emptySub}>{empty.sub}</p>
              </div>
            )}

            {show('books') && found.books.length > 0 && (
              <>
                <GrupoRotulo right={countAt(found.books.length)}>LIVROS</GrupoRotulo>
                <ListaCartao>
                  {found.books.map((row, i) => (
                    <ListaLinha key={row.book} title={row.title} sub={row.sub} last={i === found.books.length - 1} onClick={() => openBook(row)} />
                  ))}
                </ListaCartao>
              </>
            )}

            {show('passages') && found.passages.length > 0 && (
              <>
                <GrupoRotulo right={countAt(found.passages.length)}>PASSAGENS</GrupoRotulo>
                <ListaCartao>
                  {found.passages.map((row, i) => (
                    <ListaLinha key={row.title} title={row.title} sub={row.sub} last={i === found.passages.length - 1} onClick={() => openPassage(row.passage, true)} />
                  ))}
                </ListaCartao>
              </>
            )}

            {show('verses') && loadingVerses && (
              <>
                <GrupoRotulo>VERSÍCULOS</GrupoRotulo>
                <div style={s.verses}>
                  {[0, 1, 2].map(i => <span key={i} className="rb-context-skeleton" style={s.verseSkeleton} />)}
                </div>
              </>
            )}

            {show('verses') && found.verses.length > 0 && (
              <>
                <GrupoRotulo right={countAt(found.verses.length)}>VERSÍCULOS</GrupoRotulo>
                <div style={{ ...s.verses, paddingBottom: shown === 'all' && found.verses.length > VERSES_PREVIEW ? 0 : 4 }}>
                  {verses.map((e, i) => (
                    <button key={`${e.book}:${e.chapter}:${e.verse}`} type="button" style={{ ...s.verse, borderBottom: i === verses.length - 1 ? 'none' : '1px solid var(--bento-line)' }} onClick={() => openVerse(e)}>
                      <span style={s.verseRef}>{bookDisplayName(e.book, lang)} {e.chapter}:{e.verse}</span>
                      <span style={s.verseText}>
                        {highlightSegments(e.text, matcher.ranges(e.norm)).map((seg, k) => (seg.highlighted ? <mark key={k} style={s.mark}>{seg.text}</mark> : seg.text))}
                      </span>
                    </button>
                  ))}
                  {shown === 'all' && found.verses.length > VERSES_PREVIEW && (
                    <button type="button" style={s.seeAll} onClick={seeAllVerses}>
                      {seeAllVersesLabel(found.verses.length)}
                      <AppIcon name="ArrowRight" size={16} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-accent)" />
                    </button>
                  )}
                  {moreVerses && <span ref={sentinelRef} style={s.sentinel} aria-hidden="true" />}
                </div>
              </>
            )}

            {show('themes') && found.themes.length > 0 && (
              <>
                <GrupoRotulo right={countAt(found.themes.length)}>TEMAS</GrupoRotulo>
                <button type="button" style={s.theme} onClick={() => openTheme(found.themes[0])}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.themeTitle}>{found.themes[0].title}</span>
                    <span style={s.themeSub}>{found.themes[0].sub}</span>
                  </span>
                  <AppIcon name="ArrowRight" size={16} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-accent)" style={{ flexShrink: 0 }} />
                </button>
                {found.themes.length > 1 && (
                  <ListaCartao>
                    {found.themes.slice(1).map((theme, i, list) => (
                      <ListaLinha key={theme.id} title={theme.title} sub={theme.sub} last={i === list.length - 1} onClick={() => openTheme(theme)} />
                    ))}
                  </ListaCartao>
                )}
              </>
            )}

            {show('notes') && found.notes.length > 0 && (
              <>
                <GrupoRotulo right={countAt(found.notes.length)}>NAS SUAS NOTAS</GrupoRotulo>
                <ListaCartao>
                  {found.notes.map((note, i) => (
                    <ListaLinha key={note.key} title={note.title} sub={note.sub} clamp last={i === found.notes.length - 1} onClick={() => openNote(note)} />
                  ))}
                </ListaCartao>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const EMPTY = []
const EMPTY_NOTES = { highlights: [], notes: {} }
const NOTHING = { books: EMPTY, verses: EMPTY, passages: EMPTY, themes: EMPTY, notes: EMPTY }

// Medidas dos quadros B5, B6 e B7 (handoff-biblia-52 §6).
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '20px 20px 0' },
  back: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  field: { flex: 1, minWidth: 0, height: 46, borderRadius: 16, background: 'var(--bento-card)', boxShadow: 'inset 0 0 0 2px var(--bento-ink)', display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px' },
  lens: { width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', caretColor: 'var(--bento-accent)' },
  // Botão de limpar: a bolinha de 20px do quadro dentro de uma área de
  // toque de 44px (as margens negativas devolvem a sobra ao desenho). O
  // cinza é o mesmo do glifo apagado das medalhas (#E4DED7).
  clear: { width: 44, height: 44, flexShrink: 0, margin: '0 -12px', border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  clearDot: { width: 20, height: 20, borderRadius: 99, background: 'var(--medalha-glifo-apagado)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 20px calc(22px + var(--safe-bottom))' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 },
  filter: { height: 34, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-quote-ink)', cursor: 'pointer' },
  filterOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },
  filterCount: { fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)' },
  filterCountOn: { color: 'rgba(255,255,255,.55)' },
  testaments: { display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: 'var(--bento-card)', flexShrink: 0 },
  testament: { flex: 1, minWidth: 0, height: 32, borderRadius: 10, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', whiteSpace: 'nowrap', cursor: 'pointer' },
  testamentOn: { background: 'var(--bento-line)', color: 'var(--bento-ink)', fontWeight: 800 },
  empty: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 18px 17px', flexShrink: 0 },
  emptyTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: 'var(--bento-ink)', margin: '0 0 4px' },
  emptySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: 0 },
  verses: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px 0', flexShrink: 0 },
  verse: { width: '100%', display: 'block', padding: '12px 0', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' },
  verseRef: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 4 },
  verseText: { display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-quote-ink)' },
  // Realce do termo: o laranja claro (o tom de Evangelhos e Atos), sem
  // respiro lateral, pra não abrir espaço antes da pontuação.
  mark: { background: 'var(--bloco-evangelhos-atos-tom)', borderRadius: 4, padding: '1px 0', fontWeight: 800, color: 'var(--bento-ink)' },
  verseSkeleton: { display: 'block', height: 44, borderRadius: 10, background: 'var(--bento-line)', margin: '12px 0' },
  seeAll: { width: '100%', height: 48, boxSizing: 'content-box', borderTop: '1px solid var(--bento-line)', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  sentinel: { display: 'block', height: 1 },
  theme: { borderRadius: 24, border: 'none', background: 'var(--bento-ink)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', flexShrink: 0, cursor: 'pointer' },
  themeTitle: { display: 'block', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.2px', color: '#fff', marginBottom: 3 },
  themeSub: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.6)' },
  direct: { borderRadius: 24, background: 'var(--bento-sand)', padding: '15px 16px 16px', flexShrink: 0 },
  directLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', color: 'var(--bento-sand-label)', margin: '0 0 8px' },
  directText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: '0 0 11px' },
  examples: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  example: { height: 32, borderRadius: 11, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', padding: '0 11px', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1, color: 'var(--bento-sand-ink-strong)', cursor: 'pointer' },
  clearRecents: { border: 'none', background: 'none', padding: 0, fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', cursor: 'pointer' },
  count: { fontFamily: FONT, fontSize: 11, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)' },
  go: { borderRadius: 26, background: 'var(--bento-ink)', padding: '18px 18px 16px', flexShrink: 0 },
  goLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', color: 'var(--bento-accent)', margin: '0 0 10px' },
  goTitle: { fontFamily: FONT, fontSize: 24, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.9px', color: '#fff', margin: '0 0 10px' },
  goText: { fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.75)', margin: '0 0 16px' },
  goSkeleton: { display: 'block', height: 43, borderRadius: 10, background: 'rgba(255,255,255,.08)', margin: '0 0 16px' },
  goButton: { width: '100%', height: 50, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
