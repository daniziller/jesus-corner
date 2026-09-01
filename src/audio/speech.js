// Text-to-speech via Web Speech API (voz do próprio aparelho) — usado pelo
// modo mãos-livres (HandsFreeScreen.jsx) pra ler a leitura do dia em voz
// alta e falar as transições de etapa dos cronômetros.
//
// Por que não é trivial: navegadores têm bugs conhecidos de SpeechSynthesis
// que este módulo contorna —
//   1. getVoices() volta vazio no 1º acesso; as vozes chegam depois, no
//      evento 'voiceschanged' (Chrome). Guardamos num cache e resolvemos
//      uma Promise quando aparecem.
//   2. Chrome corta a fala depois de ~15s por utterance. Solução: quebrar
//      o texto em frases curtas e enfileirar uma utterance por frase.
//   3. iOS/Safari só "destrava" o áudio depois de um speak() disparado por
//      um gesto real (clique) — por isso o modo mãos-livres começa sempre
//      num toque de "Iniciar".
//   4. Chrome às vezes "congela" a fila quando a aba fica em segundo plano;
//      um resume() periódico enquanto está falando mantém viva.

let _voicesPromise = null

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function loadVoices() {
  if (_voicesPromise) return _voicesPromise
  _voicesPromise = new Promise(resolve => {
    if (!isSpeechSupported()) return resolve([])
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) return resolve(existing)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true })
    // Fallback: algumas plataformas nunca disparam 'voiceschanged'.
    setTimeout(finish, 1200)
  })
  return _voicesPromise
}

// Melhor voz pro idioma: prioriza uma que combine com o locale completo
// (pt-BR, en-US), depois só o idioma, e por fim qualquer uma marcada como
// padrão. Retorna null se não achar nada — aí o navegador usa a dele.
async function pickVoice(lang) {
  const voices = await loadVoices()
  if (!voices.length) return null
  const wanted = lang === 'en' ? 'en-us' : 'pt-br'
  const base = lang === 'en' ? 'en' : 'pt'
  return (
    voices.find(v => v.lang?.toLowerCase() === wanted) ||
    voices.find(v => v.lang?.toLowerCase().startsWith(base)) ||
    voices.find(v => v.default) ||
    null
  )
}

// Quebra em frases pra contornar o corte de ~15s do Chrome e permitir
// pausar/retomar com granularidade fina. Mantém a pontuação final.
export function splitIntoChunks(text, maxLen = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const sentences = clean.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || [clean]
  const chunks = []
  for (const s of sentences) {
    const sentence = s.trim()
    if (sentence.length <= maxLen) {
      chunks.push(sentence)
      continue
    }
    // Frase longa demais (versículo comprido) — quebra por vírgula / ponto e vírgula.
    let buf = ''
    for (const part of sentence.split(/(?<=[,;:])\s+/)) {
      if ((buf + ' ' + part).trim().length > maxLen && buf) {
        chunks.push(buf.trim())
        buf = part
      } else {
        buf = (buf + ' ' + part).trim()
      }
    }
    if (buf.trim()) chunks.push(buf.trim())
  }
  return chunks
}

let _keepAlive = null
function startKeepAlive() {
  stopKeepAlive()
  _keepAlive = setInterval(() => {
    const s = window.speechSynthesis
    if (s.speaking && !s.paused) {
      // "cutuca" a fila do Chrome pra ela não congelar em segundo plano.
      s.pause()
      s.resume()
    }
  }, 8000)
}
function stopKeepAlive() {
  if (_keepAlive) clearInterval(_keepAlive)
  _keepAlive = null
}

// Fala uma sequência de trechos, um após o outro. Devolve um controlador
// com stop() e uma Promise `done` que resolve quando terminou tudo (ou foi
// interrompido). onChunk(index) avisa qual trecho começou (pra destacar o
// versículo na tela, por exemplo).
export function speakSequence(chunks, { lang = 'pt', rate = 1, pitch = 1, onChunk, onDone } = {}) {
  const list = Array.isArray(chunks) ? chunks.filter(Boolean) : splitIntoChunks(chunks)
  let stopped = false
  let resolveDone
  const done = new Promise(res => { resolveDone = res })

  if (!isSpeechSupported() || list.length === 0) {
    onDone?.()
    resolveDone?.()
    return { stop: () => {}, done }
  }

  window.speechSynthesis.cancel()

  ;(async () => {
    const voice = await pickVoice(lang)
    startKeepAlive()
    for (let i = 0; i < list.length; i++) {
      if (stopped) break
      onChunk?.(i)
      await new Promise(res => {
        const u = new SpeechSynthesisUtterance(list[i])
        u.lang = lang === 'en' ? 'en-US' : 'pt-BR'
        if (voice) u.voice = voice
        u.rate = rate
        u.pitch = pitch
        u.onend = res
        u.onerror = res
        window.speechSynthesis.speak(u)
      })
    }
    stopKeepAlive()
    if (!stopped) {
      onDone?.()
      resolveDone()
    }
  })()

  return {
    stop() {
      stopped = true
      stopKeepAlive()
      try { window.speechSynthesis.cancel() } catch { /* noop */ }
      resolveDone()
    },
    done,
  }
}

// Fala curta (um aviso de transição). Cancela o que estiver falando.
export function say(text, { lang = 'pt', rate = 1 } = {}) {
  return speakSequence(splitIntoChunks(text), { lang, rate })
}

export function stopSpeaking() {
  stopKeepAlive()
  if (isSpeechSupported()) {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
  }
}

// Toca uma fala curtinha e silenciosa a partir de um gesto do usuário — só
// pra "destravar" o áudio no iOS antes de o modo mãos-livres começar pra
// valer. Chamar DENTRO do onClick do botão de iniciar.
export function primeSpeech() {
  if (!isSpeechSupported()) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch { /* noop */ }
  loadVoices()
}
