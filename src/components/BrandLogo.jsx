// Logotipo (quadro 16a): Manrope 800, tracking −5%, "Jesus'" na tinta (ou
// branco sobre escuro) e "Corner" sempre em #F0662B — exceto sobre laranja,
// onde o logotipo inteiro é preto (quadro 16c). Só o texto: o símbolo é
// BrandMark.jsx, e a assinatura (símbolo + logotipo) junta os dois com a
// altura do símbolo igual à da caixa alta e distância de metade da largura
// do símbolo (16a).
export default function BrandLogo({ size = 19, onDark = false, onAccent = false, letterSpacing, style }) {
  const base = onAccent ? 'var(--bento-ink)' : onDark ? '#fff' : 'var(--bento-ink)'
  const accent = onAccent ? 'var(--bento-ink)' : 'var(--bento-accent)'
  return (
    <span style={{ fontFamily: 'var(--font-bento)', fontSize: size, fontWeight: 800, lineHeight: 1, letterSpacing: letterSpacing ?? '-0.05em', color: base, whiteSpace: 'nowrap', ...style }}>
      Jesus' <span style={{ color: accent }}>Corner</span>
    </span>
  )
}
