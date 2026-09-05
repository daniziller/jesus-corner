// RoutineCompleteScreen.jsx — Rotina concluída (quadro 21c), fecha o dia
// guiado. Tela inteiramente escura, como 13a e 15e — as três telas que
// fecham um ciclo. Só chega aqui pelo fim da rotina guiada (ver
// App.jsx/advanceGuided) — nunca por navegação direta, e nunca fala de
// "sequência": a meta é semanal, e um dia perdido não aparece aqui
// (README §18 "Sobre culpa e constância").
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { formatToday } from './HomeScreen'
import { getSavedPrayerMinutes } from '../prayer/prayerDurationStore'
import { getSavedReflectionMinutes } from '../reflection/reflectionDurationStore'
import { getHighlights } from '../highlights/highlightsStore'

const FONT = 'var(--font-bento)'
const ORDINAL_KEYS = ['ordinal1', 'ordinal2', 'ordinal3', 'ordinal4', 'ordinal5', 'ordinal6', 'ordinal7']

// steps: quais dos 3 passos guiados (App.jsx/GUIDED_STEPS) entraram nessa
// rotina — só esses viram linha no resumo. readingSession: a leitura que
// ACABOU de ser concluída (App.jsx/lastReadSession, capturado antes de
// avançar pra este passo — session.todaySession já teria virado a PRÓXIMA
// sessão a essa altura).
export default function RoutineCompleteScreen({ session, authUser, steps, readingSession, onBack, onOpenGroupRoom }) {
  const { lang } = session
  const L = (k, vars) => t(`routineComplete.${k}`, vars, lang)

  // Contagem de marcações no capítulo lido — buscada aqui (não recebida de
  // App.jsx, que não mantém as marcações em memória fora da tela de
  // Leitura) pra "Leitura" mostrar um número real, não inventado.
  const [highlights, setHighlights] = useState(null)
  useEffect(() => {
    let cancelled = false
    getHighlights(authUser?.email).then(list => { if (!cancelled) setHighlights(list) }).catch(() => { if (!cancelled) setHighlights([]) })
    return () => { cancelled = true }
  }, [authUser?.email])

  const stepMin = {
    prayer: getSavedPrayerMinutes() ?? session.plan.prayerMinutes,
    reading: session.activePlan.readingMinutes,
    reflection: getSavedReflectionMinutes() ?? session.plan.reflectionMinutes,
  }
  const totalMinutes = steps.reduce((sum, s) => sum + (stepMin[s] ?? 0), 0)

  const daysMet = session.weekGoalDaysMet ?? 0
  const goalDays = session.weeklyGoalDays ?? 5
  const remaining = Math.max(0, goalDays - daysMet)
  const dow = new Date().getDay() === 0 ? 7 : new Date().getDay()
  const ordinal = L(ORDINAL_KEYS[dow - 1])
  const weekMessage = remaining > 0
    ? L('weekMessageRemaining', { ordinal, remaining })
    : L('weekMessageMet')

  const rows = []
  if (steps.includes('prayer')) {
    rows.push({ key: 'prayer', label: L('prayerRowLabel'), value: L('prayerRowValue', { n: stepMin.prayer }) })
  }
  if (steps.includes('reading')) {
    if (readingSession?.book && readingSession.type !== 'reflection') {
      const bookLabel = lang === 'en' ? (readingSession.bookEn || readingSession.book) : readingSession.book
      const ref = `${bookLabel} ${readingSession.chStart}${readingSession.chStart !== readingSession.chEnd ? `–${readingSession.chEnd}` : ''}`
      const markCount = (highlights ?? []).filter(h => !h.hidden && h.book === readingSession.book && h.chapter >= readingSession.chStart && h.chapter <= readingSession.chEnd).length
      rows.push({ key: 'reading', label: L('readingRowLabel'), value: markCount > 0 ? L('readingRowValueWithMarks', { ref, n: markCount }) : L('readingRowValue', { ref }) })
    } else if (readingSession?.book) {
      const bookLabel = lang === 'en' ? (readingSession.bookEn || readingSession.book) : readingSession.book
      rows.push({ key: 'reading', label: L('readingRowLabel'), value: L('readingRowValue', { ref: bookLabel }) })
    } else {
      rows.push({ key: 'reading', label: L('readingRowLabel'), value: L('readingRowValueGeneric') })
    }
  }
  if (steps.includes('reflection')) {
    rows.push({ key: 'reflection', label: L('reflectionRowLabel'), value: L('reflectionRowValue') })
  }

  const myGroup = session.myGroups?.[0] ?? null

  return (
    <div style={s.screen}>
      <div style={s.body}>
        <div style={s.checkTile}><AppIcon name="Check" size={22} strokeWidth={2.8} color="var(--bento-ink)" /></div>
        <p style={s.date}>{formatToday(lang)}</p>
        <p style={s.title}>{L('title', { n: totalMinutes })}</p>
        <p style={s.weekMessage}>{weekMessage}</p>

        <div style={s.rows}>
          {rows.map(r => (
            <div key={r.key} style={{ ...s.row, ...(r.key === 'reflection' ? s.rowAccent : {}) }}>
              <span style={{ ...s.rowLabel, ...(r.key === 'reflection' ? { color: 'var(--bento-accent)' } : {}) }}>{r.label}</span>
              <span style={s.rowValue}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={s.weekBar}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                ...s.weekCell,
                background: i >= goalDays ? 'rgba(255,255,255,.06)' : i < daysMet ? 'var(--bento-accent)' : 'rgba(255,255,255,.12)',
              }}
            />
          ))}
        </div>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.primaryBtn} onClick={onBack}>{L('backHomeBtn')}</button>
        {myGroup && readingSession?.book && readingSession.type !== 'reflection' && (
          <button
            type="button"
            style={s.secondaryBtn}
            onClick={() => onOpenGroupRoom?.({ group: myGroup, book: readingSession.book, bookEn: readingSession.bookEn, chapter: readingSession.chStart })}
          >
            {L('viewGroupCommentsBtn')}
          </button>
        )}
      </div>
    </div>
  )
}

// Medidas do quadro 21c.
const s = {
  screen: { height: '100%', background: 'var(--bento-ink)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '56px 26px 0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  checkTile: { width: 56, height: 56, borderRadius: 19, background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 0 26px' },
  date: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 12px' },
  title: { fontFamily: FONT, fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.7px', color: '#fff', margin: '0 0 14px', textWrap: 'pretty' },
  weekMessage: { fontFamily: FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,.55)', margin: '0 0 28px', textWrap: 'pretty' },
  rows: { display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 auto' },
  row: { borderRadius: 18, background: 'rgba(255,255,255,.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  rowAccent: { background: 'rgba(240,102,43,.14)' },
  rowLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', width: 72, flexShrink: 0 },
  rowValue: { flex: 1, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, color: '#fff' },
  weekBar: { display: 'flex', gap: 6, margin: '0 0 24px' },
  weekCell: { flex: 1, height: 10, borderRadius: 99, transition: 'background .3s' },
  footer: { flex: 'none', padding: '0 26px calc(30px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  primaryBtn: { height: 56, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: FONT, fontSize: 16, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  secondaryBtn: { height: 56, borderRadius: 18, border: 'none', background: 'rgba(255,255,255,.07)', fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.85)', cursor: 'pointer' },
}
