// Preferência de ordenação dos livros na aba Bíblia (visão de mapa, fora de
// um plano — ver JourneyScreen.jsx) — por dispositivo, mesmo padrão de
// textScaleStore.js. 'biblical' (ordem canônica, padrão) ou 'alpha' (A-Z).
const KEY = 'jc_book_sort_mode'

export function getBookSortMode() {
  return localStorage.getItem(KEY) === 'alpha' ? 'alpha' : 'biblical'
}

export function setBookSortMode(mode) {
  localStorage.setItem(KEY, mode)
}
