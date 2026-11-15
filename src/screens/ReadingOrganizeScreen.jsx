// ReadingOrganizeScreen.jsx — "Leitura da Bíblia" (turno 35, Bloco 1,
// handoff-meu-plano-35/, tela 35i). Aberta de "Organizar a leitura" em
// Ajustar meu plano (AjustarPlanoScreen.jsx). Onde começar, em que ordem
// (canônica, cronológica, minha ordem, ordem livre — NUNCA reseta
// progresso nem marca nada como lido, ver bibleOrderMath.js), ritmo
// aprendido e dias da Bíblia. Tudo vale na hora — a ordem, a fila e o
// ponto de partida moram em App.jsx, que é quem acha a sessão de hoje.
//
// "Minha ordem" (a pessoa monta a fila arrastando e escolhe quais livros
// entram) e "Ordem livre" (o plano segue do último texto aberto na leitura
// do plano): o pacote de design não trouxe quadro para elas — a lista de
// FilaDeLivros.jsx e os textos são composição nossa, no sistema visual
// Bento (pedido da autora, 2026-11-14).
import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import WeekdayChipRow from '../components/WeekdayChipRow'
import { splitBold } from '../utils/boldSubstring'
import { getStepDays, setStepDays as persistStepDays } from '../routine/stepDaysStore'
import { customBookLists, keepBooks, planQueue, resolveNextChapter } from '../reading/bibleOrderMath'
import { getReadingPaceSessions, getUseLearnedPace, setUseLearnedPace } from '../reading/readingPaceStore'
import { estimateReadingPace, earlyReadingPace, chaptersPerSession, previewPaceBlock } from '../reading/readingPaceMath'
import { computeProjection, totalBibleChapters } from '../plan/readingProjection'
import { BIBLE_TOTAL_WORDS } from '../data/bibleBlocks'
import { getChapterWords } from '../data/chapterWordCounts'
import { getSelectedVersionId, setSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { BIBLE_VERSIONS, findBibleVersion } from '../data/bibleVersions'
import { bookNameFor } from '../utils/progress'
import StartPickerSheet from '../components/StartPickerSheet'
import FilaDeLivros from '../components/leitura/FilaDeLivros'

const AVG_WORDS_PER_CHAPTER = BIBLE_TOTAL_WORDS / totalBibleChapters()

function renderBold(text, boldPart) {
  return splitBold(text, boldPart).map((part, i) =>
    typeof part === 'string' ? <span key={i}>{part}</span> : <strong key={i} style={{ fontWeight: 800, color: 'var(--bento-sand-icon)' }}>{part.bold}</strong>
  )
}

const ORDER_OPTIONS = [
  { key: 'canonical', title: 'orderCanonicalTitle', sub: 'orderCanonicalSub' },
  { key: 'chronological', title: 'orderChronologicalTitle', sub: 'orderChronologicalSub' },
  { key: 'custom', title: 'orderCustomTitle', sub: 'orderCustomSub' },
  { key: 'free', title: 'orderFreeTitle', sub: 'orderFreeSub' },
]

export default function ReadingOrganizeScreen({ session, completedSet, blocks, bookChapterCounts, stepMinutes, bibleOrderMode: orderMode, customBookOrder, planPosition, readingOrder, onSaveBibleOrderMode, onSaveCustomBookOrder, onSetStartPosition, onNavigate, onBack }) {
  const { lang, plan } = session
  const readingMinutes = stepMinutes?.reading ?? plan.readingMinutes ?? 15
  const L = (k, vars) => t(`readingOrganize.${k}`, vars, lang)

  const [stepDays, setStepDaysState] = useState(null)
  const [paceSessions, setPaceSessions] = useState([])
  const [useLearnedPace, setUseLearnedPaceState] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    getStepDays().then(setStepDaysState).catch(() => {})
    getReadingPaceSessions().then(setPaceSessions).catch(() => {})
    getUseLearnedPace().then(setUseLearnedPaceState).catch(() => {})
  }, [])

  // A fila do plano nesta ordem — os livros, e de onde o plano segue — e o
  // capítulo onde ele está: o primeiro por ler a partir do ponto de partida.
  const queue = useMemo(
    () => planQueue(orderMode === 'chronological' ? 'chrono' : 'fixed', orderMode, customBookOrder, planPosition, readingOrder),
    [orderMode, customBookOrder, planPosition, readingOrder]
  )
  const position = useMemo(() => resolveNextChapter(completedSet, queue.bookOrder, bookChapterCounts, queue.start), [completedSet, queue, bookChapterCounts])
  const customLists = useMemo(() => customBookLists(customBookOrder), [customBookOrder])
  const testaments = useMemo(() => ({
    all: blocks.flatMap(b => b.books),
    old: blocks.filter(b => b.id <= 4).flatMap(b => b.books),
    new: blocks.filter(b => b.id >= 5).flatMap(b => b.books),
  }), [blocks])
  const planBooks = orderMode === 'custom' ? queue.bookOrder : null

  const daysCount = stepDays ? stepDays.reading.filter(Boolean).length : 0
  const proj = stepDays
    ? computeProjection({ completedSet, readingMinutesPerDay: readingMinutes, weeklyDays: stepDays.reading, lang, books: planBooks })
    : null

  const pace = estimateReadingPace(paceSessions)
  const early = earlyReadingPace(paceSessions)
  // "1,4 capítulo por 15 min" (35i) é uma referência fixa de 15 min, pra
  // comparar ritmos entre si sem depender de quanto a pessoa configurou.
  // "Hoje daria X em Y min" usa os minutos REAIS configurados pra leitura.
  const chaptersFor15 = chaptersPerSession(pace.wordsPerMinute, 15, AVG_WORDS_PER_CHAPTER)
  // "Hoje daria Gênesis 41–42 em 15 min" (35i) — o bloco de VERDADE que o
  // ritmo monta a partir de onde a pessoa está, não uma contagem abstrata
  // (ver previewPaceBlock, mesma regra de tolerância de 15% do HANDOFF).
  const todayBlock = position ? previewPaceBlock(getChapterWords(position.book), position.chapter, pace.wordsPerMinute, readingMinutes) : null
  const todayBlockLabel = todayBlock
    ? `${bookNameFor(position.book, lang)} ${todayBlock.chStart === todayBlock.chEnd ? todayBlock.chStart : `${todayBlock.chStart}–${todayBlock.chEnd}`}`
    : ''

  const versionId = getSelectedVersionId(lang)
  const version = findBibleVersion(versionId)
  const versions = BIBLE_VERSIONS[lang] ?? []

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
              <p style={styles.rowTitle} data-plano="posicao">{position ? `${bookNameFor(position.book, lang)} ${position.chapter}` : L(planBooks ? 'planComplete' : 'bibleComplete')}</p>
              <p style={styles.rowSub}>{L(orderMode === 'free' ? 'positionSubFree' : queue.start ? 'positionSubStart' : 'fromWhereYouStopped')}</p>
            </div>
            <button style={styles.linkBtn} onClick={() => setPickerOpen(true)}>{L('choose')}</button>
          </div>
          <p style={styles.hint}>{L('startHint')}</p>
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
          {ORDER_OPTIONS.map(opt => {
            const on = orderMode === opt.key
            return (
              <button key={opt.key} data-ordem={opt.key} aria-pressed={on} style={{ ...styles.orderOption, ...(on ? styles.orderOptionOn : {}) }} onClick={() => onSaveBibleOrderMode?.(opt.key)}>
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
              <p style={styles.quickLabel}>{L('customQuickLabel')}</p>
              <div style={styles.quickRow} role="group" aria-label={L('customQuickLabel')}>
                {[['all', 'customKeepAll'], ['old', 'customKeepOld'], ['new', 'customKeepNew']].map(([key, label]) => (
                  <button key={key} style={styles.quickChip} data-escolha={key} onClick={() => onSaveCustomBookOrder?.(keepBooks(customLists.included, testaments[key]))}>{L(label)}</button>
                ))}
              </div>
              <FilaDeLivros lang={lang} included={customLists.included} excluded={customLists.excluded} onChange={onSaveCustomBookOrder} />
            </div>
          )}
          {orderMode === 'free' && <p style={styles.hint}>{L('freeOrderHint')}</p>}
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
                {useLearnedPace ? L('paceToggleOnSub', { block: todayBlockLabel, min: readingMinutes }) : L('paceToggleOffSub')}
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
                // Manda o objeto stepDays local inteiro, não só
                // `{ reading: days }` — mesma corrida de StudyOrganizeScreen.jsx
                // (setStepDays faz merge buscando o servidor; um patch
                // parcial corre risco de perder outro passo salvo entre o
                // fetch e o write). Com o objeto completo o merge no
                // servidor fica irrelevante.
                const next = { ...(stepDays ?? {}), reading: days }
                setStepDaysState(next)
                persistStepDays(next).catch(err => console.error('Failed to persist reading days', err))
              }}
            />
          )}
        </div>

        {/* Projeção */}
        <div style={{ ...styles.card, background: 'var(--bento-sand)' }}>
          {proj?.finishDateLabel ? (
            <p style={styles.projText}>
              {renderBold(`${L(planBooks ? 'projectionPrefixPlan' : 'projectionPrefix', { n: daysCount })} ${proj.finishDateLabel}.`, proj.finishDateLabel)} {L('projectionSuffix')}
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
          lang={lang}
          title={L('startPickerTitle')}
          books={queue.bookOrder.map(name => ({ name, label: bookNameFor(name, lang) }))}
          bookChapterCounts={bookChapterCounts}
          onClose={() => setPickerOpen(false)}
          onConfirm={(book, chapter) => {
            onSetStartPosition?.(book, chapter)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px' },
  backBtn: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
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
  quickLabel: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', margin: '14px 0 6px' },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickChip: { minHeight: 44, border: 'none', borderRadius: 99, background: 'var(--bento-line)', padding: '0 14px', fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

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
