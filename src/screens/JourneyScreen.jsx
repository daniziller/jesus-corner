// JourneyScreen.jsx — a aba "Bíblia": dona da navegação livre (raiz → livro
// → leitura → busca → tema). Com uma anotação em andamento, mostra o lápis
// flutuante (LapisFlutuante.jsx) para retomá-la. A raiz é B1
// (handoff-biblia-52, components/biblia/BibliaRaiz.jsx): os livros estão
// nela, por bloco — a lista de livros do testamento (39b) não existe mais.
import { useState, useEffect } from 'react'
import { sessionKeys } from '../utils/progress'
import { getFreeReadingPosition } from '../bible/freeReadingPositionStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import BibliaRaiz from '../components/biblia/BibliaRaiz'
import LapisFlutuante from '../components/biblia/LapisFlutuante'
import { useReadingSessionToday } from '../biblia/useReadingSessionToday'
import ReadingBlockView from './ReadingBlockView'
import BookChapterScreen from './BookChapterScreen'
import BuscaScreen from './BuscaScreen'
import ThemeAsStudyScreen from './ThemeAsStudyScreen'
import { getThemeById } from '../bible/themes'

export default function JourneyScreen({
  session, authUser, stepMinutes, blocks, sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, onMarkChaptersManually, initialBlockId, entryMode, resumeSessionId, forceChapterContext, browseJumpTarget, onBrowseJumpConsumed, onNavigate, onContinueSession, onGoToReflectionFrom, onExitReading, onOpenGroupRoom, onPastRootChange, onBuildThemeStudy,
  // Toque no lápis flutuante (34e): abre a página de anotação no rascunho
  // em andamento.
  onOpenSermonNote,
  // Cartão de progresso da raiz (B1) → Sua Bíblia (G2).
  onOpenSuaBiblia,
  // Selo de um livro completo (B2) → Um selo (G10).
  onOpenSelo,
  // Leitura livre (B4): a marcação que completa livro, bloco ou degrau
  // abre a tela de parabéns na hora (App.jsx, celebrateGamificationNow).
  onCelebrateNow,
}) {
  const { lang } = session
  // "Sessão de hoje" do cartão preto da raiz (B1) — hook, então fica antes
  // de qualquer retorno antecipado.
  const sessionTitle = useReadingSessionToday(session)
  // Busca — string (o texto inicial, vazio ao abrir pelo campo da raiz)
  // quando a busca está aberta, null quando não. 39l (themeOpenId) empilha
  // POR CIMA dela (não substitui: "‹" de 39l volta pra mesma busca).
  const [searchOpen, setSearchOpen] = useState(null)
  const [themeOpenId, setThemeOpenId] = useState(null)
  // Seletor de versão (cabeçalho, regra 3 da aba inteira: "vale pra aba
  // toda"). Só 1 versão por idioma hoje — ver BibleVersionChip.jsx.
  const [versionId, setVersionId] = useState(() => getSelectedVersionId(lang))

  // Bloco "aberto" (visão de leitura) — null significa visão geral (mapa de
  // blocos). Quando entryMode é 'reading' (ex: botão "Continuar sessão" na
  // Home/Rotina), já abre direto no bloco ativo, featurando a mesma sessão
  // do plano exibida lá (resumeSessionId), em vez do mapa — é a leitura
  // pela sessão do plano. Qualquer outra forma de entrar (busca, tocar num
  // livro) é navegação livre pela Bíblia, capítulo a capítulo, e passa pela
  // tela do livro (expandedBookKey, abaixo).
  const [expandedBlockId, setExpandedBlockId] = useState(entryMode === 'reading' ? initialBlockId : null)
  const [initialSessionId, setInitialSessionId] = useState(entryMode === 'reading' ? resumeSessionId : null)
  // Livro aberto (quadro 18a: Página do livro) — chave `${blockId}:${bookName}`,
  // navega pra uma tela própria (BookChapterScreen) em vez de expandir
  // inline na lista, como antes do reskin Bento.
  const [expandedBookKey, setExpandedBookKey] = useState(null)
  const [expandedInitialSessionId, setExpandedInitialSessionId] = useState(null)
  const [expandedInitialTextOpen, setExpandedInitialTextOpen] = useState(false)
  // Busca (B5–B7) e tema (39l): tocar um resultado chega aqui já com um
  // versículo pra focar — ver initialFocusVerse em ReadingBlockView.jsx.
  const [expandedInitialFocusVerse, setExpandedInitialFocusVerse] = useState(null)

  // Barra de abas fixa só na raiz — avisa App.jsx assim que a navegação
  // livre sai dela (o livro, ou a leitura aberta de dentro dele),
  // pra ele esconder a barra igual já faz com a leitura guiada. Roda de
  // novo no desmonte (voltar pra outra aba) — sem isso, journeyPastRoot
  // ficaria "true" preso em App.jsx entre uma visita e a próxima.
  // A busca (B5–B7) também é fora da raiz, sem barra de abas; a tela do
  // tema (39l), que abre por cima dela, segue como sempre foi.
  const searchOnScreen = searchOpen != null && themeOpenId == null
  useEffect(() => {
    onPastRootChange?.(expandedBookKey != null || searchOnScreen)
    return () => onPastRootChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedBookKey, searchOnScreen])

  // O botão "Ir para a leitura de hoje" (Rotina) chama onContinueSession
  // mesmo com a tela já montada (usuário já está na aba Bíblia) — os
  // estados acima só rodam no useState inicial (na primeira montagem),
  // então esse efeito cobre a navegação pra quem já estava aqui.
  useEffect(() => {
    if (entryMode === 'reading') {
      setExpandedBlockId(initialBlockId)
      setInitialSessionId(resumeSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialBlockId, resumeSessionId])

  // Expande um livro inline na lista — usado tanto por um toque direto na
  // própria linha (openBook abaixo) quanto por um pulo vindo de fora dela
  // (jumpToBook abaixo). Guarda o bloco real (não um id sintético) pra
  // manter compatível o "onde parei" (gravado por ReadingBlockView.jsx).
  function expandBook(block, bookName, sessionIdToFeature, textOpen, focusVerse) {
    setExpandedBookKey(`${block.id}:${bookName}`)
    setExpandedInitialSessionId(sessionIdToFeature)
    setExpandedInitialTextOpen(textOpen)
    setExpandedInitialFocusVerse(focusVerse ?? null)
  }

  // Abre um capítulo/versículo específico vindo de FORA da navegação livre
  // normal (um resultado da busca ou um trecho do tema, 39l) — acha o bloco a
  // partir do NOME do livro (`blocks` já é a lista fixa de sempre) e cai
  // direto na leitura, no capítulo certo, com o versículo em foco.
  // `extra.noteId` (resultado "Nas suas notas" da busca): a leitura abre
  // com a nota daquela marcação aberta.
  function openChapterFromSearch(book, chapter, verse, extra) {
    const block = blocks.find(b => b.books.includes(book))
    if (!block) return
    const sessions = browseSessionsByBlock[block.id] ?? []
    const target = sessions.find(sn => sn.book === book && sn.chStart <= chapter && chapter <= sn.chEnd)
    setSearchOpen(null)
    setThemeOpenId(null)
    expandBook(block, book, target?.id ?? null, true, verse != null ? { chapter, verse, openNoteId: extra?.noteId ?? null } : null)
  }

  // Pulo pra um livro vindo de FORA da lista de livros visível agora
  // ("Continuar leitura", card de "lido recentemente") — limpa a busca
  // (a tela do livro, 18a, não depende da lista continuar visível).
  function jumpToBook(block, bookName, sessionIdToFeature, textOpen) {
    expandBook(block, bookName, sessionIdToFeature, textOpen)
  }

  // Abre direto um capítulo (bloco + sessão da navegação livre) — diferente
  // de abrir um livro do zero, aqui já cai lendo o capítulo exato, sem
  // passar pela grade de números primeiro. Usado pelos pulos vindos de
  // fora (browseJumpTarget, abaixo).
  function openBrowseChapter(blockId, sessionId) {
    const block = blocks.find(b => b.id === blockId)
    const targetSession = browseSessionsByBlock[blockId]?.find(s => s.id === sessionId)
    if (!block || !targetSession) return
    jumpToBook(block, targetSession.book, sessionId, true)
  }

  // Link "ir pro texto" (ex: das anotações, ver App.jsx/openBiblePassage)
  // — objeto novo a cada pedido, então todo pedido roda este efeito de
  // novo mesmo pra pular pro MESMO capítulo de antes. Avisa App.jsx que
  // já consumiu (onBrowseJumpConsumed limpa o state lá) — sem isso, o
  // pedido ficava "pendente" pra sempre e essa tela pulava pro mesmo
  // capítulo de novo em TODA montagem futura (qualquer visita à aba
  // Bíblia depois de usar o link uma vez, não só via botão Voltar).
  useEffect(() => {
    if (browseJumpTarget) {
      // Um versículo específico (a Biblioteca: trecho marcado, passagem
      // citada) — o mesmo caminho de um resultado da busca.
      if (browseJumpTarget.focus) openChapterFromSearch(browseJumpTarget.focus.book, browseJumpTarget.focus.chapter, browseJumpTarget.focus.verse, { noteId: browseJumpTarget.focus.noteId })
      else if (browseJumpTarget.blockId != null) openBrowseChapter(browseJumpTarget.blockId, browseJumpTarget.sessionId)
      // Livro inteiro (grade de capítulos), não um capítulo — roda da
      // Bíblia/estante (gamificação, App.openBibleBook).
      else if (browseJumpTarget.bookName) {
        const block = blocks.find(b => b.books.includes(browseJumpTarget.bookName))
        if (block) openBook(block, browseJumpTarget.bookName)
      }
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
    setExpandedBlockId(null)
    setInitialSessionId(null)
  }

  // Volta da página do livro (18a, BookChapterScreen) pro mapa/grade —
  // mesma guarda de testamento que closeBlock acima.
  function closeBook() {
    setExpandedBookKey(null)
    setExpandedInitialSessionId(null)
    setExpandedInitialFocusVerse(null)
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
    // A leitura pela sessão do plano. key inclui initialSessionId, não só
    // expandedBlockId — pular de uma sessão pra outra do MESMO bloco
    // precisa remontar do zero, senão o estado interno (a sessão em
    // destaque) fica preso na anterior — ver comentário em
    // ReadingBlockView.jsx.
    return (
      <>
        <ReadingBlockView
          key={`${expandedBlockId}-${initialSessionId}`}
          session={session}
          authUser={authUser}
          stepMinutes={stepMinutes}
          onNavigate={onNavigate}
          blockId={expandedBlockId}
          blocks={blocks}
          sessionsByBlock={sessionsByBlock}
          mode="session"
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          initialSessionId={initialSessionId}
          // Força o recap "onde a história está" no caminho de sessão
          // guiada (vindo da Bênção) — ver comentário em App.jsx.
          forceChapterContext={forceChapterContext}
          onBack={closeBlock}
          onGoToReflection={heroSession => onGoToReflectionFrom?.({ tab: 'journey', blockId: expandedBlockId, sessionId: heroSession.id, book: heroSession.book, bookEn: heroSession.bookEn, chStart: heroSession.chStart, chEnd: heroSession.chEnd, words: heroSession.words, type: heroSession.type })}
          onOpenGroupRoom={onOpenGroupRoom}
        />
        <LapisFlutuante lang={lang} authUser={authUser} onOpen={onOpenSermonNote} />
      </>
    )
  }

  if (expandedBookKey != null) {
    const [blockIdStr, bookName] = expandedBookKey.split(':')
    const block = blocks.find(b => b.id === Number(blockIdStr))
    const bookIdx = block?.books.indexOf(bookName) ?? -1
    const displayName = bookIdx >= 0 ? (lang === 'en' ? block.booksEn[bookIdx] : bookName) : bookName
    return (
      // key inclui expandedInitialSessionId — pular pra um capítulo
      // DIFERENTE do MESMO livro precisa remontar do zero, senão a
      // leitura continuaria presa no capítulo antigo (mesmo raciocínio do
      // ReadingBlockView acima).
      <>
        <BookChapterScreen
          key={`${expandedBookKey}:${expandedInitialSessionId}`}
          session={session}
          authUser={authUser}
          block={block}
          bookName={bookName}
          displayName={displayName}
          browseSessionsByBlock={browseSessionsByBlock}
          completedSet={completedSet}
          onToggleSession={onToggleSession}
          onToggleChapter={onToggleChapter}
          onMarkChaptersManually={onMarkChaptersManually}
          onOpenSelo={onOpenSelo}
          onCelebrateNow={onCelebrateNow}
          onGoToReflectionFrom={onGoToReflectionFrom}
          onNavigate={onNavigate}
          onBack={closeBook}
          initialSessionId={expandedInitialSessionId}
          initialTextOpen={expandedInitialTextOpen}
          initialFocusVerse={expandedInitialFocusVerse}
        />
        <LapisFlutuante lang={lang} authUser={authUser} onOpen={onOpenSermonNote} />
      </>
    )
  }

  // O tema (39l) empilha por cima da busca (não substitui) — "‹" do tema
  // volta pra busca com o MESMO texto; "‹" da busca volta pra raiz.
  if (themeOpenId != null) {
    const theme = getThemeById(themeOpenId)
    if (theme) {
      return (
        <>
          <ThemeAsStudyScreen
            session={session}
            theme={theme}
            completedSet={completedSet}
            onBack={() => setThemeOpenId(null)}
            onOpenChapter={openChapterFromSearch}
            onBuildStudy={onBuildThemeStudy}
            onNavigate={onNavigate}
          />
          <LapisFlutuante lang={lang} authUser={authUser} onOpen={onOpenSermonNote} />
        </>
      )
    }
  }
  // Leitura livre: a posição PRÓPRIA da aba (freeReadingPositionStore.js),
  // não a do plano — só vale se o capítulo ainda existe na navegação livre.
  // Usada pela raiz (B1) e pela busca ("Onde você estava", B5).
  const freeReadPos = getFreeReadingPosition()
  const freeReadBlock = freeReadPos ? blocks.find(b => b.books.includes(freeReadPos.book)) : null
  const freeReadSession = freeReadBlock
    ? (browseSessionsByBlock[freeReadBlock.id] ?? []).find(sn => sn.book === freeReadPos.book && sn.chStart <= freeReadPos.chapter && sn.chEnd >= freeReadPos.chapter)
    : null
  // Abre o livro (B2) pelo nome — da pastilha da raiz ou de um resultado
  // da busca.
  function openBookByName(nome) {
    const block = blocks.find(b => b.books.includes(nome))
    if (block) openBook(block, nome)
  }
  // "Continuar a leitura livre": volta ao versículo onde a pessoa parou
  // (sem realce) — o mesmo que a linha mostra em ", versículo n".
  function openFreeReading() {
    setSearchOpen(null)
    expandBook(freeReadBlock, freeReadPos.book, freeReadSession.id, true, freeReadPos.verse > 1 ? { chapter: freeReadPos.chapter, verse: freeReadPos.verse, scrollOnly: true } : null)
  }

  if (searchOpen != null) {
    return (
      <>
        <BuscaScreen
          session={session}
          authUser={authUser}
          initialQuery={searchOpen}
          completedSet={completedSet}
          sessionTitle={sessionTitle}
          free={freeReadSession ? freeReadPos : null}
          onBack={() => setSearchOpen(null)}
          onOpenChapter={openChapterFromSearch}
          onOpenBook={nome => { setSearchOpen(null); openBookByName(nome) }}
          // O tema (39l) abre por cima da busca; guardar o que estava
          // digitado faz o "voltar" de lá cair na mesma busca.
          onOpenTheme={(id, typed) => { setSearchOpen(typed ?? ''); setThemeOpenId(id) }}
          onReadSession={onContinueSession}
          onOpenFree={openFreeReading}
        />
        <LapisFlutuante lang={lang} authUser={authUser} onOpen={onOpenSermonNote} />
      </>
    )
  }

  // ── A raiz (B1) ──

  return (
    <>
      <BibliaRaiz
        lang={lang} completedSet={completedSet} versionId={versionId} onChangeVersion={setVersionId}
        sessionTitle={sessionTitle} free={freeReadSession ? freeReadPos : null} currentBook={session.currentBlock?.book}
        onOpenSearch={() => setSearchOpen('')}
        onOpenSuaBiblia={onOpenSuaBiblia}
        onRead={onContinueSession}
        onOpenFree={openFreeReading}
        onOpenBook={openBookByName}
      />
      <LapisFlutuante lang={lang} authUser={authUser} onOpen={onOpenSermonNote} />
    </>
  )
}
