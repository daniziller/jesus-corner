// WeekPickerSheet.jsx — "Semanas ▾" (31a/31b, Bloco 13). Folha simples
// listando o histórico de resumos semanais já computados (mais recente
// primeiro) pra escolher qual ver — mesmo espírito de FriendPickerSheet.jsx,
// só que seleção única.
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import { weekRangeLabel } from '../recap/weeklySummaryMath'

const FONT = 'var(--font-bento)'

export default function WeekPickerSheet({ lang, summaries, selectedIndex, onSelect, onClose }) {
  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handleWrap}><div style={s.handle} /></div>
        <div style={s.header}>
          <p style={s.title}>{t('weeklySummary.weekPickerTitle', undefined, lang)}</p>
        </div>
        <div style={s.body}>
          {summaries.map((s2, i) => (
            <button key={s2.weekKey} type="button" style={{ ...s.row, ...(i === selectedIndex ? s.rowOn : {}) }} onClick={() => { onSelect(i); onClose() }}>
              <span style={{ ...s.rowText, ...(i === selectedIndex ? s.rowTextOn : {}) }}>{weekRangeLabel(s2.startKey, s2.endKey, lang)}</span>
              {i === 0 && <span style={s.latestTag}>{t('weeklySummary.latestTag', undefined, lang)}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(26,23,20,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 'var(--max-width)', maxHeight: '70vh', background: 'var(--bento-bg)', borderRadius: '34px 34px 0 0', boxShadow: '0 -18px 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' },
  handleWrap: { flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 0 0' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)' },
  header: { flex: 'none', padding: '16px 22px 6px' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 22px calc(20px + var(--safe-bottom))' },
  row: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 52, border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderBottom: '1px solid var(--bento-line)' },
  rowOn: {},
  rowText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)' },
  rowTextOn: { color: 'var(--bento-accent)', fontWeight: 800 },
  latestTag: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--bento-t4)' },
}
