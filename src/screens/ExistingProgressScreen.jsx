// ExistingProgressScreen.jsx — "Você já leu parte do livro" (quadro 28e,
// Bloco 6). Só aparece quando o livro escolhido em 28d já tem capítulos
// marcados — três caminhos reais (seguir, reler, começar limpo) mais
// "já terminei", porque os quatro acontecem de verdade. "Começar limpo" é
// a única ação destrutiva do fluxo (pede confirmação nativa, mesmo padrão
// de handleResetProgress em App.jsx).
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { buildBookSessions } from '../data/dynamicSessions'
import { WORDS_PER_MINUTE } from '../data/bibleBlocks'
import { getWeeklyDays, WEEKDAY_ABBR3 } from '../routine/weeklyDaysStore'

function Radio({ on }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 99, flexShrink: 0, boxSizing: 'border-box', marginTop: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--bento-accent)' : 'transparent',
      border: on ? 'none' : '2px solid var(--bento-t6)',
    }}>
      {on && <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--bento-ink)' }} />}
    </span>
  )
}

// Próximo livro na ordem canônica dos blocos — usado só pela prévia de
// "Já terminei" (o plano passa pro início dele).
function nextBookAfter(blocks, book) {
  const flat = blocks.flatMap(b => b.books.map(name => ({ name, block: b })))
  const idx = flat.findIndex(e => e.name === book)
  return flat[idx + 1] ?? null
}

