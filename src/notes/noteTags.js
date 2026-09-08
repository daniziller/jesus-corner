// noteTags.js — vocabulário de etiquetas de 39f ("Medo", "Consolo",
// "Salmos"...). Sem tabela própria: cada marcação já guarda suas
// etiquetas (highlight.tags, pacote 39) — o vocabulário é só a união de
// tudo que a pessoa já usou, então uma etiqueta nova (chip "+ nova")
// passa a existir pra sempre nas próximas notas sem precisar de nenhuma
// escrita extra.
export function collectTagVocabulary(highlights) {
  const set = new Set()
  for (const h of highlights ?? []) {
    if (h.hidden) continue
    for (const tag of h.tags ?? []) if (tag && tag.trim()) set.add(tag.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
