// LapisFlutuante.jsx — o lápis flutuante da aba Bíblia (34e, handoff-
// anotacao-34): aparece só quando há uma anotação em andamento (um
// rascunho, não finalizado) e a pessoa está na Bíblia. Tocar nele abre a
// página de anotação naquele rascunho; nunca começa uma anotação nova. A
// tarja escura, com o título e quantas passagens, some sozinha depois de
// alguns segundos. O lápis é arrastável e lembra onde ficou.
//
// Aqui o rascunho só é lido — quem escreve e grava é a página de
// anotação (AnotarScreen.jsx).
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getSermonNotes } from '../../notes/sermonNotesStore'
import { currentDraft } from '../../anotar/anotarMath'
import { t } from '../../i18n'
import AppIcon from '../../icons/AppIcon'

const TARJA_MS = 4000

export default function LapisFlutuante({ lang, authUser, onOpen }) {
  // O rascunho em andamento: a anotação não finalizada mais recente.
  const [draft, setDraft] = useState(null)
  useEffect(() => {
    if (!authUser?.email) return undefined
    let cancelled = false
    getSermonNotes(authUser.email).then(notes => { if (!cancelled) setDraft(currentDraft(notes)) }).catch(() => {})
    return () => { cancelled = true }
  }, [authUser?.email])

  // A tarja "some sozinha depois de alguns segundos", deixando só o lápis.
  const [tarjaVisible, setTarjaVisible] = useState(true)
  useEffect(() => {
    if (!draft) return undefined
    setTarjaVisible(true)
    const timer = window.setTimeout(() => setTarjaVisible(false), TARJA_MS)
    return () => window.clearTimeout(timer)
  }, [draft])

  // Posição do lápis arrastado (34e, "posição lembrada") — persiste entre
  // visitas/sessões (localStorage, só client-side: é posição de UI, não
  // dado da conta). Cai em {x:0,y:0} (canto padrão) se nunca mexeu, se o
  // valor salvo for inválido, ou se localStorage não estiver disponível
  // (modo privado, etc.) — nunca trava a tela por causa disso.
  const [position, setPosition] = useState(() => {
    try {
      const raw = window.localStorage.getItem('sermonFabPos')
      if (!raw) return { x: 0, y: 0 }
      const parsed = JSON.parse(raw)
      const x = Number(parsed?.x), y = Number(parsed?.y)
      return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
    } catch { return { x: 0, y: 0 } }
  })

  // Arrasto do FAB (34e, "arrastável") — diferença de posição em relação
  // ao ponto onde o toque começou; um deslocamento total menor que 6px
  // conta como toque (abre a folha), não como arrasto, mesmo limiar que
  // qualquer gesto de toque-vs-arrasto no navegador.
  const dragState = useRef(null)
  function handleFabPointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: position.x, baseY: position.y, moved: false, lastPos: position }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function handleFabPointerMove(e) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragState.current.moved = true
    const next = { x: dragState.current.baseX + dx, y: dragState.current.baseY + dy }
    dragState.current.lastPos = next
    setPosition(next)
  }
  // "Posição lembrada" — grava só ao SOLTAR (não a cada pointermove, que
  // dispararia dezenas de escritas por segundo). Toque simples (sem
  // arrasto): abre a página de anotação para RETOMAR o rascunho em
  // andamento. O lápis só aparece com rascunho, então chegando aqui
  // sempre há o que retomar.
  function handleFabPointerUp() {
    const moved = dragState.current?.moved
    const lastPos = dragState.current?.lastPos
    dragState.current = null
    if (!moved) { onOpen?.(); return }
    if (lastPos) { try { window.localStorage.setItem('sermonFabPos', JSON.stringify(lastPos)) } catch { /* modo privado etc. — posição só não persiste */ } }
  }

  if (!draft) return null
  const passages = (draft.passages ?? []).length
  const title = String(draft.title ?? '').trim() || t('sermonNote.newTitle', undefined, lang)
  // Portal pro <body>, mesmo truque de centralização de .bottom-nav.
  return createPortal(
    <div style={styles.wrap}>
      {tarjaVisible && (
        <button type="button" style={styles.tarja} onClick={() => onOpen?.()}>
          <span style={styles.tarjaDot} />
          <span style={{ minWidth: 0 }}>
            <span style={styles.tarjaTitle}>{title}</span>
            <span style={styles.tarjaSub}>
              {passages === 0
                ? t('sermonNote.minimizedAnnotatingNone', undefined, lang)
                : t(passages === 1 ? 'sermonNote.minimizedAnnotatingOne' : 'sermonNote.minimizedAnnotatingMany', { n: passages }, lang)}
            </span>
          </span>
        </button>
      )}
      <button
        type="button" style={{ ...styles.fab, transform: `translate(${position.x}px, ${position.y}px)` }}
        onPointerDown={handleFabPointerDown} onPointerMove={handleFabPointerMove} onPointerUp={handleFabPointerUp} onPointerCancel={handleFabPointerUp}
        aria-label={t('sermonNote.newTitle', undefined, lang)}
      >
        <AppIcon name="PenLine" size={22} color="#1A1714" strokeWidth={2.2} />
        {passages > 0 && <span style={styles.fabBadge}>{passages}</span>}
      </button>
    </div>,
    document.body
  )
}

const styles = {
  // Lápis + tarja, flutuando sobre a Bíblia. A posição base já fica no
  // canto inferior direito (touchAction:none evita o scroll da página
  // brigar com o arrasto vertical); o arrasto desloca a partir daí via
  // transform.
  wrap: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--max-width)',
    bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, padding: '0 20px',
    display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
  },
  // Tarja escura (34e: preto #1A1714, raio 18).
  tarja: {
    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, height: 52, padding: '0 16px 0 14px',
    borderRadius: 18, border: 'none', background: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-bento)', pointerEvents: 'auto',
  },
  tarjaDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--bento-accent)', flexShrink: 0 },
  tarjaTitle: { display: 'block', fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tarjaSub: { display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginTop: 1 },
  // O lápis (34e: 58×58, raio 20, laranja, sombra
  // 0 8px 20px rgba(240,102,43,.4)). Selo preto no canto superior direito
  // com o número em laranja.
  fab: {
    position: 'fixed', right: 20, bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 199, touchAction: 'none', pointerEvents: 'auto',
    width: 58, height: 58, borderRadius: 20, border: 'none', background: 'var(--bento-accent)', boxShadow: '0 8px 20px rgba(240,102,43,.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
  },
  fabBadge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99, background: 'var(--bento-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bento)', fontSize: 10.5, fontWeight: 800, color: 'var(--bento-accent)',
  },
}
