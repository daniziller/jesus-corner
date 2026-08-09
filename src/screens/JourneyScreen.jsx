import { useState, useEffect } from 'react'
import { GRADIENT_MAP } from '../data/bibleBlocks'
import { ACCENT_MAP, GLOW_MAP } from '../utils/blockColors'
import { pickActiveBlock, sessionKeys } from '../utils/progress'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import ReadingBlockView from './ReadingBlockView'

// Remove acentos pra busca não exigir digitar "Êxodo" com acento certo.
function normalizeSearch(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export default function JourneyScreen({
  session, authUser, blocks, sessionsByBlock, browseSessionsByBlock, completedSet,
  onToggleSession, onToggleChapter, initialBlockId, entryMode, resumeSessionId, onNavigate,
}) {
  const { lang } = session
  const [searchQuery, setSearchQuery] = useState('')

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
      />
    )
  }

  const activeBlock = pickActiveBlock(blocks)
  const totalBooks = blocks.reduce((s, b) => s + b.books.length, 0)
  const currentBookName = lang === 'en' ? activeBlock.currentBookEn : activeBlock.currentBook

  // Busca de livro — achata todos os blocos numa lista única de livros
  // pesquisáveis, independente de qual bloco/testamento eles pertencem, já
  // que o usuário pode não saber de cabeça em qual bloco um livro está.
  const trimmedQuery = searchQuery.trim()
  const searchResults = trimmedQuery
    ? blocks.flatMap(block => {
        const names = lang === 'en' ? block.booksEn : block.books
        return names
          .map((displayName, i) => ({ displayName, canonicalName: block.books[i], block }))
          .filter(entry => normalizeSearch(entry.displayName).includes(normalizeSearch(trimmedQuery)))
      })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: 83 }}>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroOrbOrange} />
        <div style={styles.heroOrbPink} />
        <p style={styles.heroLabel}>{t('journey.heroLabel', undefined, lang)}</p>
        <h2 style={styles.heroTitle}>{t('journey.heroTitle', undefined, lang)}</h2>
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

          {searchResults ? (
            searchResults.length === 0 ? (
              <p style={styles.searchEmptyHint}>{t('journey.searchNoResults', { query: trimmedQuery }, lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {searchResults.map(({ displayName, canonicalName, block }) => (
                  <button
                    key={`${block.id}-${canonicalName}`}
                    style={styles.searchResultRow}
                    onClick={() => openBook(block, canonicalName)}
                  >
                    <div>
                      <p style={styles.searchResultBook}>{displayName}</p>
                      <p style={styles.searchResultBlock}>{lang === 'en' ? block.nameEn : block.name}</p>
                    </div>
                    <AppIcon name="ChevronRight" size={15} color="var(--g4)" />
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <TestamentSection
                testamentKey="at"
                label={t('journey.oldTestament', undefined, lang)}
                blocks={blocks.filter(b => b.id <= 4)}
                onOpenBlock={openBlock}
                onOpenBook={openBook}
                lang={lang}
              />
              <TestamentSection
                testamentKey="nt"
                label={t('journey.newTestament', undefined, lang)}
                blocks={blocks.filter(b => b.id >= 5)}
                onOpenBlock={openBlock}
                onOpenBook={openBook}
                lang={lang}
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
   compacta, mesmo se o bloco ativo estiver dentro dela; o usuário decide
   quando quer ver os blocos, em vez do app abrir um dos dois sozinho. ── */
function TestamentSection({ testamentKey, label, blocks, onOpenBlock, onOpenBook, lang, style }) {
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
        <div className="block-grid" style={{ marginTop: 9 }}>
          {blocks.map(block => (
            <BlockCard key={block.id} block={block} onOpenBlock={onOpenBlock} onOpenBook={onOpenBook} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

function BlockCard({ block, onOpenBlock, onOpenBook, lang }) {
  const gradient = GRADIENT_MAP[block.gradientKey]
  const accent   = ACCENT_MAP[block.gradientKey]
  const name = lang === 'en' ? block.nameEn : block.name
  const tag  = lang === 'en' ? block.tagEn : block.tag
  const books = lang === 'en' ? block.booksEn : block.books
  const currentBookName = lang === 'en' ? block.currentBookEn : block.currentBook
  // "Iniciar bloco" se nada foi lido ainda (0%); "Continuar bloco" assim que
  // pelo menos um capítulo do bloco já foi marcado.
  const actionLabel = block.status === 'todo'
    ? t('journey.startBlock', undefined, lang)
    : t('journey.continueBlock', undefined, lang)

  const isActive = block.status === 'active'

  return (
    <div style={{
      ...styles.blockCard,
      boxShadow: isActive ? `var(--shadow-premium), 0 8px 22px ${GLOW_MAP[block.gradientKey]}` : `0 8px 22px ${GLOW_MAP[block.gradientKey]}`,
      border: isActive ? '0.5px solid var(--gold-soft)' : styles.blockCard.border,
    }}>
      {/* Topo */}
      <div style={styles.blockTop}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AppIcon name={block.icon} size={22} color={accent} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.blockTag}>{tag}</p>
          <h3 style={styles.blockTitle}>{name}</h3>
          {block.status === 'active' && <span className="badge badge-orange">{t('journey.inProgressBadge', undefined, lang)}</span>}
          {block.status === 'todo' && <span className="badge badge-locked">{t('journey.startBadge', undefined, lang)}</span>}
          {block.status === 'done' && <span className="badge badge-green">{t('journey.doneBadge', undefined, lang)}</span>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: accent, letterSpacing: '-1px' }}>{block.percent}%</div>
          {block.status === 'active' && <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--g5)' }}>{currentBookName}</div>}
        </div>
      </div>

      {/* Barra */}
      <div style={{ height: 5, background: 'var(--g1)', borderRadius: 99, overflow: 'hidden', margin: '0 12px 10px' }}>
        <div style={{ height: '100%', background: accent, borderRadius: 99, width: `${block.percent}%` }} />
      </div>

      {/* Livros do bloco — clicáveis, pulam direto pro livro na leitura */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 12px 12px' }}>
        {books.map((bookName, i) => (
          <span
            key={bookName}
            style={styles.bookChip}
            onClick={() => onOpenBook(block, block.books[i])}
          >
            {bookName}
          </span>
        ))}
      </div>

      {/* Botão */}
      <div style={{ margin: '0 12px 12px' }}>
        <div
          style={{ background: 'var(--grad-vivid)', borderRadius: 11, padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}
          onClick={() => onOpenBlock(block.id)}
        >
          {actionLabel}
        </div>
      </div>
    </div>
  )
}

const styles = {
  searchWrap:        { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '10px 13px', marginBottom: 4 },
  searchInput:       { flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--bk)' },
  searchClearBtn:    { border: 'none', background: 'var(--g2)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  searchEmptyHint:   { fontSize: 12.5, fontWeight: 500, color: 'var(--g4)', padding: '14px 2px', textAlign: 'center' },
  searchResultRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 17, padding: '10px 13px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', boxShadow: 'var(--shadow-card)' },
  searchResultBook:  { fontSize: 12.5, fontWeight: 700, color: 'var(--bk)' },
  searchResultBlock: { fontSize: 10, fontWeight: 500, color: 'var(--g4)', marginTop: 1 },
  hero:            { background: 'var(--bk-hero)', padding: '18px 16px 30px', position: 'relative', overflow: 'hidden', flexShrink: 0 },
  heroOrbOrange:   { position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'var(--hero-orb-a)', filter: 'blur(70px)', opacity: 0.5, top: -70, right: -60 },
  heroOrbPink:     { position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'var(--hero-orb-b)', filter: 'blur(70px)', opacity: 0.32, bottom: -60, left: -40 },
  heroLabel:       { position: 'relative', fontSize: 9, fontWeight: 700, color: 'var(--or)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle:       { position: 'relative', fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, fontStyle: 'italic', color: 'white', marginBottom: 3, letterSpacing: '-0.2px' },
  heroDesc:        { position: 'relative', fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginBottom: 13 },
  heroProgressBar: { position: 'relative', height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 },
  heroProgressFill:{ height: '100%', background: 'var(--grad-vivid)', borderRadius: 99 },
  heroProgressLabel:{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(255,255,255,.55)' },
  sheet:           { background: 'var(--white)', borderRadius: '24px 24px 0 0', marginTop: -18, position: 'relative', zIndex: 2, boxShadow: '0 -12px 30px rgba(0,0,0,.05)', flex: 1 },
  testamentSection:{},
  testamentHeader: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 13, padding: '11px 13px', cursor: 'pointer', fontFamily: 'var(--font)' },
  testamentLabel:  { fontSize: 11.5, fontWeight: 800, color: 'var(--bk)', letterSpacing: 0.3, textTransform: 'uppercase' },
  testamentMeta:   { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'var(--or)' },
  blockCard:       { background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 22, overflow: 'hidden' },
  blockTop:        { padding: '13px 12px 10px', display: 'flex', gap: 10, alignItems: 'flex-start' },
  blockTag:        { fontSize: 8, fontWeight: 700, color: 'var(--g4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  blockTitle:      { fontSize: 13, fontWeight: 800, color: 'var(--bk)', marginBottom: 4, letterSpacing: '-0.2px' },
  bookChip:        { background: 'var(--olt)', color: 'var(--brand-deep)', border: '0.5px solid rgba(249,115,22,.25)', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' },
}