export default function ExistingProgressScreen({ session, blocks, book, order, completedSet, bookChapterCounts, readingMinutes, onConfirm, onBack }) {
  const { lang } = session
  const L = (k, vars) => t(`existingProgress.${k}`, vars, lang)
  const [action, setAction] = useState('continue')
  const [weeklyDays, setWeeklyDays] = useState(null)

  useEffect(() => {
    getWeeklyDays().then(setWeeklyDays).catch(() => setWeeklyDays([true, true, true, true, true, false, false]))
  }, [])

  const total = bookChapterCounts[book] ?? 0
  let done = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${book}:${ch}`)) done++

  // Prévia real da semana — mesmo motor de sessões dinâmicas do Bloco 4
  // (dynamicSessions.js), aplicado só a este livro (ou ao próximo, pra
  // "já terminei"). Sem preferência de minutos salva ainda, cai numa
  // sessão por capítulo (mesmo comportamento de sempre nesse caso).
  const targetWords = readingMinutes ? readingMinutes * WORDS_PER_MINUTE : 0
  let previewSessions = []
  if (action === 'finish') {
    const next = nextBookAfter(blocks, book)
    if (next) previewSessions = buildBookSessions(next.name, targetWords, 1).sessions.filter(s => s.type !== 'reflection')
  } else {
    const startCh = action === 'continue' ? Math.min(done + 1, total) : 1
    const all = buildBookSessions(book, targetWords, 1).sessions.filter(s => s.type !== 'reflection')
    previewSessions = all.filter(s => s.chEnd >= startCh)
  }

  const abbr3 = WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt
  const todayIdxRaw = new Date().getDay()
  const todayIdx = todayIdxRaw === 0 ? 6 : todayIdxRaw - 1
  const markedDayIndices = []
  if (weeklyDays) {
    for (let offset = 0; offset < 7 && markedDayIndices.length < 2; offset++) {
      const idx = (todayIdx + offset) % 7
      if (weeklyDays[idx]) markedDayIndices.push(idx)
    }
  }
  const previewRows = markedDayIndices.map((idx, i) => ({
    day: abbr3[idx],
    session: previewSessions[i],
  })).filter(r => r.session)

  const footerLabel = action === 'continue'
    ? L('footerContinue', { book, n: Math.min(done + 1, total) })
    : action === 'reread'
    ? L('footerReread', { book })
    : action === 'clean'
    ? L('footerClean', { book })
    : L('footerFinish', { book: nextBookAfter(blocks, book)?.name ?? book })

  function handleConfirm() {
    if (action === 'clean') {
      if (!window.confirm(L('cleanConfirm', { book, n: done }))) return
    }
    onConfirm(action)
  }

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.headerTop}>
          <button style={s.backBtn} onClick={onBack} aria-label={t('a11y.goBack', undefined, lang)}>
            <AppIcon name="ChevronLeft" size={16} strokeWidth={2} color="var(--bento-ink)" />
          </button>
          <p style={s.title}>{L('title', { book })}</p>
        </div>
        <p style={s.sub}>{L('sub', { done, total })}</p>
      </div>

      <div style={s.body}>
        <button style={{ ...s.optionCard, ...(action === 'continue' ? s.optionCardOn : {}) }} onClick={() => setAction('continue')}>
          <Radio on={action === 'continue'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <p style={{ ...s.optionTitle, color: action === 'continue' ? '#fff' : 'var(--bento-ink)' }}>{L('continueTitle')}</p>
              <span style={s.suggestedBadge}>{L('suggested')}</span>
            </div>
            <p style={{ ...s.optionSub, color: action === 'continue' ? 'rgba(255,255,255,.5)' : 'var(--bento-t3)' }}>{L('continueSub', { book, n: Math.min(done + 1, total) })}</p>
          </div>
        </button>

        <button style={s.optionCardLight} onClick={() => setAction('reread')}>
          <Radio on={action === 'reread'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.optionTitleLight}>{L('rereadTitle')}</p>
            <p style={s.optionSubLight}>{L('rereadSub')}</p>
          </div>
        </button>

        <button style={s.optionCardLight} onClick={() => setAction('clean')}>
          <Radio on={action === 'clean'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.optionTitleLight}>{L('cleanTitle')}</p>
            <p style={s.optionSubLight}>{L('cleanSub', { n: done, book })}</p>
          </div>
        </button>

        <button style={s.optionCardLight} onClick={() => setAction('finish')}>
          <Radio on={action === 'finish'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.optionTitleLight}>{L('finishTitle', { book })}</p>
            <p style={s.optionSubLight}>{L('finishSub', { n: total - done, next: nextBookAfter(blocks, book)?.name ?? '—' })}</p>
          </div>
        </button>

        {previewRows.length > 0 && (
          <div style={s.previewCard}>
            <p style={s.previewLabel}>{L('previewLabel')}</p>
            {previewRows.map((r, i) => (
              <div key={i} style={{ ...s.previewRow, borderBottom: i === previewRows.length - 1 ? 'none' : '1px solid var(--bento-line)' }}>
                <span style={s.previewDay}>{r.day}</span>
                <span style={s.previewText}>{lang === 'en' ? r.session.titleEn : r.session.title}</span>
              </div>
            ))}
          </div>
        )}

        <div style={s.noteCard}>
          <p style={s.noteText}>{L('noteText')}</p>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.confirmBtn} onClick={handleConfirm}>
          <span>{footerLabel}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>→</span>
        </button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  header: { flex: 'none', padding: '22px 20px 0' },
  headerTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: 0 },
  sub: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },
  optionCard: { display: 'flex', alignItems: 'flex-start', gap: 14, borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  optionCardOn: { background: 'var(--bento-ink)' },
  optionCardLight: { display: 'flex', alignItems: 'flex-start', gap: 14, borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' },
  optionTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.2, margin: 0 },
  optionTitleLight: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 5px' },
  optionSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, margin: 0 },
  optionSubLight: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'var(--bento-t3)', margin: 0 },
  suggestedBadge: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', background: 'rgba(240,102,43,.16)', borderRadius: 99, padding: '5px 8px' },

  previewCard: { borderRadius: 22, background: 'var(--bento-card)', padding: '14px 18px' },
  previewLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  previewRow: { display: 'flex', alignItems: 'center', gap: 12, height: 32 },
  previewDay: { width: 52, flexShrink: 0, fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: 'var(--bento-t4)' },
  previewText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: 'var(--bento-ink)' },

  noteCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '14px 18px' },
  noteText: { fontFamily: FONT, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--bento-sand-ink)', margin: 0 },

  footer: { flex: 'none', padding: '12px 20px calc(20px + var(--safe-bottom))' },
  confirmBtn: { width: '100%', height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
}
