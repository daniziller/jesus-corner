// Paleta de "temas" (fundo sólido + cor de destaque) reaproveitada em
// qualquer lugar que mostre uma métrica/ícone com 1 de 3 rótulos —
// streak/atividade em laranja, nível em roxo, restante/social em verde. Hoje
// usada só por ActivityFeedItem.jsx (Home/Progresso migraram pra estilo
// próprio inline durante o redesign Bento). Cor sólida, sem degradê — a
// identidade Bento não usa gradiente em superfície nenhuma (ver
// src/index.css, tokens --bento-*).
export const STAT_THEMES = {
  orange: { bg: 'var(--bento-mark)', color: 'var(--bento-accent)' },
  purple: { bg: '#F3E8FF', color: '#9333EA' },
  green:  { bg: '#E1F5E9', color: '#1E8E4F' },
}
