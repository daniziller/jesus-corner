// SeloDeLivro.jsx — o selo de um livro (HANDOFF §6): quadrado arredondado
// na cor do bloco com a sigla. UM componente pros três estados, em todo
// tamanho (44px na estante, 36px em "O próximo selo", 58px/64px nos
// cartões de G8/G10 ficam no próprio cartão, que é maior que um selo):
//   completo     — fundo na cor do bloco, sigla branca;
//   andamento    — fundo branco, borda 2px na cor, preenchimento no TOM do
//                  bloco subindo de baixo (lidos/capítulos), sigla na cor;
//   nao-comecado — fundo branco, borda 1,5px tracejada, sigla cinza.
// Raio = 30% do lado; sigla 800 em 36% do lado (30% com 3 caracteres).
import { blockColorVar, blockToneVar } from '../../data/gamificationBlocks'
import { sealState } from '../../gamification/sealDetails'

export default function SeloDeLivro({ sigla, blocoId, lidos = 0, total = 1, size = 44, ariaLabel, onClick }) {
  const state = sealState(lidos, total)
  const radius = size * 0.3
  const fontSize = size * (sigla.length >= 3 ? 0.3 : 0.36)
  const base = {
    position: 'relative', width: size, height: size, borderRadius: radius, boxSizing: 'border-box', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bento)', fontWeight: 800, fontSize, lineHeight: 1, letterSpacing: '-.02em',
    border: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default',
  }
  let style
  if (state === 'completo') style = { ...base, background: blockColorVar(blocoId), color: '#fff' }
  else if (state === 'andamento') style = { ...base, background: '#fff', border: `2px solid ${blockColorVar(blocoId)}`, color: blockColorVar(blocoId) }
  else style = { ...base, background: '#fff', border: '1.5px dashed var(--bento-t6)', color: 'var(--bento-t6)' }

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} style={style} aria-label={ariaLabel} onClick={onClick}>
      {state === 'andamento' && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.round((lidos / total) * 100)}%`, background: blockToneVar(blocoId) }} />
      )}
      <span style={{ position: 'relative' }}>{sigla}</span>
    </Tag>
  )
}
