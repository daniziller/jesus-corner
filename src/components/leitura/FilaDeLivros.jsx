// FilaDeLivros.jsx — a lista de "Minha ordem" (35i): os livros do plano,
// na ordem que a pessoa monta arrastando, e os que ela deixou de fora.
// Arrastar é pela alça de cada linha (o resto da linha rola a lista); com
// o teclado, a alça em foco move o livro com as setas ↑ e ↓. As contas de
// arrastar são puras — dragTargetIndex/dragRowShift em bibleOrderMath.js.
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'
import { bookNameFor } from '../../utils/progress'
import { moveBook, setBookIncluded, dragTargetIndex, dragRowShift } from '../../reading/bibleOrderMath'

const ROW = 48
// Perto das bordas da lista, ela rola sozinha enquanto se arrasta.
const EDGE = 44
const EDGE_STEP = 9

export default function FilaDeLivros({ lang, included, excluded, onChange }) {
  const L = (k, vars) => t(`readingOrganize.${k}`, vars, lang)
  const listRef = useRef(null)
  // Enquanto arrasta: de qual linha saiu e quanto já andou, em px.
  const [drag, setDrag] = useState(null)
  const gesture = useRef(null)

  const offsetNow = () => {
    const g = gesture.current
    const list = listRef.current
    return g.pointerY - g.startY + (list.scrollTop - g.startScroll)
  }

  // Rola a lista enquanto o dedo está perto de uma das bordas.
  useEffect(() => {
    if (!drag) return undefined
    let frame
    const tick = () => {
      const g = gesture.current
      const list = listRef.current
      if (g && list) {
        const box = list.getBoundingClientRect()
        const before = list.scrollTop
        if (g.pointerY < box.top + EDGE) list.scrollTop -= EDGE_STEP
        else if (g.pointerY > box.bottom - EDGE) list.scrollTop += EDGE_STEP
        if (list.scrollTop !== before) setDrag(d => (d ? { ...d, offset: offsetNow() } : d))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.from])

  function startDrag(e, index) {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    gesture.current = { startY: e.clientY, pointerY: e.clientY, startScroll: listRef.current.scrollTop }
    setDrag({ from: index, offset: 0 })
  }
  function moveDrag(e) {
    if (!gesture.current) return
    gesture.current.pointerY = e.clientY
    setDrag(d => (d ? { ...d, offset: offsetNow() } : d))
  }
  function endDrag(commit) {
    if (!gesture.current) return
    const target = dragTargetIndex(drag.from, offsetNow(), ROW, included.length)
    gesture.current = null
    setDrag(null)
    if (commit && target !== drag.from) onChange(moveBook(included, drag.from, target))
  }
  function moveWithKeys(e, index) {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!delta) return
    e.preventDefault()
    const target = index + delta
    if (target >= 0 && target < included.length) onChange(moveBook(included, index, target))
  }

  const target = drag ? dragTargetIndex(drag.from, drag.offset, ROW, included.length) : null
  // A linha arrastada não sai da lista.
  const dragged = drag ? Math.max(-drag.from * ROW, Math.min((included.length - 1 - drag.from) * ROW, drag.offset)) : 0
  const onlyOne = included.length === 1

  return (
    <div data-fila="livros">
      <p style={styles.groupLabel}>{included.length === 1 ? L('customInPlanOne', { n: 1 }) : L('customInPlanMany', { n: included.length })}</p>
      <div ref={listRef} style={styles.list} data-fila="no-plano">
        {included.map((book, i) => {
          const isDragged = drag?.from === i
          const shift = drag && !isDragged ? dragRowShift(i, drag.from, target, ROW) : 0
          const name = bookNameFor(book, lang)
          return (
            <div
              key={book}
              data-livro={book}
              style={{
                ...styles.row,
                transform: `translateY(${isDragged ? dragged : shift}px)`,
                transition: drag && !isDragged ? 'transform .12s ease' : 'none',
                ...(isDragged ? styles.rowDragged : null),
              }}
            >
              <button
                type="button"
                style={styles.handle}
                aria-label={L('customMoveAria', { book: name, n: i + 1 })}
                onPointerDown={e => startDrag(e, i)}
                onPointerMove={moveDrag}
                onPointerUp={() => endDrag(true)}
                onPointerCancel={() => endDrag(false)}
                onKeyDown={e => moveWithKeys(e, i)}
              >
                <AppIcon name="GripVertical" size={18} strokeWidth={2} color="var(--bento-t4)" />
              </button>
              <span style={styles.index}>{i + 1}</span>
              <span style={styles.name}>{name}</span>
              <button
                type="button"
                style={{ ...styles.iconBtn, ...(onlyOne ? styles.iconBtnOff : null) }}
                disabled={onlyOne}
                aria-label={L('customRemoveAria', { book: name })}
                onClick={() => onChange(setBookIncluded(included, book, false))}
              >
                <span style={styles.iconDot}><AppIcon name="Minus" size={15} strokeWidth={2.4} color="var(--bento-ink)" /></span>
              </button>
            </div>
          )
        })}
      </div>
      {onlyOne && <p style={styles.note}>{L('customLastBook')}</p>}

      {excluded.length > 0 && (
        <>
          <p style={{ ...styles.groupLabel, marginTop: 18 }}>{excluded.length === 1 ? L('customOutOne', { n: 1 }) : L('customOutMany', { n: excluded.length })}</p>
          <div style={styles.list} data-fila="fora">
            {excluded.map(book => {
              const name = bookNameFor(book, lang)
              return (
                <div key={book} data-livro={book} style={styles.row}>
                  <span style={{ ...styles.name, ...styles.nameOut }}>{name}</span>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    aria-label={L('customAddAria', { book: name })}
                    onClick={() => onChange(setBookIncluded(included, book, true))}
                  >
                    <span style={{ ...styles.iconDot, ...styles.iconDotAdd }}><AppIcon name="Plus" size={15} strokeWidth={2.4} color="var(--bento-ink)" /></span>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  groupLabel: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 800, color: 'var(--bento-ink)', margin: '14px 0 6px' },
  list: { position: 'relative', maxHeight: ROW * 6.5, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', borderRadius: 16, background: 'var(--bento-bg)' },
  row: { position: 'relative', height: ROW, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, padding: '0 2px', borderBottom: '1px solid var(--bento-line)', background: 'var(--bento-bg)' },
  rowDragged: { zIndex: 2, background: 'var(--bento-card)', borderRadius: 14, borderBottom: '1px solid transparent', boxShadow: '0 8px 22px rgba(0,0,0,.16)' },
  handle: { width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', touchAction: 'none' },
  index: { width: 22, flexShrink: 0, fontFamily: 'var(--font-bento)', fontSize: 11.5, fontWeight: 700, color: 'var(--bento-t4)', fontVariantNumeric: 'tabular-nums' },
  name: { flex: 1, minWidth: 0, fontFamily: 'var(--font-bento)', fontSize: 14, fontWeight: 700, color: 'var(--bento-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  nameOut: { fontWeight: 600, color: 'var(--bento-t3)', paddingLeft: 14 },
  iconBtn: { width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  iconBtnOff: { opacity: 0.3, cursor: 'default' },
  iconDot: { width: 28, height: 28, borderRadius: 99, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconDotAdd: { background: 'var(--bento-accent)' },
  note: { fontFamily: 'var(--font-bento)', fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: '8px 0 0' },
}
