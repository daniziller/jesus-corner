// DayShareScreen.jsx — o editor da imagem do dia (37d, pacote 36-37),
// aberto pela linha "Compartilhar meu dia" do dia concluído (S5). É o
// cartão que antes ficava dentro da própria tela de dia concluído (37c),
// sem mudança: o cartão NÃO é um painel que depois vira imagem — é a
// própria imagem (canvas de dayCompleteImage.js), só reduzida por CSS; os
// 4 chips ligam/desligam blocos e o cartão redesenha na hora.
// "Compartilhar" e "Salvar imagem" ficam aqui; voltar devolve ao resumo.
// A frase e os tempos de hoje chegam prontos de quem abre (S5).
import { useState, useEffect, useMemo } from 'react'
import { renderDayCompleteImage, shareDayCompleteImage, downloadDayCompleteImage } from '../routine/dayCompleteImage'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'
import { dateKey } from '../utils/dateKey'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import CabecalhoDoPasso from '../components/passos/CabecalhoDoPasso'

const CHIP_KEYS = ['phrase', 'times', 'whereInBible', 'name']

export default function DayShareScreen({ session, readingSession, phrase, minutes, onBack }) {
  const { lang, userName, dailyRoutine, weeksInGoal, biblePercent } = session
  const L = (k, vars) => t(`dayComplete.${k}`, vars, lang)

  const [include, setInclude] = useState({ phrase: true, times: true, whereInBible: true, name: true })
  function toggle(key) { setInclude(prev => ({ ...prev, [key]: !prev[key] })) }

  const totalSeconds = minutes.prayer + minutes.reading + minutes.reflection
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

  return (
    <div style={styles.screen}>
      <CabecalhoDoPasso title="Compartilhar meu dia" subtitle="Você escolhe o que entra na imagem" onBack={onBack} backLabel={t('a11y.goBack', undefined, lang)} />

      <div style={styles.body}>
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
        <button style={styles.saveBtn} onClick={handleSave} disabled={busy}>{L('saveBtn')}</button>
      </div>
    </div>
  )
}

const FONT = 'var(--font-bento)'
const styles = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '18px 20px 4px', display: 'flex', flexDirection: 'column', gap: 10 },

  // flexShrink: 0 é o que segura o tamanho do cartão (achado 2026-10-25,
  // reportado por ela: "a imagem fica pequena"). O body é uma coluna flex
  // de altura fixa, e um item flex com overflow:hidden tem min-height
  // automático ZERO (regra do flexbox) — então o container 9:16 era
  // espremido até caber no que sobrava da tela (~230px num iPhone), e a
  // imagem, com `contain`, virava uma miniatura no meio de um retângulo
  // escuro. Sem encolher, o cartão mantém a proporção e o body rola.
  // O teto de 62vh (largura derivada da altura, proporção exata) é pra o
  // cartão não tomar a tela inteira e deixar os chips à vista com um rolar
  // curto — mesmo espírito do maxHeight de 48vh na prévia de ReadingBlockView.
  imageWrap: { flexShrink: 0, alignSelf: 'center', width: '100%', maxWidth: 'calc(62vh * 9 / 16)', borderRadius: 28, overflow: 'hidden', background: '#1A1714', aspectRatio: '9 / 16' },
  // `contain`, não `cover` (achado 2026-09-09, reportado por ela: o
  // título do cartão saía cortado por cima) — a imagem já É exatamente
  // 1080×1920 (9:16, igual ao aspectRatio do container), então os dois
  // deveriam ficar idênticos; `cover` corta agressivamente se o
  // navegador arredondar a altura do container por um pixel a menos que
  // o esperado, `contain` nunca corta, só sobra uma borda mínima nesse
  // caso raro (imperceptível).
  imagePreview: { display: 'block', width: '100%', height: '100%', objectFit: 'contain' },

  chipsRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { height: 40, padding: '0 16px', borderRadius: 99, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-t3)' },
  chipOn: { background: 'var(--bento-ink)', color: '#fff' },
  chipsHint: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t4)', margin: '2px 0 0' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px calc(20px + var(--safe-bottom))' },
  shareBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontFamily: FONT, fontSize: 15, fontWeight: 800, color: 'var(--bento-ink)' },
  saveBtn: { height: 50, borderRadius: 18, border: 'none', background: '#fff', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)' },
}
