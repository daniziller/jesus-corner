// meusEstudosApi.js — por onde a tela Estudos lê e grava as ações de "Meus
// estudos": os convites de amigos, o que publiquei no banco, e apagar um
// estudo guardado. Um objeto só, pra a pré-visualização de desenvolvimento
// poder trocar por um de memória.
import { getMyPublishedStudies, getMyStudyInvites, withdrawStudy, acceptStudyInvite } from './publicStudiesStore'
import { deleteAiStudy } from './aiStudiesStore'
import { deleteInductiveStudy } from './inductiveStudiesStore'
import { clearStudyProgress } from './studiesProgressStore'

export const meusEstudosApi = {
  published: () => getMyPublishedStudies(),
  invites: () => getMyStudyInvites(),
  withdraw: studyId => withdrawStudy(studyId),
  acceptInvite: studyId => acceptStudyInvite(studyId),
  // Tira um estudo guardado: o que é da pessoa é apagado; o do catálogo
  // tem só o progresso zerado (ver meusEstudosMath.js/removalOf).
  remove(entry) {
    if (entry.kind === 'ai') return deleteAiStudy(null, entry.id)
    if (entry.kind === 'inductive') return deleteInductiveStudy(null, entry.id)
    return clearStudyProgress(null, entry.id, entry.sessionIds)
  },
}
