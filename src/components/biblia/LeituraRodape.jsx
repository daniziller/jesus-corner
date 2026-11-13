// LeituraRodape.jsx — o rodapé fixo da tela de leitura. À esquerda, sempre
// o quadrado do lápis (abre Ferramentas). À direita:
//
// - na leitura livre (handoff-biblia-52 §4 e §5): "Marcar como lido" — ou
//   "Lido · desmarcar" quando o capítulo já está lido. Ao marcar, a barra
//   dá lugar ao cartão de capítulo marcado (B4): o que mudou no livro, na
//   Bíblia e na próxima conquista, e o botão pro capítulo seguinte.
//   Pequeno, embaixo, sem festa; o texto continua rolável atrás dele. Quem
//   decide se ele aparece (ou se entra a tela de parabéns) é
//   ReadingBlockView, por markOutcome (biblia/bibliaMath.js);
// - na leitura do plano (handoff-passos-pedidos-53-54 §4, S3): o botão
//   laranja "Concluir a leitura" (`onConclude`). O cartão B4 não aparece.
//
// O cartão é anunciado como status por uma região viva que está sempre
// montada (leitor de tela só anuncia mudança em região que já existia) e
// não rouba o foco.
import { forwardRef } from 'react'
import AppIcon from '../../icons/AppIcon'
import { blockColorVar } from '../../data/gamificationBlocks'
import { markButton } from '../../biblia/bibliaMath'

const FONT = 'var(--font-bento)'

const LeituraRodape = forwardRef(function LeituraRodape({ card, blocoId, done, onTools, onMark, onUnmark, onCloseCard, onNext, onConclude }, ref) {
  const button = markButton(done)
  return (
    <div ref={ref} style={{ ...s.fixed, ...(card ? s.fixedCard : s.fixedBar) }}>
      <span role="status" aria-live="polite" style={s.srOnly}>{card ? card.aria : ''}</span>
      {card ? (
        <div style={s.card}>
          <div style={s.cardTop}>
            <span style={{ ...s.cardCheck, background: blockColorVar(blocoId) }} aria-hidden="true">
              <AppIcon name="Check" size={13} strokeWidth={2} absoluteStrokeWidth color="#fff" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.cardTitle}>{card.title}</p>
              <p style={s.cardSub}>{card.sub}</p>
            </div>
            <button type="button" style={s.cardClose} onClick={onCloseCard} aria-label="Fechar">
              <AppIcon name="X" size={16} strokeWidth={1.8} absoluteStrokeWidth color="rgba(255,255,255,.5)" />
            </button>
          </div>
          <div style={{ ...s.numbers, marginBottom: card.next ? 12 : 2 }}>
            {card.numbers.map(n => (
              <div key={n.caption} style={s.number}>
                <p style={s.numberValue}>{n.value}</p>
                <p style={s.numberCaption}>{n.caption}</p>
              </div>
            ))}
          </div>
          {card.next && (
            <button type="button" style={s.next} onClick={() => onNext(card.next.chapter)}>
              {card.next.label}
              <AppIcon name="ArrowRight" size={16} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-ink)" />
            </button>
          )}
        </div>
      ) : (
        <>
          <button type="button" style={{ ...s.tools, ...(onConclude ? s.flat : null) }} onClick={onTools} aria-label="Ferramentas">
            <AppIcon name="Pencil" size={16} strokeWidth={1.8} absoluteStrokeWidth color="var(--bento-ink)" />
          </button>
          {onConclude ? (
            <button type="button" style={s.conclude} onClick={onConclude}>
              <span>Concluir a leitura</span>
              <AppIcon name="ArrowRight" size={16} strokeWidth={2.6} color="var(--bento-ink)" style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <button type="button" style={{ ...s.mark, ...(button.done ? s.markDone : null) }} onClick={button.done ? onUnmark : onMark}>
              <AppIcon name="Check" size={13} strokeWidth={2} absoluteStrokeWidth color="var(--bento-accent)" />
              {button.label}
            </button>
          )}
        </>
      )}
    </div>
  )
})

export default LeituraRodape

// Medidas dos quadros B3 (barra), B4 (cartão) e S3 (barra do plano, sem
// sombra).
const s = {
  // Portalado pro <body> por quem usa (mesmo motivo do rodapé da leitura do
  // plano: position:fixed dentro do conteúdo com zoom calcularia errado).
  fixed: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'min(var(--max-width), 560px)', zIndex: 90, boxSizing: 'border-box' },
  fixedBar: { display: 'flex', gap: 8, padding: '14px 20px calc(22px + var(--safe-bottom))', background: 'var(--bento-bg)' },
  // O cartão flutua sobre o texto: sem fundo em volta, e os toques ao lado
  // dele passam pro texto.
  fixedCard: { padding: '14px 12px calc(12px + var(--safe-bottom))', pointerEvents: 'none' },
  srOnly: { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 },
  tools: { width: 54, height: 54, flexShrink: 0, borderRadius: 18, border: 'none', background: 'var(--bento-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 6px 18px rgba(0,0,0,.08)', cursor: 'pointer' },
  mark: { flex: 1, minWidth: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,.12)', cursor: 'pointer' },
  flat: { boxShadow: 'none' },
  conclude: { flex: 1, minWidth: 0, height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
  markDone: { background: 'var(--bento-card)', color: 'var(--bento-ink)', boxShadow: '0 6px 18px rgba(0,0,0,.08)' },
  card: { borderRadius: 28, background: 'var(--bento-ink)', padding: '16px 16px 14px', boxShadow: '0 -10px 34px rgba(0,0,0,.16)', pointerEvents: 'auto' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 },
  cardCheck: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: FONT, fontSize: 15.5, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.3px', color: '#fff', margin: '0 0 3px' },
  cardSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', margin: 0 },
  // X de 16px com área de toque de 44px — as margens negativas devolvem os
  // 14px que sobram de cada lado, pro desenho ficar como no quadro.
  cardClose: { width: 44, height: 44, flexShrink: 0, margin: -14, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  numbers: { display: 'flex', gap: 6 },
  number: { flex: 1, minWidth: 0, borderRadius: 14, background: 'rgba(255,255,255,.07)', padding: '11px 10px 10px' },
  numberValue: { fontFamily: FONT, fontSize: 16, fontWeight: 800, lineHeight: 1, letterSpacing: '-.4px', color: '#fff', margin: '0 0 5px' },
  numberCaption: { fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 1.25, color: 'rgba(255,255,255,.55)', margin: 0 },
  next: { width: '100%', height: 50, borderRadius: 16, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: FONT, fontSize: 14, fontWeight: 800, lineHeight: 1, color: 'var(--bento-ink)', cursor: 'pointer' },
}
