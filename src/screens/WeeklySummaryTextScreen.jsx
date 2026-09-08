// WeeklySummaryTextScreen.jsx — "O resumo escrito pela IA" (quadro 31b,
// Bloco 13). Segunda das 3 telas — o texto vem PRONTO de
// user_data.weekly_summaries.summary (gerado uma vez pelo cron, ver
// generateWeeklySummaryText em api/_lib/ai.js); esta tela só mostra, nunca
// gera nada na hora.
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekPickerSheet from '../components/WeekPickerSheet'
import { weekRangeLabel, chaptersRangeLabel } from '../recap/weeklySummaryMath'

const FONT = 'var(--font-bento)'

// "Gênesis 40 e 41 · ver todas" (31b, "O que você anotou") — o app só
// manda `ref` como STRING pronta por nota ("Livro N" ou "Livro N–M", ver
// collectWeekNotes em api/send-weekly-digest.js), sem book/capítulo cru;
// pra juntar as até 3 notas da semana numa frase só, reconstrói livro +
// capítulos a partir do texto do ref (separa pelo último espaço) e junta
// os capítulos por livro numa lista natural ("40 e 41"). Nota sem ref
// (reflexão diária) não entra na conta — some da frase, não quebra.
function parseNoteRef(ref) {
  if (!ref) return null
  const lastSpace = ref.lastIndexOf(' ')
  if (lastSpace === -1) return null
  const book = ref.slice(0, lastSpace)
  const chPart = ref.slice(lastSpace + 1)
  const bounds = chPart.split('–').map(Number)
  if (bounds.some(Number.isNaN)) return null
  const [start, end = start] = bounds
  return { book, chapters: Array.from({ length: end - start + 1 }, (_, i) => start + i) }
}

function joinChapterList(nums, lang) {
  const strs = nums.map(String)
  if (strs.length <= 1) return strs[0] ?? ''
  const sep = lang === 'en' ? ' and ' : ' e '
  return `${strs.slice(0, -1).join(', ')}${sep}${strs[strs.length - 1]}`
}

function noteSourceLine(noteQuotes, lang) {
  const byBook = new Map()
  for (const q of noteQuotes) {
    const parsed = parseNoteRef(q.ref)
    if (!parsed) continue
    const set = byBook.get(parsed.book) ?? new Set()
    parsed.chapters.forEach(c => set.add(c))
    byBook.set(parsed.book, set)
  }
  if (byBook.size === 0) return null
  return [...byBook.entries()]
    .map(([book, chSet]) => `${book} ${joinChapterList([...chSet].sort((a, b) => a - b), lang)}`)
    .join(', ')
}

