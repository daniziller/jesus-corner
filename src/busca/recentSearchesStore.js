// recentSearchesStore.js — as buscas recentes da aba Bíblia (handoff-
// biblia-52 §6.1): até cinco, só neste aparelho (localStorage), nunca na
// conta. A regra de quem entra e quem sobe é addRecentSearch (buscaMath.js).
import { addRecentSearch } from './buscaMath.js'

const KEY = 'jc_bible_recent_searches'

export function getRecentSearches() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter(r => r && typeof r.text === 'string') : []
  } catch {
    return []
  }
}

// Guarda e devolve a lista nova.
export function rememberSearch(item) {
  const next = addRecentSearch(getRecentSearches(), item)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage cheio/indisponível — só perde o "recentes", não é crítico.
  }
  return next
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // idem
  }
  return []
}
