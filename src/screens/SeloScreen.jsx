// SeloScreen.jsx — Um selo (G10, HANDOFF §6.3): o que ficou de um livro
// terminado — o cartão na cor do bloco com sigla, posição e data,
// "{n} capítulos em {d} dias / {t} de leitura", o primeiro versículo que
// a pessoa marcou no livro (some sem marcação — nunca escolhe um por
// ela), as notas do livro, a reflexão do último dia, "Ler {Livro} de
// novo" e "Leituras deste livro" (até três pontos).
import { useEffect, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import { blockColorVar } from '../data/gamificationBlocks'
import { summarizeSeal, firstHighlightOf, countBookNotes, readingTimeSentence } from '../gamification/sealDetails'
import { formatInt, dayMonthYearShort } from '../gamification/format'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { getAllSessions } from '../metrics/sessionDurationStore'
import { getHighlights } from '../highlights/highlightsStore'
import { getNotes } from '../notes/notesStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { findBibleVersion } from '../data/bibleVersions'
import { dateKey } from '../utils/dateKey'
import { t } from '../i18n'

const FONT = 'var(--font-bento)'

async function loadVerse(highlight, lang) {
  const versionId = getSelectedVersionId(lang)
  const version = findBibleVersion(versionId)
  const bookKey = lang === 'en' ? (highlight.bookEn ?? highlight.book) : highlight.book
  const bookJson = await fetchBookText(versionId, bookKey)
  const verses = bookJson?.[String(highlight.chapter)]?.verses
  if (!verses) return null
  const nums = [...highlight.verses].sort((a, b) => a - b)
  const text = nums.map(n => verses[String(n)]).filter(Boolean).join(' ')
  if (!text) return null
  const refVerses = nums.length > 1 ? `${nums[0]}-${nums[nums.length - 1]}` : String(nums[0])
  return { text, ref: `${highlight.book} ${highlight.chapter}:${refVerses} · ${version.short}` }
}

export default function SeloScreen({ nome, session, gamification, onBack, onReadAgain, onOpenNotes }) {
  const { lang } = session
  const seal = gamification?.bookSeals?.[nome] ?? null
  const [details, setDetails] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.allSettled([getAllChapterReadRows(), getAllSessions(), getHighlights(), getNotes()]).then(async ([c, sRows, h, n]) => {
      const chapterRows = c.status === 'fulfilled' ? c.value : []
      const sessionRows = sRows.status === 'fulfilled' ? sRows.value : []
      const highlights = h.status === 'fulfilled' ? h.value : []
      const notes = n.status === 'fulfilled' ? n.value : {}
      const summary = summarizeSeal(nome, { seal, chapterRows, sessionRows })
      const highlight = firstHighlightOf(nome, highlights)
      let verse = null
      if (highlight) verse = await loadVerse(highlight, lang).catch(() => null)
      const lastDayKey = seal?.completedAt ? dateKey(new Date(seal.completedAt)) : null
      const hasLastReflection = !!(lastDayKey && notes[`reflection:${lastDayKey}`])
      if (alive) setDetails({ summary, verse, notesCount: countBookNotes(nome, notes), hasLastReflection })
    })
    return () => { alive = false }
  }, [nome, seal, lang])

  const sum = details?.summary
  const cor = sum ? blockColorVar(sum.blocoId) : 'var(--bento-ink)'

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <p style={s.title}>{nome}</p>
      </div>

      <div style={s.body}>
        {sum ? (
          <div style={{ ...s.sealCard, background: cor }}>
            <div style={s.sealHead}>
              <p style={s.sealKicker}>{sum.blocoNome.toUpperCase()} · {sum.posicao}/66</p>
              {sum.completedAt && sum.dateKnown && <p style={s.sealDate}>{dayMonthYearShort(sum.completedAt)}</p>}
            </div>
            <div style={s.sealMain}>
              <p style={s.sealSigla}>{sum.sigla}</p>
              <div style={s.sealStats}>
                <p style={s.sealStat}>{formatInt(sum.capitulos)} {sum.capitulos === 1 ? 'capítulo' : 'capítulos'}{sum.daysLabel ? ` em ${sum.daysLabel}` : ''}</p>
                {sum.seconds > 0 && <p style={s.sealStat}>{readingTimeSentence(sum.seconds)}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="rb-context-skeleton" style={{ ...s.sealCard, background: 'var(--bento-line)', height: 180 }} />
        )}

        {details?.verse && (
          <div style={s.verseCard}>
            <p style={s.verseLabel}>O VERSÍCULO QUE VOCÊ MARCOU</p>
            <p style={s.verseText}>&ldquo;{details.verse.text}&rdquo;</p>
            <p style={s.verseRef}>{details.verse.ref}</p>
          </div>
        )}

        <div style={s.list}>
          {details?.notesCount > 0 && (
            <button type="button" style={s.row} onClick={() => onOpenNotes?.()}>
              <span style={s.rowLabel}>Suas notas neste livro</span>
              <span style={s.rowRight}><span style={s.rowCount}>{formatInt(details.notesCount)}</span><span style={s.chevron}>›</span></span>
            </button>
          )}
          {details?.hasLastReflection && (
            <button type="button" style={{ ...s.row, ...(details?.notesCount > 0 ? s.rowDivider : {}) }} onClick={() => onOpenNotes?.()}>
              <span style={s.rowLabel}>Sua reflexão do último dia</span>
              <span style={s.chevron}>›</span>
            </button>
          )}
          <button type="button" style={{ ...s.row, ...((details?.notesCount > 0 || details?.hasLastReflection) ? s.rowDivider : {}) }} onClick={() => onReadAgain?.(nome)}>
            <span style={s.rowLabel}>Ler {nome} de novo</span>
            <span style={s.chevron}>›</span>
          </button>
        </div>

        <div style={s.readsCard}>
          <div>
            <p style={s.readsTitle}>Leituras deste livro</p>
            <p style={s.readsSub}>Ler de novo acrescenta um ponto ao selo</p>
          </div>
          <div style={s.dots} aria-label={`${sum?.readings ?? 1} ${(sum?.readings ?? 1) === 1 ? 'leitura' : 'leituras'}`}>
            {[1, 2, 3].map(i => <span key={i} style={{ ...s.dot, background: i <= (sum?.readings ?? 1) ? cor : 'var(--bento-toggle-off)' }} />)}
          </div>
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
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(var(--nav-height) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 },
  sealCard: { borderRadius: 26, padding: '18px 18px 20px' },
  sealHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 22 },
  sealKicker: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', margin: 0 },
  sealDate: { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)', margin: 0, flexShrink: 0 },
  sealMain: { display: 'flex', alignItems: 'center', gap: 18 },
  sealSigla: { fontFamily: FONT, fontSize: 58, fontWeight: 800, letterSpacing: '-3px', lineHeight: 0.9, color: '#fff', margin: 0 },
  sealStats: { display: 'flex', flexDirection: 'column', gap: 4 },
  sealStat: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,.9)', margin: 0 },
  verseCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px 18px' },
  verseLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 10px' },
  verseText: { fontFamily: FONT, fontSize: 16, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--bento-sand-ink-strong)', margin: '0 0 10px' },
  verseRef: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--bento-sand-label)', margin: 0 },
  list: { borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px' },
  row: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '18px 0', minHeight: 44, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  rowDivider: { borderTop: '1px solid var(--bento-line)' },
  rowLabel: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)' },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  rowCount: { fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'var(--bento-t3)' },
  chevron: { fontFamily: FONT, fontSize: 18, fontWeight: 600, lineHeight: 1, color: 'var(--bento-t5)' },
  readsCard: { borderRadius: 24, background: 'var(--bento-card)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  readsTitle: { fontFamily: FONT, fontSize: 15, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 3px' },
  readsSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  dots: { display: 'flex', gap: 6, flexShrink: 0 },
  dot: { width: 9, height: 9, borderRadius: '50%' },
}
