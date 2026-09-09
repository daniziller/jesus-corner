// StudyCompleteScreen.jsx — "Estudo concluído" (41g, turno 41,
// handoff-estudos-41/). Substitui 41e no último dia (M de M) — ver
// handleStudyDayCompleted/finalizeCompletedStudy em App.jsx, que também é
// onde "Começar o próximo salvo"/"Devolver os dias à Bíblia"
// (studyFinishPrefsStore.js) finalmente são CONSUMIDOS — até este bloco
// só existiam como preferência salva, sem gatilho (comentário antigo no
// próprio store dizia isso).
//
// "A partir de amanhã" adaptado pras trilhas independentes: sem "Gênesis
// volta em 41" (não existe mais data de retomada calculada) — mesma copy
// de 41h (returnDaysSubDays), só que aqui reflete a ESCOLHA que
// finalizeCompletedStudy já aplicou.
//
// "Compartilhar o estudo": texto simples (Web Share API/clipboard), não
// uma imagem de canvas como o fecho do dia (36-37) — regra 4 não pede uma
// imagem aqui, e nenhum PNG do pacote mostra o que a imagem conteria.
import { useEffect, useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { generateStudySynthesisFor, cardinalWord } from '../studies/estudosStore'
import { naturalDayListSentence, WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath'

const FONT = 'var(--font-bento)'
const MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function shortDate(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const names = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_PT
  return lang === 'en' ? `${names[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} de ${names[d.getMonth()]}`
}

function formatTotal(totalSeconds, lang) {
  const totalMin = Math.round((totalSeconds ?? 0) / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return lang === 'en' ? `${m} min` : `${m} min`
  return `${h}h${String(m).padStart(2, '0')}`
}

export default function StudyCompleteScreen({ session, authUser, study, returnedDays, onChooseAnother, onOnlyReadingForNow, onBackToPlan }) {
  const { lang, userName } = session
  const L = (k, vars) => t(`studyComplete.${k}`, vars, lang)

  const [synthesis, setSynthesis] = useState(null)
  const [loadingSynthesis, setLoadingSynthesis] = useState(false)
  const [answersOpen, setAnswersOpen] = useState(false)
  const [shared, setShared] = useState(false)

  const sessions = study.sessions ?? []
  const total = sessions.length
  const answered = sessions.filter(s => s.answer)
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0)

  const titleMain = study.title?.includes(':') ? study.title.split(':')[0].trim() : study.title
  const tema = (titleMain ?? '').toLowerCase()
  const firstName = (userName ?? '').split(' ')[0] || ''

  useEffect(() => {
    if (answered.length < 3) return
    let cancelled = false
    setLoadingSynthesis(true)
    generateStudySynthesisFor(answered.map(s => ({ dayIndex: sessions.indexOf(s), text: s.answer })), lang)
      .then(result => { if (!cancelled) setSynthesis(result) })
      .catch(err => console.error('Failed to generate study synthesis', err))
      .finally(() => { if (!cancelled) setLoadingSynthesis(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.id])

  // Com menos de 3 respostas, só a frase (regra 4 §9) — escolhida
  // localmente (a mais longa), sem gastar IA numa amostra tão pequena.
  const localHighlight = answered.length > 0 && answered.length < 3
    ? answered.reduce((best, s) => (s.answer.length > (best?.answer.length ?? 0) ? s : best), null)
    : null
  const highlightQuote = synthesis?.highlightQuote ?? localHighlight?.answer ?? null
  const highlightDayIndex = synthesis?.highlightDayIndex ?? (localHighlight ? sessions.indexOf(localHighlight) : null)

  async function handleShare() {
    const text = L('shareText', { n: cardinalWord(total, lang), theme: tema, time: formatTotal(totalSeconds, lang) })
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: study.title, text }); setShared(true); return } catch { /* cancelou */ }
    }
    try { await navigator.clipboard?.writeText(text); setShared(true) } catch (err) { console.error('Failed to share study', err) }
  }

  const returnDaysAbbr = returnedDays ? naturalDayListSentence(returnedDays, WEEKDAY_ABBR3[lang] ?? WEEKDAY_ABBR3.pt, lang) : ''

  return (
    <div style={s.screen}>
      <div style={s.body}>
        <div style={s.headTextBlock}>
          <p style={s.conclLabel}>{L('conclLabel')}</p>
          <p style={s.recapLine}>{L('recapLine', { n: cardinalWord(total, lang), theme: tema, name: firstName })}</p>
          <p style={s.metaLine}>{L('metaLine', { time: formatTotal(totalSeconds, lang), n: answered.length, from: shortDate(sessions[0]?.completedAt, lang), to: shortDate(sessions[total - 1]?.completedAt, lang) })}</p>
        </div>

        {highlightQuote && (
          <div style={s.darkCard}>
            <div style={s.darkLabelRow}>
              <span style={s.diamond} />
              <p style={s.darkLabel}>{L('threadLabel')}</p>
            </div>
            {loadingSynthesis && <p style={s.synthesisLoading}>{L('generatingSynthesis')}</p>}
            {synthesis?.body && <p style={s.synthesisBody}>{synthesis.body}</p>}
            <div style={s.highlightBox}>
              <p style={s.highlightLabel}>{L('highlightLabel', { n: highlightDayIndex != null ? highlightDayIndex + 1 : '' })}</p>
              <p style={s.highlightQuote}>&ldquo;{highlightQuote}&rdquo;</p>
            </div>
          </div>
        )}

        <button style={s.answersRow} onClick={() => setAnswersOpen(v => !v)}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={s.answersTitle}>{L('answersTitle', { nWord: cardinalWord(total, lang), nDigit: total })}</p>
            <p style={s.answersSub}>{L('savedInLibrary')}</p>
          </div>
          <AppIcon name={answersOpen ? 'ChevronDown' : 'ChevronRight'} size={16} color="var(--bento-t4)" />
        </button>
        {answersOpen && (
          <div style={s.answersList}>
            {sessions.map((sess, i) => (
              <div key={sess.id ?? i} style={s.answerRow}>
                <span style={s.answerNum}>{i + 1}</span>
                <p style={s.answerText}>{sess.answer ? `“${sess.answer}”` : L('skippedNote')}</p>
              </div>
            ))}
          </div>
        )}

        {returnedDays && (
          <div style={s.sandCard}>
            <p style={s.sandLabel}>{L('fromTomorrowLabel')}</p>
            <p style={s.sandText}>{L('returnDaysText', { days: returnDaysAbbr, n: cardinalWord((session.routineModules ?? []).filter(k => k !== 'study').length, lang) })}</p>
          </div>
        )}

        <div style={s.card}>
          <p style={s.cardLabel}>{L('anotherStudyLabel')}</p>
          <p style={s.cardText}>{L('anotherStudyText')}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={s.chooseBtn} onClick={onChooseAnother}>{L('chooseAnotherBtn')}</button>
            <button style={s.onlyReadingBtn} onClick={onOnlyReadingForNow}>{L('onlyReadingBtn')}</button>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.shareBtn} onClick={handleShare}>
          <AppIcon name="Share2" size={16} color="var(--bento-ink)" />
          {shared ? L('sharedBtn') : L('shareBtn')}
        </button>
        <button style={s.backBtn} onClick={onBackToPlan}>{L('backToPlanBtn')}</button>
      </div>
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  headTextBlock: { marginBottom: 4 },
  conclLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 8px' },
  recapLine: { fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '-.7px', lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 8px' },
  metaLine: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  darkCard: { borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  darkLabelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  diamond: { width: 10, height: 10, background: 'var(--bento-accent)', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  synthesisLoading: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,.5)', margin: 0 },
  synthesisBody: { fontFamily: "'Be Vietnam Pro', var(--font-bento)", fontWeight: 400, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '0 0 14px' },
  highlightBox: { borderRadius: 16, background: 'rgba(240,102,43,.12)', padding: '14px 16px' },
  highlightLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 6px' },
  highlightQuote: { fontFamily: "'Be Vietnam Pro', var(--font-bento)", fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.4, color: '#fff', margin: 0 },

  answersRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', borderRadius: 22, background: 'var(--bento-card)', padding: '16px 18px', cursor: 'pointer' },
  answersTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: 'var(--bento-ink)', margin: '0 0 2px' },
  answersSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },
  answersList: { borderRadius: 20, background: 'var(--bento-card)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  answerRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  answerNum: { width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: 'var(--bento-line)', color: 'var(--bento-t4)', fontFamily: FONT, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  answerText: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: 'var(--bento-t3)', margin: 0 },

  sandCard: { borderRadius: 20, background: 'var(--bento-sand)', padding: '16px 20px' },
  sandLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 6px' },
  sandText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-sand-ink)', margin: 0 },

  card: { borderRadius: 20, background: 'rgba(255,255,255,.6)', padding: '18px 20px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 8px' },
  cardText: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: 0 },
  chooseBtn: { flex: 1, height: 44, borderRadius: 15, border: 'none', background: '#fff', fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  onlyReadingBtn: { flex: 1, height: 44, borderRadius: 15, border: 'none', background: 'rgba(255,255,255,.5)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 20px calc(20px + var(--safe-bottom))' },
  shareBtn: { height: 54, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', cursor: 'pointer' },
  backBtn: { height: 46, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.5)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },
}
