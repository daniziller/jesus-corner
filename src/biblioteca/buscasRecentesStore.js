// buscasRecentesStore.js — as buscas recentes da aba Biblioteca (handoff-
// biblioteca-55 §6.1): até cinco, só neste aparelho (localStorage), nunca
// na conta. A regra de quem entra e quem sobe é rememberLibrarySearch
// (buscaDaBiblioteca.js).
import { rememberLibrarySearch } from './buscaDaBiblioteca.js'

const KEY = 'jc_library_recent_searches'

export function getLibraryRecentSearches() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter(r => r && typeof r.text === 'string') : []
  } catch {
    return []
  }
}

// Guarda e devolve a lista nova.
export function rememberLibraryRecentSearch(item, lang = 'pt') {
  const next = rememberLibrarySearch(getLibraryRecentSearches(), item, lang)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage cheio/indisponível — só perde o "recentes", não é crítico.
  }
  return next
}

export function clearLibraryRecentSearches() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // idem
  }
  return []
}
