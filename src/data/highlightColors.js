// Cores disponíveis pra grifar um trecho — pelo menos 4, cada uma com um
// tom sólido (o círculo do seletor) e uma versão translúcida (o fundo por
// trás do texto marcado, ver styles.verseHighlighted em ReadingBlockView.jsx).
// labelKey aponta pra uma chave de tradução (reading.color*) usada só como
// aria-label dos círculos — a cor em si já é a informação principal.
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', labelKey: 'reading.colorYellow', swatch: '#F5C518', bg: 'rgba(245,197,24,.35)' },
  { id: 'green',  labelKey: 'reading.colorGreen',  swatch: '#4ADE80', bg: 'rgba(74,222,128,.32)' },
  { id: 'blue',   labelKey: 'reading.colorBlue',   swatch: '#60A5FA', bg: 'rgba(96,165,250,.32)' },
  { id: 'pink',   labelKey: 'reading.colorPink',   swatch: '#F472B6', bg: 'rgba(244,114,182,.32)' },
]

export const DEFAULT_HIGHLIGHT_COLOR = 'yellow'

export function highlightColorBg(colorId) {
  return HIGHLIGHT_COLORS.find(c => c.id === colorId)?.bg ?? HIGHLIGHT_COLORS.find(c => c.id === DEFAULT_HIGHLIGHT_COLOR).bg
}
