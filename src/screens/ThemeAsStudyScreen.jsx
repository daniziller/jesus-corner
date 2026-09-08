// ThemeAsStudyScreen.jsx — "Um tema" (39l, Bloco 6/último do pacote 39).
// Aberta de um tema em 39k (SearchResultsScreen.jsx). Dado do tema em si:
// src/bible/themes.js (autoria própria, conjunto modesto e verificado —
// ver comentário lá).
//
// "Montar estudo de N dias" chama o MESMO gerador de 35d
// (generateThemePlan, api/generate-theme-plan.js) e leva à MESMA proposta
// de 35e (StudyProposalNewScreen.jsx) — não um gerador próprio: o `scope`
// mandado é a descrição em texto livre do tema (aiScope/aiScopeEn, ver
// themes.js), do mesmo jeito que CreateAiStudyScreen.jsx manda o texto que
// a pessoa digitou. Isso significa que os dias propostos não são
// necessariamente os MESMOS 18 trechos listados aqui embaixo (a IA
// distribui e escolhe as passagens de novo, a partir do assunto) — é o
// comportamento real de "chama o mesmo gerador", não uma simulação. Nada
// entra no plano até a pessoa aprovar em 35e (onBuildStudy, ligado em
// App.jsx, é o mesmo caminho de handleGeneratePersonalStudy).
import { useState, useEffect, useMemo } from 'react'
import { loadSearchIndex, testamentForBook, bookEnFor, splitHighlightSegments } from '../bible/bibleSearch'
import { normalizeForSearch, findAllOccurrences } from '../bible/searchNormalize'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const FONT = 'var(--font-bento)'
const DURATION_CHIPS = [5, 7, 14, 21]

