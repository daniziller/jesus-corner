// ReadingOrganizeScreen.jsx — "Leitura da Bíblia" (turno 35, Bloco 1,
// handoff-meu-plano-35/, tela 35i). Aberta de "Organizar a leitura" em
// 35c (AdjustPlanScreen.jsx). Onde começar, em que ordem (canônica/
// cronológica/minha ordem — NUNCA reseta progresso, ver bibleOrderMath.js),
// ritmo aprendido e dias da Bíblia.
//
// "Minha ordem" (a pessoa monta a fila dos livros): o pacote de design não
// trouxe uma tela própria pra isso (só cita "tela de ordem dos livros,
// 28c" como referência futura) — a lista de reordenar abaixo é composição
// nossa, no sistema visual Bento, não um quadro fiel a um handoff (decisão
// tomada com a autora ao começar este bloco).
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekdayChipRow from '../components/WeekdayChipRow'
import { splitBold } from '../utils/boldSubstring'
import { getStepDays, setStepDays as persistStepDays } from '../routine/stepDaysStore'
import { getBibleOrderMode, setBibleOrderMode, getCustomBookOrder, setCustomBookOrder, resolveBookOrder, canonicalBookOrder, resolveNextChapter } from '../reading/bibleOrderStore'
import { getReadingPaceSessions, getUseLearnedPace, setUseLearnedPace } from '../reading/readingPaceStore'
import { estimateReadingPace, earlyReadingPace, chaptersPerSession } from '../reading/readingPaceMath'
import { computeProjection, totalBibleChapters } from '../plan/readingProjection'
import { BIBLE_TOTAL_WORDS } from '../data/bibleBlocks'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'

const AVG_WORDS_PER_CHAPTER = BIBLE_TOTAL_WORDS / totalBibleChapters()

function renderBold(text, boldPart) {
  return splitBold(text, boldPart).map((part, i) =>
    typeof part === 'string' ? <span key={i}>{part}</span> : <strong key={i} style={{ fontWeight: 800, color: 'var(--bento-sand-icon)' }}>{part.bold}</strong>
  )
}

