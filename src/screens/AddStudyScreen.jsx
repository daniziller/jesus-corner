// AddStudyScreen.jsx — "Estudos" (turno 35, Bloco 4, tela 35h). Substitui
// por inteiro a versão antiga (26e, uma lista simples de prontos + card de
// IA): busca por tema/livro/autor, filtro por origem, e as 4 fontes reais
// — criar por IA, Jesus Corner, grupos, banco público — mais o estudo em
// andamento e um atalho pros salvos.
//
// "Dos seus grupos" reaproveita group_reading_plans (getMyAcceptedGroupPlans)
// — o mecanismo de "a moderadora manda um plano pro grupo todo" que já
// existia antes deste turno; não é uma tabela nova. Sem contagem de "quantas
// pessoas fazendo" pra esses (o dado não existe pra planos de grupo, ver
// migration 0048) — mostra só o nome do grupo, honesto em vez de inventado.
import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { getReadyMadeStudies, searchPublicStudies } from '../studies/publicStudiesStore'
import { getMyAcceptedGroupPlans } from '../groups/groupPlansStore'
import { getAiStudies } from '../studies/aiStudiesStore'
import { getInductiveStudies } from '../studies/inductiveStudiesStore'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore'
import { getStepDays } from '../routine/stepDaysStore'
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'
import { deriveThemeTexts } from '../themePlans/themeTexts'

const FONT = 'var(--font-bento)'
const CHIPS = ['all', 'jesusCorner', 'groups', 'public', 'saved']

