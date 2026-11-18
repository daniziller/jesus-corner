// Text-to-speech premium — voz natural (audiolivro) pro modo mãos-livres
// (ver src/audio/premiumSpeech.js). Usa o Vercel AI Gateway (mesmo do
// chat / plano por tema: OIDC em produção, AI_GATEWAY_API_KEY local).
//
// Cache em duas camadas. No SERVIDOR (api/_lib/ttsCache.js, pedido dela,
// 2026-11-18): o texto é o mesmo pra todo mundo, então cada trecho é
// gerado uma vez, guardado no Supabase Storage e servido a todos os
// assinantes — já guardado, a resposta é só um link assinado ({ url }) e
// não gera nada. No APARELHO: o app guarda o
// mp3 no Cache Storage e depois toca de graça e offline.
//
// Custo: gpt-4o-mini-tts (~centavos por capítulo). Guardas: exige login +
// assinatura ativa, limita o tamanho por requisição (MAX_CHARS) e limita
// os trechos NOVOS por pessoa por dia (api/_lib/ttsLimit.js — os já
// guardados não contam). A voz NÃO entra no
// limite mensal de IA por pessoa (pedido dela, 2026-11-18): é gerada
// conforme o uso — o primeiro a pedir um trecho gera, e ele fica guardado
// pra todos —, então o custo é do app, uma vez por trecho, e não de quem
// ouviu primeiro.
import { createClient } from '@supabase/supabase-js'
import { generateSpeech } from 'ai'
import { fetchEntitlement } from './_lib/entitlement.js'
import { ttsCachePath, findCachedAudio, storeAudio } from './_lib/ttsCache.js'
import { claimTtsGeneration, releaseTtsGeneration } from './_lib/ttsLimit.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Sempre checar https://ai-gateway.vercel.sh/v1/models antes de trocar o id
// (ver skill vercel:ai-sdk / comentário em api/_lib/ai.js). gpt-4o-mini-tts
// é o melhor custo-benefício pra ler texto longo com voz natural.
const MODEL = 'openai/gpt-4o-mini-tts'
// Vozes do OpenAI: alloy, ash, ballad, coral, echo, fable, onyx, nova,
// sage, shimmer, verse. "sage" e "alloy" ficam bem calmas/neutras em pt.
const VOICE = 'sage'
// O app manda trechos de até ~700 caracteres (BATCH_CHARS em
// src/audio/premiumSpeech.js); 1.500 dá folga e, junto com o limite
// diário, segura o custo de quem chame a API direto com textos longos.
const MAX_CHARS = 1500
// As instruções de narração entram na chave do cache: mudar o texto delas
// gera áudios novos.
const INSTRUCTIONS = {
  en: 'Read calmly and clearly, at a gentle, unhurried pace, like an audiobook narrator for a devotional. Warm and reverent, never dramatic.',
  pt: 'Leia com calma e clareza, num ritmo suave e sem pressa, como um narrador de audiolivro devocional. Tom acolhedor e reverente, nunca dramático.',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const userId = userData.user.id

  // Reconfere assinatura no servidor — a voz natural é do Premium, mesmo
  // quando o áudio já está guardado.
  const ent = await fetchEntitlement(supabase, userId)
  if (!ent.hasPremium) return res.status(403).json({ error: 'premium_required' })

  const { text, lang } = req.body || {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'bad_request' })
  }
  const clean = text.trim().slice(0, MAX_CHARS)
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const instructions = INSTRUCTIONS[cleanLang]

  // Já guardado no servidor: devolve o link, sem gerar.
  const cachePath = ttsCachePath({ model: MODEL, voice: VOICE, lang: cleanLang, instructions, text: clean })
  const cachedUrl = await findCachedAudio(cachePath)
  if (cachedUrl) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ url: cachedUrl })
  }

  // Ainda não existe: gera e guarda pra todos. Fora do limite mensal de
  // IA da pessoa, mas dentro do limite diário de trechos novos — bateu,
  // responde 429 e o app lê esse trecho com a voz do aparelho.
  if (!(await claimTtsGeneration(userId))) {
    return res.status(429).json({ error: 'tts_daily_limit' })
  }

  try {
    const { audio } = await generateSpeech({
      model: MODEL,
      text: clean,
      voice: VOICE,
      outputFormat: 'mp3',
      language: cleanLang,
      instructions,
      speed: 1,
    })
    const bytes = Buffer.from(audio.uint8Array)
    // Guarda pra todo mundo antes de responder (a função pode ser encerrada
    // logo depois da resposta). Falhar aqui não impede quem pediu de ouvir.
    // Sempre como audio/mpeg (o pedido é mp3, e é o único tipo que o bucket
    // aceita), mesmo que o provedor rotule de outro jeito.
    await storeAudio(cachePath, bytes, 'audio/mpeg')
    res.setHeader('Content-Type', audio.mediaType || 'audio/mpeg')
    res.setHeader('Content-Length', String(bytes.length))
    // O client cacheia por conta própria; ajuda quem não cachear.
    res.setHeader('Cache-Control', 'private, max-age=604800')
    return res.status(200).send(bytes)
  } catch (err) {
    console.error('TTS generation failed:', err?.message || err)
    // A falha foi do provedor: não gasta o dia de ninguém.
    await releaseTtsGeneration(userId)
    return res.status(502).json({ error: 'tts_failed' })
  }
}
