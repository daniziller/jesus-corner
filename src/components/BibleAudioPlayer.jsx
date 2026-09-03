// Player de áudio da Bíblia — lê o capítulo aberto na aba Bíblia
// (navegação livre, fora de qualquer plano) em voz alta. Dois modos:
//   • "Só este capítulo": para no fim do capítulo.
//   • "Contínuo": emenda no próximo capítulo (onAdvance) e segue até a
//     pessoa parar — dá pra deixar tocando a Bíblia inteira.
//
// Voz: premiumSpeech — assinante ouve a voz de audiolivro (OpenAI TTS via
// /api/tts, cacheada por trecho); usuário grátis cai na voz do aparelho
// automaticamente (ver src/audio/premiumSpeech.js). O player fica montado
// no nível da tela (não por capítulo), então a troca de capítulo do modo
// contínuo não interrompe a reprodução.
import { useState, useEffect, useRef, useCallback } from 'react'
import AppIcon from '../icons/AppIcon'
import { t } from '../i18n'
import { fetchBookText } from '../bible-text/bibleTextStore'
import { getSelectedVersionId } from '../bible-text/bibleVersionSelection'
import {
  speakSequence, stopSpeaking, primeSpeech, splitIntoChunks,
  pauseSpeech, resumeSpeech,
} from '../audio/premiumSpeech'

