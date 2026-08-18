import { useState, useEffect } from 'react'
import { pickActiveBlock, sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { getLastOpenedChapter } from '../reading/lastOpenedChapterStore'
import { getBookSortMode, setBookSortMode } from '../utils/bookSortStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

// Remove acentos pra busca não exigir digitar "Êxodo" com acento certo.
function normalizeSearch(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

// Achata os livros de um subconjunto de blocos numa lista única — reaproveitado
// tanto pela busca quanto pelas seções de testamento (Antigo/Novo). A ordem
// dos blocos passados já é a ordem canônica/bíblica dentro daquele
// testamento (blocks 1→4 = AT, 5→8 = NT), então concatenar na ordem em que
// os blocos chegam já dá a ordem bíblica, sem precisar de uma lista própria.
function flattenBooks(blocksSubset, lang) {
  return blocksSubset.flatMap(block => {
    const names = lang === 'en' ? block.booksEn : block.books
    return names.map((displayName, i) => ({ displayName, canonicalName: block.books[i], block }))
  })
}

export default function JourneyScreen({
  session, authUser, blocks, sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, initialBlockId, entryMode, resumeSessionId, onNavigate, onGoToReflectionFrom,
}) {
  const { lang } = session
  const [searchQuery, setSearchQuery] = useState('')
  // Ordem dos livros na visão de mapa (fora de busca) — 'biblical' (padrão,
  // ordem canônica) ou 'alpha' (A-Z). Por dispositivo, sobrevive entre
  // sessões (ver src/utils/bookSortStore.js).
  const [sortMode, setSortMode] = useState(getBookSortMode)
  function changeSortMode(mode) {
    setSortMode(mode)
    setBookSortMode(mode)
  }

  // Bloco "aberto" (visão de leitura) — null significa visão geral (mapa de
  // blocos). Quando entryMode é 'reading' (ex: botão "Continuar sessão" na
  // Home/Rotina), já abre direto no bloco ativo, featurando a mesma sessão
  // do plano exibida lá (resumeSessionId), em vez do mapa — e nesse caso a
  // leitura mostra a divisão em sessões do plano ("mode" abaixo). Qualquer
  // outra forma de entrar (busca, tocar num bloco/livro) é navegação livre
  // pela Bíblia, sem sessão nenhuma — só capítulo a capítulo.
  const [expandedBlockId, setExpandedBlockId] = useState(entryMode === 'reading' ? initialBlockId : null)
  const [initialSessionId, setInitialSessionId] = useState(entryMode === 'reading' ? resumeSessionId : null)
  const [readingMode, setReadingMode] = useState(entryMode === 'reading' ? 'session' : 'browse')

  // O botão "Ir para a leitura de hoje" (Rotina) chama onContinueSession
  // mesmo com a tela já montada (usuário já está na aba Bíblia) — os
  // estados acima só rodam no useState inicial (na primeira montagem),
  // então esse efeito cobre a navegação pra quem já estava aqui.
  useEffect(() => {
    if (entryMode === 'reading') {
      setExpandedBlockId(initialBlockId)
      setInitialSessionId(resumeSessionId)
      setReadingMode('session')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialBlockId, resumeSessionId])

  function openBlock(blockId, sessionIdToFeature = null) {
    setExpandedBlockId(blockId)
    setInitialSessionId(sessionIdToFeature)
    setReadingMode('browse')
  }
  function closeBlock() {
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Clicar num livro específico (dentro da descrição de um bloco) pula direto
  // pro primeiro capítulo pendente (ou o 1o) daquele livro, já em destaque —
  // sempre pela divisão "1 capítulo = 1 sessão" (browseSessionsByBlock),
  // já que isso é sempre navegação livre, nunca o fluxo guiado da Rotina.
  function openBook(block, bookName) {
    const sessions = browseSessionsByBlock[block.id]
    const bookSessions = sessions.filter(s => s.book === bookName)
    const target = bookSessions.find(s => sessionKeys(s).some(k => !completedSet.has(k))) ?? bookSessions[0]
    openBlock(block.id, target?.id ?? null)
  }

  if (expandedBlockId != null) {
    return (
      <ReadingBlockView
        session={session}
        authUser={authUser}
        onNavigate={onNavigate}
        blockId={expandedBlockId}
        blocks={blocks}
        sessionsByBlock={readingMode === 'session' ? sessionsByBlock : browseSessionsByBlock}
        mode={readingMode}
        completedSet={completedSet}
        onToggleSession={onToggleSession}
        onToggleChapter={onToggleChapter}
        initialSessionId={initialSessionId}
        onBack={closeBlock}
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id })}
      />
    )
  }

  const activeBlock = pickActiveBlock(blocks)
  const totalBooks = blocks.reduce((s, b) => s + b.books.length, 0)
  const currentBookName = lang === 'en' ? activeBlock.currentBookEn : activeBlock.currentBook

  // Último capítulo aberto na navegação livre (ver ReadingBlockView.jsx,
  // mode 'browse') — lido direto do localStorage a cada render (não num
  // useState) porque essa tela não desmonta ao entrar/sair de um bloco (só
  // troca de branch aqui embaixo), então um valor lido só na 1a montagem
  // ficaria desatualizado depois de ler um novo capítulo e voltar.
  const lastOpened = getLastOpenedChapter()
  const lastOpenedSession = lastOpened ? browseSessionsByBlock[lastOpened.blockId]?.find(s => s.id === lastOpened.sessionId) : null
  const lastOpenedBlock = lastOpened ? blocks.find(b => b.id === lastOpened.blockId) : null

  // Progresso real por livro (capítulos lidos/total) — mostrado em cada
  // linha de livro, tanto na busca quanto nas seções de testamento.
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock)

  // Busca de livro — achata todos os blocos numa lista única de livros
  // pesquisáveis, independente de qual testamento eles pertencem, já que o
  // usuário pode não saber de cabeça onde um livro está.
  const trimmedQuery = searchQuery.trim()
  const searchResults = trimmedQuery
    ? flattenBooks(blocks, lang).filter(entry => normalizeSearch(entry.displayName).includes(normalizeSearch(trimmedQuery)))
    : null

  const atBooks = flattenBooks(blocks.filter(b => b.id <= 4), lang)
  const ntBooks = flattenBooks(blocks.filter(b => b.id >= 5), lang)
  const sortBooks = list => sortMode === 'alpha'
    ? [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, lang === 'en' ? 'en' : 'pt'))
    : list

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: 83 }}>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <p style={styles.heroVerse}>{t('journey.heroVerseText', undefined, lang)}</p>
        <p style={styles.heroVerseRef}>{t('journey.heroVerseRef', undefined, lang)}</p>
        <p style={styles.heroDesc}>{t('journey.heroDesc', { books: totalBooks, plan: session.plan.label }, lang)}</p>
        <div style={styles.heroProgressBar}>
          <div style={{ ...styles.heroProgressFill, width: `${session.biblePercent}%` }} />
        </div>
        <div style={styles.heroProgressLabel}>
          <span>{t('journey.overallProgress', undefined, lang)}</span>
          <strong>{session.biblePercent}% · {currentBookName ? t('journey.inProgress', { book: currentBookName }, lang) : t('journey.bibleComplete', undefined, lang)}</strong>
        </div>
      </div>

      {/* Sheet flutuante sobre o hero — plano de leitura e progresso do dia
          agora moram só na aba Rotina; aqui fica só a Bíblia em si. */}
      <div style={styles.sheet}>

        {/* Conteúdo */}
        <div style={{ padding: '13px 14px 18px', display: 'flex', flexDirection: 'column' }}>

          {/* Busca — digitar filtra a lista de livros de todos os blocos;
              limpar a busca volta pra visão normal por testamento. */}
          <div style={styles.searchWrap}>
            <AppIcon name="Search" size={15} color="var(--g4)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('journey.searchPlaceholder', undefined, lang)}
              style={styles.searchInput}
            />
            {trimmedQuery && (
              <button style={styles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="clear">
                <AppIcon name="X" size={13} color="var(--g4)" />
              </button>
            )}
          </div>

          {/* "Continuar leitura" — só some quando tem busca ativa (que já
              tem sua própria lista de resultados) ou quando nunca abriu
              nada ainda por aqui (lastOpenedSession null). */}
          {!trimmedQuery && lastOpenedSession && (
            <button style={styles.continueReadingBtn} onClick={() => openBlock(lastOpened.blockId, lastOpened.sessionId)}>
              <span style={styles.continueReadingIcon}>
                <AppIcon name="BookOpen" size={16} color="white" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {/* Bloco (Pentateuco etc.) junto do rótulo — sem ele, não
                    dava pra saber pra ONDE o botão levava antes de tocar,
                    só o livro/capítulo (que sozinhos podem repetir em mais
                    de um bloco, ex: mesmo Salmo em blocos diferentes). */}
                <span style={styles.continueReadingLabel}>
                  {t('journey.continueReading', undefined, lang)}
                  {lastOpenedBlock && ` · ${lang === 'en' ? lastOpenedBlock.nameEn : lastOpenedBlock.name}`}
                </span>
                <span style={styles.continueReadingTitle}>
                  {(lang === 'en' ? lastOpenedSession.bookEn : lastOpenedSession.book)} {lastOpenedSession.chStart}
                  {' · '}{lang === 'en' ? lastOpenedSession.titleEn : lastOpenedSession.title}
                </span>
              </span>
              <AppIcon name="ChevronRight" size={16} color="var(--g4)" />
            </button>
          )}

          {searchResults ? (
            searchResults.length === 0 ? (
              <p style={styles.searchEmptyHint}>{t('journey.searchNoResults', { query: trimmedQuery }, lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {searchResults.map(entry => (
                  <BookRow
                    key={`${entry.block.id}-${entry.canonicalName}`}
                    entry={entry}
                    bookChapterCounts={bookChapterCounts}
                    completedSet={completedSet}
                    onOpen={() => openBook(entry.block, entry.canonicalName)}
                  />
                ))}
              </div>
            )
          ) : (
            <>
              {/* Ordem bíblica (padrão) ou A-Z — só faz sentido fora da
                  busca, que já tem sua própria lista filtrada. */}
              <div style={styles.sortRow}>
                <button
                  style={{ ...styles.sortBtn, ...(sortMode === 'biblical' ? styles.sortBtnActive : {}) }}
                  onClick={() => changeSortMode('biblical')}
                >
                  {t('journey.sortBiblical', undefined, lang)}
                </button>
                <button
                  style={{ ...styles.sortBtn, ...(sortMode === 'alpha' ? styles.sortBtnActive : {}) }}
                  onClick={() => changeSortMode('alpha')}
                >
                  {t('journey.sortAlpha', undefined, lang)}
                </button>
              </div>

              <TestamentSection
                testamentKey="at"
                label={t('journey.oldTestament', undefined, lang)}
                blocks={blocks.filter(b => b.id <= 4)}
                books={sortBooks(atBooks)}
                bookChapterCounts={bookChapterCounts}
                completedSet={completedSet}
                onOpenBook={openBook}
              />
              <TestamentSection
                testamentKey="nt"
                label={t('journey.newTestament', undefined, lang)}
                blocks={blocks.filter(b => b.id >= 5)}
                books={sortBooks(ntBooks)}
                bookChapterCounts={bookChapterCounts}
                completedSet={completedSet}
                onOpenBook={openBook}
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Seção expansível de testamento (Antigo/Novo) — começa sempre
   compacta; o usuário decide quando quer ver a lista de livros, em vez do
   app abrir um dos dois sozinho. Sem agrupamento por bloco temático — só
   Antigo/Novo Testamento, cada um com a lista (achatada) dos seus livros,
   na ordem escolhida em `books` (bíblica ou A-Z, decidido por quem chama). ── */
function TestamentSection({ testamentKey, label, blocks, books, bookChapterCounts, completedSet, onOpenBook, style }) {
  const [open, setOpen] = useState(false)

  const doneSessions = blocks.reduce((s, b) => s + b.sessionsDone, 0)
  const totalSessions = blocks.reduce((s, b) => s + b.sessionsTotal, 0)
  const percent = totalSessions ? Math.round((doneSessions / totalSessions) * 100) : 0

  return (
    <div style={{ ...styles.testamentSection, ...style }}>
      <button style={styles.testamentHeader} onClick={() => setOpen(v => !v)}>
        <span style={styles.testamentLabel}>{label}</span>
        <span style={styles.testamentMeta}>
          {percent}%
          <AppIcon name="ChevronDown" size={15} color="var(--g4)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 9 }}>
          {books.map(entry => (
            <BookRow
              key={`${testamentKey}-${entry.canonicalName}`}
              entry={entry}
              bookChapterCounts={bookChapterCounts}
              completedSet={completedSet}
              onOpen={() => onOpenBook(entry.block, entry.canonicalName)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Linha de livro — nome + progresso real (capítulos lidos/total, ou um
// check quando o livro inteiro já foi lido) + seta. Usado tanto nas seções
// de testamento quanto nos resultados de busca (mesmo componente, um só
// lugar pra manter esse visual consistente).
function BookRow({ entry, bookChapterCounts, completedSet, onOpen }) {
  const { displayName, canonicalName } = entry
  const total = bookChapterCounts[canonicalName] ?? 0
  let done = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${canonicalName}:${ch}`)) done++
  const isDone = total > 0 && done === total

  return (
    <button style={styles.bookRow} onClick={onOpen}>
      <span style={styles.bookRowName}>{displayName}</span>
      {isDone
        ? <span style={styles.bookRowDone}><AppIcon name="Check" size={13} color="white" /></span>
        : <span style={styles.bookRowMeta}>{done}/{total}</span>}
      <AppIcon name="ChevronRight" size={15} color="var(--g4)" />
    </button>
  )
}

const styles = {
  searchWrap:        { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '10px 13px', marginBottom: 4 },
  searchInput:       { flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)' },
  continueReadingBtn:  { width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 15, padding: '10px 12px', margin: '10px 0 12px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', boxShadow: 'var(--shadow-card)' },
  continueReadingIcon: { width: 32, height: 32, borderRadius: 10, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  continueReadingLabel:{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--g4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 1 },
  continueReadingTitle:{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  searchClearBtn:    { border: 'none', background: 'var(--g2)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  searchEmptyHint:   { fontSize: 12.5, fontWeight: 500, color: 'var(--g4)', padding: '14px 2px', textAlign: 'center' },
  sortRow:         { display: 'flex', gap: 6, marginBottom: 12 },
  sortBtn:         { flex: 1, border: '0.5px solid var(--g2)', background: 'var(--g1)', borderRadius: 10, padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--g5)', cursor: 'pointer', fontFamily: 'var(--font)' },
  sortBtnActive:   { background: 'var(--bk)', border: '0.5px solid var(--bk)', color: 'white' },
  bookRow:         { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 14, padding: '10px 13px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', boxShadow: 'var(--shadow-card)' },
  bookRowName:     { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  bookRowMeta:     { fontSize: 10.5, fontWeight: 600, color: 'var(--g4)', flexShrink: 0 },
  bookRowDone:     { width: 18, height: 18, borderRadius: '50%', background: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hero:            { background: 'var(--bk-hero)', padding: '18px 16px 30px', position: 'relative', overflow: 'hidden', flexShrink: 0 },
  heroOrbOrange:   { position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.5, top: -70, right: -60 },
  heroOrbPink:     { position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.32, bottom: -60, left: -40 },
  heroVerse:       { position: 'relative', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: 'white', lineHeight: 1.35, marginBottom: 5, letterSpacing: '-0.1px' },
  heroVerseRef:    { position: 'relative', fontSize: 10.5, fontWeight: 700, color: 'var(--or)', letterSpacing: 0.5, marginBottom: 12 },
  heroDesc:        { position: 'relative', fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginBottom: 13 },
  heroProgressBar: { position: 'relative', height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 },
  heroProgressFill:{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99 },
  heroProgressLabel:{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(255,255,255,.55)' },
  sheet:           { background: 'var(--white)', borderRadius: '24px 24px 0 0', marginTop: -18, position: 'relative', zIndex: 2, boxShadow: '0 -12px 30px rgba(0,0,0,.05)', flex: 1 },
  testamentSection:{},
  testamentHeader: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '11px 13px', cursor: 'pointer', fontFamily: 'var(--font)' },
  testamentLabel:  { fontSize: 11.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: 0.3, textTransform: 'uppercase' },
  testamentMeta:   { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'var(--or)' },
}
