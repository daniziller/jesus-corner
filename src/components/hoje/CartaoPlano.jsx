// CartaoPlano.jsx — "Seu plano de hoje" no Hoje (handoff-hoje-50 §4): o
// título do dia, a lista dos passos DE HOJE com círculos (aberto / laranja
// cheio com visto) e um botão. Só desenha: o estado, os textos e o botão
// vêm prontos de buildPlanCard (src/hoje/hojeMath.js), que parte do mesmo
// computeMeuPlano do Meu Plano.
//
// As linhas não são tocáveis — ninguém pula passo por aqui. O resto do
// cartão leva à aba Meu Plano (o cabeçalho é o alvo de teclado/leitor de
// tela pra isso); o botão faz a ação do estado (onAction recebe
// 'start' | 'plan' | 'read' | 'adjust' | 'retry').
//
// O círculo muda sozinho quando o passo é concluído: ao voltar pro Hoje,
// um passo que ficou pronto desde a última vez enche em 200ms (classe
// .hoje-passo-circulo, sem animação com prefers-reduced-motion). Na
// primeira abertura nada anima.
import { useEffect, useState } from 'react'
import AppIcon from '../../icons/AppIcon'
import { dateKey } from '../../utils/dateKey'

const FONT = 'var(--font-bento)'
// Passos já mostrados como feitos nesta sessão do app ("dia:passo").
let shownDone = null

export default function CartaoPlano({ card, onOpenPlan, onAction }) {
  const day = dateKey()
  const [settled, setSettled] = useState(false)
  const doneIds = (card.steps ?? []).filter(s => s.done).map(s => `${day}:${s.key}`)
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => {
    if (card.kind === 'loading') return
    shownDone = new Set([...(shownDone ?? []), ...doneIds])
  }, [card.kind, doneIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (card.kind === 'loading') return <div className="rb-context-skeleton" style={s.skeleton} />

  const navigable = card.kind !== 'error'
  const { button } = card
  const headLabel = `Seu plano de hoje: ${[card.title, ...(card.right ?? [])].join(', ')}${navigable ? '. Abrir Meu Plano' : ''}`
  const Head = navigable ? 'button' : 'div'

  return (
    <div style={{ ...s.card, cursor: navigable ? 'pointer' : 'default' }} onClick={navigable ? onOpenPlan : undefined}>
      <Head type={navigable ? 'button' : undefined} style={{ ...s.head, marginBottom: card.steps.length > 0 || button ? 13 : 0 }} aria-label={navigable ? headLabel : undefined}>
        <span style={s.headLeft}>
          <span style={s.label}>SEU PLANO DE HOJE</span>
          <span style={s.title}>{card.title}</span>
          {card.line && <span style={s.line}>{card.line}</span>}
        </span>
        {card.right && (
          <span style={s.right}>
            <span style={s.rightLine}>{card.right[0]}</span>
            <span style={s.rightLine}>{card.right[1]}</span>
          </span>
        )}
      </Head>

      {card.steps.length > 0 && (
        <ul style={s.list}>
          {card.steps.map((step, i) => {
            // Feito desde a última vez que o Hoje foi visto: pinta aberto e enche no quadro seguinte.
            const filled = step.done && (settled || shownDone === null || shownDone.has(`${day}:${step.key}`))
            return (
              <li key={step.key} style={{ ...s.row, borderBottom: i < card.steps.length - 1 ? '1px solid rgba(255,255,255,.1)' : 'none' }} aria-label={step.aria}>
                <span
                  className="hoje-passo-circulo" aria-hidden="true"
                  style={{ ...s.circle, background: filled ? 'var(--bento-accent)' : 'transparent', boxShadow: filled ? 'inset 0 0 0 2px var(--bento-accent)' : 'inset 0 0 0 2px rgba(255,255,255,.4)' }}
                >
                  {/* absoluteStrokeWidth: o traço de 2.2 é em px na tela, não na grade de 24 do ícone. */}
                  <AppIcon name="Check" size={11} strokeWidth={2.2} absoluteStrokeWidth color="var(--bento-ink)" style={{ opacity: filled ? 1 : 0 }} />
                </span>
                <span style={s.rowText} aria-hidden="true">
                  <span style={{ fontWeight: 700, color: step.done ? 'rgba(255,255,255,.6)' : '#fff' }}>{step.name}</span>
                  {step.detail && <span style={s.rowDetail}> · {step.detail}</span>}
                </span>
                <span style={s.rowRight} aria-hidden="true">{step.right}</span>
              </li>
            )
          })}
        </ul>
      )}

      {button && (
        <button
          type="button" style={button.primary ? s.primary : s.secondary}
          onClick={e => { e.stopPropagation(); onAction?.(button.action) }}
        >
          {button.label}
          {button.arrow && <AppIcon name="ArrowRight" size={16} strokeWidth={2.2} color="var(--bento-ink)" />}
        </button>
      )}
    </div>
  )
}

const btn = { width: '100%', height: 54, borderRadius: 18, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }
const s = {
  skeleton: { height: 262, borderRadius: 24, background: 'var(--bento-line)', flexShrink: 0 },
  card: { borderRadius: 24, background: 'var(--bento-ink)', padding: 16 },
  head: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'inherit', fontFamily: FONT },
  headLeft: { flex: 1, minWidth: 0, display: 'block' },
  label: { display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' },
  title: { display: 'block', fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.6px', color: '#fff', marginTop: 7 },
  line: { display: 'block', fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'rgba(255,255,255,.6)', marginTop: 6 },
  right: { flexShrink: 0, textAlign: 'right', display: 'block' },
  rightLine: { display: 'block', fontFamily: FONT, fontSize: 11.5, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,.6)' },
  list: { listStyle: 'none', margin: '0 0 13px', padding: 0, borderTop: '1px solid rgba(255,255,255,.1)' },
  row: { display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0' },
  circle: { width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  rowText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.3 },
  rowDetail: { fontWeight: 500, color: 'rgba(255,255,255,.6)' },
  rowRight: { flexShrink: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.6)' },
  primary: { ...btn, background: 'var(--bento-accent)', color: 'var(--bento-ink)' },
  secondary: { ...btn, background: 'rgba(255,255,255,.08)', color: '#fff' },
}
