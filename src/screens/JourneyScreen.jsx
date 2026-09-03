// JourneyScreen.jsx — "Bíblia" (reskin Bento — tela 5f, leitura livre)
import { useState, useEffect, useRef } from 'react'
import { sessionKeys, computeBookChapterCounts } from '../utils/progress'
import { getLastOpenedChapter } from '../reading/lastOpenedChapterStore'
import { getRecentChapters } from '../reading/recentChaptersStore'
import { getBookSortMode, setBookSortMode } from '../utils/bookSortStore'
import { formatRelativeTime } from '../utils/time'
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
  onToggleSession, onToggleChapter, initialBlockId, entryMode, resumeSessionId, browseJumpTarget, onBrowseJumpConsumed, onNavigate, onContinueSession, onGoToReflectionFrom, onExitGuided, onExitReading,
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

  // Qual testamento está visível agora — reskin Bento: em vez de duas
  // seções em acordeão (Antigo e Novo, cada uma abrindo/fechando por si),
  // vira um cartão só com um link pra trocar de lado (ver mockup 5f,
  // "Novo →"). Volta pro testamento certo sozinho ao voltar de um livro
  // (ver lastViewedBlockId) ou pular pra um vindo de fora da lista.
  const [testament, setTestament] = useState('at')

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

  // Toque direto numa linha de livro (cartão de testamento ou busca) —
  // expande ali mesmo, na lista (nunca navega). Tocar de novo o mesmo
  // livro já expandido fecha (acordeão); tocar outro livro troca qual está
  // aberto. Ao abrir do zero, já pula pro primeiro capítulo pendente (ou o
  // 1o) daquele livro, em destaque — sempre pela divisão "1 capítulo = 1
  // sessão" (browseSessionsByBlock), já que isso é sempre navegação livre,
  // nunca o fluxo guiado da Rotina.
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
        onExitGuided={onExitGuided}
      />
    )
  }

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
  // linha de livro, tanto na busca quanto no cartão de testamento.
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
  const testamentBlocks = blocks.filter(b => testament === 'at' ? b.id <= 4 : b.id >= 5)
  const testamentBooks = sortBooks(testament === 'at' ? atBooks : ntBooks)
  const testamentDone = testamentBlocks.reduce((s, b) => s + b.sessionsDone, 0)
  const testamentTotal = testamentBlocks.reduce((s, b) => s + b.sessionsTotal, 0)
  const testamentPercent = testamentTotal ? Math.round((testamentDone / testamentTotal) * 100) : 0

  // Tudo que uma linha de livro (BookRow) precisa pra saber se é ELA que
  // está expandida agora e, se for, alimentar a instância embutida de
  // ReadingBlockView — um objeto só pra não espalhar uma dúzia de props
  // soltas.
  const embedCtx = {
    session, authUser, onNavigate, browseSessionsByBlock, completedSet,
    onToggleSession, onToggleChapter, onGoToReflectionFrom,
    expandedBookKey, expandedInitialSessionId, expandedInitialTextOpen,
    scrollTargetKey, clearScrollTarget: () => setScrollTargetKey(null),
  }

  return (
    <div style={styles.screen}>
      <div style={styles.body}>
        {/* Cabeçalho enxuto — a visão geral de progresso (hero com
            versículo, % geral, orbes) saiu daqui: já mora no cartão
            "Bíblia" da Início (3c) e na Caminhada (5b). Aqui fica só a
            Bíblia em si, pra ler à vontade. */}
        <p style={styles.title}>{t('nav.journey', undefined, lang)}</p>
        <p style={styles.subtitle}>{t('journey.freeReadingSubtitle', undefined, lang)}</p>
        <div style={styles.searchWrap}>
          <AppIcon name="Search" size={15} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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

      {/* Cards estilo "stories" dos últimos capítulos lidos — fora do
          padding do conteúdo abaixo de propósito, pra rolar de ponta a
          ponta (ver RecentChaptersRow, que já cuida da própria margem).
          Fixo (sticky) ao rolar. */}
      <RecentChaptersRow chapters={recentChapters} lang={lang} onOpen={openRecentChapter} sticky bento />

      <div style={styles.body2}>
        {/* Notas + marcações — atalho pra Biblioteca, perto de onde as
            anotações e grifos de leitura são criados. */}
        <button style={styles.notesEntryBtn} onClick={() => onNavigate?.('notes')}>
          <span style={styles.notesEntryIcon}><AppIcon name="StickyNote" size={14} color="var(--bento-accent)" /></span>
          <span style={{ flex: 1, textAlign: 'left' }}>{t('nav.notes', undefined, lang)}</span>
          <AppIcon name="ChevronRight" size={15} color="var(--bento-t5)" />
        </button>

        {/* Última leitura livre — igual ao mockup 5f, com tempo relativo
            real (reusa formatRelativeTime, já usado na Biblioteca). Some
            com busca ativa (que já tem sua própria lista) ou se nunca
            abriu nada por aqui ainda. */}
        {!trimmedQuery && lastOpenedSession && (
          <button style={styles.lastReadCard} onClick={() => jumpToBook(lastOpenedBlock, lastOpenedSession.book, lastOpenedSession.id, false)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.lastReadLabel}>{t('journey.lastFreeReadingLabel', undefined, lang)}</span>
              <span style={styles.lastReadTitle}>
                {(lang === 'en' ? lastOpenedSession.bookEn : lastOpenedSession.book)} {lastOpenedSession.chStart}
              </span>
              {lastOpened?.at && <span style={styles.lastReadTime}>{formatRelativeTime(lastOpened.at, lang)}</span>}
            </span>
            <span style={styles.lastReadOpenBtn}>{t('journey.openBtn', undefined, lang)}</span>
          </button>
        )}

        {searchResults ? (
          searchResults.length === 0 ? (
            <p style={styles.searchEmptyHint}>{t('journey.searchNoResults', { query: trimmedQuery }, lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

            {/* Testamento — um cartão só, com um link pra trocar de lado
                (mockup 5f mostra uma grade de siglas; aqui a linha por
                livro ficou, porque é ela que carrega o progresso real
                de cada um — capítulos lidos/total, ou o check de livro
                concluído — informação que uma grade de 2 letras não
                cabe). */}
            <div style={styles.testamentCard}>
              <div style={styles.testamentHeader}>
                <span style={styles.testamentLabel}>
                  {t(testament === 'at' ? 'journey.oldTestament' : 'journey.newTestament', undefined, lang)}
                </span>
                <button
                  style={styles.testamentSwitchBtn}
                  onClick={() => setTestament(v => (v === 'at' ? 'nt' : 'at'))}
                >
                  {t(testament === 'at' ? 'journey.newTestamentShort' : 'journey.oldTestamentShort', undefined, lang)}
                </button>
              </div>
              <p style={styles.testamentPercent}>{testamentPercent}%</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {testamentBooks.map(entry => (
                  <BookRow
                    key={`${testament}-${entry.canonicalName}`}
                    entry={entry}
                    bookChapterCounts={bookChapterCounts}
                    completedSet={completedSet}
                    onOpen={() => openBook(entry.block, entry.canonicalName)}
                    embedCtx={embedCtx}
                  />
                ))}
              </div>
            </div>

            {/* Atalho de volta pra sessão estruturada do dia — as "duas
                portas para o mesmo texto" do mockup 5f: aqui a leitura é
                livre e não conta no plano; isto cruza pra lá. */}
            {onContinueSession && (
              <button style={styles.todaySessionCard} onClick={onContinueSession}>
                <span style={styles.todaySessionIcon}>
                  <AppIcon name="BookOpen" size={16} color="var(--bento-accent)" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.todaySessionTitle}>{t('journey.todaySessionCta', undefined, lang)}</span>
                  <span style={styles.todaySessionSub}>{session.todaySession.title} · {t('journey.countsInPlan', undefined, lang)}</span>
                </span>
                <span style={styles.todaySessionChevron}>›</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Linha de livro — nome + progresso real (capítulos lidos/total, ou um
// check quando o livro inteiro já foi lido) + seta. Usado tanto no cartão
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
          ? <span style={styles.bookRowDone}><AppIcon name="Check" size={13} color="var(--bento-ink)" /></span>
          : <span style={styles.bookRowMeta}>{done}/{total}</span>}
        <AppIcon name="ChevronRight" size={15} color="var(--bento-t5)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
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
  screen: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingBottom: 83, background: 'var(--bento-bg)' },
  body:   { flex: 'none', padding: '20px 20px 0' },
  body2:  { padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  title:      { fontFamily: 'var(--font-bento)', fontSize: 21, fontWeight: 800, letterSpacing: '-.7px', color: 'var(--bento-ink)', margin: '0 0 4px' },
  subtitle:   { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 14px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, height: 46, background: 'var(--bento-card)', borderRadius: 16, padding: '0 16px' },
  searchInput:{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 500, color: 'var(--bento-ink)' },
  searchClearBtn: { border: 'none', background: 'var(--bento-line)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  searchEmptyHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', padding: '14px 2px', textAlign: 'center' },

  notesEntryBtn:  { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'var(--bento-card)', border: 'none', borderRadius: 16, padding: '13px 16px', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  notesEntryIcon: { width: 30, height: 30, borderRadius: 10, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  lastReadCard:     { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bento-sand)', border: 'none', borderRadius: 24, padding: 20, cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  lastReadLabel:    { display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', marginBottom: 8 },
  lastReadTitle:    { display: 'block', fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-sand-ink-strong)', marginBottom: 3 },
  lastReadTime:     { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-label)' },
  lastReadOpenBtn:  { flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 16, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand)' },

  sortRow:  { display: 'flex', gap: 8 },
  sortBtn:  { flex: 1, border: 'none', background: 'var(--bento-card)', borderRadius: 12, padding: '10px 10px', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
  sortBtnActive: { background: 'var(--bento-ink)', color: '#fff' },

  testamentCard:   { background: 'var(--bento-card)', borderRadius: 24, padding: 20 },
  testamentHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  testamentLabel:  { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  testamentSwitchBtn: { border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', padding: 0 },
  testamentPercent: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-accent)', margin: '0 0 14px' },

  bookRow:       { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'var(--bento-line)', border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  bookRowActive: { border: '1.5px solid var(--bento-accent)' },
  bookRowName:   { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)' },
  bookRowMeta:   { fontSize: 11, fontWeight: 600, color: 'var(--bento-t4)', flexShrink: 0 },
  bookRowDone:   { width: 18, height: 18, borderRadius: '50%', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bookExpandWrap:{ background: 'var(--bento-card)', borderRadius: 16, overflow: 'hidden' },

  todaySessionCard:  { width: '100%', borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', textAlign: 'left' },
  todaySessionIcon:  { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-mark)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todaySessionTitle: { display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', marginBottom: 3 },
  todaySessionSub:   { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)' },
  todaySessionChevron:{ fontSize: 15, fontWeight: 700, color: 'var(--bento-t5)' },
}