export default function BibleAudioPlayer({ session, lang, hasNext, onAdvance, allowPremiumVoice = true, compact = false }) {
  const L = (k, vars) => t(`bibleAudio.${k}`, vars, lang)

  // idle | loading | playing | paused | done | error
  const [status, setStatus] = useState('idle')
  const [continuous, setContinuous] = useState(false)
  const [progress, setProgress] = useState(0)

  const ctlRef = useRef(null)
  const statusRef = useRef('idle')
  const continuousRef = useRef(false)
  const hasNextRef = useRef(hasNext)
  const onAdvanceRef = useRef(onAdvance)
  statusRef.current = status
  continuousRef.current = continuous
  hasNextRef.current = hasNext
  onAdvanceRef.current = onAdvance

  const bookName = lang === 'en' ? (session.bookEn || session.book) : session.book
  const chapterRef = session.chStart === session.chEnd
    ? `${bookName} ${session.chStart}`
    : `${bookName} ${session.chStart}–${session.chEnd}`

  const stopPlayback = useCallback(() => {
    ctlRef.current?.stop?.()
    ctlRef.current = null
    stopSpeaking()
    setStatus('idle')
    setProgress(0)
  }, [])

  // Limpa o áudio ao desmontar a tela.
  useEffect(() => () => {
    ctlRef.current?.stop?.()
    stopSpeaking()
  }, [])

  const playCurrent = useCallback(async () => {
    setStatus('loading')
    setProgress(0)
    let chunks = []
    try {
      const versionId = getSelectedVersionId(lang)
      const bookKey = lang === 'en' ? (session.bookEn || session.book) : session.book
      const chapters = await fetchBookText(versionId, bookKey)
      for (let ch = session.chStart; ch <= session.chEnd; ch++) {
        const verses = chapters?.[String(ch)]?.verses ?? {}
        chunks.push(L('chapterLabel', { book: bookName, n: ch }))
        for (const vn of Object.keys(verses).map(Number).sort((a, b) => a - b)) {
          for (const c of splitIntoChunks(verses[String(vn)])) chunks.push(c)
        }
      }
    } catch {
      setStatus('error')
      return
    }
    if (chunks.length === 0) { setStatus('error'); return }

    const total = chunks.length
    setStatus('playing')
    const ctl = speakSequence(chunks, {
      lang,
      deviceOnly: !allowPremiumVoice,
      onChunk: i => setProgress((i + 1) / total),
      onDone: () => {
        if (statusRef.current !== 'playing') return
        if (continuousRef.current && hasNextRef.current) {
          // onAdvance troca a sessão (capítulo) no pai — o efeito abaixo
          // detecta a troca e já começa a tocar o novo capítulo.
          onAdvanceRef.current?.()
        } else {
          setProgress(1)
          setStatus('done')
        }
      },
    })
    ctlRef.current = ctl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, lang, bookName, allowPremiumVoice])

  // Modo contínuo: quando o capítulo muda (onAdvance), emenda no novo sem
  // parar. Só age se já estava tocando — não dispara no primeiro render.
  useEffect(() => {
    if (statusRef.current === 'playing' || statusRef.current === 'loading') {
      playCurrent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  function handlePlayPause() {
    if (status === 'playing') {
      pauseSpeech()
      setStatus('paused')
      return
    }
    if (status === 'paused') {
      resumeSpeech()
      setStatus('playing')
      return
    }
    // idle | done | error
    primeSpeech() // destrava o áudio no iOS (precisa ser dentro do gesto)
    playCurrent()
  }

  const isBusy = status === 'playing' || status === 'paused' || status === 'loading'
  const playIcon = status === 'playing' ? 'Pause' : status === 'loading' ? 'Hourglass' : 'Play'

  const titleText = status === 'error' ? L('error')
    : status === 'loading' ? L('loading')
    : status === 'done' ? L('done')
    : isBusy ? L('nowPlaying', { ref: chapterRef })
    : L('listen', { ref: chapterRef })

  // Compacto (leitura imersiva 1b) — barra escura fina, um clique só, sem
  // seletor de modo (fica sempre "só este capítulo").
  if (compact) {
    return (
      <div style={styles.compactWrap}>
        <button style={styles.compactPlayBtn} onClick={handlePlayPause} aria-label={L('play')}>
          <AppIcon name={playIcon} size={15} color="var(--bento-ink)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.compactTitle}>{titleText}</p>
          <div style={styles.compactTrack}>
            <div style={{ ...styles.compactFill, width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
        {isBusy && (
          <button style={styles.compactStopBtn} onClick={stopPlayback} aria-label={L('stop')}>
            <AppIcon name="X" size={13} color="rgba(255,255,255,.7)" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <button style={styles.playBtn} onClick={handlePlayPause} aria-label={L('play')}>
          <AppIcon name={playIcon} size={18} color="white" />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.title}>{titleText}</p>
          <div style={styles.modeSel}>
            <button
              style={{ ...styles.modeBtn, ...(continuous ? {} : styles.modeBtnActive) }}
              onClick={() => setContinuous(false)}
            >
              {L('modeChapter')}
            </button>
            <button
              style={{ ...styles.modeBtn, ...(continuous ? styles.modeBtnActive : {}) }}
              onClick={() => setContinuous(true)}
            >
              {L('modeContinuous')}
            </button>
          </div>
        </div>

        {isBusy && (
          <button style={styles.stopBtn} onClick={stopPlayback} aria-label={L('stop')}>
            <AppIcon name="X" size={15} color="var(--g5)" />
          </button>
        )}
      </div>

      {(isBusy || status === 'done') && (
        <div style={styles.track}>
          <div style={{ ...styles.fill, width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { background: 'var(--g1)', border: '0.5px solid var(--g2)', borderRadius: 14, padding: '10px 12px', margin: '2px 6px 10px', display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  playBtn: { width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' },
  title: { fontSize: 12, fontWeight: 700, color: 'var(--bk)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  modeSel: { display: 'inline-flex', gap: 4, background: 'var(--g2)', borderRadius: 9, padding: 3, marginTop: 4 },
  modeBtn: { border: 'none', background: 'transparent', color: 'var(--g5)', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font)', padding: '4px 9px', borderRadius: 7, cursor: 'pointer' },
  modeBtnActive: { background: 'var(--white)', color: 'var(--bk)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' },
  stopBtn: { width: 30, height: 30, borderRadius: '50%', border: '0.5px solid var(--g2)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  track: { width: '100%', height: 4, background: 'var(--g2)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', background: 'var(--grad-primary)', borderRadius: 99, transition: 'width .4s ease' },

  // Bloco de áudio da leitura imersiva (reskin Bento, tela 4a) — só usado
  // ali (ver ReadingBlockView.jsx), então reskinado direto sem variante à
  // parte. Botão de play em ink sobre laranja sólido (não branco sobre
  // gradiente); sem gradiente em lugar nenhum, como pede o adendo de
  // identidade.
  compactWrap: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bento-ink)', borderRadius: 22, padding: '14px 16px' },
  compactPlayBtn: { width: 38, height: 38, flexShrink: 0, borderRadius: 14, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  compactTitle: { fontFamily: 'var(--font-bento)', fontSize: 12.5, fontWeight: 700, color: 'white', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  compactTrack: { height: 4, borderRadius: 99, background: 'rgba(255,255,255,.2)', overflow: 'hidden' },
  compactFill: { height: '100%', borderRadius: 99, background: 'var(--bento-accent)', transition: 'width .4s ease' },
  compactStopBtn: { width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
