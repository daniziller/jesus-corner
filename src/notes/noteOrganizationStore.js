// Pastas e arquivo da Biblioteca (pedido dela, 2026-09-12) — guardado no
// backend (tabela user_data, colunas note_folders/archived_notes, ver
// supabase/migrations/0064_note_folders_archive.sql), mesmo padrão de
// sermonNotesStore.js. Camada por cima das anotações de verdade: arquivar
// não move nem apaga nada nas stores de origem (notesStore/
// highlightsStore/sermonNotesStore) — só marca a `key` da anotação como
// arquivada (opcionalmente numa pasta), e a Biblioteca (NotesScreen.jsx)
// filtra pelo que está aqui pra decidir o que mostrar na lista principal
// vs. na tela de Arquivo.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getNoteFolders(_email) {
  const row = await fetchRow()
  return row?.note_folders ?? []
}

export async function getArchivedNotes(_email) {
  const row = await fetchRow()
  return row?.archived_notes ?? []
}

// Cria uma pasta nova e devolve ela junto com a lista inteira já
// atualizada — quem chama decide se usa só a pasta (pra em seguida
// arquivar uma nota nela) ou a lista toda (pra atualizar o estado local).
export function createNoteFolder(_email, name) {
  return withRowLock(async () => {
    const folders = await getNoteFolders(_email)
    const folder = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, createdAt: new Date().toISOString() }
    const next = [...folders, folder]
    const updated = await updateRow({ note_folders: next })
    return { folder, folders: updated?.note_folders ?? next }
  })
}

// Apagar uma pasta não apaga as anotações arquivadas nela — elas voltam
// pra "Sem pasta" (folderId: null), continuam no Arquivo normalmente.
export function deleteNoteFolder(_email, folderId) {
  return withRowLock(async () => {
    const [folders, archived] = await Promise.all([getNoteFolders(_email), getArchivedNotes(_email)])
    const nextFolders = folders.filter(f => f.id !== folderId)
    const nextArchived = archived.map(a => a.folderId === folderId ? { ...a, folderId: null } : a)
    const updated = await updateRow({ note_folders: nextFolders, archived_notes: nextArchived })
    return {
      folders: updated?.note_folders ?? nextFolders,
      archivedNotes: updated?.archived_notes ?? nextArchived,
    }
  })
}

// Arquiva (ou muda de pasta, se já estava arquivada — substitui a entrada
// existente) uma anotação pela `key` que a Biblioteca já usa. folderId
// null = "Sem pasta" (arquivo geral).
export function archiveNote(_email, noteKey, folderId = null) {
  return withRowLock(async () => {
    const archived = await getArchivedNotes(_email)
    const entry = { noteKey, folderId, archivedAt: new Date().toISOString() }
    const next = [entry, ...archived.filter(a => a.noteKey !== noteKey)]
    const updated = await updateRow({ archived_notes: next })
    return updated?.archived_notes ?? next
  })
}

// Desarquivar — volta pra lista principal da Biblioteca.
export function unarchiveNote(_email, noteKey) {
  return withRowLock(async () => {
    const archived = await getArchivedNotes(_email)
    const next = archived.filter(a => a.noteKey !== noteKey)
    const updated = await updateRow({ archived_notes: next })
    return updated?.archived_notes ?? next
  })
}
