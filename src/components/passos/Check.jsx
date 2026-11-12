// Check.jsx — o check dos quadros de passos e pedidos (handoff-passos-
// pedidos-53-54): traço de 2,6 numa grade de 20, no tamanho pedido.
export default function Check({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  )
}
