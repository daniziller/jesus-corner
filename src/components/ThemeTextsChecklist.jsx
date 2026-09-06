// Textos de um plano por tema, agrupados por livro, cada um com checkbox +
// tempo de leitura. Extraído de RoutineScreen.jsx (redesign 1c, que não
// mostra mais planos por tema) — usado por ThemePlanScreen.jsx.
import { useState } from 'react'
import { deriveThemeTexts, themeTextKey } from '../themePlans/themeTexts'
import { sessionKeys } from '../utils/progress'
import { groupSessionsByBook } from '../utils/groupByBook'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ThemeTextsChecklist({ plan, completedSet, todayThemePicks, lang, onOpenText, onAddToRoutine, onStartReading }) {
  const texts = deriveThemeTexts(plan.passages).map(s => ({
    ...s,
    status: sessionKeys(s).every(k => completedSet.has(k)) ? 'done' : 'pending',
  }))
  const initialKeys = todayThemePicks?.planId === plan.id ? todayThemePicks.keys ?? [] : []
  const [selected, setSelected] = useState(() => new Set(initialKeys))

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedTexts = texts.filter(s => s.status !== 'done' && selected.has(themeTextKey(s)))
  const totalMinutes = selectedTexts.reduce((sum, s) => sum + s.minutes, 0)
  const bookGroups = groupSessionsByBook(texts)

  return (
    <>
      <p style={styles.chipsLabel}>{t('themePlan.textsLabel', undefined, lang)}</p>
      <p style={styles.textsInstructions}>{t('themePlan.textsInstructions', undefined, lang)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {bookGroups.map(group => (
          <div key={group.book} style={styles.textGroup}>
            <p style={styles.textGroupHeader}>{lang === 'en' ? group.sessions[0]?.bookEn : group.book}</p>
            {group.sessions.map(s => {
              const key = themeTextKey(s)
              const isDone = s.status === 'done'
              const isChecked = !isDone && selected.has(key)
              return (
                <div key={s.id} style={styles.textRow}>
                  <span
                    role={isDone ? undefined : 'checkbox'}
                    aria-checked={isChecked}
                    style={{ ...styles.textCheckbox, ...(isDone ? styles.textCheckboxDone : isChecked ? styles.textCheckboxChecked : {}) }}
                    onClick={() => !isDone && toggle(key)}
                  >
                    {isDone && <AppIcon name="Check" size={13} color="white" />}
                    {!isDone && isChecked && <AppIcon name="Check" size={13} color="white" />}
                  </span>
                  <button style={styles.textInfo} onClick={() => onOpenText?.(key)}>
                    <span style={styles.textTitle}>{lang === 'en' ? s.titleEn : s.title}</span>
                    <span style={styles.textMinutes}>{t('themePlan.minutesEach', { n: s.minutes }, lang)}</span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={styles.todaySummary}>
        <span style={styles.todaySummaryText}>
          {t('themePlan.todaySummary', { minutes: totalMinutes, count: selectedTexts.length }, lang)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button
          style={{ ...styles.addToRoutineBtn, ...(selectedTexts.length === 0 ? styles.addToRoutineBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onAddToRoutine?.([...selected])}
        >
          {t('themePlan.addToRoutineCta', undefined, lang)}
        </button>
        <button
          style={{ ...styles.startTodayBtn, ...(selectedTexts.length === 0 ? styles.startTodayBtnDisabled : {}) }}
          disabled={selectedTexts.length === 0}
          onClick={() => onStartReading?.([...selected])}
        >
          {t('themePlan.startTodayCta', undefined, lang)} <AppIcon name="ChevronRight" size={14} color="white" />
        </button>
      </div>
    </>
  )
}

const styles = {
  chipsLabel:      { fontFamily: 'var(--font-bento)', fontSize: 9.5, fontWeight: 800, color: 'var(--bento-t4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textsInstructions: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', lineHeight: 1.45, marginTop: -6, marginBottom: 10 },
  textGroup:       { background: 'var(--bento-card)', border: '1px solid var(--bento-line)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  textGroupHeader: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 700, color: 'var(--bento-t3)', marginBottom: 2 },
  textRow:         { display: 'flex', alignItems: 'center', gap: 9 },
  textCheckbox:    { width: 24, height: 24, borderRadius: 7, border: '1.5px solid var(--bento-t5)', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' },
  textCheckboxChecked: { background: '#A21CAF', borderColor: '#A21CAF' },
  textCheckboxDone:    { background: 'var(--bento-ink)', borderColor: 'transparent', cursor: 'default' },
  textInfo:        { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-bento)', padding: 0 },
  textTitle:       { fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)' },
  textMinutes:     { fontSize: 9.5, fontWeight: 500, color: 'var(--bento-t3)' },
  todaySummary:      { display: 'flex', alignItems: 'center', gap: 10, background: '#FAE8FF', border: '0.5px solid rgba(162,28,175,.25)', borderRadius: 13, padding: '10px 10px 10px 13px' },
  todaySummaryText:  { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: '#A21CAF' },
  startTodayBtn:     { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-bento)', background: '#A21CAF' },
  startTodayBtnDisabled: { background: 'var(--bento-t5)', cursor: 'default' },
  addToRoutineBtn:   { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: '0.5px solid rgba(162,28,175,.35)', borderRadius: 10, padding: '10px 13px', fontSize: 11.5, fontWeight: 700, color: '#A21CAF', cursor: 'pointer', fontFamily: 'var(--font-bento)', background: 'var(--bento-card)' },
  addToRoutineBtnDisabled: { color: 'var(--bento-t4)', borderColor: 'var(--bento-t5)', cursor: 'default' },
}
