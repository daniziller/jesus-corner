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
//   palavra ou expressão     → B6 (grupos por tipo).
//
// Substitui a tela de resultados 39k. O interpretador de referências e os
// textos vêm de src/busca/ (puros, com testes); o texto dos versículos é o
// da versão em uso (o mesmo arquivo por livro que a leitura já carrega).
// A resposta espera ~250 ms depois da última tecla e o que chega de uma
// busca anterior é descartado — digitar nunca trava.
import { useState, useEffect, useMemo, useRef } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { NAMED_PASSAGES } from '../data/passagensComNome'
import { interpretReference, formatReference, openReferenceLabel, referencePreview, referenceKind, wholeChapterRow, bookDisplayName } from '../busca/referencia'
import { SEARCH_HINT, TYPE_FILTERS, REFERENCE_EXAMPLES, whereYouWere, passageReference, passageStart, featuredPassages, bookRow } from '../busca/buscaMath'
import { getRecentSearches, rememberSearch, clearRecentSearches } from '../busca/recentSearchesStore'
import { GrupoRotulo, ListaCartao, ListaLinha } from '../components/biblia/BuscaPartes'

const FONT = 'var(--font-bento)'
const DEBOUNCE_MS = 250

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
  session, initialQuery, completedSet, sessionTitle, free,
  onBack, onOpenChapter, onOpenBook, onReadSession, onOpenFree,
}) {
  const { lang } = session
  const versionId = getSelectedVersionId(lang)
  const [query, setQuery] = useState(initialQuery ?? '')
  const [filter, setFilter] = useState('all')
  const [recents, setRecents] = useState(getRecentSearches)
  const inputRef = useRef(null)
  const term = useDebounced(query, DEBOUNCE_MS).trim()

  const progress = useMemo(() => computeBibleProgress(completedSet), [completedSet])
  const interpretation = useMemo(() => (term ? interpretReference(term, { lang }) : null), [term, lang])
  const candidates = interpretation?.type === 'ref' ? interpretation.readings : EMPTY
  const textOf = useReadingTexts(candidates, versionId, lang)
  // Só ficam as leituras que existem nesta versão; a primeira é a do cartão.
  const readings = candidates.filter(r => textOf(r)?.status !== 'missing')
  const primary = readings[0] ?? null
  const chapterRow = primary ? wholeChapterRow(primary, lang) : null
  const books = interpretation?.type === 'book' ? interpretation.books.map(nome => bookRow(nome, progress, lang)) : EMPTY

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
  function openPassage(p) {
    const start = passageStart(p)
    onOpenChapter(start.book, start.chapter, start.verse ?? undefined)
  }

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
        {!term ? (
          <>
            <div style={s.filters} role="group" aria-label="Tipo de resultado">
              {TYPE_FILTERS.map(f => (
                <button key={f.id} type="button" className="busca-filtro" style={{ ...s.filter, ...(filter === f.id ? s.filterOn : null) }} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>

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

            {books.length > 0 && (
              <>
                <GrupoRotulo right={<span style={s.count}>{books.length}</span>}>LIVROS</GrupoRotulo>
                <ListaCartao>
                  {books.map((row, i) => (
                    <ListaLinha key={row.book} title={row.title} sub={row.sub} last={i === books.length - 1} onClick={() => openBook(row)} />
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

// Medidas dos quadros B5 e B7 (handoff-biblia-52 §6).
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
