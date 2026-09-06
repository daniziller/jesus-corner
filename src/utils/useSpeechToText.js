// Ditado por voz (quadro 26c, aba "Falar") — Web Speech API nativa do
// navegador (SpeechRecognition), sem servidor: funciona em Chrome/Edge/
// Safari recentes, e cai pra "indisponível" (sem quebrar nada) no Firefox e
// outros sem suporte. Fica ouvindo enquanto `listening`, chamando
// onResult(text) a cada trecho reconhecido — quem chama decide se troca ou
// concatena no campo (ver ReflectionScreen.jsx).
import { useEffect, useRef, useState } from 'react'

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isSpeechToTextSupported() {
  return !!getRecognitionCtor()
}

export function useSpeechToText({ lang = 'pt', onResult } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function start() {
    const Ctor = getRecognitionCtor()
    if (!Ctor) { setError('unsupported'); return }
    setError(null)
    const recognition = new Ctor()
    recognition.lang = lang === 'en' ? 'en-US' : 'pt-BR'
    recognition.interimResults = false
    recognition.continuous = true
    recognition.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript
      }
      if (text.trim()) onResultRef.current?.(text.trim())
    }
    recognition.onerror = (event) => {
      // 'no-speech'/'aborted' são esperados ao parar de propósito — não são
      // erro pra mostrar; qualquer outro (ex: 'not-allowed', sem permissão
      // de microfone) vira aviso real.
      if (event.error !== 'no-speech' && event.error !== 'aborted') setError(event.error)
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('start-failed')
    }
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return { listening, error, start, stop, supported: isSpeechToTextSupported() }
}
