import { useState, useEffect, useRef } from 'react'
import { pickActiveBlock, sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { getLastOpenedChapter } from '../reading/lastOpenedChapterStore'
import { getRecentChapters } from '../reading/recentChaptersStore'
import { getBookSortMode, setBookSortMode } from '../utils/bookSortStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'
import RecentChaptersRow from '../components/RecentChaptersRow'

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
  // Só true quando abrindo um capítulo que a pessoa JÁ tinha escolhido ler
  // antes (ver RecentChaptersRow/openRecentChapter abaixo) — nesse caso faz
  // sentido já cair lendo, diferente de abrir um livro do zero (onOpenBook),
  // que mostra só os números dos capítulos pra escolher (ver ReadingBlockView.jsx).
  const [initialTextOpen, setInitialTextOpen] = useState(false)
  // Bloco de onde a pessoa acabou de voltar (fluxo guiado, ver closeBlock)
  // OU pro qual acabou de pular um livro (navegação livre, ver expandBook
  // abaixo) — nos dois casos, só serve pra garantir que a seção de
  // testamento certa (Antigo/Novo) já esteja aberta no mapa.
  const [lastViewedBlockId, setLastViewedBlockId] = useState(null)

  // Livro expandido INLINE na própria lista (navegação livre pela aba
  // Bíblia) — chave `${blockId}:${bookName}`, só um por vez (abrir outro
  // fecha o anterior). Substitui a navegação de tela cheia que existia
  // antes só pra esse caso (o fluxo guiado acima continua tela cheia).
  const [expandedBookKey, setExpandedBookKey] = useState(null)
  const [expandedInitialSessionId, setExpandedInitialSessionId] = useState(null)
  const [expandedInitialTextOpen, setExpandedInitialTextOpen] = useState(false)
  // Chave do livro pro qual precisa rolar a lista assim que ele expandir —
  // só usado quando o pulo vem de FORA da lista de livros visível no
  // momento ("Continuar leitura", card de "lido recentemente"); um toque
  // direto na própria linha do livro não precisa rolar pra lugar nenhum.
  const [scrollTargetKey, setScrollTargetKey] = useState(null)

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

  // Expande um livro inline na lista — usado tanto por um toque direto na
  // própria linha (openBook abaixo) quanto por um pulo vindo de fora dela
  // (jumpToBook abaixo). Guarda o bloco real (não um id sintético) pra
  // manter compatível o "onde parei"/"lidos recentemente" (lastOpenedChapterStore/
  // recentChaptersStore, gravados por ReadingBlockView.jsx usando block.id).
  function expandBook(block, bookName, sessionIdToFeature, textOpen) {
    setExpandedBookKey(`${block.id}:${bookName}`)
    setExpandedInitialSessionId(sessionIdToFeature)
    setExpandedInitialTextOpen(textOpen)
    setLastViewedBlockId(block.id)
  }

  // Pulo pra um livro vindo de FORA da lista de livros visível agora
  // ("Continuar leitura", card de "lido recentemente") — limpa a busca
  // (o livro alvo pode não bater com uma busca ativa) e marca a linha do
  // livro como alvo de rolagem (ver BookRow/scrollTargetKey).
  function jumpToBook(block, bookName, sessionIdToFeature, textOpen) {
    setSearchQuery('')
    expandBook(block, bookName, sessionIdToFeature, textOpen)
    setScrollTargetKey(`${block.id}:${bookName}`)
  }

  // Tocar um card de "lido recentemente" (RecentChaptersRow) — diferente de
  // abrir um livro do zero, aqui já cai lendo o capítulo exato, sem passar
  // pela lista de números primeiro (ver initialTextOpen acima).
  function openRecentChapter(blockId, sessionId) {
    const block = blocks.find(b => b.id === blockId)
    const targetSession = browseSessionsByBlock[blockId]?.find(s => s.id === sessionId)
    if (!block || !targetSession) return
    jumpToBook(block, targetSession.book, sessionId, true)
  }

  function closeBlock() {
    // Guarda de qual bloco a pessoa estava saindo — usado só pra decidir
    // qual seção de testamento (Antigo/Novo) volta já aberta no mapa (ver
    // lastViewedBlockId/TestamentSection abaixo). Sem isso, a seção sempre
    // voltava fechada (padrão de TestamentSection é começar fechada), e
    // quem tinha acabado de rolar fundo numa lista longa de livros perdia
    // o lugar inteiro ao voltar — parecia rolagem quebrada, mas era só a
    // lista recolhendo sozinha.
    setLastViewedBlockId(expandedBlockId)
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Toque direto numa linha de livro (mapa de testamento ou busca) — expande
  // ali mesmo, na lista (nunca navega). Tocar de novo o mesmo livro já
  // expandido fecha (acordeão); tocar outro livro troca qual está aberto.
  // Ao abrir do zero, já pula pro primeiro capítulo pendente (ou o 1o)
  // daquele livro, em destaque — sempre pela divisão "1 capítulo = 1 sessão"
  // (browseSessionsByBlock), já que isso é sempre navegação livre, nunca o
  // fluxo guiado da Rotina.
  function openBook(block, bookName) {
    const key = `${block.id}:${bookName}`
    if (expandedBookKey === key) {
      setExpandedBookKey(null)
      return
    }
    const sessions = browseSessionsByBlock[block.id]
    const bookSessions = sessions.filter(s => s.book === bookName)
    const target = bookSessions.find(s => sessionKeys(s).some(k => !completedSet.has(k))) ?? bookSessions[0]
    expandBook(block, bookName, target?.id ?? null, false)
  }

  if (expandedBlockId != null) {
    // key inclui initialSessionId, não só expandedBlockId — vários livros
    // diferentes moram no MESMO bloco (ex: Evangelhos = Matthew+Mark+Luke+
    // John), então pular de um capítulo de um livro pro de outro dentro do
    // mesmo bloco (ex: via RecentChaptersRow) também precisa remontar do
    // zero, senão o estado interno (sessão em destaque, capítulo
    // expandido, livro aberto na lista) fica preso no livro antigo — ver
    // comentário em ReadingBlockView.jsx.
    return (
      <ReadingBlockView
        key={`${expandedBlockId}-${initialSessionId}`}
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
        initialTextOpen={initialTextOpen}
        onBack={closeBlock}
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id })}
        onJumpToChapter={openRecentChapter}
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

  // Últimos capítulos abertos (cards estilo "stories", ver
  // RecentChaptersRow/recentChaptersStore.js) — mesmo espírito de
  // lastOpened acima (lido direto do localStorage a cada render, sem
  // useState, pra nunca ficar desatualizado).
  const recentChapters = getRecentChapters()

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

  // Tudo que uma linha de livro (BookRow) precisa pra saber se é ELA que
  // está expandida agora e, se for, alimentar a instância embutida de
  // ReadingBlockView — um objeto só pra não espalhar uma dúzia de props
  // soltas por TestamentSection/BookRow.
  const embedCtx = {
    session, authUser, onNavigate, browseSessionsByBlock, completedSet,
    onToggleSession, onToggleChapter, onGoToReflectionFrom,
    expandedBookKey, expandedInitialSessionId, expandedInitialTextOpen,
    scrollTargetKey, clearScrollTarget: () => setScrollTargetKey(null),
  }

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

        {/* Cards estilo "stories" dos últimos capítulos lidos — fora do
            padding do conteúdo abaixo de propósito, pra rolar de ponta a
            ponta (ver RecentChaptersRow, que já cuida da própria margem). */}
        <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={openRecentChapter} />

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
            <button style={styles.continueReadingBtn} onClick={() => jumpToBook(lastOpenedBlock, lastOpenedSession.book, lastOpenedSession.id, false)}>
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
                    embedCtx={embedCtx}
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
                defaultOpen={lastViewedBlockId != null && lastViewedBlockId <= 4}
                embedCtx={embedCtx}
              />
              <TestamentSection
                testamentKey="nt"
                label={t('journey.newTestament', undefined, lang)}
                blocks={blocks.filter(b => b.id >= 5)}
                books={sortBooks(ntBooks)}
                bookChapterCounts={bookChapterCounts}
                completedSet={completedSet}
                onOpenBook={openBook}
                defaultOpen={lastViewedBlockId != null && lastViewedBlockId >= 5}
                embedCtx={embedCtx}
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Seção expansível de testamento (Antigo/Novo) — começa fechada por
   padrão (o usuário decide quando quer ver a lista de livros, em vez do
   app abrir um dos dois sozinho), EXCETO quando `defaultOpen` vem true —
   usado ao voltar de um livro desse testamento no fluxo guiado, OU ao
   pular pra um livro dele vindo de fora da lista, ex: "Continuar leitura"
   (ver lastViewedBlockId em JourneyScreen.jsx), pra não perder o lugar
   numa lista longa só por ter tocado um livro e voltado/pulado. Sem
   agrupamento por bloco temático — só Antigo/Novo Testamento, cada um com
   a lista (achatada) dos seus livros, na ordem escolhida em `books`
   (bíblica ou A-Z, decidido por quem chama). ── */
function TestamentSection({ testamentKey, label, blocks, books, bookChapterCounts, completedSet, onOpenBook, defaultOpen, embedCtx, style }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  // Reabre sozinha quando `defaultOpen` vira true DEPOIS da 1a montagem —
  // diferente do valor inicial acima (que só conta na 1a vez), isso cobre
  // pular pra um livro deste testamento com a tela já montada (ela nunca
  // desmonta mais pra navegação livre, só o fluxo guiado ainda troca de
  // tela). Só ABRE sozinha, nunca fecha — tocar um livro nunca deveria
  // recolher a seção sem a pessoa pedir.
  useEffect(() => {
    if (defaultOpen) setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen])

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
              embedCtx={embedCtx}
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
// lugar pra manter esse visual consistente). Quando é O livro expandido no
// momento (embedCtx.expandedBookKey bate com este), cresce logo abaixo de
// si mesma com a lista de capítulos daquele livro — mesmo componente
// ReadingBlockView.jsx de sempre, só que embutido (prop `embedded`) em vez
// de navegar pra uma tela cheia à parte.
function BookRow({ entry, bookChapterCounts, completedSet, onOpen, embedCtx }) {
  const { displayName, canonicalName, block } = entry
  const total = bookChapterCounts[canonicalName] ?? 0
  let done = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${canonicalName}:${ch}`)) done++
  const isDone = total > 0 && done === total

  const rowKey = `${block.id}:${canonicalName}`
  const isExpanded = embedCtx?.expandedBookKey === rowKey
  const isScrollTarget = embedCtx?.scrollTargetKey === rowKey

  const rowRef = useRef(null)
  useEffect(() => {
    if (isScrollTarget && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      embedCtx.clearScrollTarget()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrollTarget])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button ref={rowRef} style={{ ...styles.bookRow, ...(isExpanded ? styles.bookRowActive : {}) }} onClick={onOpen}>
        <span style={styles.bookRowName}>{displayName}</span>
        {isDone
          ? <span style={styles.bookRowDone}><AppIcon name="Check" size={13} color="white" /></span>
          : <span style={styles.bookRowMeta}>{done}/{total}</span>}
        <AppIcon name="ChevronRight" size={15} color="var(--g4)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {isExpanded && (
        <div style={styles.bookExpandWrap}>
          <ReadingBlockView
            key={`${rowKey}:${embedCtx.expandedInitialSessionId}:${embedCtx.expandedInitialTextOpen}`}
            embedded
            mode="browse"
            session={embedCtx.session}
            authUser={embedCtx.authUser}
            onNavigate={embedCtx.onNavigate}
            blockId={block.id}
            blocks={[block]}
            sessionsByBlock={{ [block.id]: embedCtx.browseSessionsByBlock[block.id].filter(s => s.book === canonicalName) }}
            completedSet={completedSet}
            onToggleSession={embedCtx.onToggleSession}
            onToggleChapter={embedCtx.onToggleChapter}
            initialSessionId={embedCtx.expandedInitialSessionId}
            initialTextOpen={embedCtx.expandedInitialTextOpen}
            onGoToReflection={heroSession => embedCtx.onGoToReflectionFrom?.({ tab: 'journey', blockId: block.id, sessionId: heroSession.id })}
          />
        </div>
      )}
    </div>
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
  bookRowActive:   { border: '1.5px solid var(--or)' },
  bookRowName:     { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  bookRowMeta:     { fontSize: 10.5, fontWeight: 600, color: 'var(--g4)', flexShrink: 0 },
  bookRowDone:     { width: 18, height: 18, borderRadius: '50%', background: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bookExpandWrap:  { background: 'var(--white)', border: '0.5px solid var(--g2)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
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
