// Icone.jsx — os traços da página de anotação (handoff-biblioteca-55,
// referencia/Anotar 56): os mesmos desenhos do quadro, em 20×20.
const PATHS = {
  down: <path d="M5 8l5 5 5-5" />,
  left: <path d="M12 5l-5 5 5 5" />,
  right: <path d="M8 5l5 5-5 5" />,
  plus: <path d="M10 4v12M4 10h12" />,
  lines: <path d="M4 6h12M4 10h12M4 14h7" />,
  mic: <><rect x="7.5" y="3" width="5" height="9" rx="2.5" /><path d="M4.5 10a5.5 5.5 0 0011 0M10 15.5V18" /></>,
}

export default function Icone({ name, size = 16, color = 'var(--bento-ink)', strokeWidth = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
