import { useEffect, useRef, useState } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'

// Alguns alvos (nav-tabs, profile-avatar) existem ao mesmo tempo em dois
// elementos do DOM — BottomNav e Sidebar (ou AppHeader e Sidebar) ficam
// SEMPRE montados, só um escondido via CSS (display:none na media query de
// 1024px, não renderização condicional). Um querySelector comum pegaria
// sempre o primeiro em ordem no JSX (o do Sidebar) mesmo no mobile — por
// isso aqui pegamos todos e escolhemos o primeiro com tamanho real (um
// elemento display:none sempre mede largura/altura zero).
function findVisibleTourTarget(value) {
  const nodes = document.querySelectorAll(`[data-tour="${value}"]`)
  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return node
  }
  return null
}

const FIND_TIMEOUT_MS = 2500
const FIND_POLL_MS = 100
const PAD = 8
const CARD_WIDTH = 320
const CARD_MARGIN = 14

export default function TourOverlay({ step, stepNumber, totalSteps, isLast, onAdvance, onSkip, lang, onTargetMissing }) {
  const [rect, setRect] = useState(null)
  const targetElRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let pollTimer = null
    let elapsed = 0
    let resizeObserver = null
    setRect(null)
    targetElRef.current = null

    function measure() {
      const el = targetElRef.current
      if (!el || cancelled) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    function poll() {
      if (cancelled) return
      const el = findVisibleTourTarget(step.target)
      if (el) {
        targetElRef.current = el
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        // scrollIntoView é assíncrono (rolagem suave) — espera assentar
        // antes de medir, senão o recorte nasce na posição errada.
        setTimeout(() => { if (!cancelled) measure() }, 300)
        resizeObserver = new ResizeObserver(measure)
        resizeObserver.observe(el)
        return
      }
      elapsed += FIND_POLL_MS
      if (elapsed >= FIND_TIMEOUT_MS) {
        console.warn(`[tour] alvo "${step.target}" não encontrado a tempo, pulando passo.`)
        onTargetMissing()
        return
      }
      pollTimer = setTimeout(poll, FIND_POLL_MS)
    }
    poll()

    // capture:true no window já pega scroll de qualquer container rolável
    // descendente (ex: .app-content-inner), sem precisar de um listener
    // dedicado nele — todo scroll passa pela fase de captura do window.
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target, onTargetMissing])

  if (!rect) return <div style={styles.blockerOnly} />

  const cutout = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: step.shape === 'circle' ? '50%' : 16,
  }

  const cardTop = computeCardTop(cutout)
  const cardLeft = computeCardLeft(cutout)

  return (
    <>
      <div style={styles.blocker} />
      <div style={{ ...styles.cutout, ...cutout }} />
      <div style={{ ...styles.card, top: cardTop, left: cardLeft }}>
        <button aria-label={t('tour.close', undefined, lang)} onClick={onSkip} style={styles.closeBtn}>
          <AppIcon name="X" size={16} color="var(--g4)" />
        </button>
        <p style={styles.title}>{t(step.titleKey, undefined, lang)}</p>
        <p style={styles.body}>{t(step.bodyKey, undefined, lang)}</p>
        <div style={styles.footer}>
          <span style={styles.counter}>{stepNumber} / {totalSteps}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span onClick={onSkip} style={styles.skipLink}>{t('tour.skip', undefined, lang)}</span>
            <button onClick={onAdvance} className="btn-primary" style={styles.nextBtn}>
              {isLast ? t('tour.finish', undefined, lang) : t('tour.next', undefined, lang)}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function computeCardTop(cutout) {
  const spaceBelow = window.innerHeight - (cutout.top + cutout.height)
  const estCardHeight = 180
  if (spaceBelow >= estCardHeight + CARD_MARGIN) {
    return cutout.top + cutout.height + CARD_MARGIN
  }
  if (cutout.top - estCardHeight - CARD_MARGIN >= 0) {
    return cutout.top - estCardHeight - CARD_MARGIN
  }
  // Sem espaço acima nem abaixo (alvo enorme/tela curta) — centraliza.
  return Math.max(CARD_MARGIN, (window.innerHeight - estCardHeight) / 2)
}

function computeCardLeft(cutout) {
  const center = cutout.left + cutout.width / 2
  const raw = center - CARD_WIDTH / 2
  const maxLeft = window.innerWidth - CARD_WIDTH - CARD_MARGIN
  return Math.min(Math.max(raw, CARD_MARGIN), Math.max(maxLeft, CARD_MARGIN))
}

const styles = {
  blockerOnly: { position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.72)' },
  blocker:     { position: 'fixed', inset: 0, zIndex: 999 },
  cutout:      { position: 'fixed', boxShadow: '0 0 0 9999px rgba(0,0,0,.72)', transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease', zIndex: 1000, pointerEvents: 'none' },
  card:        { position: 'fixed', width: CARD_WIDTH, maxWidth: 'calc(100vw - 28px)', background: 'white', borderRadius: 18, padding: '18px 18px 14px', boxShadow: '0 20px 50px rgba(0,0,0,.35)', zIndex: 1001, transition: 'top .25s ease, left .25s ease' },
  closeBtn:    { position: 'absolute', top: 12, right: 12, border: 'none', background: 'var(--g1)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title:       { fontSize: 15, fontWeight: 800, color: 'var(--bk)', paddingRight: 26, marginBottom: 6 },
  body:        { fontSize: 12.5, fontWeight: 500, color: 'var(--g5)', lineHeight: 1.5, marginBottom: 14 },
  footer:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  counter:     { fontSize: 11, fontWeight: 700, color: 'var(--g4)' },
  skipLink:    { fontSize: 12, fontWeight: 700, color: 'var(--g4)', cursor: 'pointer' },
  nextBtn:     { width: 'auto', padding: '9px 16px', fontSize: 12.5 },
}
