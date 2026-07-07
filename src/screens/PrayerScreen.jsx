import { useState, useEffect, useRef } from 'react'
import ActsCard, { ACTS_DATA } from '../components/acts/ActsCard'
import PrayerRequests from '../components/prayer/PrayerRequests'
import { incrementPrayerStat } from '../prayer/prayerStatsStore'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

export default function PrayerScreen({ session, authUser }) {
  const { lang } = session
  const [seconds, setSeconds] = useState(15 * 60)
  const [running, setRunning]  = useState(false)
  const intervalRef = useRef(null)
  const email = authUser?.email

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            incrementPrayerStat(email, 'timerCompletions').catch(err => {
              console.error('Failed to persist prayer stat', err)
            })
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, email])

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function resetTimer() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setSeconds(15 * 60)
  }

  const btnLabel = running ? t('prayer.pause', undefined, lang)
    : seconds === 0 ? t('prayer.done', undefined, lang)
    : seconds < 15 * 60 ? t('prayer.resume', undefined, lang)
    : t('prayer.start', undefined, lang)

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 83, height: '100%' }}>

      {/* Header */}
      <div className="page-header"><h1 className="page-title">{t('prayer.pageTitle', undefined, lang)}</h1></div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroOrbBlue} />
        <div style={styles.heroOrbPink} />
        <span style={{ position: 'relative', marginBottom: 5 }}><AppIcon name="HandHeart" size={30} color="white" /></span>
        <span style={{ ...styles.heroTitle, position: 'relative' }}>{t('prayer.heroTitle', undefined, lang)}</span>
        <span style={{ ...styles.heroSub, position: 'relative' }}>{t('prayer.heroSub', undefined, lang)}</span>
      </div>

      <div style={styles.body}>
        <div className="dashboard-grid">

          {/* Coluna esquerda: timer + roteiro ACTS */}
          <div className="dashboard-col">
            <div style={styles.timer}>
              <span style={styles.timerLabel}>{t('prayer.timerLabel', undefined, lang)}</span>
              <span style={styles.timerDisplay}>{fmt(seconds)}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{
                    ...styles.timerBtn, color: 'white',
                    background: seconds === 0 ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'var(--grad-vivid)',
                    boxShadow: seconds === 0 ? '0 8px 20px rgba(22,163,74,.35)' : 'var(--shadow-glow)',
                  }}
                  onClick={() => seconds > 0 && setRunning(v => !v)}
                >
                  {btnLabel}
                </button>
                <button style={{ ...styles.timerBtn, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.65)' }} onClick={resetTimer}>
                  {t('prayer.restart', undefined, lang)}
                </button>
              </div>
            </div>

            {/* ACTS acordeão */}
            <div className="block-grid">
              {ACTS_DATA.map(data => (
                <ActsCard key={data.id} data={data} />
              ))}
            </div>
          </div>

          {/* Coluna direita: pedidos de oração */}
          <div className="dashboard-col">
            <PrayerRequests authUser={authUser} lang={lang} />
          </div>

        </div>
      </div>
    </div>
  )
}

const styles = {
  hero:        { minHeight: 150, margin: '10px 16px', borderRadius: 22, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4c1d95 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 22px', boxShadow: '0 12px 28px rgba(76,29,149,.3)' },
  heroOrbBlue: { position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#6366F1', filter: 'blur(60px)', opacity: 0.5, top: -60, left: -50 },
  heroOrbPink: { position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: '#EC4899', filter: 'blur(60px)', opacity: 0.3, bottom: -60, right: -40 },
  heroTitle:   { fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2, letterSpacing: '-0.3px' },
  heroSub:     { fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.5, marginTop: 3 },
  body:        { padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  timer:       { background: '#141414', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timerLabel:  { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 2, textTransform: 'uppercase' },
  timerDisplay:{ fontSize: 40, fontWeight: 300, color: 'white', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' },
  timerBtn:    { padding: '8px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, border: 'none', fontFamily: 'var(--font)', transition: 'transform .15s' },
}