export default function WeeklySummaryTextScreen({ session, summaries, selectedIndex, onSelectWeek, onBack, onOpenPrayerGroup, onOpenLibrary }) {
  const lang = session.lang
  const L = (k, vars) => t(`weeklySummary.${k}`, vars, lang)
  const [pickerOpen, setPickerOpen] = useState(false)

  const current = summaries[selectedIndex] ?? null
  if (!current) return null

  const readingMinutes = Math.round((current.stepSeconds.reading ?? 0) / 60)
  const chaptersLabel = chaptersRangeLabel(current.chapters, lang)
  const daysWithReading = Math.min(current.chapters.length, 7) // segmentos simples, ver nota no JSX

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <div>
            <p style={s.title}>{L('pageTitle')}</p>
            <p style={s.dateRange}>{weekRangeLabel(current.startKey, current.endKey, lang)}</p>
          </div>
        </div>
        {summaries.length > 1 && (
          <button style={s.weeksChip} onClick={() => setPickerOpen(true)}>
            <span>{L('weeksChip')}</span>
            <AppIcon name="ChevronDown" size={11} strokeWidth={2.6} color="var(--bento-t3)" />
          </button>
        )}
      </div>

      <div style={s.body}>
        <div style={s.darkCard}>
          <div style={s.darkLabelRow}>
            <span style={s.diamond} />
            <p style={s.darkLabel}>{L('writtenByAiLabel')}</p>
          </div>
          <p style={s.openingParagraph}>{current.summary.openingParagraph}</p>
          <p style={s.closingParagraph}>{current.summary.closingParagraph}</p>
        </div>

        {current.chapters.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeadRow}>
              <p style={s.cardLabel}>{L('readingLabel')}</p>
              <span style={s.cardHeadValue}>{L('minutesReadingValue', { n: readingMinutes })}</span>
            </div>
            <p style={s.readingTitle}>{L('chaptersCountLabel', { n: current.chapters.length })}{chaptersLabel ? ` · ${chaptersLabel}` : ''}</p>
            {/* Segmentos simples (não é "dias marcados" — ver 31a pra isso):
                cada capítulo lido vira um segmento, até 7, só pra dar uma
                textura visual de progresso; sem quadro que peça mais precisão. */}
            <div style={{ display: 'flex', gap: 5, height: 8 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 99, background: i < daysWithReading ? 'var(--bento-accent)' : 'var(--bento-line)' }} />
              ))}
            </div>
          </div>
        )}

        {current.noteQuotes.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeadRow}>
              <p style={s.cardLabel}>{L('whatYouWroteLabel')}</p>
              <span style={s.cardHeadValue}>{t(current.notesCount === 1 ? 'weeklySummary.notesCountOne' : 'weeklySummary.notesCountMany', { n: current.notesCount }, lang)}</span>
            </div>
            {current.noteQuotes.map((q, i) => (
              <div key={i}>
                <p style={s.quote}>"{q.text}"</p>
                {i < current.noteQuotes.length - 1 && <div style={s.divider} />}
              </div>
            ))}
            {onOpenLibrary && (
              <button type="button" style={s.viewAllBtn} onClick={onOpenLibrary}>
                {noteSourceLine(current.noteQuotes, lang) ? `${noteSourceLine(current.noteQuotes, lang)} · ${L('viewAllNotesBtn')}` : L('viewAllNotesBtn')}
              </button>
            )}
          </div>
        )}

        {current.applicationsTotal > 0 && (
          <div style={s.sandCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.sandLabel}>{L('applicationsLabel')}</p>
              <p style={s.sandNumber}>{L('metOfTotal', { met: current.applicationsFulfilled, total: current.applicationsTotal })}</p>
            </div>
            {current.applicationText && (
              <p style={s.sandText}>{L('applicationStuckLine', { text: current.applicationText })}</p>
            )}
          </div>
        )}
      </div>

      <div style={s.footer}>
        <button style={s.nextBtn} onClick={onOpenPrayerGroup}>
          <span>{L('prayerAndGroupBtn')}</span>
          <span style={{ color: 'var(--bento-accent)' }}>→</span>
        </button>
      </div>

      {pickerOpen && (
        <WeekPickerSheet lang={lang} summaries={summaries} selectedIndex={selectedIndex} onSelect={onSelectWeek} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  dateRange: { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  weeksChip: { flexShrink: 0, height: 34, border: 'none', borderRadius: 12, background: 'var(--bento-card)', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', cursor: 'pointer', fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-ink)' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px', display: 'flex', flexDirection: 'column', gap: 8 },

  darkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22 },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  diamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  openingParagraph: { fontFamily: FONT, fontSize: 15, fontWeight: 600, lineHeight: 1.6, color: 'rgba(255,255,255,.92)', margin: '0 0 12px', textWrap: 'pretty' },
  closingParagraph: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: 0 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 20px' },
  cardHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  cardHeadValue: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t3)' },
  readingTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: '0 0 10px' },

  quote: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--bento-ink)', margin: '0 0 10px', textWrap: 'pretty' },
  divider: { height: 1, background: 'var(--bento-line)', margin: '0 0 10px' },
  viewAllBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--bento-t5)' },

  sandCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  sandLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 7px' },
  sandNumber: { fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '-.9px', color: 'var(--bento-sand-ink-strong)', margin: 0 },
  sandText: { flex: 1, fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flexShrink: 0, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  nextBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: '#fff' },
}
