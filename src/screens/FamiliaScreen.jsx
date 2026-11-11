// FamiliaScreen.jsx — Uma família (G6, HANDOFF §5.5): o que ela mede, e os
// seis degraus um por linha, com mês/ano em que cada um foi ganho, "{atual}
// de {limiar}" no próximo (único com barra) e "—" nos seguintes. O mesmo
// layout serve às cinco famílias.
import { useEffect, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import Medalha from '../components/gamificacao/Medalha'
import { familyById, familyAchievementId } from '../data/achievements'
import { loadGamificationStats } from '../gamification/evaluate'
import { earnedAtOf } from '../gamification/achievementsMath'
import { formatInt, deOf, monthYearShort } from '../gamification/format'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

// `mede` pode trazer **negrito** (ex.: "não precisam ser seguidas").
function RichText({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') ? <strong key={i} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  )
}

export default function FamiliaScreen({ familyId, session, completedSet, gamification, onBack }) {
  const { lang, dailyRoutine, weeklyGoalDays } = session
  const fam = familyById(familyId)
  const store = gamification?.achievements ?? {}
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays }).then(d => { if (alive) setData(d) }).catch(err => console.error('[família] carregar', err))
    return () => { alive = false }
  }, [completedSet, dailyRoutine, weeklyGoalDays])

  if (!fam) return null
  const st = data?.states.families.find(f => f.id === fam.id)
  const earnedN = fam.degraus.filter(d => store[familyAchievementId(fam.id, d.degrau)]).length
  const nextDegrau = earnedN + 1

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{fam.nome}</p>
        <p style={s.count}>{earnedN} de 6</p>
      </div>

      <div style={s.body}>
        <div style={s.sandCard}><p style={s.sandText}><RichText text={fam.mede} /></p></div>

        <div style={s.card}>
          {fam.degraus.map((d, i) => {
            const id = familyAchievementId(fam.id, d.degrau)
            const ganha = !!store[id]
            const isNext = !ganha && d.degrau === nextDegrau
            const distante = !ganha && !isNext
            const earnedAt = earnedAtOf(store, id)
            return (
              <div key={d.degrau} style={{ ...s.row, ...(i > 0 ? s.rowDivider : {}) }}>
                <Medalha familia={fam.id} degrau={d.degrau} size={58} ganha={ganha} />
                <div style={s.rowMain}>
                  <p style={{ ...s.rowName, color: distante ? 'var(--bento-t4)' : 'var(--bento-ink)' }}>{d.nome}</p>
                  <p style={s.rowLimiar}>{formatInt(d.limiar)} {d.limiar === 1 ? fam.unidadeSingular : fam.unidade}</p>
                  {isNext && st && (
                    <span style={s.bar}><span style={{ ...s.barFill, width: `${Math.round(st.progress * 100)}%` }} /></span>
                  )}
                </div>
                <div style={s.rowRight}>
                  {ganha && earnedAt && <p style={s.rowDate}>{monthYearShort(earnedAt)}</p>}
                  {isNext && st && <p style={s.rowNext}>{deOf(st.value, d.limiar)}</p>}
                  {distante && <p style={s.rowDash}>—</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 12px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  count: { fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-t3)', margin: 0 },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  sandCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px' },
  sandText: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: 0 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '6px 18px' },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', minHeight: 44 },
  rowDivider: { borderTop: '1px solid var(--bento-line)' },
  rowMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  rowName: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, margin: 0 },
  rowLimiar: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  bar: { display: 'block', height: 6, borderRadius: 99, background: 'var(--bento-line)', overflow: 'hidden', marginTop: 6 },
  barFill: { display: 'block', height: '100%', borderRadius: 99, background: 'var(--bento-accent)' },
  rowRight: { flexShrink: 0, textAlign: 'right' },
  rowDate: { fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', margin: 0 },
  rowNext: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-accent)', margin: 0 },
  rowDash: { fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t5)', margin: 0 },
}
