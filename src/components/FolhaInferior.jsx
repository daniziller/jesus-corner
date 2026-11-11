// FolhaInferior.jsx — a casca de folha inferior do app (véu escurecido e
// desfocado, folha branca de raio 32 no topo, alça): a mesma da folha do
// cronômetro do Ajustar (handoff-meu-plano-47 §12.5, de onde saiu) e da
// folha do versículo do Hoje (handoff-hoje-50 §6). Quem usa só põe o
// conteúdo dentro.
//
// Fecha por toque no véu, arrastar para baixo e Esc (o botão de fechar,
// se houver, é do conteúdo). Prende o foco: ao abrir, vai pro primeiro
// botão; Tab circula só dentro da folha. `labelledBy` é o id do título.
//
// `fixed`: por padrão o véu cobre o elemento posicionado que contém a
// folha (telas sem barra de abas, como o Ajustar); com `fixed`, cobre a
// janela inteira, barra de abas incluída, via portal.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DRAG_CLOSE_PX = 80

export default function FolhaInferior({ onClose, labelledBy, fixed = false, children }) {
  const sheetRef = useRef(null)
  const dragRef = useRef({ startY: null, dy: 0 })
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    sheetRef.current?.querySelector('button:not([disabled])')?.focus?.()
  }, [])

  // Teclado ouvido no documento, não só na folha: se o foco escapar (um
  // botão que se desabilita depois do toque, por exemplo), Esc ainda fecha
  // e Tab volta pra dentro.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const focusables = [...(sheetRef.current?.querySelectorAll('button:not([disabled])') ?? [])]
      if (focusables.length === 0) return
      const first = focusables[0], last = focusables[focusables.length - 1]
      const inside = sheetRef.current.contains(document.activeElement)
      if (!inside) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function onTouchStart(e) { dragRef.current = { startY: e.touches[0].clientY, dy: 0 } }
  function onTouchMove(e) {
    if (dragRef.current.startY == null) return
    const dy = Math.max(0, e.touches[0].clientY - dragRef.current.startY)
    dragRef.current.dy = dy
    setDragY(dy)
  }
  function onTouchEnd() {
    const { dy } = dragRef.current
    dragRef.current = { startY: null, dy: 0 }
    if (dy > DRAG_CLOSE_PX) onClose()
    else setDragY(0)
  }

  const node = (
    <div style={{ ...s.veil, ...(fixed ? s.veilFixed : null) }} onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        style={{ ...s.sheet, ...(fixed ? s.sheetFixed : null), transform: dragY ? `translateY(${dragY}px)` : 'none', transition: dragY ? 'none' : 'transform .18s ease-out' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      >
        <div style={s.handle} aria-hidden="true" />
        {children}
      </div>
    </div>
  )
  return fixed ? createPortal(node, document.body) : node
}

const s = {
  veil: { position: 'absolute', inset: 0, background: 'rgba(26,23,20,.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 5 },
  veilFixed: { position: 'fixed', zIndex: 120 },
  sheet: { width: '100%', background: 'var(--bento-card)', borderRadius: '32px 32px 0 0', padding: '10px 20px calc(24px + var(--safe-bottom))', boxShadow: '0 -18px 40px rgba(0,0,0,.18)', boxSizing: 'border-box', touchAction: 'pan-y' },
  sheetFixed: { maxWidth: 'var(--max-width)' },
  handle: { width: 44, height: 5, borderRadius: 99, background: 'var(--bento-t6)', margin: '0 auto 16px' },
}
