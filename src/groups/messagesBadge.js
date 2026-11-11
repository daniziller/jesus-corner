// messagesBadge.js — o número de mensagens novas sobre a aba Comunidade
// (handoff-hoje-50 §7): o total; acima de 99, "99+"; zero, nada. E o
// rótulo da aba pra leitor de tela ("Comunidade, 9 mensagens novas").
// Puro — testado em scripts/test-hoje.mjs.
export function messagesBadgeText(count) {
  const n = Math.floor(Number(count) || 0)
  if (n <= 0) return null
  return n > 99 ? '99+' : String(n)
}

export function communityTabLabel(label, count) {
  const n = Math.floor(Number(count) || 0)
  if (n <= 0) return label
  return `${label}, ${n === 1 ? '1 mensagem nova' : `${n} mensagens novas`}`
}

// Soma do que getGroupMessagesSummary devolve (um total por grupo).
export function totalUnreadMessages(summary) {
  return (summary ?? []).reduce((sum, g) => sum + (g?.unreadCount || 0), 0)
}
