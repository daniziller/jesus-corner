// Voz premium (audiolivro) pro modo mãos-livres — busca o áudio gerado no
// servidor (api/tts.js, OpenAI gpt-4o-mini-tts via AI Gateway), cacheia o
// mp3 no Cache Storage (o texto bíblico nunca muda: cada trecho é gerado
// UMA vez por dispositivo e depois toca de graça e offline) e reproduz com
// um <audio> só, reaproveitado (pra pausar/retomar).
//
// Mesma interface do src/audio/speech.js (speakSequence / say / stop /
// pause / resume / prime) — se qualquer coisa falhar (offline sem cache,
// erro do servidor, sem assinatura), cai automaticamente pra voz do
// aparelho (speech.js). Assim o "on the go" nunca fica mudo.
import { supabase } from '../lib/supabaseClient'
import * as device from './speech'

const CACHE_NAME = 'jc-tts-v1'
const BATCH_CHARS = 700

export function isSpeechSupported() {
  // "Tem voz" = ou dá pra tocar <audio>, ou a voz do aparelho existe.
  return typeof Audio !== 'undefined' || device.isSpeechSupported()
}

// Hash estável e curto do texto (+ idioma) pra chave de cache.
function keyFor(text, lang) {
  const s = `${lang}\0${text}`
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `https://tts.jc/${lang}-${(h >>> 0).toString(36)}-${s.length}`
}

// Sem memoizar o token (varredura 2026-10-25): guardado na 1ª chamada, ele
// expirava em ~1h e todo pedido seguinte dava 401 → a voz premium caía
// em silêncio pra voz do aparelho até recarregar; e sobrevivia a trocar
// de conta. getSession() já é local e renova sozinho.
let _authToken = null
async function authToken() {
  const { data } = await supabase.auth.getSession()
  _authToken = data?.session?.access_token ?? null
  return _authToken
}

// Devolve um Blob de áudio pro texto — do cache, ou gerando no servidor.
async function getAudioBlob(text, lang) {
  let cache = null
  try { cache = await caches.open(CACHE_NAME) } catch { /* sem Cache Storage */ }

  const key = keyFor(text, lang)
  if (cache) {
    const hit = await cache.match(key)
    if (hit) return hit.blob()
  }

  const token = await authToken()
  if (!token) throw new Error('no_auth')

  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, lang }),
  })
  if (!res.ok) throw new Error(`tts_http_${res.status}`)
  const ctype = res.headers.get('content-type') || ''
  if (!ctype.startsWith('audio/')) throw new Error(`tts_bad_type_${ctype}`)

  if (cache) {
    try { await cache.put(key, res.clone()) } catch { /* cota cheia, tudo bem */ }
  }
  return res.blob()
}

// Junta trechos pequenos (versículos) em lotes de ~BATCH_CHARS pra fazer
// menos requisições e menos arquivos no cache. Mantém o mapeamento
// lote → índice do 1º trecho original (pra barra de progresso).
function batch(chunks) {
  const batches = []
  let buf = ''
  let firstIdx = 0
  chunks.forEach((c, i) => {
    if (buf && (buf.length + 1 + c.length) > BATCH_CHARS) {
      batches.push({ text: buf, idx: firstIdx })
      buf = c
      firstIdx = i
    } else {
      if (!buf) firstIdx = i
      buf = buf ? `${buf} ${c}` : c
    }
  })
  if (buf) batches.push({ text: buf, idx: firstIdx })
  return batches
}

// <audio> único reaproveitado.
let _audio = null
function audioEl() {
  if (!_audio) {
    _audio = typeof Audio !== 'undefined' ? new Audio() : null
    if (_audio) _audio.preload = 'auto'
  }
  return _audio
}

