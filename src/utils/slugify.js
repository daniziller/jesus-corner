// Slug de nome de livro bíblico -> nome de arquivo em public/bible-text/.
// Usado tanto pelo script de geração (scripts/build-bible-text.mjs, que
// roda fora do Vite) quanto pelo app em runtime (bibleTextStore.js) — os
// dois precisam produzir exatamente o mesmo slug pro fetch bater no arquivo
// certo, por isso essa função fica isolada aqui em vez de duplicada.
export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
