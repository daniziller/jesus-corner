// Agrupa sessões consecutivas do mesmo livro — a lista de sessões de um
// bloco já vem em ordem de leitura, então basta juntar vizinhas iguais.
export function groupSessionsByBook(sessions) {
  const groups = []
  for (const s of sessions) {
    const last = groups[groups.length - 1]
    if (last && last.book === s.book) {
      last.sessions.push(s)
    } else {
      groups.push({ book: s.book, sessions: [s] })
    }
  }
  return groups
}