export default function ReadingOrganizeScreen({ session, completedSet, blocks, bookChapterCounts, stepMinutes, onSetStartPosition, onNavigate, onBack }) {
  const { lang, plan } = session
  const readingMinutes = stepMinutes?.reading ?? plan.readingMinutes ?? 15
  const L = (k, vars) => t(`readingOrganize.${k}`, vars, lang)

  const [stepDays, setStepDaysState] = useState(null)
  const [orderMode, setOrderMode] = useState('canonical')
  const [customOrder, setCustomOrderState] = useState(null)
  const [position, setPosition] = useState(null)
  const [paceSessions, setPaceSessions] = useState([])
  const [useLearnedPace, setUseLearnedPaceState] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    getReadingPaceSessions().then(setPaceSessions).catch(() => {})
    getUseLearnedPace().then(setUseLearnedPaceState).catch(() => {})
    Promise.all([getBibleOrderMode(), getCustomBookOrder()]).then(([mode, custom]) => {
      setOrderMode(mode)
      setCustomOrderState(custom ?? canonicalBookOrder())
      setPosition(resolveNextChapter(completedSet, resolveBookOrder(mode, custom), bookChapterCounts))
    }).catch(() => {})
  }, [])

  function refreshPosition(mode, custom) {
    setPosition(resolveNextChapter(completedSet, resolveBookOrder(mode, custom), bookChapterCounts))
  }

  function chooseOrder(mode) {
    setOrderMode(mode)
    setBibleOrderMode(mode).catch(err => console.error('Failed to persist bible order mode', err))
    refreshPosition(mode, customOrder)
  }

  function moveBook(index, delta) {
    const next = [...customOrder]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setCustomOrderState(next)
    setCustomBookOrder(next).catch(err => console.error('Failed to persist custom book order', err))
    if (orderMode === 'custom') refreshPosition('custom', next)
  }

  const daysCount = stepDays ? stepDays.reading.filter(Boolean).length : 0
  const proj = stepDays
    ? computeProjection({ completedSet, readingMinutesPerDay: readingMinutes, weeklyDays: stepDays.reading, lang })
    : null

  const pace = estimateReadingPace(paceSessions)
  const early = earlyReadingPace(paceSessions)
  // "1,4 capítulo por 15 min" (35i) é uma referência fixa de 15 min, pra
  // comparar ritmos entre si sem depender de quanto a pessoa configurou.
  // "Hoje daria X em Y min" usa os minutos REAIS configurados pra leitura.
  const chaptersFor15 = chaptersPerSession(pace.wordsPerMinute, 15, AVG_WORDS_PER_CHAPTER)
  const chaptersToday = chaptersPerSession(pace.wordsPerMinute, readingMinutes, AVG_WORDS_PER_CHAPTER)

  const versionId = getSelectedVersionId(lang)
  const version = findBibleVersion(versionId)
  const versions = BIBLE_VERSIONS[lang] ?? []

  const bookOrderNow = customOrder ?? canonicalBookOrder()

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div>
          <p style={styles.headerTitle}>{L('title')}</p>
          <p style={styles.headerSubtitle}>{L('subtitle')}</p>
        </div>
      </div>

      <div style={styles.body}>
        {/* Onde começar */}
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('whereToStartLabel')}</p>
          <div style={styles.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.rowTitle}>{position ? `${position.book} ${position.chapter}` : L('bibleComplete')}</p>
              <p style={styles.rowSub}>{L('fromWhereYouStopped')}</p>
            </div>
            <button style={styles.linkBtn} onClick={() => setPickerOpen(true)}>{L('choose')}</button>
          </div>
          <div style={styles.divider} />
          <div style={styles.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.rowTitle}>{L('versionLabel')}</p>
              <p style={styles.rowSub}>{version ? `${version.short} · ${version.label}` : ''}</p>
            </div>
            <button style={styles.linkBtn} onClick={() => setVersionOpen(v => !v)}>{L('change')}</button>
          </div>
          {versionOpen && (
            <div style={styles.versionList}>
              {versions.map(v => (
                <button key={v.id} style={styles.versionRow} onClick={() => { setSelectedVersionId(lang, v.id); setVersionOpen(false) }}>
                  <span style={{ ...styles.radio, ...(v.id === versionId ? styles.radioOn : {}) }}>{v.id === versionId && <span style={styles.radioDot} />}</span>
                  <span style={styles.versionLabel}>{v.short} · {v.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Em que ordem */}
        <div style={styles.card}>
          <p style={styles.sectionLabel}>{L('orderLabel')}</p>
          {[
            { key: 'canonical', title: 'orderCanonicalTitle', sub: 'orderCanonicalSub' },
            { key: 'chronological', title: 'orderChronologicalTitle', sub: 'orderChronologicalSub' },
            { key: 'custom', title: 'orderCustomTitle', sub: 'orderCustomSub' },
          ].map(opt => {
            const on = orderMode === opt.key
            return (
              <button key={opt.key} style={{ ...styles.orderOption, ...(on ? styles.orderOptionOn : {}) }} onClick={() => chooseOrder(opt.key)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...styles.orderTitle, color: on ? '#fff' : 'var(--bento-ink)' }}>{L(opt.title)}</p>
                  <p style={{ ...styles.orderSub, color: on ? 'rgba(255,255,255,.55)' : 'var(--bento-t3)' }}>{L(opt.sub)}</p>
                </div>
                {on && <AppIcon name="Check" size={16} strokeWidth={2.5} color="var(--bento-accent)" />}
              </button>
            )
          })}
          <p style={styles.hint}>{L('orderHint')}</p>

          {orderMode === 'custom' && (
            <div style={styles.customOrderBox}>
              <p style={styles.hint}>{L('customOrderHint')}</p>
              <div style={styles.customOrderList}>
                {bookOrderNow.map((book, i) => (
                  <div key={book} style={styles.customOrderRow}>
                    <span style={styles.customOrderIdx}>{i + 1}</span>
                    <span style={styles.customOrderName}>{book}</span>
                    <div style={styles.customOrderArrows}>
                      <button style={styles.arrowBtn} onClick={() => moveBook(i, -1)} disabled={i === 0} aria-label="up">
                        <AppIcon name="ChevronUp" size={14} strokeWidth={2.4} color="var(--bento-ink)" />
                      </button>
                      <button style={styles.arrowBtn} onClick={() => moveBook(i, 1)} disabled={i === bookOrderNow.length - 1} aria-label="down">
                        <AppIcon name="ChevronDown" size={14} strokeWidth={2.4} color="var(--bento-ink)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seu ritmo de leitura */}
        <div style={styles.darkCard}>
          <div style={styles.darkLabelRow}>
            <span style={styles.darkDiamond} />
            <p style={styles.darkLabel}>{L('paceLabel')}</p>
          </div>
          <p style={styles.paceValue}>{L('paceValue', { chapters: chaptersFor15, min: 15 })}</p>
          <p style={styles.darkHint}>
            {pace.isColdStart ? L('paceHintColdStart') : L('paceHintAvg', { n: pace.sampleCount })}
            {!pace.isColdStart && early != null && early !== pace.wordsPerMinute && (
              <>
                {' '}
                {pace.wordsPerMinute > early
                  ? L('paceHintImproved', { early: chaptersPerSession(early, 15, AVG_WORDS_PER_CHAPTER) })
                  : L('paceHintSlower', { early: chaptersPerSession(early, 15, AVG_WORDS_PER_CHAPTER) })}
              </>
            )}
          </p>
          <div style={styles.darkDivider} />
          <div style={styles.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...styles.rowTitle, color: '#fff' }}>{L('paceToggleTitle')}</p>
              <p style={{ ...styles.rowSub, color: 'rgba(255,255,255,.5)' }}>
                {useLearnedPace ? L('paceToggleOnSub', { chapters: chaptersToday, min: readingMinutes }) : L('paceToggleOffSub')}
              </p>
            </div>
            <button
              role="switch" aria-checked={useLearnedPace}
              onClick={() => { const next = !useLearnedPace; setUseLearnedPaceState(next); setUseLearnedPace(next).catch(() => {}) }}
              style={{ ...styles.switch, background: useLearnedPace ? 'var(--bento-accent)' : 'rgba(255,255,255,.15)', justifyContent: useLearnedPace ? 'flex-end' : 'flex-start' }}
            >
              <span style={styles.switchThumb} />
            </button>
          </div>
        </div>

        {/* Dias da Bíblia */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          <div style={styles.stepsHead}>
            <p style={{ ...styles.sectionLabel, color: 'var(--bento-sand-label)' }}>{L('daysLabel')}</p>
            <p style={styles.sandCount}>{L('daysCountMany', { n: daysCount })}</p>
          </div>
          <p style={{ ...styles.hint, color: 'var(--bento-sand-ink-mid)' }}>{L('daysHint')}</p>
          {stepDays && (
            <WeekdayChipRow
              days={stepDays.reading}
              lang={lang}
              onChange={days => {
                setStepDaysState(prev => ({ ...prev, reading: days }))
                persistStepDays({ reading: days }).catch(err => console.error('Failed to persist reading days', err))
                refreshPosition(orderMode, customOrder)
              }}
            />
          )}
        </div>

        {/* Projeção */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          {proj?.finishDateLabel ? (
            <p style={styles.projText}>
              {renderBold(`${L('projectionPrefix', { n: daysCount })} ${proj.finishDateLabel}.`, proj.finishDateLabel)} {L('projectionSuffix')}
            </p>
          ) : (
            <p style={styles.projText}>{L('projectionNoPlan')}</p>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.saveBtn} onClick={onBack}>{L('save')}</button>
      </div>

      {pickerOpen && (
        <StartPickerSheet
          lang={lang} blocks={blocks} bookChapterCounts={bookChapterCounts}
          onClose={() => setPickerOpen(false)}
          onConfirm={(book, chapter) => {
            onSetStartPosition?.(bookOrderNow, book, chapter)
            setPosition({ book, chapter })
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

function StartPickerSheet({ lang, blocks, bookChapterCounts, onClose, onConfirm }) {
  const [book, setBook] = useState(null)
  const allBooks = blocks.flatMap((b, bi) => b.books.map((name, i) => ({ name, nameEn: b.booksEn[i] })))

  return (
    <div style={sheetStyles.overlay} onClick={onClose}>
      <div style={sheetStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={sheetStyles.grabber} />
        {!book ? (
          <div style={sheetStyles.list}>
            {allBooks.map(b => (
              <button key={b.name} style={sheetStyles.listRow} onClick={() => setBook(b.name)}>
                {lang === 'en' ? b.nameEn : b.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={sheetStyles.list}>
            <button style={sheetStyles.backRow} onClick={() => setBook(null)}>‹ {book}</button>
            <div style={sheetStyles.chapterGrid}>
              {Array.from({ length: bookChapterCounts[book] ?? 0 }, (_, i) => i + 1).map(ch => (
                <button key={ch} style={sheetStyles.chapterBtn} onClick={() => onConfirm(book, ch)}>{ch}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const sheetStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' },
  sheet: { width: '100%', maxHeight: '75vh', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column' },
  grabber: { width: 36, height: 4, borderRadius: 99, background: 'var(--bento-line)', margin: '0 auto 12px' },
  list: { overflowY: 'auto' },
  listRow: { display: 'block', width: '100%', textAlign: 'left', padding: '12px 4px', border: 'none', background: 'none', borderBottom: '1px solid var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer' },
  backRow: { display: 'block', width: '100%', textAlign: 'left', padding: '4px 4px 14px', border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  chapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  chapterBtn: { height: 44, borderRadius: 12, border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: 'var(--font-bento)', fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  headerSubtitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 },
  card: { borderRadius: 24, background: 'var(--bento-card)', padding: 20 },
  sectionLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 12px' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' },
  rowTitle: { fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 3px' },
  rowSub: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  linkBtn: { flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 700, color: 'var(--bento-accent)' },
  divider: { height: 1, background: 'var(--bento-line)', margin: '14px 0' },
  versionList: { marginTop: 10, borderTop: '1px solid var(--bento-line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 },
  versionRow: { display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', padding: '8px 0', cursor: 'pointer', textAlign: 'left' },
  versionLabel: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 600, color: 'var(--bento-ink)' },
  radio: { width: 18, height: 18, borderRadius: 99, border: '2px solid var(--bento-t5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioOn: { border: '2px solid var(--bento-accent)' },
  radioDot: { width: 9, height: 9, borderRadius: 99, background: 'var(--bento-accent)' },
  hint: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '10px 0 0' },

  orderOption: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', borderRadius: 20, background: 'var(--bento-line)', padding: '16px 18px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' },
  orderOptionOn: { background: 'var(--bento-ink)' },
  orderTitle: { fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 800, margin: '0 0 3px' },
  orderSub: { fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, margin: 0 },

  customOrderBox: { marginTop: 6 },
  customOrderList: { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 },
  customOrderRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--bento-line)' },
  customOrderIdx: { width: 20, flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 11, fontWeight: 700, color: 'var(--bento-t4)' },
  customOrderName: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 600, color: 'var(--bento-ink)' },
  customOrderArrows: { display: 'flex', gap: 4, flexShrink: 0 },
  arrowBtn: { width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  darkCard: { borderRadius: 28, background: 'var(--bento-ink)', padding: 22 },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  darkDiamond: { width: 9, height: 9, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: 0 },
  paceValue: { fontFamily: 'var(--font-bento)', fontSize: 27, fontWeight: 800, letterSpacing: '-1px', color: '#fff', margin: '0 0 8px' },
  darkHint: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.55)', margin: 0 },
  darkDivider: { height: 1, background: 'rgba(255,255,255,.1)', margin: '18px 0 14px' },
  switch: { width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },

  stepsHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sandCount: { fontFamily: 'var(--font-bento)', fontSize: 13, fontWeight: 800, color: 'var(--bento-sand-icon)', margin: 0, flexShrink: 0 },

  projText: { fontFamily: 'var(--font-bento)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink-mid)', margin: 0 },

  footer: { flexShrink: 0, padding: '16px 20px calc(22px + var(--safe-bottom))' },
  saveBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', fontFamily: 'var(--font-bento)', fontSize: 15.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
