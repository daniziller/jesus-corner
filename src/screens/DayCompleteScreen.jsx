// DayCompleteScreen.jsx — Dia concluído (pacote 36-37, quadro 37c),
// substitui RoutineCompleteScreen.jsx por inteiro. O cartão dentro da tela
// NÃO é um painel que depois vira imagem — é a própria imagem (37d, canvas
// de dayCompleteImage.js), só reduzida por CSS; os 4 chips ligam/desligam
// blocos e o cartão redesenha na hora.
import { useState, useEffect, useMemo } from 'react'
import { renderDayCompleteImage, shareDayCompleteImage, downloadDayCompleteImage } from '../routine/dayCompleteImage'
import { getNotes, noteTextOf } from '../notes/notesStore'
import { getAllSessions, totalsForDay } from '../metrics/sessionDurationStore'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'
import { dailyApplicationKeyFor } from '../reflection/applicationPhraseStore'
import { dateKey } from '../utils/dateKey'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'

const CHIP_KEYS = ['phrase', 'times', 'whereInBible', 'name']

// "Três passos feitos" (37c) — o quadro escreve por extenso o número de
// passos (nunca mais que 4: Oração/Leitura/Estudo/Reflexão), diferente dos
// outros números da mesma frase ("18ª semana"), que ficam em algarismo.
// Maiúscula porque é sempre a 1ª palavra da frase.
const STEP_COUNT_WORDS = {
  pt: { 0: 'Nenhum', 1: 'Um', 2: 'Dois', 3: 'Três', 4: 'Quatro' },
  en: { 0: 'No', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four' },
}

export default function DayCompleteScreen({ session, authUser, steps, readingSession, onBack }) {
  const { lang, userName, dailyRoutine, weeksInGoal, biblePercent } = session
  const L = (k, vars) => t(`dayComplete.${k}`, vars, lang)
  const email = authUser?.email

  const [include, setInclude] = useState({ phrase: true, times: true, whereInBible: true, name: true })
  function toggle(key) { setInclude(prev => ({ ...prev, [key]: !prev[key] })) }

  const [phrase, setPhrase] = useState('')
  const [minutes, setMinutes] = useState({ prayer: 0, reading: 0, reflection: 0 })
  useEffect(() => {
    if (!email) return
    getNotes(email).then(map => setPhrase(noteTextOf(map[dailyApplicationKeyFor()]))).catch(() => {})
    getAllSessions().then(rows => setMinutes(totalsForDay(rows, dateKey()))).catch(() => {})
  }, [email])

  const totalSeconds = minutes.prayer + minutes.reading + minutes.reflection
  const totalMinutes = Math.round(totalSeconds / 60)
  const dayNumber = Object.keys(dailyRoutine ?? {}).filter(d => d <= dateKey()).length
  const dateLabel = formatWeekdayDate(dateKey(), lang)
  const percentRead = `${(biblePercent ?? 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  const chapterShort = readingSession && readingSession.type !== 'reflection'
    ? `${readingSession.book} ${readingSession.chStart}`
    : null

  const titleWithName = chapterShort ? L('titleWithName', { name: userName, chapter: chapterShort }) : L('titleWithNameNoChapter', { name: userName })
  const titleWithoutName = chapterShort ? L('titleNoName', { chapter: chapterShort }) : L('titleNoNameNoChapter')

  const imageData = useMemo(() => ({
    dayNumber, dateLabel, name: userName,
    titleWithName, titleWithoutName,
    phrase: phrase?.trim() || null,
    minutes, totalSeconds,
    weeksInGoal: weeksInGoal ?? 0,
    percentRead, chapterShort,
    labels: {
      prayer: t('home.routinePrayer', undefined, lang),
      reading: t('home.routineReading', undefined, lang),
      reflection: t('home.routineReflection', undefined, lang),
      timeToday: L('timeTodayLabel'),
      weeksInGoal: L('weeksInGoalLabel'),
      whereInBible: L('whereInBibleLabel'),
      day: L('dayLabel'),
      myPhraseToday: L('myPhraseTodayLabel'),
    },
  }), [dayNumber, dateLabel, userName, titleWithName, titleWithoutName, phrase, minutes, totalSeconds, weeksInGoal, percentRead, chapterShort, lang])

  const [previewUrl, setPreviewUrl] = useState(null)
  useEffect(() => {
    let cancelled = false
    renderDayCompleteImage(imageData, include).then(blob => {
      if (cancelled || !blob) return
      const url = URL.createObjectURL(blob)
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData, include])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const [busy, setBusy] = useState(false)
  async function handleShare() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderDayCompleteImage(imageData, include)
      await shareDayCompleteImage(blob, { title: L('shareTitle'), text: include.name ? titleWithName : titleWithoutName })
    } finally {
      setBusy(false)
    }
  }
  async function handleSave() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderDayCompleteImage(imageData, include)
      downloadDayCompleteImage(blob)
    } finally {
      setBusy(false)
    }
  }

  const stepCount = steps?.length ?? 0
  const stepCountWord = (STEP_COUNT_WORDS[lang] ?? STEP_COUNT_WORDS.pt)[stepCount] ?? String(stepCount)
  const contextLine = L(stepCount === 1 ? 'contextLineOne' : 'contextLineMany', { n: stepCountWord, weeks: weeksInGoal ?? 0 })

  return (
    <div style={styles.screen}>
      <div style={styles.body}>
        <p style={styles.eyebrow}>{L('pageTitle')}</p>
        <p style={styles.headline}>{L('headline', { n: totalMinutes, name: userName })}</p>
        <p style={styles.context}>{contextLine}</p>

        <div style={styles.imageWrap}>
          {previewUrl && <img src={previewUrl} alt="" style={styles.imagePreview} />}
        </div>

        <div style={styles.chipsRow}>
          {CHIP_KEYS.map(key => (
            <button key={key} type="button" style={{ ...styles.chip, ...(include[key] ? styles.chipOn : {}) }} onClick={() => toggle(key)}>
              {L(`chip${key[0].toUpperCase()}${key.slice(1)}`)}
            </button>
          ))}
        </div>
        <p style={styles.chipsHint}>{L('chipsHint')}</p>
      </div>

      <div style={styles.footer}>
        <button style={styles.shareBtn} onClick={handleShare} disabled={busy}>
          <AppIcon name="Share2" size={16} strokeWidth={2.2} color="var(--bento-ink)" />
          <span>{L('shareBtn')}</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.saveBtn} onClick={handleSave} disabled={busy}>{L('saveBtn')}</button>
          <button style={styles.backBtn} onClick={onBack}>{L('backBtn')}</button>
        </div>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  eyebrow: { fontFamily: FONT, fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  headline: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.5px', color: 'var(--bento-ink)', margin: 0 },
  context: { fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: 'var(--bento-t3)', margin: '0 0 6px' },

  imageWrap: { borderRadius: 28, overflow: 'hidden', background: '#1A1714', aspectRatio: '9 / 16' },
  imagePreview: { display: 'block', width: '100%', height: '100%', objectFit: 'cover' },

  chipsRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { height: 40, padding: '0 16px', borderRadius: 99, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t3)' },
  chipOn: { background: 'var(--bento-ink)', color: '#fff' },
  chipsHint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: '2px 0 0' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  shareBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  saveBtn: { flex: 1, height: 50, borderRadius: 18, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
  backBtn: { flex: 1, height: 50, borderRadius: 18, border: 'none', background: 'var(--bento-card)', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-t2)' },
}
