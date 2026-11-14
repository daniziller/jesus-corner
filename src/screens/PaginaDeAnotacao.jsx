// PaginaDeAnotacao.jsx — a anotação longa, de ponta a ponta (handoff-
// biblioteca-55 §7A): a página de escrever (N2), a anotação guardada (N5)
// e a leitura — e os caminhos entre elas. "Finalizar" leva à anotação
// guardada; "Continuar escrevendo" volta à página; "Ler a anotação
// inteira" abre a página só para ler.
//
// É aqui que a anotação vai ao grupo: ao ser finalizada, para os grupos
// escolhidos em "Quem vê"; numa já finalizada, só para os grupos
// escolhidos depois. Sem versículo citado, ou se a publicação falha, o
// grupo sai da escolha — "Quem vê" nunca mostra um grupo que não recebeu.
import { useState } from 'react'
import { anotarApi } from '../anotar/anotarApi'
import { shareNote } from '../anotar/levarAoGrupo'
import { notePayload } from '../anotar/anotarMath'
import { groupsToShare } from '../anotar/guardadaMath'
import AnotarScreen from './AnotarScreen'
import AnotacaoGuardadaScreen from './AnotacaoGuardadaScreen'

// `target`: o que abrir — { fresh: true, type, details } (uma nova) ·
// { noteId } (um rascunho, na página) · { noteId, saved: true } (uma já
// finalizada, na tela da anotação guardada) · {} (o rascunho em andamento).
export default function PaginaDeAnotacao({ lang = 'pt', api = anotarApi, target, groups, onClose, onOpenBiblePassage }) {
  const [view, setView] = useState(() => (target.saved ? { name: 'saved', noteId: target.noteId, notice: null } : { name: 'write', target, details: target.details ?? null }))

  // Leva a anotação aos grupos que ainda não a receberam e devolve o que
  // aconteceu (para a linha de confirmação), ou nulo se não havia a quem.
  async function settle(note, opened, finalizedNow) {
    const ids = groupsToShare({ chosen: note.sharedGroupIds ?? [], wasFinalized: !!opened?.wasFinalized, finalizedNow, sharedBefore: opened?.sharedGroupIds ?? [] })
    if (ids.length === 0) return null
    const result = await shareNote(api, note, ids)
    if (result.failed.length) {
      const kept = (note.sharedGroupIds ?? []).filter(id => !result.failed.includes(id))
      await api.save(notePayload({ ...note, sharedGroupIds: kept }, { trim: false })).catch(err => console.error('[anotar] tirar o grupo que não recebeu', err))
    }
    return result
  }

  if (view.name === 'saved') {
    return (
      <AnotacaoGuardadaScreen
        lang={lang} api={api} noteId={view.noteId} groups={groups} notice={view.notice}
        onBack={onClose} onDeleted={onClose} onOpenBiblePassage={onOpenBiblePassage}
        onContinue={() => setView({ name: 'write', target: { noteId: view.noteId }, from: 'saved' })}
        onRead={() => setView({ name: 'write', target: { noteId: view.noteId }, readOnly: true, from: 'saved' })}
      />
    )
  }
  return (
    <AnotarScreen
      key={`${view.target.noteId ?? 'nova'}-${view.readOnly ? 'ler' : 'escrever'}`}
      lang={lang} api={api} target={view.target} groups={groups} initialDetails={view.details ?? null} readOnly={!!view.readOnly}
      onOpenBiblePassage={onOpenBiblePassage}
      onClose={async (note, opened) => {
        if (view.from !== 'saved') { onClose(); return }
        const notice = view.readOnly || !note ? null : await settle(note, opened, false)
        setView({ name: 'saved', noteId: view.target.noteId, notice })
      }}
      onFinalized={async (saved, opened) => {
        const notice = await settle(saved, opened, true)
        setView({ name: 'saved', noteId: saved.id, notice })
      }}
    />
  )
}
