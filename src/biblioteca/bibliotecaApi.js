// bibliotecaApi.js — de onde a aba Biblioteca tira o que mostra. Um objeto
// só, pra a pré-visualização de desenvolvimento poder trocar por um de
// memória.
//
// Lê a linha da pessoa UMA vez (user_data — a RLS só entrega a dela) e, do
// aparelho, as perguntas guardadas. Nada aqui consulta grupo, amigo ou
// outra pessoa, e a oração não passa de pickLibraryData.
import { fetchRow } from '../backend/userDataStore'
import { hideHighlight } from '../highlights/highlightsStore'
import { deleteSermonNote } from '../notes/sermonNotesStore'
import { saveNote } from '../notes/notesStore'
import { getPinnedApplicationPhrase, setPinnedApplicationPhrase } from '../reflection/applicationPhraseStore'
import { getAllPassageQuestions, removePassageQuestion } from '../aiChat/passageQuestionStore'
import { getAllChapterReadRows } from '../bible/chapterReadLog'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import { STUDIES } from '../data/studies'
import { pickLibraryData, libraryItems, chaptersByDay, studiesSummary } from './bibliotecaMath.js'

export const bibliotecaApi = {
  // { items, readByDay, studies } — os itens dos seis tipos, os capítulos
  // lidos em cada dia (o título das reflexões) e o resumo dos estudos.
  async load() {
    const [row, chapterRows] = await Promise.all([
      fetchRow(),
      // Sem o registro de leitura a Biblioteca ainda vale: a reflexão fica
      // com a data no título.
      getAllChapterReadRows().catch(err => { console.error('[biblioteca] capítulos lidos', err); return [] }),
    ])
    const data = pickLibraryData(row)
    return {
      items: libraryItems({ ...data, questions: Object.values(getAllPassageQuestions()).flat() }),
      readByDay: chaptersByDay(chapterRows),
      studies: studiesSummary({ catalog: STUDIES, ai: data.aiStudies, inductive: data.inductiveStudies, completed: data.studiesCompleted, activeStudyId: data.activeStudyId }),
    }
  },

  // O texto de um trecho marcado — a marcação guarda livro, capítulo e
  // versículos, não o texto. Um arquivo por livro, guardado em memória
  // pela sessão (bibleTextStore.js).
  async verseText(item, lang = 'pt') {
    const chapters = await fetchBookText(getSelectedVersionId(lang), lang === 'en' ? (item.bookEn || item.book) : item.book)
    const verses = chapters?.[String(item.chapter)]?.verses ?? {}
    return (item.verses ?? []).map(v => verses[String(v)]).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  },

  // "Apagar" no menu de um item — a mesma gravação de sempre de cada
  // tipo: a marcação (e a nota de versículo, que é uma marcação) fica
  // escondida (highlightsStore.js); a anotação longa sai da lista dela;
  // nota de sessão, reflexão e frase do dia saem do mapa de notas; a
  // pergunta, do aparelho.
  async remove(item) {
    if (item.type === 'pregacao') await deleteSermonNote(null, item.id)
    else if (item.type === 'marcacao' || (item.type === 'nota' && item.id)) await hideHighlight(null, item.id)
    else if (item.type === 'pergunta') removePassageQuestion({ book: item.book, chapter: item.chapter, verseStart: item.verseStart, verseEnd: item.verseEnd, question: item.question })
    else if (item.noteKey) {
      await saveNote(null, item.noteKey, '')
      // A frase fixada no Hoje é uma cópia, comparável só pelo texto
      // (applicationPhraseStore.js): apagada a frase do dia, sai a cópia.
      if (item.type === 'aplicacao') {
        const pinned = await getPinnedApplicationPhrase(null).catch(() => '')
        if (pinned && pinned === item.text) await setPinnedApplicationPhrase(null, '')
      }
    } else throw new Error(`[biblioteca] apagar: item sem registro (${item.key})`)
  },
}
