// MonthRecapScreen.jsx — Retrospectiva do mês (quadro 17b).
//
// Cartão escuro compartilhável, com a marca discreta no canto: aparece uma
// vez, no primeiro dia em que a pessoa abre o app no mês seguinte, e pode ir
// pra Biblioteca. Só mostra números que subiram; um mês ruim vira "Você
// voltou" em vez de tabela de zeros. Os dados vêm de
// src/recap/monthlyRecapStore.js.
import { useState, useEffect } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import BrandMark from '../components/BrandMark'
import BrandLogo from '../components/BrandLogo'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'

const FONT = 'var(--font-bento)'

export function monthLabel(monthKey, lang) {
  const [y, m] = monthKey.split('-').map(Number)
  const raw = new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function hoursLabel(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return { h, m }
}

// Título e números que sobem — compartilhado com o texto salvo na Biblioteca.
export function recapSummary(recap, lang, bookLabel) {
  const L = (k, vars) => t(`recap.${k}`, vars, lang)
  const title = recap.booksFinished.length
    ? L('titleBook', { book: bookLabel(recap.booksFinished[recap.booksFinished.length - 1]) })
    : recap.chapters === 1 ? L('titleChapter')
    : recap.chapters > 1 ? L('titleChapters', { n: recap.chapters })
    : L('titleBack')
  const parts = []
  if (recap.chapters > 0) parts.push(`${recap.chapters} ${L('chapters')}`)
  if (recap.seconds >= 60) { const { h, m } = hoursLabel(recap.seconds); parts.push(`${h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`} ${L('reading')}`) }
  if (recap.weeksMet > 0) parts.push(`${recap.weeksMet}/${recap.weeksTotal} ${L('weeks')}`)
  if (recap.highlights > 0) parts.push(`${recap.highlights} ${L('highlights')}`)
  return { title, parts }
}

export default function MonthRecapScreen({ recap, lang, nextBook, bookLabel, onClose, onSave, onShare }) {
  const L = (k, vars) => t(`recap.${k}`, vars, lang)
  const [verseText, setVerseText] = useState('')
  const [saved, setSaved] = useState(false)
  const { title } = recapSummary(recap, lang, bookLabel)
  const { h, m } = hoursLabel(recap.seconds)

  useEffect(() => {
    const tv = recap.topVerse
    if (!tv) return
    let cancelled = false
    const key = lang === 'en' ? (tv.bookEn || tv.book) : tv.book
    fetchBookText(getSelectedVersionId(lang), key).then(chapters => {
      if (cancelled) return
      setVerseText(chapters?.[String(tv.chapter)]?.verses?.[String(tv.verse)] ?? '')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [recap.topVerse, lang])

  const tiles = []
  if (recap.chapters > 0) tiles.push({ key: 'chapters', num: <>{recap.chapters}</>, label: L('chapters') })
  if (recap.seconds >= 60) tiles.push({ key: 'reading', num: h ? <>{h}<span style={s.tileUnit}>h</span>{String(m).padStart(2, '0')}</> : <>{m}<span style={s.tileUnit}>min</span></>, label: L('reading') })
  if (recap.weeksMet > 0) tiles.push({ key: 'weeks', accent: true, num: <>{recap.weeksMet}<span style={{ ...s.tileUnit, color: 'rgba(240,102,43,.6)' }}>/{recap.weeksTotal}</span></>, label: L('weeks') })
  if (recap.highlights > 0) tiles.push({ key: 'highlights', num: <>{recap.highlights}</>, label: L('highlights') })

  const topRef = recap.topVerse ? `${bookLabel(recap.topVerse.book, recap.topVerse.bookEn)} ${recap.topVerse.chapter}:${recap.topVerse.verse}` : null

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button type="button" style={s.iconBtn} onClick={onClose} aria-label={L('close')}>
          <AppIcon name="X" size={16} strokeWidth={2} color="var(--bento-ink)" />
        </button>
        <span style={s.headerLabel}>{L('label')}</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={s.stage}>
        <div id="month-recap-card" style={s.card}>
          <div style={s.glow} />
          <div style={s.brandRow}>
            {/* Marca discreta: tile no mesmo preto do cartão, com anel de 1.5px (quadro 17b). */}
            <BrandMark size={30} variant="default" style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,.12)', borderRadius: 10 }} />
            <BrandLogo size={13} onDark letterSpacing="-.4px" />
          </div>
          <p style={s.month}>{monthLabel(recap.month, lang)}</p>
          <p style={s.title}>{title}</p>

          {tiles.length > 0 && (
            <div style={s.grid}>
              {tiles.map(tile => (
                <div key={tile.key} style={{ ...s.tile, ...(tile.accent ? { background: 'rgba(240,102,43,.16)' } : {}) }}>
                  <p style={{ ...s.tileNum, ...(tile.accent ? { color: 'var(--bento-accent)' } : {}) }}>{tile.num}</p>
                  <p style={s.tileLabel}>{tile.label}</p>
                </div>
              ))}
            </div>
          )}

          {recap.topVerse && verseText && (
            <div style={s.verseCard}>
              <p style={s.verseLabel}>{L('topVerse')}</p>
              <p style={s.verseText}>"{verseText}"</p>
              <p style={s.verseRef}>{topRef}</p>
            </div>
          )}

          {nextBook && <p style={s.next}>{L('next', { book: nextBook })}</p>}
        </div>
      </div>

      <div style={s.footer}>
        <button type="button" style={s.saveBtn} disabled={saved} onClick={async () => { await onSave?.(); setSaved(true) }}>
          {saved ? L('saved') : L('save')}
        </button>
        <button type="button" style={s.shareBtn} onClick={() => onShare?.({ verseText, title })}>
          {/* Ícone do quadro (seta pra cima saindo da bandeja) — não há equivalente na biblioteca de ícones. */}
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="var(--bento-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13V4M6 8l4-4 4 4M4 12v4h12v-4" /></svg>
          <span>{L('share')}</span>
        </button>
      </div>
    </div>
  )
}

// Medidas do quadro 17b.
const s = {
  screen: { height: '100%', background: 'var(--bento-bg)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: FONT },
  header: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px' },
  iconBtn: { width: 34, height: 34, borderRadius: 12, background: 'var(--bento-card)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
  stage: { flex: 1, minHeight: 0, padding: '0 20px', overflowY: 'auto' },
  card: { borderRadius: 28, background: 'var(--bento-ink)', padding: '26px 24px', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 99, background: 'rgba(240,102,43,.16)' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 26px', position: 'relative' },
  month: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 10px', position: 'relative' },
  title: { fontFamily: FONT, fontSize: 34, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.6px', color: '#fff', margin: '0 0 26px', textWrap: 'pretty', position: 'relative' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 10px' },
  tile: { borderRadius: 18, background: 'rgba(255,255,255,.06)', padding: 16 },
  tileNum: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.4px', color: '#fff', margin: '0 0 6px' },
  tileUnit: { fontSize: 17, letterSpacing: '-.4px' },
  tileLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1.25, color: 'rgba(255,255,255,.5)', margin: 0 },
  verseCard: { borderRadius: 18, background: 'rgba(255,255,255,.06)', padding: 16, margin: '0 0 auto' },
  verseLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', margin: '0 0 8px' },
  verseText: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(255,255,255,.85)', margin: '0 0 6px' },
  verseRef: { fontFamily: FONT, fontSize: 11, fontWeight: 800, lineHeight: 1, color: 'var(--bento-accent)', margin: 0 },
  next: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.35)', margin: 'auto 0 0', paddingTop: 16 },
  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))', display: 'flex', gap: 10 },
  saveBtn: { flex: 1, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  shareBtn: { flex: 1, height: 52, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 13.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
