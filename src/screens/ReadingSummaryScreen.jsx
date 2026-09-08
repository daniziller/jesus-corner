// ReadingSummaryScreen.jsx — Antes de refletir (pacote 36-37, quadro 37e).
// Abre entre "Concluir"/"Finalizar por aqui" da leitura e a Reflexão (ver
// goToReflectionFrom/beginReflectionFromSummary em App.jsx) — não consome
// tempo de passo, é só transição. Cabeçalho segue o PNG, não o texto do
// handoff: eles divergem ("Leitura feita"/ícone areia com check/"passo N
// de M" no texto vs. "Antes de refletir"/seta simples/"N min lidos" no
// quadro) — ela escolheu seguir o PNG.
//
// Tese + 3 momentos + fio da história + "sobre Deus/personagem" + oração
// de transição vêm de api/generate-reading-summary.js (gerado por IA,
// cada momento verificado contra o texto real antes de aparecer — ver
// verifyMoments lá). "O que você marcou hoje"/"Suas anotações" vêm dos
// SEUS highlights de hoje neste capítulo (highlightsStore.js) — o mesmo
// highlight pode aparecer nos dois blocos (uma vez como o texto bíblico
// marcado, outra como a nota que você escreveu sobre ele, se escreveu).
// Qualquer bloco vazio (sem marcação, sem nota, ou o resumo indisponível)
// simplesmente não aparece.
import { useState, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { fetchReadingSummary } from '../aiChat/readingSummaryStore'
import { getHighlights } from '../highlights/highlightsStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { formatVerseRanges } from '../utils/verseRanges'
import { dateKey } from '../utils/dateKey'
import { WORDS_PER_MINUTE } from '../data/bibleBlocks'

function verseSpan(start, end) {
  return start === end ? `${start}` : `${start}-${end}`
}

export default function ReadingSummaryScreen({ session, authUser, descriptor, onBeginReflection, onBackToReading }) {
  const { lang } = session
  const L = (k, vars) => t(`readingSummary.${k}`, vars, lang)
  const email = authUser?.email

  const hasChapter = !!descriptor?.book && descriptor?.type !== 'reflection'
  const minutes = Math.max(1, Math.round((descriptor?.words ?? 0) / WORDS_PER_MINUTE))
  const chapterLabel = hasChapter ? `${descriptor.book} ${verseSpan(descriptor.chStart, descriptor.chEnd)}` : ''

  const [summary, setSummary] = useState(null)
  const [summaryFailed, setSummaryFailed] = useState(false)
  useEffect(() => {
    if (!hasChapter) return
    let cancelled = false
    fetchReadingSummary({ book: descriptor.book, bookEn: descriptor.bookEn, chStart: descriptor.chStart, chEnd: descriptor.chEnd, lang })
      .then(s => { if (!cancelled) setSummary(s) })
      .catch(() => { if (!cancelled) setSummaryFailed(true) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor?.book, descriptor?.chStart, descriptor?.chEnd])

  const [chapterVerseText, setChapterVerseText] = useState(null)
  const [highlights, setHighlights] = useState([])
  useEffect(() => {
    if (!hasChapter) return
    getHighlights(email).then(setHighlights).catch(() => setHighlights([]))
    const versionId = getSelectedVersionId(lang)
    fetchBookText(versionId, lang === 'en' ? (descriptor.bookEn || descriptor.book) : descriptor.book)
      .then(setChapterVerseText)
      .catch(() => setChapterVerseText(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor?.book, hasChapter])

  const todaysChapterHighlights = useMemo(() => {
    if (!hasChapter) return []
    const today = dateKey()
    return highlights.filter(h => !h.hidden && h.date === today && h.book === descriptor.book && h.chapter >= descriptor.chStart && h.chapter <= descriptor.chEnd)
  }, [highlights, hasChapter, descriptor])

  const markedItems = useMemo(() => {
    if (!chapterVerseText) return []
    return todaysChapterHighlights.map(h => {
      const chapterData = chapterVerseText[String(h.chapter)]
      const sorted = [...h.verses].sort((a, b) => a - b)
      const quote = sorted.map(v => chapterData?.verses?.[String(v)]).filter(Boolean).join(' ')
      return quote ? { id: h.id, quote, reference: `${descriptor.book} ${h.chapter}:${formatVerseRanges(h.verses)}` } : null
    }).filter(Boolean)
  }, [todaysChapterHighlights, chapterVerseText, descriptor])

  const noteItems = todaysChapterHighlights.filter(h => h.text?.trim())

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBackToReading} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{L('pageTitle')}</p>
          {hasChapter && <p style={styles.subtitle}>{chapterLabel} · {L('minutesRead', { n: minutes })}</p>}
        </div>
      </div>

      <div style={styles.body}>
        {summary && (
          <div style={styles.thesisCard}>
            <p style={styles.thesisLabel}>{L('thesisLabel')}</p>
            <p style={styles.thesisText}>{summary.thesis}</p>
          </div>
        )}

        {summary && (
          <div style={styles.card}>
            <p style={styles.sectionLabel}>{L('momentsLabel')}</p>
            {summary.moments.map((m, i) => (
              <div key={i} style={{ ...styles.momentRow, ...(i > 0 ? { borderTop: '1px solid var(--bento-line)' } : {}) }}>
                <div style={styles.momentMeta}>
                  <p style={styles.momentLabel}>{m.label}</p>
                  <p style={styles.momentVerses}>v. {verseSpan(m.verseStart, m.verseEnd)}</p>
                </div>
                <p style={styles.momentText}>{m.text}</p>
              </div>
            ))}
            <div style={styles.threadDivider} />
            <p style={styles.threadText}><span style={styles.threadStrong}>{L('threadLabel')}</span> {summary.threadOfStory}</p>
          </div>
        )}

        {summary && (
          <div style={styles.card}>
            <p style={styles.sectionLabel}>{L('showsLabel')}</p>
            <div style={styles.showsRow}>
              <p style={styles.showsKey}>{L('aboutGodLabel')}</p>
              <p style={styles.showsText}>{summary.aboutGod}</p>
            </div>
            <div style={{ ...styles.showsRow, borderTop: '1px solid var(--bento-line)' }}>
              <p style={styles.showsKey}>{L('aboutCharacterLabel', { name: summary.characterName })}</p>
              <p style={styles.showsText}>{summary.aboutCharacter}</p>
            </div>
          </div>
        )}

        {!summary && !summaryFailed && hasChapter && (
          <div style={styles.card}><p style={styles.loadingHint}>{L('loading')}</p></div>
        )}

        {markedItems.length > 0 && (
          <div style={styles.markedCard}>
            <div style={styles.markedHeader}>
              <p style={styles.markedLabel}>{L('markedLabel')}</p>
              <p style={styles.markedCount}>{L(markedItems.length === 1 ? 'markedCountOne' : 'markedCountMany', { n: markedItems.length })}</p>
            </div>
            {markedItems.map((m, i) => (
              <div key={m.id} style={{ ...styles.markedItem, ...(i > 0 ? { borderTop: '1px solid rgba(122,74,30,.18)' } : {}) }}>
                <p style={styles.markedQuote}>&ldquo;{m.quote}&rdquo;</p>
                <p style={styles.markedReference}>{m.reference}</p>
              </div>
            ))}
          </div>
        )}

        {noteItems.length > 0 && (
          <div style={styles.card}>
            <div style={styles.markedHeader}>
              <p style={styles.sectionLabel}>{L('notesLabel')}</p>
              <button type="button" style={styles.editLink} onClick={onBackToReading}>{L('editBtn')}</button>
            </div>
            {noteItems.map((h, i) => (
              <div key={h.id} style={{ ...styles.noteRow, ...(i > 0 ? { borderTop: '1px solid var(--bento-line)' } : {}) }}>
                <p style={styles.noteVerse}>v. {formatVerseRanges(h.verses)}</p>
                <p style={styles.noteText}>{h.text}</p>
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div style={styles.prayerCard}>
            <p style={styles.prayerLabel}><span style={styles.prayerDiamond} />{L('prayerLabel')}</p>
            <p style={styles.prayerText}>{summary.prayer}</p>
            <p style={styles.prayerHint}>{L('prayerHint')}</p>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.primaryBtn} onClick={onBeginReflection}>
          <span>{L('beginReflectionBtn')}</span>
          <span>→</span>
        </button>
        <button style={styles.backLink} onClick={onBackToReading}>{L('seeChapterAgainBtn')}</button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 17, fontWeight: 800, color: 'var(--bento-ink)', letterSpacing: '-.3px', margin: 0 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: '2px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 20px', display: 'flex', flexDirection: 'column', gap: 10 },

  thesisCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px' },
  thesisLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 10px' },
  thesisText: { fontFamily: FONT, fontSize: 23, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.5px', color: '#fff', margin: 0 },

  card: { borderRadius: 22, background: 'var(--bento-card)', padding: '18px 18px 16px' },
  sectionLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },

  momentRow: { display: 'flex', gap: 14, padding: '12px 0' },
  momentMeta: { flexShrink: 0, width: 92 },
  momentLabel: { fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-accent)', margin: '0 0 2px' },
  momentVerses: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t4)', margin: 0 },
  momentText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-ink)', margin: 0 },
  threadDivider: { height: 1, background: 'var(--bento-line)', margin: '10px 0 12px' },
  threadText: { fontFamily: FONT, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t2)', margin: 0 },
  threadStrong: { fontWeight: 800, color: 'var(--bento-ink)' },

  showsRow: { padding: '12px 0' },
  showsKey: { fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 4px' },
  showsText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t2)', margin: 0 },

  loadingHint: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  markedCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px' },
  markedHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  markedLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-ink)', margin: 0 },
  markedCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-ink)', margin: 0 },
  markedItem: { padding: '10px 0', borderLeft: '3px solid var(--bento-sand-icon)', paddingLeft: 12 },
  markedQuote: { fontFamily: FONT, fontSize: 14, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4, color: 'var(--bento-sand-ink-strong)', margin: '0 0 4px' },
  markedReference: { fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'var(--bento-sand-ink)', margin: 0 },

  editLink: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-accent)' },
  noteRow: { padding: '10px 0', display: 'flex', gap: 12 },
  noteVerse: { flexShrink: 0, width: 44, fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-t4)', margin: 0 },
  noteText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-ink)', margin: 0 },

  prayerCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '20px 22px', marginBottom: 8 },
  prayerLabel: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 12px' },
  prayerDiamond: { width: 8, height: 8, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  prayerText: { fontFamily: FONT, fontSize: 17, fontWeight: 500, lineHeight: 1.65, color: '#fff', margin: '0 0 14px' },
  prayerHint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', margin: 0 },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  primaryBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  backLink: { border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--bento-t4)', textAlign: 'center' },
}
