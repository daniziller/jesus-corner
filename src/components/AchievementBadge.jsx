// Selo (medalha) de uma conquista — um medalhão circular com corpo em
// degradê, brilho no topo, aro biselado e o ícone da conquista em branco.
// A cor vem do "tom" da conquista (ver `tone` em src/utils/achievements.js):
// leitura, sequência (fogo), livros/Bíblia (ouro), blocos (pergaminho) e
// oração (azul). Bloqueada: cinza dessaturado, opaca, com um cadeado no
// canto. Usado na aba Progresso (grade de conquistas) e na Home (as já
// conquistadas).
import AppIcon from '../icons/AppIcon'

const TONES = {
  flame:  { body: 'radial-gradient(circle at 34% 26%, #FED7AA, #F97316 46%, #C2410C)', ring: '#FDBA74', glow: 'rgba(234,88,12,.42)' },
  book:   { body: 'radial-gradient(circle at 34% 26%, #E8C39A, #B5651D 48%, #7A2E00)', ring: '#E3A972', glow: 'rgba(157,67,0,.4)'  },
  gold:   { body: 'radial-gradient(circle at 34% 26%, #FFF1CC, #E4B95F 46%, #A97C34)', ring: '#F5DFA6', glow: 'rgba(201,154,74,.5)' },
  scroll: { body: 'radial-gradient(circle at 34% 26%, #C9B7FB, #7C3AED 50%, #5B21B6)', ring: '#C4B5FD', glow: 'rgba(124,58,237,.4)' },
  prayer: { body: 'radial-gradient(circle at 34% 26%, #BAE6FD, #3B82F6 50%, #1D4ED8)', ring: '#A9D8FB', glow: 'rgba(37,99,235,.4)'  },
}
const LOCKED = { body: 'radial-gradient(circle at 34% 26%, #E4E0DD, #B4AEA9 52%, #8C8580)', ring: '#CBC5C0' }

export default function AchievementBadge({ icon, tone = 'book', unlocked = true, size = 52, showLock = true, style }) {
  const t = TONES[tone] ?? TONES.book
  const palette = unlocked ? t : LOCKED
  const iconSize = Math.round(size * 0.42)

  return (
    <span
      style={{
        position: 'relative',
        width: size, height: size, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}
    >
      {/* halo atrás do selo — só quando conquistado */}
      {unlocked && (
        <span
          aria-hidden
          style={{
            position: 'absolute', width: size * 1.3, height: size * 1.3, borderRadius: '50%',
            background: `radial-gradient(circle, ${t.glow}, transparent 68%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* corpo do medalhão */}
      <span
        style={{
          position: 'relative',
          width: size, height: size, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: palette.body,
          border: `1.5px solid ${palette.ring}`,
          boxShadow: unlocked
            ? `inset 0 2px 3px rgba(255,255,255,.5), inset 0 -4px 8px rgba(0,0,0,.28), 0 6px 16px ${t.glow}`
            : 'inset 0 1px 2px rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.16)',
          opacity: unlocked ? 1 : 0.6,
        }}
      >
        {/* brilho superior */}
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 22%, rgba(255,255,255,.55), rgba(255,255,255,0) 58%)',
            pointerEvents: 'none',
          }}
        />
        <AppIcon
          name={icon}
          size={iconSize}
          color="#fff"
          style={{ position: 'relative', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.4))', opacity: unlocked ? 1 : 0.85 }}
        />
      </span>

      {/* cadeado no canto — só bloqueada */}
      {!unlocked && showLock && (
        <span
          style={{
            position: 'absolute', right: -1, bottom: -1,
            width: Math.round(size * 0.36), height: Math.round(size * 0.36), borderRadius: '50%',
            background: 'var(--white)', border: '1px solid var(--g2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <AppIcon name="Lock" size={Math.round(size * 0.2)} color="var(--g4)" />
        </span>
      )}
    </span>
  )
}
