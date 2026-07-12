// Tempo relativo ("há 2h", "ontem") — usado só no feed de atividade dos
// amigos; o resto do app mostra datas absolutas (ver formatDate em
// GroupsScreen.jsx), então isso fica isolado aqui em vez de generalizar algo
// que só um lugar precisa.
export function formatRelativeTime(iso, lang) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return lang === 'en' ? 'just now' : 'agora'
  if (diffMin < 60) return lang === 'en' ? `${diffMin}m ago` : `há ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return lang === 'en' ? `${diffH}h ago` : `há ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return lang === 'en' ? 'yesterday' : 'ontem'
  if (diffD < 7) return lang === 'en' ? `${diffD}d ago` : `há ${diffD}d`
  const diffW = Math.floor(diffD / 7)
  if (diffW < 5) return lang === 'en' ? `${diffW}w ago` : `há ${diffW}sem`
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')
}
