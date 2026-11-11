// orei.js — o "orei" é um só (handoff-passos-pedidos-53-54, PROMPT-CODE):
// o check da Súplica (S2) e o botão da lista de pedidos (O1) passam por
// aqui. Vale uma vez por pedido por dia (a marca é do DIA do aparelho, ver
// markPraying). Em pedido de outra pessoa soma na contagem dela e na minha
// família "Oração pelos outros" — o App escuta `onOreiPelosOutros` e
// reavalia as conquistas; em pedido meu só registra a data.
import { markPraying, unmarkPrayingToday } from '../groups/prayerRequestsStore'
import { countsForOthers } from './pedidosMath.js'

const listeners = new Set()

export function onOreiPelosOutros(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(request) {
  if (!countsForOthers(request)) return
  for (const fn of listeners) {
    try { fn(request) } catch (err) { console.error('[orei] ouvinte', err) }
  }
}

export async function orarPor(request) {
  await markPraying(request.id)
  notify(request)
}

// Só a Súplica desfaz, e só a marca de hoje feita naquela mesma oração.
export async function desfazerOrei(request) {
  await unmarkPrayingToday(request.id)
  notify(request)
}
