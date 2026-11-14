// levarAoGrupo.js — leva uma anotação aos grupos escolhidos (a sala do
// capítulo da primeira passagem citada, como sempre). Devolve o que foi:
// `shared` ([{ groupId, postId }] — o id serve para o "Desfazer") e o que
// não foi (`failed`), com o motivo: 'no_passage' (a anotação não cita
// versículo) ou 'network'.
import { groupPostOfNote } from './guardadaMath.js'

export async function shareNote(api, note, groupIds) {
  if (groupIds.length === 0) return { shared: [], failed: [], reason: null }
  const post = groupPostOfNote(note)
  if (!post) return { shared: [], failed: [...groupIds], reason: 'no_passage' }
  const results = await Promise.allSettled(groupIds.map(groupId => api.publish(groupId, post)))
  const shared = []
  const failed = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') shared.push({ groupId: groupIds[i], postId: result.value ?? null })
    else { console.error('[anotar] levar ao grupo', groupIds[i], result.reason); failed.push(groupIds[i]) }
  })
  return { shared, failed, reason: failed.length ? 'network' : null }
}