function playBlob(blob) {
  return new Promise((resolve, reject) => {
    const el = audioEl()
    if (!el) return reject(new Error('no_audio_el'))
    const url = URL.createObjectURL(blob)
    const cleanup = () => {
      el.onended = el.onerror = null
      URL.revokeObjectURL(url)
    }
    el.onended = () => { cleanup(); resolve() }
    el.onerror = () => { cleanup(); reject(new Error('audio_error')) }
    el.src = url
    el.play().catch(err => { cleanup(); reject(err) })
  })
}

// Fala uma sequência de trechos. Se o áudio premium falhar em qualquer
// ponto, o RESTO da sequência vai pela voz do aparelho. Retorna { stop, done }.
// deviceOnly: pula o /api/tts de vez e usa direto a voz do aparelho — pra
// quem não tem a voz natural (tier grátis), evita uma requisição que vai
// dar 403 e a latência dela antes do fallback.
export function speakSequence(chunks, { lang = 'pt', onChunk, onDone, deviceOnly = false } = {}) {
  const list = (Array.isArray(chunks) ? chunks : device.splitIntoChunks(chunks)).filter(Boolean)
  let stopped = false
  let deviceCtl = null
  let resolveDone
  const done = new Promise(r => { resolveDone = r })

  if (list.length === 0) {
    onDone?.(); resolveDone(); return { stop: () => {}, done }
  }

  if (deviceOnly) {
    deviceCtl = device.speakSequence(list, {
      lang, onChunk,
      onDone: () => { if (!stopped) { onDone?.(); resolveDone() } },
    })
    return {
      stop() { stopped = true; deviceCtl?.stop?.(); device.stopSpeaking(); resolveDone() },
      done,
    }
  }

  ;(async () => {
    const batches = batch(list)
    let fellBack = false
    for (let b = 0; b < batches.length && !stopped; b++) {
      if (fellBack) break
      try {
        const blob = await getAudioBlob(batches[b].text, lang)
        if (stopped) break
        onChunk?.(batches[b].idx)
        await playBlob(blob)
      } catch {
        // Premium falhou daqui em diante — termina com a voz do aparelho.
        fellBack = true
        const rest = list.slice(batches[b].idx)
        deviceCtl = device.speakSequence(rest, {
          lang,
          onChunk: i => onChunk?.(batches[b].idx + i),
          onDone: () => { if (!stopped) { onDone?.(); resolveDone() } },
        })
        return
      }
    }
    if (!stopped && !fellBack) { onDone?.(); resolveDone() }
  })()

  return {
    stop() {
      stopped = true
      deviceCtl?.stop?.()
      try { const el = audioEl(); if (el) { el.pause(); el.removeAttribute('src'); el.load() } } catch { /* noop */ }
      device.stopSpeaking()
      resolveDone()
    },
    done,
  }
}

export function say(text, { lang = 'pt' } = {}) {
  return speakSequence(device.splitIntoChunks(text), { lang })
}

export function stopSpeaking() {
  try { const el = audioEl(); if (el) { el.pause(); el.removeAttribute('src'); el.load() } } catch { /* noop */ }
  device.stopSpeaking()
}

export function pauseSpeech() {
  try { audioEl()?.pause() } catch { /* noop */ }
  try { window.speechSynthesis?.pause() } catch { /* noop */ }
}

export function resumeSpeech() {
  try { const el = audioEl(); if (el && el.src && el.paused) el.play().catch(() => {}) } catch { /* noop */ }
  try { window.speechSynthesis?.resume() } catch { /* noop */ }
}

// Destrava áudio no iOS a partir do gesto (tanto <audio> quanto a voz do
// aparelho). Chamar DENTRO do onClick de "Iniciar".
export function primeSpeech() {
  try {
    const el = audioEl()
    if (el) {
      // 1 frame de silêncio (data URI wav) só pra "liberar" o play.
      el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      el.play().then(() => el.pause()).catch(() => {})
    }
  } catch { /* noop */ }
  device.primeSpeech()
}

export const splitIntoChunks = device.splitIntoChunks

// Reseta o token cacheado (ex: logout / troca de conta).
export function resetPremiumSpeechAuth() { _authToken = null }
