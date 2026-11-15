// StartPickerSheet.jsx — folha de escolher um livro e um capítulo: o ponto
// de partida do plano em "Leitura da Bíblia" (35i) e, na ordem livre, o
// texto para onde a leitura do plano vai. `books`: os livros oferecidos,
// na ordem em que aparecem — [{ name, label }].
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function StartPickerSheet({ lang, title, books, bookChapterCounts, onClose, onConfirm }) {
  const [book, setBook] = useState(null)
  const picked = books.find(b => b.name === book)

  return createPortal(
    <div style={styles.overlay} onClick={onClose} data-sheet="start-picker">
      <div style={styles.sheet} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div style={styles.grabber} />
        {!picked ? (
          <>
            <p style={styles.title}>{title}</p>
            <div style={styles.list}>
              {books.map(b => (
                <button key={b.name} style={styles.listRow} onClick={() => setBook(b.name)}>{b.label}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button style={styles.backRow} onClick={() => setBook(null)} aria-label={t('a11y.goBack', undefined, lang)}><AppIcon name="ChevronLeft" size={14} strokeWidth={2.2} style={{ verticalAlign: '-2px' }} /> {picked.label}</button>
            <div style={styles.list}>
              <div style={styles.chapterGrid}>
                {Array.from({ length: bookChapterCounts[picked.name] ?? 0 }, (_, i) => i + 1).map(ch => (
                  <button key={ch} style={styles.chapterBtn} onClick={() => onConfirm(picked.name, ch)}>{ch}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' },
  sheet: { width: '100%', maxHeight: '75vh', background: 'var(--bento-bg)', borderRadius: '28px 28px 0 0', padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column' },
  grabber: { width: 36, height: 4, borderRadius: 99, background: 'var(--bento-line)', margin: '0 auto 12px', flexShrink: 0 },
  title: { flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 4px 6px' },
  list: { overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  listRow: { display: 'block', width: '100%', minHeight: 44, textAlign: 'left', padding: '12px 4px', border: 'none', background: 'none', borderBottom: '1px solid var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 14.5, fontWeight: 600, color: 'var(--bento-ink)', cursor: 'pointer' },
  backRow: { flexShrink: 0, display: 'block', width: '100%', minHeight: 44, textAlign: 'left', padding: '4px 4px 10px', border: 'none', background: 'none', fontFamily: 'var(--font-bento)', fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  chapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  chapterBtn: { height: 44, borderRadius: 12, border: 'none', background: 'var(--bento-line)', fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },
}
