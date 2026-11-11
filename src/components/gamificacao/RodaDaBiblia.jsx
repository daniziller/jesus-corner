// RodaDaBiblia.jsx — a roda da Bíblia (HANDOFF §2): UM componente SVG,
// escrito à mão, usado no Hoje (250px), em Sua Bíblia (300px) e nas três
// miniaturas de "Como a roda vai ficando" (92px). Geometria exata em
// src/gamification/wheelGeometry.js, calculada uma vez por modo (memo) e
// o preenchimento só quando o progresso muda.
//
// Props:
//   reads          { nome do livro: capítulos lidos }
//   mode           'livros' | 'capitulos'
//   size           lado em px
//   currentBook    livro atual do plano (marcador laranja) — opcional
//   highlightBook  livro com contorno de destaque — opcional
//   centerLine1    texto grande do centro — opcional
//   centerLine2    texto pequeno do centro — opcional
//   centerSize     tamanho da linha 1 em unidades do viewBox (40 no Hoje,
//                  44 em G2)
//   ariaLabel      resumo pra leitor de tela ("4,2% da Bíblia lida, 50 de
//                  1.189 capítulos")
//   onSliceClick   (nome) → fatias viram botões de teclado/toque (G2);
//                  sem isso, as fatias não são foco (Hoje)
//   animateKey     chave de memória entre montagens: com ela, ao voltar
//                  pra tela a roda pinta primeiro o que mostrava da última
//                  vez e só então cresce pro valor novo (400ms ease-out,
//                  via CSS .roda-fatia-fill; ao abrir pela 1ª vez, nada
//                  anima). Respeita prefers-reduced-motion no CSS.
import { useEffect, useMemo, useState } from 'react'
import { computeSlices, fillPath, markerAngle, highlightPath, point, MARKER_RADIUS, CENTER } from '../../gamification/wheelGeometry'
import { blockColorVar, blockToneVar } from '../../data/gamificationBlocks'

const SLICES_BY_MODE = { livros: computeSlices('livros'), capitulos: computeSlices('capitulos') }
const lastShown = new Map() // animateKey → reads da última pintura

export default function RodaDaBiblia({
  reads, mode = 'livros', size = 250, currentBook = null, highlightBook = null,
  centerLine1 = null, centerLine2 = null, centerSize = 40, ariaLabel, onSliceClick, animateKey = null,
}) {
  const slices = SLICES_BY_MODE[mode] ?? SLICES_BY_MODE.livros

  // Memória entre montagens (ver animateKey): 1º render com o que foi
  // mostrado antes, próximo frame com o atual — a transição CSS faz o
  // crescimento. Sem chave, ou sem memória, pinta direto o atual.
  const remembered = animateKey ? lastShown.get(animateKey) : null
  const [shown, setShown] = useState(remembered ?? reads)
  useEffect(() => {
    if (shown === reads) return
    const id = requestAnimationFrame(() => setShown(reads))
    return () => cancelAnimationFrame(id)
  }, [reads]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (animateKey) lastShown.set(animateKey, reads)
  }, [animateKey, reads])

  const fills = useMemo(() => slices.map(s => fillPath(s, shown?.[s.nome] ?? 0, mode)), [slices, shown, mode])

  const current = currentBook ? slices.find(s => s.nome === currentBook) : null
  const marker = current ? point(MARKER_RADIUS, markerAngle(current, reads?.[current.nome] ?? 0, mode)) : null
  const highlight = highlightBook ? slices.find(s => s.nome === highlightBook) : null

  return (
    <svg
      viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={ariaLabel}
      style={{ display: 'block', overflow: 'visible', fontFamily: 'var(--font-bento)' }}
    >
      {slices.map((s, i) => {
        const lidos = reads?.[s.nome] ?? 0
        const label = `${s.nome}, ${lidos} de ${s.capitulos} capítulos`
        const group = (
          <g key={s.nome}>
            <path d={s.trail} fill={blockToneVar(s.blocoId)} />
            {fills[i] && (
              <path className="roda-fatia-fill" d={fills[i]} style={{ d: `path("${fills[i]}")` }} fill={blockColorVar(s.blocoId)} />
            )}
          </g>
        )
        if (!onSliceClick) return group
        return (
          <g key={s.nome} role="button" tabIndex={0} aria-label={label} style={{ cursor: 'pointer', outline: 'none' }}
            onClick={() => onSliceClick(s.nome)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSliceClick(s.nome) } }}
          >
            <path d={s.trail} fill={blockToneVar(s.blocoId)} />
            {fills[i] && (
              <path className="roda-fatia-fill" d={fills[i]} style={{ d: `path("${fills[i]}")` }} fill={blockColorVar(s.blocoId)} />
            )}
          </g>
        )
      })}
      {highlight && (
        <path d={highlightPath(highlight)} fill="none" stroke="var(--bento-ink)" strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {marker && (
        <circle cx={marker[0]} cy={marker[1]} r={5.5} fill="var(--bento-accent)" stroke="#fff" strokeWidth={2.5} />
      )}
      {centerLine1 != null && (
        <text x={CENTER} y={CENTER} textAnchor="middle" fontSize={centerSize} fontWeight={800} letterSpacing={-1.5} fill="var(--bento-ink)">{centerLine1}</text>
      )}
      {centerLine2 != null && (
        <text x={CENTER} y={174} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--bento-t3)">{centerLine2}</text>
      )}
    </svg>
  )
}
