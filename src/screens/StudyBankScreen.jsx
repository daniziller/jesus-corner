// StudyBankScreen.jsx — "Estudos da comunidade" (quadro 26g, Bloco 12).
// Busca real no banco (studies, migration 0053) por título ou tag —
// "Ordenar e filtrar" (rodapé do mockup) simplificado pra um toggle
// mais usados/mais recentes, documentado abaixo — um filtro completo de
// autor/igreja não existe hoje (não há conceito de "igreja" no app).
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { avatarInitialsOf } from '../utils/avatarInitials'
import { searchPublicStudies } from '../studies/publicStudiesStore'
import { STUDY_THEMES, studyThemeLabel } from '../data/studyThemes'

const FONT = 'var(--font-bento)'

export default function StudyBankScreen({ session, onBack, onUseStudy }) {
  const lang = session.lang
  const L = (k, vars) => t(`studyBank.${k}`, vars, lang)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(null)
  const [sort, setSort] = useState('uses') // 'uses' | 'recent'
  const [results, setResults] = useState(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      searchPublicStudies({ query, tag }).then(setResults).catch(err => console.error('Failed to search studies', err))
    }, 250)
    return () => clearTimeout(handle)
  }, [query, tag])

  const sorted = useMemo(() => {
    if (!results) return null
    const copy = [...results]
    if (sort === 'recent') copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else copy.sort((a, b) => b.usesCount - a.usesCount)
    return copy
  }, [results, sort])

  const hero = tag && sorted && sorted.length > 0 ? sorted[0] : null
  const rest = hero ? sorted.slice(1) : (sorted ?? [])

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{L('title')}</p>
      </div>

      <div style={s.searchWrap}>
        <div style={s.searchRow}>
          <AppIcon name="Search" size={16} color="var(--bento-t5)" />
          <input
            style={s.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={L('searchPlaceholder')}
          />
        </div>
      </div>

      <div style={s.body}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STUDY_THEMES.map(theme => (
            <button
              key={theme.id}
              type="button"
              style={{ ...s.tagChip, ...(tag === theme.id ? s.tagChipOn : {}) }}
              onClick={() => setTag(t => t === theme.id ? null : theme.id)}
            >
              {studyThemeLabel(theme.id, lang)}
            </button>
          ))}
        </div>

        {hero && (
          <div style={s.heroCard}>
            <p style={s.heroLabel}>{L('heroLabel', { theme: studyThemeLabel(tag, lang) })}</p>
            <p style={s.heroTitle}>{hero.title}</p>
            <p style={s.heroMeta}>{L('studyMeta', { n: hero.passages.length, author: hero.authorName, uses: hero.usesCount })}</p>
            <button type="button" style={s.heroUseBtn} onClick={() => onUseStudy?.(hero)}>{L('useThisBtn')}</button>
          </div>
        )}

        {sorted === null ? null : rest.length === 0 && !hero ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>{L('emptyTitle')}</p>
            <p style={s.emptySub}>{L('emptySub')}</p>
          </div>
        ) : rest.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeadRow}>
              <p style={s.cardLabel}>{tag ? L('resultsInTag', { theme: studyThemeLabel(tag, lang), n: rest.length + (hero ? 1 : 0) }) : L('resultsAll')}</p>
              <button type="button" style={s.sortLink} onClick={() => setSort(s => s === 'uses' ? 'recent' : 'uses')}>
                {sort === 'uses' ? L('sortByUses') : L('sortByRecent')}
              </button>
            </div>
            {rest.map((study, i) => (
              <div key={study.id} style={{ ...s.resultRow, borderBottom: i === rest.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <div style={s.resultAvatar}>{avatarInitialsOf(study.authorName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.resultTitle}>{study.title}</p>
                  <p style={s.resultSub}>{L('studyMeta', { n: study.passages.length, author: study.authorName, uses: study.usesCount })}</p>
                </div>
                <button type="button" style={s.useBtn} onClick={() => onUseStudy?.(study)}>{L('useBtn')}</button>
              </div>
            ))}
          </div>
        )}

        <div style={s.noteCard}>
          <div style={s.noteIcon}><AppIcon name="Plus" size={15} strokeWidth={2.2} color="var(--bento-accent)" /></div>
          <p style={s.noteText}>{L('notFoundHint')}</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },

  searchWrap: { flex: 'none', padding: '14px 20px 0' },
  searchRow: { height: 46, borderRadius: 16, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--bento-ink)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 },

  tagChip: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-card)', border: 'none', borderRadius: 99, padding: '9px 13px', cursor: 'pointer' },
  tagChipOn: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },

  heroCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: 20 },
  heroLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 12px' },
  heroTitle: { fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: '-.7px', color: '#fff', margin: '0 0 10px', textWrap: 'pretty' },
  heroMeta: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' },
  heroUseBtn: { width: '100%', height: 44, border: 'none', borderRadius: 15, background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '14px 18px 4px' },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 2px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  sortLink: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t5)' },
  resultRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' },
  resultAvatar: { width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', color: 'var(--bento-t3)', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: '36px', textAlign: 'center' },
  resultTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  resultSub: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },
  useBtn: { height: 32, padding: '0 14px', flexShrink: 0, borderRadius: 11, border: 'none', background: 'var(--bento-ink)', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  empty: { padding: '24px 4px', textAlign: 'center' },
  emptyTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 4px' },
  emptySub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  noteCard: { borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  noteIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: 10, background: 'var(--bento-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-t2)', margin: 0 },
}
