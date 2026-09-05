// ChapterPickerSheet.jsx — Seletor de capítulo dentro da leitura (quadro
// 18b). Aberto pelo chip escuro do cabeçalho de 4a — troca de capítulo SEM
// sair da leitura imersiva. Mesma folha escura da IA (10b, ToolsSheet), mas
// SEM o losango: aqui não é a máquina falando, é navegação do próprio app.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function ChapterPickerSheet({
  open, onClose, lang, bookDisplayName, totalChapters, currentChapter,
  completedSet, bookKey, onSelectChapter, onSwitchBook,
}) {
  const L = (k, vars) => t(`chapterPicker.${k}`, vars, lang)
  const gridRef = useRef(null)

  // Abre centrada no capítulo atual (nota do quadro: "rola pra cima pra
  // ver os capítulos 1–30") — sem isso, livros grandes (Salmos, 150
  // capítulos) abririam sempre no topo, longe de onde a pessoa está.
  useEffect(() => {
    if (!open) return
    const el = gridRef.current?.querySelector(`[data-ch="${currentChapter}"]`)
    el?.scrollIntoView({ block: 'center' })
  }, [open, currentChapter])

  if (!open) return null

  return createPortal(
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.handleWrap} onClick={onClose}><div style={styles.handle} /></div>

        <div style={styles.top}>
          <p style={styles.bookName}>{bookDisplayName}</p>
          <button style={styles.switchBookBtn} onClick={onSwitchBook}>{L('switchBook')}</button>
        </div>

        <div style={styles.navRow}>
          <button
            style={styles.navBtn}
            disabled={currentChapter <= 1}
            onClick={() => onSelectChapter(currentChapter - 1)}
          >
            <AppIcon name="ChevronLeft" size={13} strokeWidth={2.4} color="rgba(255,255,255,.75)" />
            <span>{L('chapterShort', { n: currentChapter - 1 })}</span>
          </button>
          <button
            style={styles.navBtn}
            disabled={currentChapter >= totalChapters}
            onClick={() => onSelectChapter(currentChapter + 1)}
          >
            <span>{L('chapterShort', { n: currentChapter + 1 })}</span>
            <AppIcon name="ChevronRight" size={13} strokeWidth={2.4} color="rgba(255,255,255,.75)" />
          </button>
        </div>

        <div ref={gridRef} style={styles.gridScroll}>
          <div style={styles.grid}>
            {Array.from({ length: totalChapters }, (_, i) => i + 1).map(ch => {
              const done = completedSet.has(`${bookKey}:${ch}`)
              const isCurrent = ch === currentChapter
              return (
                <button
                  key={ch}
                  data-ch={ch}
                  style={{
                    ...styles.cell,
                    background: isCurrent ? 'var(--bento-accent)' : done ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)',
                    color: isCurrent ? 'var(--bento-ink)' : done ? '#fff' : 'rgba(255,255,255,.55)',
                    fontWeight: isCurrent ? 800 : 700,
                  }}
                  onClick={() => onSelectChapter(ch)}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>

        <p style={styles.hint}>{L('scrollHint')}</p>
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(26,23,20,.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 'var(--max-width)', background: 'var(--bento-ink)',
    borderRadius: '32px 32px 0 0', maxHeight: '78vh', minHeight: '55vh',
    padding: '14px 20px calc(20px + var(--safe-bottom))',
    display: 'flex', flexDirection: 'column',
    animation: 'bookOpenIn .26s cubic-bezier(.32,.72,0,1)',
  },
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '0 0 18px', cursor: 'pointer', flexShrink: 0 },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.22)' },
  top: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  bookName: { fontFamily: 'var(--font-bento)', fontSize: 22, fontWeight: 800, letterSpacing: '-.9px', color: '#fff', margin: 0 },
  switchBookBtn: { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.45)' },
  navRow: { flexShrink: 0, display: 'flex', gap: 8, marginBottom: 16 },
  navBtn: {
    flex: 1, height: 44, borderRadius: 14, border: 'none', background: 'rgba(255,255,255,.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer',
    fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.75)',
  },
  gridScroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 },
  cell: { height: 46, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-bento)', fontSize: 14, textAlign: 'center' },
  hint: { flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.35)', margin: '10px 0 0' },
}
