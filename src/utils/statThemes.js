// Paleta de "temas" (fundo em gradiente claro + cor de destaque) reaproveitada
// em qualquer lugar que mostre uma métrica/ícone com 1 de 3 rótulos —
// streak/atividade em laranja, nível em roxo, restante/social em verde.
// Compartilhada entre ActivityFeedItem, HomeScreen e ProgressScreen pra não
// duplicar os mesmos hex em cada arquivo.
export const STAT_THEMES = {
  orange: { bg: 'linear-gradient(135deg,#FFF3E8,#FFDDB8)', border: 'rgba(157,67,0,.25)', color: 'var(--or)' },
  purple: { bg: 'linear-gradient(135deg,#F3E8FF,#E1CBFF)', border: 'rgba(168,85,247,.25)', color: '#9333EA' },
  green:  { bg: 'linear-gradient(135deg,#E4FBEC,#C7F5D6)', border: 'rgba(22,163,74,.25)',  color: 'var(--gr)' },
}
