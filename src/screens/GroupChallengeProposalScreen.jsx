// GroupChallengeProposalScreen.jsx — 42n "A proposta" (handoff-admin-42,
// Bloco 3). "Refazer" gera outra proposta inteira; "Ajustar" troca um dia
// por vez (ver comentário de regenerateChallengeDay,
// groupChallengesStore.js, sobre a simplificação: reaproveita o mesmo
// endpoint de geração inteira e usa só o primeiro dia devolvido — não
// existe uma chamada de IA dedicada "só troque o dia 3" ainda). Nada vai
// ao grupo antes de "Publicar para o grupo".
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { generateGroupChallenge, regenerateChallengeDay, publishGroupChallenge } from '../groups/groupChallengesStore'
import { getGroupDetail } from '../groups/groupsStore'

const FONT = 'var(--font-bento)'
const COLLAPSED_COUNT = 5

function dayRef(day, lang) {
  const book = lang === 'en' ? (day.bookEn ?? day.book) : day.book
  const range = day.chStart === day.chEnd ? `${day.chStart}` : `${day.chStart}-${day.chEnd}`
  return `${book} ${range}`
}

export default function GroupChallengeProposalScreen({ session, groupId, proposal, onBack, onPublished }) {
  const lang = session.lang
  const L = (k, vars) => t(`groupChallengeProposal.${k}`, vars, lang)

  const [challenge, setChallenge] = useState(proposal.challenge)
  const [memberCount, setMemberCount] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [refazendo, setRefazendo] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [regeneratingDay, setRegeneratingDay] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getGroupDetail(groupId).then(detail => setMemberCount(detail?.members?.length ?? 0))
  }, [groupId])

  async function handleRefazer() {
    setRefazendo(true)
    setError('')
    try {
      const fresh = await generateGroupChallenge(groupId, challenge.leaderText, lang)
      setChallenge(fresh)
    } catch (err) {
      setError(L('regenerateError'))
    } finally {
      setRefazendo(false)
    }
  }

  async function handleAdjustDay(index) {
    setRegeneratingDay(index)
    setError('')
    try {
      const newDay = await regenerateChallengeDay(groupId, challenge.leaderText, lang)
      setChallenge(c => ({ ...c, days: c.days.map((d, i) => (i === index ? newDay : d)) }))
    } catch (err) {
      setError(L('regenerateError'))
    } finally {
      setRegeneratingDay(null)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError('')
    try {
      await publishGroupChallenge(groupId, challenge, proposal.startsAt, proposal.pauseGroupPlan)
      onPublished()
    } catch (err) {
      setError(L('publishError'))
    } finally {
      setPublishing(false)
    }
  }

  const days = challenge.days
  const visibleDays = expanded ? days : days.slice(0, COLLAPSED_COUNT)
  const minutesList = days.map(d => d.minutes)
  const books = [...new Set(days.map(d => (lang === 'en' ? (d.bookEn ?? d.book) : d.book)))]

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.headerTopRow}>
          <button type="button" style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="#fff" />
          </button>
          <p style={s.headerBadge}>{L('headerBadge')}</p>
          <button type="button" style={s.refazerBtn} onClick={handleRefazer} disabled={refazendo}>
            {refazendo ? L('regenerating') : L('refazerBtn')}
          </button>
        </div>
        <h1 style={s.title}>{challenge.title}</h1>
        <p style={s.subtitle}>
          {L('summaryLine', { days: days.length, min: Math.min(...minutesList), max: Math.max(...minutesList), books: books.join(', ') })}
        </p>
        <div style={s.explanationBlock}>
          <p style={s.explanationText}>{challenge.explanation}</p>
        </div>
      </div>

      <div style={s.body}>
        {error && <p style={s.errorText}>{error}</p>}
        <div style={s.card}>
          {visibleDays.map((day, i) => (
            <div key={i} style={{ ...s.dayRow, borderBottom: i === visibleDays.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
              <span style={s.dayIndex}>{L('dayShort', { n: i + 1 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.dayRef}>{dayRef(day, lang)}</p>
                <p style={s.daySub}>{day.dayTitle} · {L('minutesShort', { n: day.minutes })}</p>
              </div>
              {adjusting && (
                <button type="button" style={s.swapBtn} onClick={() => handleAdjustDay(i)} disabled={regeneratingDay !== null} aria-label={L('swapDayAria')}>
                  <AppIcon name="RefreshCw" size={14} color={regeneratingDay === i ? 'var(--bento-t5)' : 'var(--bento-t3)'} />
                </button>
              )}
            </div>
          ))}
        </div>

        {days.length > COLLAPSED_COUNT && (
          <button type="button" style={s.viewAllBtn} onClick={() => setExpanded(v => !v)}>
            {expanded ? L('showLessBtn') : L('viewAllDaysBtn', { n: days.length })}
            <AppIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={14} color="var(--bento-t3)" />
          </button>
        )}

        <div style={s.sandCard}>
          <p style={s.sandLabel}>{L('whenToPublishLabel')}</p>
          <p style={s.sandText}>{L('whenToPublishText', { n: memberCount })}</p>
        </div>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.adjustBtn} onClick={() => setAdjusting(v => !v)}>{L('adjustBtn')}</button>
        <button type="button" style={{ ...s.publishBtn, ...(publishing ? s.btnDisabled : {}) }} onClick={handlePublish} disabled={publishing}>
          {publishing ? L('publishing') : L('publishBtn')}
        </button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, padding: '24px 20px 20px', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', gap: 8 },
  headerTopRow: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerBadge: { flex: 1, fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  refazerBtn: { border: 'none', background: 'none', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.6)', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 23, fontWeight: 800, letterSpacing: '-.7px', lineHeight: 1.15, color: '#fff', margin: '4px 0 0' },
  subtitle: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  explanationBlock: { background: 'rgba(255,255,255,.07)', borderRadius: 16, padding: '14px 16px', marginTop: 6 },
  explanationText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.55, color: 'rgba(255,255,255,.85)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  errorText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--bento-destructive)', margin: 0 },
  card: { background: 'var(--bento-card)', borderRadius: 22, padding: '4px 18px' },
  dayRow: { display: 'flex', alignItems: 'center', gap: 14, minHeight: 54, padding: '10px 0' },
  dayIndex: { flexShrink: 0, width: 24, fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-t4)' },
  dayRef: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  daySub: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  swapBtn: { width: 30, height: 30, flexShrink: 0, border: 'none', background: 'var(--bento-line)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  viewAllBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, border: 'none', background: 'none', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer', padding: 6 },

  sandCard: { background: 'var(--bento-sand)', borderRadius: 20, padding: '16px 18px' },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 8px' },
  sandText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', gap: 10, padding: '14px 20px calc(14px + var(--safe-bottom))' },
  adjustBtn: { flexShrink: 0, height: 50, padding: '0 20px', border: 'none', borderRadius: 16, background: 'var(--bento-card)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  publishBtn: { flex: 1, height: 50, border: 'none', borderRadius: 16, background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  btnDisabled: { opacity: .6, cursor: 'default' },
}
