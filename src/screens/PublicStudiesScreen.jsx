// PublicStudiesScreen.jsx — "Banco público" (turno 41, handoff-estudos-41/,
// 41i). Aberta do chip "Públicos"/"ver mais" em 41a (AddStudyScreen.jsx).
// Busca por SITUAÇÃO (chips de tema — Luto, Casamento…), não por livro —
// diferente da busca de 41a, que é por tema/livro/autor. "Ver" abre a
// mesma prévia de sempre (handleOpenStudyPreview/StudyProposalNewScreen,
// já usada pelos cartões de 41a) — não entra no plano direto.
//
// Estado vazio da busca: não veio desenhado no pacote ("monte na mesma
// casca e me mostre antes de finalizar", regra 4 §11) — usei a mesma
// casca dos cartões/trust-line, só com um texto curto no lugar da lista.
//
// "Publicar um estudo meu no banco": o pacote não desenha o que essa ação
// abre, e hoje `publishStudy()` (publicStudiesStore.js) só é chamado na
// hora de CRIAR (toggle em 35d/CreateAiStudyScreen) — não existe ainda um
// fluxo pra publicar um estudo JÁ salvo depois. Por ora este botão leva
// pra "Salvos" em 41a (escolher um dos seus) — publicar de lá é trabalho
// pro Bloco 2.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { searchPublicStudies } from '../studies/publicStudiesStore'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { deriveThemeTexts } from '../themePlans/themeTexts'

const FONT = 'var(--font-bento)'

// Tags de tema (26g/41i) — "situação", não livro. Valores em minúsculo
// sem acento pra bater com o que fica salvo em studies.tags[0].
const THEME_TAGS = [
  { key: 'luto', labelKey: 'tagGrief' },
  { key: 'casamento', labelKey: 'tagMarriage' },
  { key: 'dinheiro', labelKey: 'tagMoney' },
  { key: 'perdao', labelKey: 'tagForgiveness' },
  { key: 'vocacao', labelKey: 'tagCalling' },
  { key: 'filhos', labelKey: 'tagKids' },
]

export default function PublicStudiesScreen({ session, onBack, onOpenPreview, onGoToSaved }) {
  const { lang } = session
  const L = (k, vars) => t(`publicStudies.${k}`, vars, lang)

  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState(THEME_TAGS[0].key)
  const [results, setResults] = useState(null) // null = ainda carregando

  useEffect(() => {
    const handle = setTimeout(() => {
      setResults(null)
      searchPublicStudies({ query, tag: query.trim() ? null : activeTag })
        .then(setResults)
        .catch(err => { console.error('Failed to search public studies bank', err); setResults([]) })
    }, 250)
    return () => clearTimeout(handle)
  }, [query, activeTag])

  const activeTagLabel = L(THEME_TAGS.find(tg => tg.key === activeTag)?.labelKey ?? 'tagGrief')
  const resultsLabel = query.trim() ? null : L('resultsLabel', { theme: activeTagLabel.toUpperCase(), n: results?.length ?? 0 })

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={s.title}>{L('title')}</p>
          <p style={s.subtitle}>{L('subtitle')}</p>
        </div>
      </div>

      <div style={s.searchWrap}>
        <div style={s.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input style={s.searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder={L('searchPlaceholder')} />
        </div>
      </div>

      <div style={s.chipsWrap}>
        {THEME_TAGS.map(tg => (
          <button key={tg.key} style={{ ...s.chip, ...(activeTag === tg.key && !query.trim() ? s.chipOn : {}) }} onClick={() => { setQuery(''); setActiveTag(tg.key) }}>
            {L(tg.labelKey)}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {resultsLabel && <p style={s.resultsLabel}>{resultsLabel}</p>}

        {results === null && <p style={s.emptyText}>{L('loading')}</p>}

        {results?.length === 0 && (
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>{L('emptyTitle')}</p>
            <p style={s.emptyText}>{L('emptySub')}</p>
          </div>
        )}

        {results?.map((study, i) => (
          <div key={study.id} style={s.card}>
            <div style={s.cardTopRow}>
              {i === 0 && <span style={s.mostFollowedBadge}>{L('mostFollowedBadge')}</span>}
              <span style={s.cardMeta}>{L('cardMeta', { n: study.passages?.length ?? 0, min: study.minutesPerDay })}</span>
            </div>
            <p style={s.cardTitle}>{study.title}</p>
            {study.overview && <p style={s.cardOverview}>{study.overview}</p>}
            <div style={s.cardFooterRow}>
              <div style={s.avatar}>{avatarInitialsOf(study.authorName)}</div>
              <p style={s.cardAuthor}>{L('authorLine', { author: study.authorName, n: study.usesCount })}</p>
              <button
                style={s.verBtn}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id, fromPublicBank: true })}
              >
                {L('verBtn')}
              </button>
            </div>
          </div>
        ))}

        <div style={s.trustCard}>
          <span style={s.trustCheck}><AppIcon name="Check" size={13} color="var(--bento-t4)" /></span>
          <p style={s.trustText}>{L('trustNote')}</p>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.publishBtn} onClick={onGoToSaved}>{L('publishBtn')}</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  searchWrap: { flex: 'none', padding: '14px 20px 0' },
  searchRow: { height: 46, borderRadius: 16, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--bento-ink)' },

  chipsWrap: { flex: 'none', display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 20px 0' },
  chip: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-card)', border: 'none', borderRadius: 99, padding: '9px 16px', cursor: 'pointer' },
  chipOn: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  resultsLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 2px' },

  emptyCard: { borderRadius: 20, background: 'var(--bento-card)', padding: '18px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  emptyText: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'center', margin: 0, lineHeight: 1.4 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  cardTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  mostFollowedBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)', borderRadius: 99, padding: '5px 10px' },
  cardMeta: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-t4)', marginLeft: 'auto' },
  cardTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  cardOverview: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardFooterRow: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-sand-ink)' },
  cardAuthor: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  verBtn: { flexShrink: 0, height: 38, padding: '0 20px', borderRadius: 14, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  trustCard: { display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '14px 18px' },
  trustCheck: { flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  trustText: { flex: 1, fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: 0 },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  publishBtn: { width: '100%', height: 48, borderRadius: 16, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
}
