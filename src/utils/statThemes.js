// Paleta de "temas" (fundo sólido + cor de destaque) reaproveitada em
// qualquer lugar que mostre uma métrica/ícone com 1 de 2 rótulos —
// atividade de leitura em laranja, social (grupo) em areia. Hoje usada só
// por ActivityFeedItem.jsx (Home/Progresso migraram pra estilo próprio
// inline durante o redesign Bento). Cor sólida, sem degradê — a identidade
// Bento não usa gradiente em superfície nenhuma (ver src/index.css, tokens
// --bento-*).
//
// Achado na varredura de identidade (2026-09-08): existia um terceiro tema
// `purple`, não usado por nada desde que "level_up" saiu do feed (ver
// comentário em ActivityFeedItem.jsx) — removido. `green` usava
// `#E1F5E9`/`#1E8E4F`, fora da paleta permitida (LEGADO §11: só as cores
// listadas, exceto admin e telas de marca) — trocado pela dupla areia
// (--bento-sand/--bento-sand-icon), já usada como "terceiro acento" em
// outras telas (ex.: AdminScreen.jsx).
export const STAT_THEMES = {
  orange: { bg: 'var(--bento-mark)', color: 'var(--bento-accent)' },
  sand:   { bg: 'var(--bento-sand)', color: 'var(--bento-sand-icon)' },
}
