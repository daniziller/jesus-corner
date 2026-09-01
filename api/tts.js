// Text-to-speech premium — voz natural (audiolivro) pro modo mãos-livres
// (ver src/audio/premiumSpeech.js). Usa o Vercel AI Gateway (mesmo do
// chat / plano por tema: OIDC em produção, AI_GATEWAY_API_KEY local).
//
// O texto bíblico nunca muda, então o CLIENT cacheia o mp3 devolvido aqui
// (Cache Storage) — cada trecho é gerado uma vez por dispositivo e depois
// toca de graça e offline. Este endpoint não persiste nada; só gera.
//
// Custo: gpt-4o-mini-tts é barato (~centavos por capítulo). Guardas contra
// abuso: exige login + assinatura ativa, e limita o tamanho por requisição.
// Um teto diário por usuário pode entrar depois se o uso pedir.
import { createClient } from '@supabase/supabase-js'
import { generateSpeech } from 'ai'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Sempre checar https://ai-gateway.vercel.sh/v1/models antes de trocar o id
// (ver skill vercel:ai-sdk / comentário em api/_lib/ai.js). gpt-4o-mini-tts
// é o melhor custo-benefício pra ler texto longo com voz natural.
const MODEL = 'openai/gpt-4o-mini-tts'
// Vozes do OpenAI: alloy, ash, ballad, coral, echo, fable, onyx, nova,
// sage, shimmer, verse. "sage" e "alloy" ficam bem calmas/neutras em pt.
const VOICE = 'sage'
const MAX_CHARS = 6000

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

  // Reconfere assinatura no servidor — custo real por chamada (mesmo
  // espírito de chat-about-text.js / generate-theme-plan.js).
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, access_type')
    .eq('user_id', userId)
    .maybeSingle()
  const isPremium = sub && (
    (sub.access_type === 'free' || sub.access_type === 'lifetime')
      ? sub.status === 'active'
      : sub.status === 'active' || sub.status === 'trialing'
  )
  if (!isPremium) return res.status(403).json({ error: 'subscription_required' })

  const { text, lang } = req.body || {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'bad_request' })
  }
  const clean = text.trim().slice(0, MAX_CHARS)

  try {
    const { audio } = await generateSpeech({
      model: MODEL,
      text: clean,
      voice: VOICE,
      outputFormat: 'mp3',
      language: lang === 'en' ? 'en' : 'pt',
      instructions: lang === 'en'
        ? 'Read calmly and clearly, at a gentle, unhurried pace, like an audiobook narrator for a devotional. Warm and reverent, never dramatic.'
        : 'Leia com calma e clareza, num ritmo suave e sem pressa, como um narrador de audiolivro devocional. Tom acolhedor e reverente, nunca dramático.',
      speed: 1,
    })
    const bytes = Buffer.from(audio.uint8Array)
    res.setHeader('Content-Type', audio.mediaType || 'audio/mpeg')
    res.setHeader('Content-Length', String(bytes.length))
    // O client cacheia por conta própria; ajuda quem não cachear.
    res.setHeader('Cache-Control', 'private, max-age=604800')
    return res.status(200).send(bytes)
  } catch (err) {
    console.error('TTS generation failed:', err?.message || err)
    return res.status(502).json({ error: 'tts_failed' })
  }
}
