// anotarApi.js — de onde a página de anotação lê e por onde grava. Um
// objeto só, pra a pré-visualização de desenvolvimento poder trocar por
// um de memória. Grava pelo caminho de sempre (sermonNotesStore.js): o
// formato do dado não muda.
import { fetchRow, getUserId } from '../backend/userDataStore'
import { saveSermonNote, deleteSermonNote } from '../notes/sermonNotesStore'
import { getGroupMemberCounts } from '../groups/groupsStore'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { findBibleVersion } from '../data/bibleVersions'
import { bookEnFor } from '../bible/bibleSearch'
import { keepLocalDraft, readLocalDraft, clearLocalDraft } from './rascunhoLocal'

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
  // Os versículos de um capítulo ({ "1": texto, … }), na versão em uso.
  async chapterVerses(book, chapter, lang = 'pt') {
    const chapters = await fetchBookText(getSelectedVersionId(lang), lang === 'en' ? bookEnFor(book) : book)
    return chapters?.[String(chapter)]?.verses ?? {}
  },
  versionShort: (lang = 'pt') => findBibleVersion(getSelectedVersionId(lang))?.short ?? '',
  memberCounts: groupIds => getGroupMemberCounts(groupIds),
}