export default function AddStudyScreen({ session, onBack, onCreateStudy, onChangeStudyDays, onOpenPreview }) {
  const { lang, activeStudyId, plan } = session
  const L = (k, vars) => t(`addStudy.${k}`, vars, lang)

  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('all')
  const [readyMade, setReadyMade] = useState([])
  const [groupStudies, setGroupStudies] = useState([])
  const [publicResults, setPublicResults] = useState([])
  const [savedStudies, setSavedStudies] = useState([])
  const [activeStudy, setActiveStudy] = useState(null)
  // "DIAS DO ESTUDO / Seg · Qua · Sex" (35h) — os DIAS de verdade, não uma
  // contagem ("3 dias"): mesma fonte que Meu Plano/Ajustar (stepDays.
  // study), só formatada como lista curta em vez de grade.
  const [studyDaysAbbr, setStudyDaysAbbr] = useState('')

  useEffect(() => {
    getReadyMadeStudies().then(setReadyMade).catch(err => console.error('Failed to load ready-made studies', err))
    getMyAcceptedGroupPlans().then(plans => {
      setGroupStudies(plans.map(p => ({
        ...p,
        sessions: deriveThemeTexts(p.passages),
        groupName: session.myGroups?.find(g => g.groupId === p.groupId)?.name ?? '',
      })))
    }).catch(err => console.error('Failed to load group plans', err))
    const abbr = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
    getStepDays().then(days => setStudyDaysAbbr(abbr.filter((_, i) => days.study[i]).join(' · '))).catch(() => {})
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      searchPublicStudies({ query }).then(setPublicResults).catch(err => console.error('Failed to search public studies', err))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()]).then(([ai, inductive, doneSet]) => {
      const mine = [...ai, ...inductive]
      setSavedStudies(mine.filter(s => s.id !== activeStudyId))
      const active = mine.find(s => s.id === activeStudyId)
      if (active) {
        const total = active.sessions?.length ?? 0
        const done = (active.sessions ?? []).filter(sess => isStudySessionDone(doneSet, active.id, sess.id)).length
        setActiveStudy({ ...active, doneCount: done, totalCount: total })
      } else {
        setActiveStudy(null)
      }
    }).catch(err => console.error('Failed to load my studies', err))
  }, [activeStudyId])

  const q = query.trim().toLowerCase()
  const matchesQuery = study => !q || study.title.toLowerCase().includes(q) || (study.authorName ?? '').toLowerCase().includes(q)

  const filteredJesusCorner = useMemo(() => readyMade.filter(matchesQuery), [readyMade, q])
  const filteredGroups = useMemo(() => groupStudies.filter(matchesQuery), [groupStudies, q])
  const filteredSaved = useMemo(() => savedStudies.filter(matchesQuery), [savedStudies, q])
  // A busca pública já roda no servidor (searchPublicStudies), não precisa filtrar de novo.

  const showAll = chip === 'all'
  const showSection = key => showAll || chip === key

  const noResults = q.length > 0
    && (!showSection('jesusCorner') || filteredJesusCorner.length === 0)
    && (!showSection('groups') || filteredGroups.length === 0)
    && (!showSection('public') || publicResults.length === 0)
    && (!showSection('saved') || filteredSaved.length === 0)

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
        {CHIPS.map(key => (
          <button key={key} style={{ ...s.chip, ...(chip === key ? s.chipOn : {}) }} onClick={() => setChip(key)}>
            {L(`chip${key[0].toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {showAll && (
          <button style={s.createCard} onClick={onCreateStudy}>
            <span style={s.createDiamond} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={s.createTitle}>{L('createCardTitle')}</p>
              <p style={s.createSub}>{L('createCardSub')}</p>
            </div>
            <AppIcon name="ArrowRight" size={16} color="var(--bento-accent)" />
          </button>
        )}

        {showAll && activeStudy && (
          <div style={s.sandCard}>
            <div style={s.sandHead}>
              <p style={s.sandLabel}>{L('inProgressLabel')}</p>
              <p style={s.sandDay}>{L('inProgressDayOf', { n: Math.min(activeStudy.doneCount + 1, activeStudy.totalCount || 1), total: activeStudy.totalCount })}</p>
            </div>
            <p style={s.sandTitle}>{activeStudy.title ?? activeStudy.titleEn}</p>
            <p style={s.sandSub}>{L('inProgressAuthorSelf', { min: plan?.readingMinutes ?? 15 })}</p>
            <div style={s.sandDaysRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.sandDaysLabel}>{L('inProgressDaysLabel')}</p>
                <p style={s.sandDaysValue}>{studyDaysAbbr}</p>
              </div>
              <button style={s.changeDaysBtn} onClick={onChangeStudyDays}>{L('changeDaysBtn')}</button>
            </div>
          </div>
        )}

        {noResults && <p style={s.emptyText}>{L('emptyResults')}</p>}

        {showSection('jesusCorner') && filteredJesusCorner.length > 0 && (
          <StudySection label={L('sectionJesusCorner')}>
            {filteredJesusCorner.map(study => (
              <StudyCard
                key={study.id} badge={L('badgeJesusCorner')}
                title={study.title} sub={L('authorTeam')} meta={L('cardDaysMeta', { n: study.passages?.length ?? 0 })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id })}
              />
            ))}
          </StudySection>
        )}

        {showSection('groups') && filteredGroups.length > 0 && (
          <StudySection label={L('sectionGroups')}>
            {filteredGroups.map(study => (
              <StudyCard
                key={study.id} badge={study.groupName} badgeTone="group"
                title={study.title} sub={study.groupName} meta={L('cardDaysMeta', { n: study.sessions.length })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: 'book', scope: null, sessions: study.sessions, sourceStudyId: study.id })}
              />
            ))}
          </StudySection>
        )}

        {showSection('public') && publicResults.length > 0 && (
          <StudySection label={L('sectionPublic')}>
            {publicResults.map(study => (
              <StudyCard
                key={study.id} badge={L('badgePublic')}
                title={study.title} sub={L('authorBy', { author: study.authorName })}
                meta={L('followersCount', { n: study.usesCount })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: study.format, scope: null, sessions: deriveThemeTexts(study.passages), sourceStudyId: study.id, fromPublicBank: true })}
              />
            ))}
          </StudySection>
        )}

        {showSection('saved') && filteredSaved.length > 0 && (
          <StudySection label={L('chipSaved')}>
            {filteredSaved.map(study => (
              <StudyCard
                key={study.id} badge={null}
                title={study.title ?? study.titleEn} sub={null}
                meta={L('cardDaysMeta', { n: study.sessions?.length ?? 0 })}
                onClick={() => onOpenPreview?.({ title: study.title, overview: study.overview, format: 'thematic', scope: study.scope ?? null, sessions: study.sessions, sourceStudyId: study.id })}
              />
            ))}
          </StudySection>
        )}

        <div style={s.trustCard}>
          <p style={s.trustText}>{L('trustNote')}</p>
        </div>
      </div>
    </div>
  )
}

function StudySection({ label, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionLabel}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function StudyCard({ badge, badgeTone, title, sub, meta, onClick }) {
  return (
    <button style={s.card} onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={s.cardTopRow}>
          {badge && <span style={{ ...s.badge, ...(badgeTone === 'group' ? s.badgeGroup : {}) }}>{badge}</span>}
          <span style={s.cardMeta}>{meta}</span>
        </div>
        <p style={s.cardTitle}>{title}</p>
        {sub && <p style={s.cardSub}>{sub}</p>}
      </div>
    </button>
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
  chip: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t3)', background: 'var(--bento-card)', border: 'none', borderRadius: 99, padding: '9px 14px', cursor: 'pointer' },
  chipOn: { color: '#fff', background: 'var(--bento-ink)', fontWeight: 800 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 20px calc(var(--nav-height) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 },

  createCard: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px', cursor: 'pointer' },
  createDiamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  createTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 3px' },
  createSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0, lineHeight: 1.3 },

  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 20px' },
  sandHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sandLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: 0 },
  sandDay: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-ink-mid)', margin: 0 },
  sandTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-sand-ink-strong)', margin: '0 0 4px' },
  sandSub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-sand-ink-mid)', margin: '0 0 14px' },
  sandDaysRow: { display: 'flex', alignItems: 'center', gap: 12 },
  sandDaysLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 3px' },
  sandDaysValue: { fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  changeDaysBtn: { flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 13, border: 'none', background: 'var(--bento-sand-icon)', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: 'pointer' },

  emptyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', textAlign: 'center', margin: '8px 0' },

  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },

  card: { width: '100%', border: 'none', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 18px', cursor: 'pointer' },
  cardTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.14)', borderRadius: 99, padding: '4px 9px' },
  badgeGroup: { color: 'var(--bento-sand-icon)', background: 'var(--bento-sand)' },
  cardMeta: { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--bento-t4)' },
  cardTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  cardSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  trustCard: { borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '14px 18px' },
  trustText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: 0 },
}
