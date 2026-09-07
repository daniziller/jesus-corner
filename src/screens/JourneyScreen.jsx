// JourneyScreen.jsx — "Bíblia" (reskin Bento — tela 5f, leitura livre)
import { useState, useEffect } from 'react'
import { sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { computeMetricsBlocks, computeTestamentTotals } from '../data/metricsBlocks'
import { formatRelativeTime } from '../utils/time'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'
import BookChapterScreen from './BookChapterScreen'

// "Você está em Gênesis 41" (progresso real) ou "Mateus é um bom começo"
// (zero progresso ainda) — quadro 28a. blocksSubset = os 4 blocos de um
// testamento (blocks 1–4 = AT, 5–8 = NT), na ordem canônica.
function testamentStatusLine(blocksSubset, completedSet, bookChapterCounts, lang) {
  const hasAnyProgress = blocksSubset.some(block => block.books.some(book => {
    const total = bookChapterCounts[book] ?? 0
    for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${book}:${ch}`)) return true
    return false
  }))
  if (!hasAnyProgress) {
    const firstBlock = blocksSubset[0]
    return { started: false, book: lang === 'en' ? firstBlock.booksEn[0] : firstBlock.books[0] }
  }
  for (const block of blocksSubset) {
    for (let i = 0; i < block.books.length; i++) {
      const book = block.books[i]
      const total = bookChapterCounts[book] ?? 0
      for (let ch = 1; ch <= total; ch++) {
        if (!completedSet.has(`${book}:${ch}`)) {
          return { started: true, book: lang === 'en' ? block.booksEn[i] : book, chapter: ch }
        }
      }
    }
  }
  // Testamento inteiro já lido — mostra onde ele termina.
  const lastBlock = blocksSubset[blocksSubset.length - 1]
  const lastIdx = lastBlock.books.length - 1
  const lastBook = lastBlock.books[lastIdx]
  return {
    started: true,
    book: lang === 'en' ? lastBlock.booksEn[lastIdx] : lastBook,
    chapter: bookChapterCounts[lastBook] ?? 0,
  }
}

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
  onToggleSession, onToggleChapter, onMarkChaptersManually, initialBlockId, entryMode, resumeSessionId, browseJumpTarget, onBrowseJumpConsumed, onNavigate, onContinueSession, onGoToReflectionFrom, onExitGuided, onExitReading, onOpenGroupRoom,
}) {
  const { lang } = session
  const [searchQuery, setSearchQuery] = useState('')

  // Qual testamento está visível agora — reskin Bento: em vez de duas
  // seções em acordeão (Antigo e Novo, cada uma abrindo/fechando por si),
  // vira um cartão só com um link pra trocar de lado (ver mockup 5f,
  // "Novo →"). Volta pro testamento certo sozinho ao voltar de um livro
  // (ver lastViewedBlockId) ou pular pra um vindo de fora da lista.
  const [testament, setTestament] = useState('at')
  // Bloco 5 do redesign (28a/28b): a aba abre nos DOIS testamentos, do
  // mesmo tamanho — não mais um cartão só com link "Novo →". Tocar
  // "Abrir" num deles entra na lista de livros (28b, testamentEntered);
  // "‹" na lista volta pros dois cartões. Buscar pula os dois estágios
  // (mesmo comportamento de sempre — ver gridBooks abaixo).
  const [testamentEntered, setTestamentEntered] = useState(false)
  // Chips de grupo dentro da lista de livros (28b: "Todos os 39 /
  // Pentateuco / Históricos / Poéticos / Proféticos") — reseta ao trocar
  // de testamento ou entrar de novo.
  const [blockFilter, setBlockFilter] = useState('all')
  function enterTestament(which) {
    setTestament(which)
    setBlockFilter('all')
    setTestamentEntered(true)
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
  // abaixo) — nos dois casos, só serve pra garantir que o testamento certo
  // (Antigo/Novo) já esteja selecionado no cartão de mapa.
  const [lastViewedBlockId, setLastViewedBlockId] = useState(null)

  // Segue lastViewedBlockId sozinho — nunca precisa de toque manual depois
  // de voltar de um livro ou pular pra um vindo de fora da lista (blocks
  // 1–4 = Antigo, 5–8 = Novo).
  useEffect(() => {
    if (lastViewedBlockId != null) setTestament(lastViewedBlockId <= 4 ? 'at' : 'nt')
  }, [lastViewedBlockId])

  // Livro aberto (quadro 18a: Página do livro) — chave `${blockId}:${bookName}`,
  // navega pra uma tela própria (BookChapterScreen) em vez de expandir
  // inline na lista, como antes do reskin Bento.
  const [expandedBookKey, setExpandedBookKey] = useState(null)
  const [expandedInitialSessionId, setExpandedInitialSessionId] = useState(null)
  const [expandedInitialTextOpen, setExpandedInitialTextOpen] = useState(false)

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
  // (a tela do livro, 18a, não depende da lista continuar visível).
  function jumpToBook(block, bookName, sessionIdToFeature, textOpen) {
    setSearchQuery('')
    expandBook(block, bookName, sessionIdToFeature, textOpen)
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

  // Link "ir pro texto" de uma anotação de sermão (ver App.jsx/
  // openBiblePassage) — objeto novo a cada pedido, então todo pedido roda
  // este efeito de novo mesmo pra pular pro MESMO capítulo de antes. Avisa
  // App.jsx que já consumiu (onBrowseJumpConsumed limpa o state lá) — sem
  // isso, o pedido ficava "pendente" pra sempre e essa tela pulava pro
  // mesmo capítulo de novo em TODA montagem futura (qualquer visita à aba
  // Bíblia depois de usar o link uma vez, não só via botão Voltar).
  useEffect(() => {
    if (browseJumpTarget) {
      openRecentChapter(browseJumpTarget.blockId, browseJumpTarget.sessionId)
      onBrowseJumpConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseJumpTarget])

  function closeBlock() {
    // Leitura imersiva (redesign 1b): a seta ← do cabeçalho não volta pro
    // mapa de blocos (a barra de navegação está escondida — a pessoa
    // ficaria presa) — sai da leitura de volta pra onde veio (Home/Oração).
    if (entryMode === 'reading' && onExitReading) {
      onExitReading()
      return
    }
    // Guarda de qual bloco a pessoa estava saindo — usado só pra decidir
    // qual testamento (Antigo/Novo) volta selecionado no cartão de mapa.
    // Sem isso, o cartão sempre voltava no Antigo Testamento, e quem
    // tinha acabado de ler algo do Novo perdia o lugar.
    setLastViewedBlockId(expandedBlockId)
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Volta da página do livro (18a, BookChapterScreen) pro mapa/grade —
  // mesma guarda de testamento que closeBlock acima.
  function closeBook() {
    setLastViewedBlockId(expandedBookKey ? Number(expandedBookKey.split(':')[0]) : lastViewedBlockId)
    setExpandedBookKey(null)
    setExpandedInitialSessionId(null)
  }

  // Toque direto numa sigla de livro (grade de 5f ou busca) — navega pra
  // 18a (BookChapterScreen), já com o 1º capítulo pendente (ou o 1º do
  // livro) em destaque — sempre pela divisão "1 capítulo = 1 sessão"
  // (browseSessionsByBlock), já que isso é sempre navegação livre, nunca o
  // fluxo guiado da Rotina.
  function openBook(block, bookName) {
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
        onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, type: heroSession.type })}
        onJumpToChapter={openRecentChapter}
        onExitGuided={onExitGuided}
        onOpenGroupRoom={onOpenGroupRoom}
      />
    )
  }

  if (expandedBookKey != null) {
    const [blockIdStr, bookName] = expandedBookKey.split(':')
    const block = blocks.find(b => b.id === Number(blockIdStr))
    const bookIdx = block?.books.indexOf(bookName) ?? -1
    const displayName = bookIdx >= 0 ? (lang === 'en' ? block.booksEn[bookIdx] : bookName) : bookName
    return (
      // key inclui expandedInitialSessionId — pular pra um capítulo
      // DIFERENTE do MESMO livro (ex: via RecentChaptersRow) precisa
      // remontar do zero, senão o painel de leitura embutido continuaria
      // preso no capítulo antigo (mesmo raciocínio do ReadingBlockView
      // acima).
      <BookChapterScreen
        key={`${expandedBookKey}:${expandedInitialSessionId}`}
        session={session}
        authUser={authUser}
        block={block}
        bookName={bookName}
        displayName={displayName}
        sessionsByBlock={sessionsByBlock}
        browseSessionsByBlock={browseSessionsByBlock}
        completedSet={completedSet}
        onToggleSession={onToggleSession}
        onToggleChapter={onToggleChapter}
        onMarkChaptersManually={onMarkChaptersManually}
        onGoToReflectionFrom={onGoToReflectionFrom}
        onNavigate={onNavigate}
        onBack={closeBook}
        initialSessionId={expandedInitialSessionId}
        initialTextOpen={expandedInitialTextOpen}
      />
    )
  }

  // "Último texto lido" (pedido direto, 2026-09-07) — lastReadPositionStore.js
  // (session.lastReadPosition) grava em QUALQUER modo de leitura, guiado
  // (Rotina) OU livre. É o "onde parei de verdade", mesmo que seja outro
  // livro/bloco que não o da sessão de hoje do plano — por isso resolve o
  // bloco a partir do LIVRO salvo (b.books.includes), não de um blockId
  // gravado. Existia um card irmão aqui, "Última leitura livre"
  // (lastOpenedChapterStore.js), que só cobria navegação livre — removido
  // em 2026-09-07 por ficar redundante depois deste (batiam quase sempre
  // no mesmo capítulo; a diferença nunca compensou ter os dois).
  const lastReadPos = session.lastReadPosition
  const lastReadBlock = lastReadPos ? blocks.find(b => b.books.includes(lastReadPos.book)) : null
  const lastReadSession = lastReadBlock
    ? (browseSessionsByBlock[lastReadBlock.id] ?? []).find(s => s.book === lastReadPos.book && s.chStart <= lastReadPos.chapter && s.chEnd >= lastReadPos.chapter)
    : null

  // Busca (quadro 5f: "Livro, capítulo ou versículo") — o texto filtra os
  // livros pelo nome; um número no fim ("Gênesis 41", "Sl 23") é o capítulo:
  // com um livro só batendo, Enter abre direto nesse capítulo.
  const trimmedQuery = searchQuery.trim()
  const queryMatch = trimmedQuery.match(/^(.*?)\s*(\d+)?(?::\d+(?:-\d+)?)?$/)
  const queryName = (queryMatch?.[1] ?? trimmedQuery).trim()
  const queryChapter = queryMatch?.[2] ? Number(queryMatch[2]) : null
  const allBooks = flattenBooks(blocks, lang)
  const searchResults = trimmedQuery
    ? allBooks.filter(entry => {
        const n = normalizeSearch(entry.displayName)
        const abbr = normalizeSearch(abbreviationFor(entry))
        const q = normalizeSearch(queryName || trimmedQuery)
        return q ? (n.includes(q) || abbr === q) : true
      })
    : null

  function openSearchTarget() {
    if (!searchResults || searchResults.length !== 1) return
    const entry = searchResults[0]
    if (queryChapter) {
      const target = browseSessionsByBlock[entry.block.id]?.find(s => s.book === entry.canonicalName && s.chStart <= queryChapter && queryChapter <= s.chEnd)
      if (target) { jumpToBook(entry.block, entry.canonicalName, target.id, true); return }
    }
    openBook(entry.block, entry.canonicalName)
  }

  const atBooks = flattenBooks(blocks.filter(b => b.id <= 4), lang)
  const ntBooks = flattenBooks(blocks.filter(b => b.id >= 5), lang)
  const testamentBooks = testament === 'at' ? atBooks : ntBooks
  // Sigla do livro (grade do quadro 5f) — vem da própria referência da 1ª
  // sessão do livro ("Gn 1:1–2:25" → "Gn"), no idioma da tela.
  function abbreviationFor(entry) {
    const sessions = browseSessionsByBlock?.[entry.block.id] ?? sessionsByBlock?.[entry.block.id] ?? []
    const first = sessions.find(s => s.book === entry.canonicalName && s.type !== 'reflection')
    const ref = first ? (lang === 'en' ? first.passageEn : first.passage) : ''
    const abbr = ref.split(' ')[0]
    return abbr && /[A-Za-zÀ-ÿ]/.test(abbr) ? abbr : entry.displayName.slice(0, 3)
  }
  // Progresso por livro (quadro 5f): barra fina — laranja em curso, preta
  // concluído — e o total de capítulos ao lado (não quantos já leu; o
  // total é o dado estável, a barra já mostra o quanto).
  const bookChapterCounts = computeBookChapterCounts(sessionsByBlock ?? {})
  function progressFor(entry) {
    const total = bookChapterCounts[entry.canonicalName] ?? 0
    if (!total) return { done: 0, total: 0, pct: 0 }
    let done = 0
    for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${entry.canonicalName}:${ch}`)) done++
    return { done, total, pct: Math.round((done / total) * 100) }
  }

  // Grupos (Pentateuco/Históricos/Poéticos/Proféticos ou Evangelhos/Atos/
  // Cartas/Apocalipse) dentro do testamento aberto — viram chips em 28b.
  const groupBlocks = testament === 'at' ? blocks.filter(b => b.id <= 4) : blocks.filter(b => b.id >= 5)
  const filteredBooks = blockFilter === 'all' ? testamentBooks : testamentBooks.filter(e => e.block.id === blockFilter)
  const gridBooks = searchResults ?? filteredBooks
  const showTestamentCards = !testamentEntered && !trimmedQuery

  // Os dois cartões de testamento (28a) — mesmo peso, cada um com anel de
  // %, quantos capítulos e uma linha de status real (onde você está, ou
  // sugestão de começo se ainda não leu nada ali). Reaproveita
  // metricsBlocks.js (Bloco 2) em vez de recalcular a mesma soma.
  const metricsBlocks = computeMetricsBlocks(completedSet)
  const { ot: otTotals, nt: ntTotals } = computeTestamentTotals(metricsBlocks)
  const atBlocksList = blocks.filter(b => b.id <= 4)
  const ntBlocksList = blocks.filter(b => b.id >= 5)
  const otStatus = testamentStatusLine(atBlocksList, completedSet, bookChapterCounts, lang)
  const ntStatus = testamentStatusLine(ntBlocksList, completedSet, bookChapterCounts, lang)
  // Qual testamento é "onde a pessoa está agora" (cartão escuro, 28a) —
  // o mesmo livro de session.currentBlock, comparado no idioma certo.
  const currentBookName = session.currentBlock?.book
  const activeTestament = currentBookName && atBlocksList.some(b => (lang === 'en' ? b.booksEn : b.books).includes(currentBookName))
    ? 'at' : 'nt'

  return (
    <div style={styles.screen}>
      <div style={styles.body}>
        <p style={styles.title}>{t('nav.journey', undefined, lang)}</p>
        <p style={styles.subtitle}>{t('journey.freeReadingSubtitle', undefined, lang)}</p>
        <div style={styles.searchWrap}>
          <AppIcon name="Search" size={17} strokeWidth={2} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') openSearchTarget() }}
            placeholder={t('journey.searchPlaceholder', undefined, lang)}
            style={styles.searchInput}
          />
          {trimmedQuery && (
            <button style={styles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="clear">
              <AppIcon name="X" size={13} color="var(--bento-t4)" />
            </button>
          )}
        </div>
      </div>

      <div style={styles.body2}>
        {showTestamentCards ? (
          <>
            {/* Bíblia (28a) — os dois testamentos, do mesmo tamanho; o
                escuro é só onde a pessoa está agora (currentBlock), não um
                "principal" fixo. */}
            {[
              { key: 'at', totals: otTotals, status: otStatus, dark: activeTestament === 'at' },
              { key: 'nt', totals: ntTotals, status: ntStatus, dark: activeTestament === 'nt' },
            ].map(({ key, totals, status, dark }) => {
              const blocksList = key === 'at' ? atBlocksList : ntBlocksList
              const bookCount = blocksList.reduce((s, b) => s + b.books.length, 0)
              return (
                <div key={key} style={{ ...styles.testamentTile, background: dark ? 'var(--bento-ink)' : 'var(--bento-card)' }}>
                  <div style={styles.testamentTileTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...styles.testamentTileEyebrow, color: dark ? 'rgba(255,255,255,.42)' : 'var(--bento-t4)' }}>
                        {t('journey.booksCount', { n: bookCount }, lang)}
                      </p>
                      <p style={{ ...styles.testamentTileName, color: dark ? '#fff' : 'var(--bento-ink)' }}>
                        {t(key === 'at' ? 'journey.oldTestament' : 'journey.newTestament', undefined, lang)}
                      </p>
                      <p style={{ ...styles.testamentTileSub, color: dark ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>
                        {t('journey.chaptersOfTotal', { done: totals.chaptersRead, total: totals.chaptersTotal }, lang)}
                      </p>
                    </div>
                    <div style={styles.testamentRing}>
                      {/* Anel de progresso em SVG — não conic-gradient, ver
                          o mesmo ajuste em BookChapterScreen.jsx (Bloco 1). */}
                      <svg width="62" height="62" viewBox="0 0 62 62" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                        <circle cx="31" cy="31" r="28" fill="none" stroke={dark ? 'rgba(255,255,255,.1)' : 'var(--bento-line)'} strokeWidth="6" />
                        <circle cx="31" cy="31" r="28" fill="none" stroke="var(--bento-accent)" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(totals.percent / 100) * 175.93} 175.93`} />
                      </svg>
                      <div style={{ ...styles.testamentRingInner, background: dark ? 'var(--bento-ink)' : '#fff' }}>
                        <span style={{ ...styles.testamentRingPct, color: dark ? '#fff' : 'var(--bento-t3)' }}>{totals.percent}%</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.testamentTileFoot}>
                    <span style={{ ...styles.testamentStatusText, color: dark ? 'rgba(255,255,255,.45)' : 'var(--bento-t3)' }}>
                      {status.started
                        ? t('journey.youAreAt', { book: status.book, n: status.chapter }, lang)
                        : t('journey.goodStart', { book: status.book }, lang)}
                    </span>
                    <button
                      style={{ ...styles.testamentOpenBtn, background: dark ? 'var(--bento-accent)' : 'var(--bento-ink)', color: dark ? 'var(--bento-ink)' : '#fff' }}
                      onClick={() => enterTestament(key)}
                    >
                      {t('journey.openBtn', undefined, lang)}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {/* Livros do testamento (28b) — cabeçalho com voltar (não mais
                o link "trocar" de 5f) + chips de grupo, filtrando a lista
                sem esconder o "Todos". */}
            <div style={styles.bookListHeader}>
              {!searchResults && (
                <button style={styles.backChip} onClick={() => setTestamentEntered(false)} aria-label={t('a11y.goBack', undefined, lang)}>
                  <AppIcon name="ChevronLeft" size={15} strokeWidth={2.4} color="var(--bento-ink)" />
                </button>
              )}
              <span style={styles.testamentLabel}>
                {searchResults
                  ? t('journey.searchResultsLabel', undefined, lang)
                  : t(testament === 'at' ? 'journey.oldTestament' : 'journey.newTestament', undefined, lang)}
              </span>
            </div>

            {!searchResults && (
              <div style={styles.chipsRow}>
                <button style={{ ...styles.filterChip, ...(blockFilter === 'all' ? styles.filterChipOn : {}) }} onClick={() => setBlockFilter('all')}>
                  {t('journey.allBooksChip', { n: groupBlocks.reduce((s, b) => s + b.books.length, 0) }, lang)}
                </button>
                {groupBlocks.map(b => (
                  <button
                    key={b.id}
                    style={{ ...styles.filterChip, ...(blockFilter === b.id ? styles.filterChipOn : {}) }}
                    onClick={() => setBlockFilter(b.id)}
                  >
                    {lang === 'en' ? b.shortNameEn ?? b.nameEn : b.shortName ?? b.name}
                  </button>
                ))}
              </div>
            )}

            <div style={styles.testamentCard}>
              {gridBooks.length === 0 ? (
                <p style={styles.searchEmptyHint}>{t('journey.searchNoResults', { query: trimmedQuery }, lang)}</p>
              ) : (
                <div>
                  {gridBooks.map((entry, i) => {
                    const key = `${entry.block.id}:${entry.canonicalName}`
                    const showSectionHeader = !!searchResults && (i === 0 || entry.block.id !== gridBooks[i - 1].block.id)
                    const { done, total, pct } = progressFor(entry)
                    const isLast = i === gridBooks.length - 1
                    return (
                      <div key={key}>
                        {showSectionHeader && (
                          <p style={{ ...styles.sectionLabel, marginTop: i === 0 ? 0 : 14 }}>
                            {lang === 'en' ? entry.block.nameEn : entry.block.name}
                          </p>
                        )}
                        <button
                          style={{ ...styles.bookRow, borderBottom: isLast ? 'none' : '1px solid var(--bento-line)' }}
                          onClick={() => openBook(entry.block, entry.canonicalName)}
                        >
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={styles.bookRowName}>{entry.displayName}</span>
                            <span style={styles.bookRowChapters}>{t('journey.chaptersOfTotal', { done, total }, lang)}</span>
                          </span>
                          <span style={styles.bookRowStat}>
                            <span style={styles.bookRowBarTrack}>
                              <span style={{ ...styles.bookRowBarFill, width: `${pct}%`, background: pct >= 100 ? 'var(--bento-ink)' : 'var(--bento-accent)' }} />
                            </span>
                            <span style={{ ...styles.bookRowPct, color: pct > 0 ? 'var(--bento-accent)' : 'var(--bento-t4)' }}>{pct}%</span>
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Último texto lido (pedido direto, 2026-09-07) — qualquer modo
            (guiado ou livre), pode ser um livro/capítulo diferente da
            sessão de hoje do plano; é por isso que existe separado do
            card de baixo, que só cobre navegação livre. */}
        {showTestamentCards && lastReadSession && (
          <button style={styles.lastReadCard} onClick={() => jumpToBook(lastReadBlock, lastReadPos.book, lastReadSession.id, true)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.lastReadLabel}>{t('journey.lastReadTextLabel', undefined, lang)}</span>
              <span style={styles.lastReadTitle}>
                {(lang === 'en' && lastReadSession.bookEn ? lastReadSession.bookEn : lastReadPos.book)} {lastReadPos.chapter}
              </span>
              {lastReadPos.readAt && <span style={styles.lastReadTime}>{formatRelativeTime(lastReadPos.readAt, lang)}</span>}
            </span>
            <span style={styles.lastReadOpenBtn}>{t('journey.openBtn', undefined, lang)}</span>
          </button>
        )}


        {/* Atalho de volta pra sessão estruturada do dia — as "duas portas
            para o mesmo texto" do quadro 5f. */}
        {showTestamentCards && onContinueSession && (
          <button style={styles.todaySessionCard} onClick={onContinueSession}>
            <span style={styles.todaySessionIcon}>
              <AppIcon name="BookOpen" size={16} strokeWidth={1.9} color="var(--bento-accent)" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.todaySessionTitle}>{t('journey.todaySessionCta', undefined, lang)}</span>
              <span style={styles.todaySessionSub}>{session.todaySession.title} · {t('journey.countsInPlan', undefined, lang)}</span>
            </span>
            <span style={styles.todaySessionChevron}>›</span>
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  // Medidas do quadro 5f.
  screen: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingBottom: 'calc(var(--nav-height) + 18px)', background: 'var(--bento-bg)' },
  body:   { flex: 'none', padding: '22px 20px 0' },
  body2:  { padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 },
  title:      { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  subtitle:   { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, color: 'var(--bento-t3)', margin: '0 0 14px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, height: 46, background: 'var(--bento-card)', borderRadius: 16, padding: '0 16px' },
  searchInput:{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', padding: 0, fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 500, lineHeight: 1, color: 'var(--bento-ink)' },
  searchClearBtn: { border: 'none', background: 'var(--bento-line)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  searchEmptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', padding: '14px 2px', textAlign: 'center', margin: 0 },

  lastReadCard:     { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-sand)', border: 'none', borderRadius: 24, padding: 20, cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  lastReadLabel:    { display: 'block', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', marginBottom: 8 },
  lastReadTitle:    { display: 'block', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: 'var(--bento-sand-ink-strong)', marginBottom: 3 },
  lastReadTime:     { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-sand-label)' },
  lastReadOpenBtn:  { flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 16, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 800, lineHeight: 1, color: 'var(--bento-sand)' },

  // Os dois cartões de testamento (28a) — mesmo tamanho, o escuro é só
  // onde a pessoa está agora.
  testamentTile: { borderRadius: 26, padding: 22, display: 'flex', flexDirection: 'column' },
  testamentTileTop: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  testamentTileEyebrow: { fontFamily: 'var(--font-bento)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 8px' },
  testamentTileName: { fontFamily: 'var(--font-bento)', fontSize: 25, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1px', margin: '0 0 6px' },
  testamentTileSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.3, margin: 0 },
  testamentRing: { position: 'relative', flexShrink: 0, width: 62, height: 62, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  testamentRingInner: { position: 'relative', width: 50, height: 50, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  testamentRingPct: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800 },
  testamentTileFoot: { display: 'flex', alignItems: 'center', gap: 10 },
  testamentStatusText: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 },
  testamentOpenBtn: { flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 13, border: 'none', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' },

  // Lista de livros de um testamento (28b) — cabeçalho com voltar + chips
  // de grupo, no lugar do link "trocar" de 5f.
  bookListHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  backChip: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  chipsRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterChip: { border: 'none', background: 'var(--bento-card)', borderRadius: 99, padding: '9px 12px', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterChipOn: { background: 'var(--bento-ink)', color: '#fff', fontWeight: 800 },

  testamentCard:   { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  testamentHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' },
  testamentLabel:  { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  testamentSwitchBtn: { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t3)', padding: 0 },
  // Cabeçalho de seção (Pentateuco, Históricos…) e linha de livro (28b):
  // nome + "N de M capítulos" à esquerda, barra fina + % à direita.
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 2px' },
  bookRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 62, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' },
  bookRowName: { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 4 },
  bookRowChapters: { display: 'block', fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'var(--bento-t3)' },
  bookRowStat: { flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 },
  bookRowBarTrack: { width: 62, height: 5, borderRadius: 99, background: 'var(--bento-line)', flexShrink: 0, overflow: 'hidden' },
  bookRowBarFill: { display: 'block', height: 5, borderRadius: 99 },
  bookRowPct: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1 },
  bookRowCount: { width: 34, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t4)' },

  todaySessionCard:  { width: '100%', borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  todaySessionIcon:  { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todaySessionTitle: { display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', marginBottom: 3 },
  todaySessionSub:   { display: 'block', fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
  todaySessionChevron:{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--bento-t5)' },
}
