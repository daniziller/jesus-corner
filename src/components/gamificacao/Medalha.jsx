// Medalha.jsx — a medalha de conquista (HANDOFF §5.2): UM componente SVG
// (viewBox 100×100) pra toda tela — G4 (168px), G5 (47px e 50px nos
// blocos), G6 (58px), G9 (42px), escadas (40px). Recebe família ou bloco,
// degrau (1–6), tamanho, se está ganha e se fica sobre fundo escuro.
// `tracejadoLaranja` é a não ganha "mais perto": sobre escuro (G5) só o
// traço fica laranja; sobre claro (Hoje, handoff-hoje-50 §5) o glifo
// também, com os degraus já ganhos acesos em laranja.
//
// O símbolo nunca muda; o que evolui é o material (DEGRAU_MATERIAL em
// src/data/achievements.js). Formas exatas dos cinco glifos: referência
// .dc.html do pacote (turnos 45 e 46).
//   tile:   rect 6,6 88×88 rx 26
//   pontos: seis círculos r 2.4 em y=77, x = 50 + (i − 2.5) × 8
//   degrau 4: borda interna rect 11,11 78×78 rx 21, traço 2.5
//   degrau 6: halo rect 1.5,1.5 97×97 rx 30, traço 2.5
import { DEGRAU_MATERIAL, familyById } from '../../data/achievements'
import { blockColorVar } from '../../data/gamificationBlocks'

const DOTS_X = [30, 38, 46, 54, 62, 70]

function Glifo({ familia, cor }) {
  const stroke = { fill: 'none', stroke: cor, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (familia) {
    case 'constancia':
      return (
        <>
          <rect x="29" y="34" width="10" height="26" rx="5" fill={cor} />
          <rect x="45" y="24" width="10" height="36" rx="5" fill={cor} />
          <rect x="61" y="30" width="10" height="30" rx="5" fill={cor} />
        </>
      )
    case 'tempo':
      return (
        <>
          <circle cx="50" cy="44" r="17" fill="none" stroke={cor} strokeWidth="5" />
          <path d="M50 35v10l7 5" {...stroke} />
        </>
      )
    case 'oracao':
      return (
        <>
          <rect x="46.5" y="24" width="7" height="40" rx="3.5" fill={cor} />
          <rect x="35" y="35" width="30" height="7" rx="3.5" fill={cor} />
        </>
      )
    case 'livros':
      return (
        <>
          <rect x="27" y="52" width="46" height="9" rx="3" fill={cor} />
          <rect x="31" y="40" width="38" height="9" rx="3" fill={cor} />
          <rect x="29" y="28" width="30" height="9" rx="3" fill={cor} transform="rotate(-8 44 32)" />
        </>
      )
    default: // 'leitura' e medalha de bloco: livro aberto em traço
      return <path d="M50 32C44 27.5 36 26.5 28 27.5V57c8-1 16 0 22 4.5 6-4.5 14-5.5 22-4.5V27.5c-8-1-16 0-22 4.5zM50 32v29.5" {...stroke} />
  }
}

// `contorno`: contorno laranja de 2px em volta (o próximo degrau em G4).
// `tracejadoLaranja`: o tracejado da não ganha em laranja (a mais perto, G5).
export default function Medalha({ familia = null, bloco = null, degrau = 1, size = 47, ganha = false, sobreEscuro = false, contorno = false, tracejadoLaranja = false, ariaLabel }) {
  const label = ariaLabel ?? (bloco ? `Bloco ${bloco}${ganha ? ', completo' : ''}` : `${familyById(familia)?.nome ?? ''}, degrau ${degrau} de 6${ganha ? ', ganho' : ', ainda não ganho'}`)
  const naoGanhaTile = sobreEscuro
    ? { fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.2)' }
    : { fill: '#fff', stroke: 'var(--bento-t6)' }
  const tracoNaoGanha = tracejadoLaranja ? 'var(--bento-accent)' : naoGanhaTile.stroke

  let body
  if (bloco) {
    body = ganha ? (
      <>
        <rect x="6" y="6" width="88" height="88" rx="26" fill={blockColorVar(bloco)} />
        <Glifo familia="leitura" cor="#fff" />
      </>
    ) : (
      <>
        <rect x="6" y="6" width="88" height="88" rx="26" fill={naoGanhaTile.fill} stroke={tracoNaoGanha} strokeWidth="2.5" strokeDasharray="5 4" />
        <rect x="38" y="70" width="24" height="6" rx="3" fill={blockColorVar(bloco)} opacity=".45" />
        <Glifo familia="leitura" cor="var(--medalha-glifo-apagado)" />
      </>
    )
  } else if (ganha) {
    const m = DEGRAU_MATERIAL[degrau] ?? DEGRAU_MATERIAL[1]
    const tileEscuro = m.tile === 'var(--bento-ink)'
    const tile = tileEscuro && sobreEscuro ? 'var(--medalha-tile-escuro)' : m.tile
    const pontoApagado = tileEscuro ? 'rgba(255,255,255,.16)' : 'rgba(26,23,20,.22)'
    body = (
      <>
        {m.halo && <rect x="1.5" y="1.5" width="97" height="97" rx="30" fill="none" stroke="var(--bento-accent)" strokeWidth="2.5" />}
        <rect x="6" y="6" width="88" height="88" rx="26" fill={tile} />
        {m.bordaInterna && <rect x="11" y="11" width="78" height="78" rx="21" fill="none" stroke="var(--bento-accent)" strokeWidth="2.5" />}
        <Glifo familia={familia} cor={m.glifo} />
        {DOTS_X.map((x, i) => <circle key={x} cx={x} cy="77" r="2.4" fill={i < degrau ? m.glifo : pontoApagado} />)}
      </>
    )
  } else if (tracejadoLaranja && !sobreEscuro) {
    body = (
      <>
        <rect x="6" y="6" width="88" height="88" rx="26" fill="#fff" stroke="var(--bento-accent)" strokeWidth="2.5" strokeDasharray="5 4" />
        <Glifo familia={familia} cor="var(--bento-accent)" />
        {DOTS_X.map((x, i) => <circle key={x} cx={x} cy="77" r="2.4" fill={i < degrau - 1 ? 'var(--bento-accent)' : 'var(--medalha-glifo-apagado)'} />)}
      </>
    )
  } else {
    body = (
      <>
        <rect x="6" y="6" width="88" height="88" rx="26" fill={naoGanhaTile.fill} stroke={tracoNaoGanha} strokeWidth="2.5" strokeDasharray="5 4" />
        <Glifo familia={familia} cor="var(--medalha-glifo-apagado)" />
        {DOTS_X.map((x, i) => <circle key={x} cx={x} cy="77" r="2.4" fill={i < degrau ? 'var(--bento-t6)' : 'var(--bento-bg)'} />)}
      </>
    )
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label} style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
      {body}
      {contorno && <rect x="1.5" y="1.5" width="97" height="97" rx="30" fill="none" stroke="var(--bento-accent)" strokeWidth="2" />}
    </svg>
  )
}
