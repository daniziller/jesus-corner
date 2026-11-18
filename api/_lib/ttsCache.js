// Cache do áudio da voz natural NO SERVIDOR (pedido dela, 2026-11-18).
//
// O texto que a voz natural lê é o mesmo pra todo mundo: o texto bíblico
// (NVT/NLT) e frases fixas do app ("Próximo passo: Leitura."). Antes, cada
// pessoa gerava o próprio áudio de cada trecho — o mesmo capítulo era pago
// de novo a cada ouvinte, e saía do limite mensal de IA de cada um. Agora
// cada trecho é gerado UMA vez, guardado no Supabase Storage e servido a
// todos os assinantes: de graça, sem tocar no limite de ninguém.
//
// Onde: bucket privado `tts-audio` (migração 0080). Só o service role lê e
// escreve; o app recebe um link assinado e temporário pro arquivo, nunca
// acesso ao bucket — a voz natural continua sendo do Premium.
//
// Chave: sha256 de tudo que muda o áudio — modelo, voz, idioma, as
// instruções de narração e o texto. Trocar qualquer um deles gera um
// arquivo novo; o antigo fica sem uso. Só quem pede exatamente o mesmo
// texto chega ao mesmo arquivo, e o nome não revela o texto.
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const TTS_BUCKET = 'tts-audio'
// Quanto tempo o link assinado vale. O app guarda o áudio no aparelho logo
// que baixa (Cache Storage), então só precisa durar o download.
export const SIGNED_URL_SECONDS = 60 * 60

// 'pt/<64 hex>.mp3' — o idioma na frente só pra organizar o bucket.
export function ttsCachePath({ model, voice, lang, instructions, text }) {
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const hash = createHash('sha256')
    .update([model, voice, cleanLang, instructions, text].map(v => String(v ?? '')).join('\u0000'))
    .digest('hex')
  return `${cleanLang}/${hash}.mp3`
}

let admin = null
function storage() {
  if (!admin) admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return admin.storage.from(TTS_BUCKET)
}

// O link assinado do áudio já guardado, ou null se ainda não existe (ou se
// o Storage falhou — aí a voz é gerada como antes, o que nunca deixa
// ninguém sem áudio).
export async function findCachedAudio(path, { bucket = storage() } = {}) {
  const { data, error } = await bucket.createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

// Guarda o áudio recém-gerado pra todo mundo. Duas pessoas gerando o mesmo
// trecho ao mesmo tempo gravam o mesmo conteúdo (upsert). Falhar aqui não
// derruba a resposta: quem pediu recebe o áudio do mesmo jeito.
export async function storeAudio(path, bytes, contentType = 'audio/mpeg', { bucket = storage() } = {}) {
  const { error } = await bucket.upload(path, bytes, { contentType, upsert: true, cacheControl: '31536000' })
  if (error) console.error('[ttsCache] não guardou o áudio:', path, error.message)
  return !error
}
