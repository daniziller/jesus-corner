// Limite diário de trechos NOVOS da voz natural por pessoa (pedido dela,
// 2026-11-18). A voz fica fora do limite mensal de IA e é guardada pra
// todos (api/_lib/ttsCache.js): trecho já guardado toca sem limite. Este
// teto só conta trechos que precisam ser GERADOS.
//
// Por que existe: no app, cada trecho tem no máximo uns 700 caracteres
// (src/audio/premiumSpeech.js junta versículos até isso), e um ouvinte de
// verdade gera poucos trechos novos — a maior parte já foi gerada por
// alguém antes. O risco é quem mande textos inventados direto pra API:
// texto novo nunca está no cache, então cada pedido seria pago. 300 por
// dia, com no máximo 1.500 caracteres cada (MAX_CHARS em api/tts.js), dá
// umas 3 horas de áudio novo por pessoa por dia — muito acima de qualquer
// uso real, e um teto de gasto pra quem abusar.
//
// O dia é o de Brasília. A conta é atômica no banco (migração 0081):
// claim soma 1 só se ainda está abaixo do teto; release devolve 1 quando
// a geração falhou, pra uma falha do provedor não gastar o dia de ninguém.
import { createClient } from '@supabase/supabase-js'

export const TTS_DAILY_MAX = 300

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000

// 'aaaa-mm-dd' no fuso de Brasília.
export function ttsDay(nowMs = Date.now()) {
  return new Date(nowMs - BRAZIL_OFFSET_MS).toISOString().slice(0, 10)
}

let admin = null
function supabaseAdmin() {
  if (!admin) admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return admin
}

// Reserva um trecho novo no dia de `userId`. true: pode gerar. false:
// bateu o teto. Se o banco falhar, deixa gerar (e registra) — uma falha
// nossa não pode tirar a voz de quem paga.
export async function claimTtsGeneration(userId, { db = supabaseAdmin(), nowMs = Date.now(), max = TTS_DAILY_MAX } = {}) {
  const { data, error } = await db.rpc('claim_tts_generation', { p_user_id: userId, p_day: ttsDay(nowMs), p_max: max })
  if (error) {
    console.error('[ttsLimit] contagem diária falhou:', error.message)
    return true
  }
  return data != null
}

// Devolve a reserva quando a geração falhou.
export async function releaseTtsGeneration(userId, { db = supabaseAdmin(), nowMs = Date.now() } = {}) {
  const { error } = await db.rpc('release_tts_generation', { p_user_id: userId, p_day: ttsDay(nowMs) })
  if (error) console.error('[ttsLimit] não devolveu a reserva:', error.message)
}
