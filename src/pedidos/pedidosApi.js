// pedidosApi.js — de onde as telas de pedidos (Súplica, S2; lista, O1)
// tiram os pedidos e por onde marcam o "orei". Um objeto só pra a
// pré-visualização de desenvolvimento poder trocar por um de memória.
//
// A lista junta os meus pedidos e os dos meus grupos (get_my_prayer_
// requests) com os dos meus amigos (get_prayer_requests_feed) e as MINHAS
// marcas de "orei" — é por elas, no dia do aparelho, que se sabe se já
// orei hoje (o servidor compara com o dia dele, em UTC). Nada aqui lê quem
// orou por um pedido: só a contagem.
import { getMyPrayerRequests, getPrayerRequestsFeed, getMyPrayerIntentions, getMyPrayerRequestIds } from '../groups/prayerRequestsStore'
import { dateKey } from '../utils/dateKey'
import { mergePedidos, othersPrayedCount } from './pedidosMath.js'
import { orarPor, desfazerOrei } from './orei'

export const pedidosApi = {
  // { pedidos, othersPrayed } — a lista e quantas vezes orei por pedidos de
  // outras pessoas (a conta da família "Oração pelos outros"; null se as
  // marcas não puderam ser lidas).
  async load() {
    const [mine, feed, intentions, myIds] = await Promise.all([
      getMyPrayerRequests(),
      // Sem os amigos ou sem as marcas, a lista ainda vale: os meus e os dos
      // grupos aparecem, com o "orei hoje" que o servidor informou.
      getPrayerRequestsFeed(null).catch(err => { console.error('[pedidos] pedidos dos amigos', err); return [] }),
      getMyPrayerIntentions().catch(err => { console.error('[pedidos] minhas marcas', err); return null }),
      getMyPrayerRequestIds().catch(err => { console.error('[pedidos] meus pedidos', err); return null }),
    ])
    return {
      pedidos: mergePedidos({ mine, feed, intentions, todayKey: dateKey() }),
      othersPrayed: myIds ? othersPrayedCount(intentions, myIds) : null,
    }
  },
  orar: orarPor,
  desfazer: desfazerOrei,
}
