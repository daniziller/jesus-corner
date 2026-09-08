// Cores disponíveis pra grifar um trecho — pacote 39 (39e, "Marcar
// texto") trocou a paleta viva de antes pelos quatro tons exatos do
// quadro, sólidos (não translúcidos: o fundo atrás do texto marcado É a
// própria cor, ver styles.verseHighlighted em ReadingBlockView.jsx) e
// SEM nome nem significado atribuído pelo app — a folha de 39e nunca
// rotula os quatro retângulos, "quem marca sabe por quê" (HANDOFF-39).
// `id` continua o mesmo de antes (yellow/green/blue/pink) só como CHAVE
// de armazenamento estável — marcações já salvas com esses ids não
// precisam de migração nenhuma, só passam a aparecer no tom novo; o
// nome em si não tem mais peso semântico nenhum (por isso os ids não
// foram renomeados pra c1/c2/c3/c4: trocar a chave também exigiria
// migrar toda marcação já salva, sem ganho nenhum). `labelKey` sobrevive
// só pro filtro por cor da Biblioteca (NotesScreen.jsx, fora deste
// pacote) — não é usado em lugar nenhum da leitura/39e.
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', labelKey: 'reading.colorYellow', swatch: '#FFE3C9', bg: '#FFE3C9' },
  { id: 'green',  labelKey: 'reading.colorGreen',  swatch: '#FBEFC2', bg: '#FBEFC2' },
  { id: 'blue',   labelKey: 'reading.colorBlue',   swatch: '#D8E6D2', bg: '#D8E6D2' },
  { id: 'pink',   labelKey: 'reading.colorPink',   swatch: '#CFDCE4', bg: '#CFDCE4' },
]

export const DEFAULT_HIGHLIGHT_COLOR = 'yellow'

export function highlightColorBg(colorId) {
  return HIGHLIGHT_COLORS.find(c => c.id === colorId)?.bg ?? HIGHLIGHT_COLORS.find(c => c.id === DEFAULT_HIGHLIGHT_COLOR).bg
}
