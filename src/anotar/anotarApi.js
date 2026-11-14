// anotarApi.js — de onde a página de anotação (N2) e a nota de versículo
// (N4) leem e por onde gravam. Um
// objeto só, pra a pré-visualização de desenvolvimento poder trocar por
// um de memória. Grava pelo caminho de sempre (sermonNotesStore.js): o
// formato do dado não muda.
import { fetchRow, getUserId } from '../backend/userDataStore'
import { saveSermonNote, deleteSermonNote, generateSermonSummaryFor } from '../notes/sermonNotesStore'
import { saveHighlight, updateHighlightText, updateHighlightVerses, hideHighlight } from '../highlights/highlightsStore'
import { postToRoom, deleteRoomPost } from '../groups/chapterRoomStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { findBibleVersion } from '../data/bibleVersions'
import { bookEnFor } from '../bible/bibleSearch'
import { keepLocalDraft, readLocalDraft, clearLocalDraft, keepLocalNote, readLocalNote, clearLocalNote } from './rascunhoLocal'

export const anotarApi = {
  // As anotações da pessoa (a que vai abrir, os tipos e pregadores já
  // usados) e as marcações (as etiquetas são as mesmas da nota de
  // versículo). Uma leitura só da linha dela. `owner` é de quem é a
  // cópia do rascunho no aparelho.
  async load() {
    const [row, owner] = await Promise.all([fetchRow(), getUserId()])
    return { owner: owner ?? 'guest', sermonNotes: Array.isArray(row?.sermon_notes) ? row.sermon_notes : [], highlights: Array.isArray(row?.highlights) ? row.highlights : [] }
  },
  save: note => saveSermonNote(null, note),
  remove: id => deleteSermonNote(null, id),
  // A cópia do rascunho no aparelho (rascunhoLocal.js).
  keepLocal: keepLocalDraft,
  readLocal: readLocalDraft,
  clearLocal: clearLocalDraft,
  // A nota de versículo (N4) é um registro de marcação: cria, troca o
  // texto e as etiquetas (e, em "Pronto", os grupos), estende os
  // versículos e esconde — pelo caminho de sempre (highlightsStore.js).
  // Cada uma devolve as marcações já atualizadas.
  createVerseNote: record => saveHighlight(null, record),
  updateVerseNote: (id, { text, tags, sharedGroupIds }) => updateHighlightText(null, id, text, undefined, tags, sharedGroupIds),
  setVerseNoteVerses: (id, verses) => updateHighlightVerses(null, id, verses),
  hideVerseNote: id => hideHighlight(null, id),
  // Leva a nota à sala do capítulo de um grupo: o texto e o versículo.
  publish: (groupId, { book, chapter, body, quote }) => postToRoom(groupId, book, chapter, body, quote),
  keepLocalNote, readLocalNote, clearLocalNote,
  // A anotação guardada (N5): a síntese ("O que ficou desta anotação" —
  // só com as palavras da pessoa), desfazer uma publicação recém-feita e
  // "Marcar na Bíblia" (uma marcação por passagem; devolve as marcações).
  summarize: (words, lang) => generateSermonSummaryFor(words, lang),
  unpublish: postId => deleteRoomPost(postId),
  async markPassages(records) {
    let highlights = null
    for (const record of records) highlights = await saveHighlight(null, record)
    return highlights
  },
  // Os versículos de um capítulo ({ "1": texto, … }), na versão em uso.
  async chapterVerses(book, chapter, lang = 'pt') {
    const chapters = await fetchBookText(getSelectedVersionId(lang), lang === 'en' ? bookEnFor(book) : book)
    return chapters?.[String(chapter)]?.verses ?? {}
  },
  versionShort: (lang = 'pt') => findBibleVersion(getSelectedVersionId(lang))?.short ?? '',
  memberCounts: groupIds => getGroupMemberCounts(groupIds),
}