export default function ThemeAsStudyScreen({ session, theme, completedSet, onBack, onOpenChapter, onBuildStudy }) {
  const { lang } = session
  const L = (k, vars) => t(`theme.${k}`, vars, lang)
  const count = (n, base, vars) => (n === 1 ? L(`${base}One`, { n, ...vars }) : L(`${base}Many`, { n, ...vars }))

  const [days, setDays] = useState(7)
  const [building, setBuilding] = useState(false)
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadSearchIndex(lang).then(data => { if (!cancelled) setEntries(data) }).catch(() => { if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [lang])

  // Mapa book:chapter:verse -> texto, só pra achar rápido o 1º versículo de
  // cada trecho (ver passageCard abaixo) — o mesmo índice agregado de 39k,
  // cacheado em memória do módulo (loadSearchIndex), então reabrir esta
  // tela de novo não busca nada de novo.
  const verseByKey = useMemo(() => {
    if (!entries) return null
    const map = new Map()
    for (const e of entries) map.set(`${e.book}:${e.chapter}:${e.verse}`, e)
    return map
  }, [entries])

  const title = lang === 'en' ? theme.titleEn : theme.title
  const thread = lang === 'en' ? theme.threadEn : theme.thread

  const passages = theme.passages.map(p => ({ ...p, testament: testamentForBook(p.book) }))
  const readCount = passages.filter(p => completedSet?.has(`${p.book}:${p.chStart}`)).length
  const atPassages = passages.filter(p => p.testament === 'at')
  const ntPassages = passages.filter(p => p.testament === 'nt')

  const [atExpanded, setAtExpanded] = useState(false)
  const [ntExpanded, setNtExpanded] = useState(false)
  const AT_PREVIEW = 3
  const NT_PREVIEW = 2

  async function handleBuild() {
    if (building) return
    setBuilding(true)
    try {
      await onBuildStudy?.(theme, days)
    } finally {
      setBuilding(false)
    }
  }

  // O cartão mostra só 1 versículo (mesmo padrão de 39k) — mas o trecho
  // costuma cobrir vários, e o quadro sempre exibe o QUE TEM o termo em
  // destaque (ex: "Ezequiel 34:12", não o 34:11 onde o trecho começa).
  // Em vez de fixar sempre o 1º versículo do trecho, procura dentro do
  // próprio intervalo (chStart:verseStart até chEnd:verseEnd) o primeiro
  // que realmente contém o termo — cai no 1º versículo do trecho só se
  // nenhum bater (não deveria acontecer, já que todo trecho foi
  // verificado contra o termo antes de entrar em themes.js).
  function findDisplayVerse(p, term) {
    if (!entries) return { chapter: p.chStart, verse: p.verseStart, entry: null }
    const norm = normalizeForSearch(term)
    for (let ch = p.chStart; ch <= p.chEnd; ch++) {
      const vStart = ch === p.chStart ? p.verseStart : 1
      const vEnd = ch === p.chEnd ? p.verseEnd : Infinity
      for (const e of entries) {
        if (e.book !== p.book || e.chapter !== ch || e.verse < vStart || e.verse > vEnd) continue
        if (normalizeForSearch(e.text).includes(norm)) return { chapter: ch, verse: e.verse, entry: e }
      }
    }
    return { chapter: p.chStart, verse: p.verseStart, entry: verseByKey?.get(`${p.book}:${p.chStart}:${p.verseStart}`) ?? null }
  }

  function passageCard(p) {
    const term = p.term ?? theme.term
    const { chapter, verse, entry } = findDisplayVerse(p, term)
    const norm = normalizeForSearch(term)
    const positions = entry ? findAllOccurrences(normalizeForSearch(entry.text), norm) : []
    const segments = entry ? splitHighlightSegments(entry.text, positions, norm.length) : null
    const done = completedSet?.has(`${p.book}:${p.chStart}`)
    const displayBook = lang === 'en' ? bookEnFor(p.book) : p.book
    return (
      <button key={`${p.book}:${p.chStart}:${p.verseStart}`} style={s.verseCard} onClick={() => onOpenChapter(p.book, chapter, verse)}>
        <div style={s.verseCardHead}>
          <span style={s.verseRef}>{displayBook} {chapter}:{verse}</span>
          {done && <span style={s.donePill}>{L('donePill')}</span>}
          <span style={{ flex: 1 }} />
          <span style={s.chevron}>›</span>
        </div>
        <p style={s.verseText}>
          {segments
            ? segments.map((seg, i) => seg.highlighted
                ? <mark key={i} style={s.verseHighlight}>{seg.text}</mark>
                : <span key={i}>{seg.text}</span>)
            : '···'}
        </p>
      </button>
    )
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
          <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.headerTitle}>{title}</p>
          {/* "Tema · 18 trechos · 4 já lidos" — montado aqui (não 1 chave
              só) porque tem DOIS números que pluralizam cada um por conta
              própria (trechos/lidos podem discordar entre si). */}
          <p style={s.headerSub}>{L('kicker')} · {count(passages.length, 'passages')} · {count(readCount, 'readInline')}</p>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.threadCard}>
          <p style={s.threadEyebrow}>{L('threadEyebrow')}</p>
          <p style={s.threadText}>{thread}</p>
        </div>

        <div style={s.buildCard}>
          <div style={s.buildEyebrowRow}>
            <span style={s.buildDiamond} />
            <p style={s.buildEyebrow}>{L('buildEyebrow')}</p>
          </div>
          <p style={s.buildHeadline}>{L('buildHeadline')}</p>
          <p style={s.buildSub}>{L('buildSub', { n: passages.length })}</p>
          <div style={s.durationRow}>
            {DURATION_CHIPS.map(n => (
              <button key={n} style={{ ...s.durationChip, ...(days === n ? s.durationChipOn : {}) }} onClick={() => setDays(n)}>
                <span style={{ ...s.durationChipN, color: days === n ? 'var(--bento-ink)' : '#fff' }}>{n}</span>
                <span style={{ ...s.durationChipLabel, color: days === n ? 'rgba(26,23,20,.65)' : 'rgba(255,255,255,.45)' }}>{L('daysLabel')}</span>
              </button>
            ))}
          </div>
          <button style={{ ...s.buildBtn, opacity: building ? .6 : 1 }} onClick={handleBuild} disabled={building}>
            <span>{building ? L('buildingBtn') : L('buildBtn', { n: days })}</span>
            {!building && <span>→</span>}
          </button>
          <p style={s.approveNote}>{L('approveNote')}</p>
        </div>

        {atPassages.length > 0 && (
          <div>
            <div style={s.sectionHeadRow}>
              <p style={s.sectionLabel}>{L('oldTestament')}</p>
              <span style={s.sectionCount}>{count(atPassages.length, 'passages')}</span>
            </div>
            <div style={s.cardsCol}>{(atExpanded ? atPassages : atPassages.slice(0, AT_PREVIEW)).map(passageCard)}</div>
            {!atExpanded && atPassages.length > AT_PREVIEW && (
              <button style={s.moreBtn} onClick={() => setAtExpanded(true)}>{L('seeAllOld', { n: atPassages.length })}</button>
            )}
          </div>
        )}

        {ntPassages.length > 0 && (
          <div>
            <div style={s.sectionHeadRow}>
              <p style={s.sectionLabel}>{L('newTestament')}</p>
              <span style={s.sectionCount}>{count(ntPassages.length, 'passages')}</span>
            </div>
            <div style={s.cardsCol}>{(ntExpanded ? ntPassages : ntPassages.slice(0, NT_PREVIEW)).map(passageCard)}</div>
            {!ntExpanded && ntPassages.length > NT_PREVIEW && (
              <button style={s.moreBtn} onClick={() => setNtExpanded(true)}>{L('seeAllNew', { n: ntPassages.length })}</button>
            )}
          </div>
        )}

        <div style={s.verifiedRow}>
          <AppIcon name="CheckCircle2" size={15} color="var(--bento-t3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={s.verifiedText}>{count(passages.length, 'verifiedDisclosure')}</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 14px' },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: 'var(--bento-ink)', margin: 0 },
  headerSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '3px 0 0' },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 16 },

  threadCard: { borderRadius: 22, background: 'var(--bento-sand)', padding: '16px 18px' },
  threadEyebrow: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-ink-mid)', margin: '0 0 8px' },
  threadText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, lineHeight: 1.55, color: 'var(--bento-sand-ink-strong)', margin: 0 },

  buildCard: { borderRadius: 26, background: 'var(--bento-ink)', padding: '20px 20px 18px' },
  buildEyebrowRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  buildDiamond: { width: 8, height: 8, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2 },
  buildEyebrow: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  buildHeadline: { fontFamily: FONT, fontSize: 21, fontWeight: 800, lineHeight: 1.25, color: '#fff', margin: '0 0 8px' },
  buildSub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' },
  durationRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 },
  durationChip: { border: 'none', borderRadius: 15, padding: '11px 4px', background: 'rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' },
  durationChipOn: { background: 'var(--bento-accent)' },
  durationChipN: { fontFamily: FONT, fontSize: 17, fontWeight: 800 },
  durationChipLabel: { fontFamily: FONT, fontSize: 8.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' },
  buildBtn: { width: '100%', height: 52, borderRadius: 17, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)' },
  approveNote: { fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.4)', textAlign: 'center', margin: '12px 4px 0' },

  sectionHeadRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 10px' },
  sectionLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: 0 },
  sectionCount: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'var(--bento-t3)' },
  cardsCol: { display: 'flex', flexDirection: 'column', gap: 8 },

  verseCard: { textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%', borderRadius: 20, background: 'var(--bento-card)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
  verseCardHead: { display: 'flex', alignItems: 'center', gap: 8 },
  verseRef: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: 'var(--bento-accent)' },
  donePill: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', color: '#fff', background: 'var(--bento-ink)', borderRadius: 99, padding: '2px 8px' },
  verseText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.6, color: 'var(--bento-ink)', margin: 0 },
  verseHighlight: { background: '#FFE3C9', color: 'var(--bento-ink)', fontWeight: 700, borderRadius: 4, padding: '1px 2px' },
  chevron: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: 'var(--bento-t5)', flexShrink: 0 },

  moreBtn: { marginTop: 8, width: '100%', border: 'none', borderRadius: 16, padding: 13, background: 'rgba(0,0,0,.05)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  verifiedRow: { display: 'flex', gap: 8, padding: '4px 2px 0' },
  verifiedText: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-t3)', margin: 0 },
}
