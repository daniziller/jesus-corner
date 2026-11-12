// DayCompleteScreen.jsx — Dia concluído (S5, handoff-passos-pedidos-53-54
// §6). O que a pessoa fez e o que mudou: os minutos reais com Deus, os
// passos de hoje com o tempo de cada um, a semana, o livro, a Bíblia, e a
// frase do dia. Sem cabeçalho, sem relógio, sem festa — um botão preto
// leva de volta ao plano, e é depois dele que entra a tela de parabéns,
// se o dia rendeu livro completo ou conquista (regra da gamificação, em
// App.jsx).
//
// "Compartilhar meu dia" abre o editor da imagem (DayShareScreen, 37d) por
// cima desta tela; voltar de lá devolve ao resumo.
import { useState, useEffect, useMemo } from 'react'
import { getNotes, noteTextOf } from '../notes/notesStore'
import { getAllSessions, totalsForDay } from '../metrics/sessionDurationStore'
import { dailyApplicationKeyFor } from '../reflection/applicationPhraseStore'
import { getGamificationRow } from '../gamification/achievementsStore'
import { computeCurrentWeekGoal } from '../gamification/weeksMath'
import { computeBibleProgress } from '../gamification/bibleProgressMath'
import { bookInfo, blockColorVar } from '../data/gamificationBlocks'
import { loadActiveStudy } from '../meuPlano/activeStudy'
import { minutesHeadline, readingLabel, dayRows, dayNumbers, dayPhrase } from '../passos/diaConcluidoMath'
import { dateKey } from '../utils/dateKey'
import AppIcon from '../icons/AppIcon'
import BarraDoDia from '../components/passos/BarraDoDia'
import Check from '../components/passos/Check'
import RodapeDoPasso from '../components/passos/RodapeDoPasso'
import DayShareScreen from './DayShareScreen'

const FONT = 'var(--font-bento)'

export default function DayCompleteScreen({ session, authUser, completedSet, steps, readingSession, onBack }) {
  const { lang, dailyRoutine, weeklyGoalDays, biblePercent, activeStudyId } = session
  const email = authUser?.email

  // A frase de hoje (pergunta 3 da reflexão), os segundos reais de cada
  // passo hoje, o histórico da meta semanal e o estudo ativo.
  const [phrase, setPhrase] = useState('')
  const [seconds, setSeconds] = useState({ prayer: 0, reading: 0, reflection: 0 })
  const [goalHistory, setGoalHistory] = useState(null)
  const [study, setStudy] = useState(null)
  useEffect(() => {
    if (!email) return
    getNotes(email).then(map => setPhrase(noteTextOf(map[dailyApplicationKeyFor()]))).catch(() => {})
    getAllSessions().then(rows => setSeconds(totalsForDay(rows, dateKey()))).catch(() => {})
    getGamificationRow().then(row => setGoalHistory(row.goalHistory ?? [])).catch(() => setGoalHistory([]))
  }, [email])
  const hasStudyStep = (steps ?? []).includes('study')
  useEffect(() => {
    if (!hasStudyStep || !activeStudyId) return
    loadActiveStudy(activeStudyId, lang).then(setStudy).catch(() => {})
  }, [hasStudyStep, activeStudyId, lang])

  // A mesma conta do contador de semanas (weeksMath): dias que contaram
  // nesta semana, contra a meta vigente.
  const week = goalHistory ? computeCurrentWeekGoal(dailyRoutine, goalHistory, weeklyGoalDays) : null
  // O livro lido hoje, na estrutura da gamificação (lidos, total, bloco).
  const bookName = (steps ?? []).includes('reading') && readingSession?.type !== 'reflection' ? readingSession?.book : null
  const book = useMemo(() => {
    const info = bookName && bookInfo(bookName)
    const progress = info && completedSet ? computeBibleProgress(completedSet).porLivro[bookName] : null
    return progress ? { name: bookName, lidos: progress.lidos, total: progress.total, blocoId: info.blocoId } : null
  }, [bookName, completedSet])

  const [sharing, setSharing] = useState(false)
  if (sharing) {
    return <DayShareScreen session={session} readingSession={readingSession} phrase={phrase} minutes={seconds} onBack={() => setSharing(false)} />
  }

  const headline = minutesHeadline(seconds.prayer + seconds.reading + seconds.reflection)
  const rows = dayRows({ steps, seconds, reading: readingLabel(readingSession), study })
  const numbers = dayNumbers({ week, book, study: hasStudyStep ? study : null, biblePercent })
  const quote = dayPhrase(phrase)

  return (
    <div style={s.screen}>
      <div style={s.scroll}>
        <div style={s.top}>
          <p style={s.eyebrow}>Dia concluído</p>
          <h1 style={s.headline}>{headline[0]}<br />{headline[1]}</h1>
        </div>

        <div style={s.body}>
          <div style={s.steps}>
            <BarraDoDia segments={rows.map(r => ({ key: r.key, minutes: r.flex, status: 'now' }))} height={6} style={s.bar} aria-hidden="true" />
            <ul style={s.list}>
              {rows.map(r => (
                <li key={r.key} style={s.row}>
                  <span style={s.check}><Check size={11} color="#fff" /></span>
                  <span style={s.rowName}>{r.name}</span>
                  {r.minutes && <span style={s.rowMinutes}>{r.minutes}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div style={s.numbers}>
            {numbers.map(n => (
              <div key={n.key} style={s.number}>
                <p style={{ ...s.numberValue, ...(n.blocoId ? { color: blockColorVar(n.blocoId) } : null) }}>{n.value}</p>
                <p style={s.numberCaption}>{n.caption}</p>
              </div>
            ))}
          </div>

          {quote && (
            <div style={s.phraseCard}>
              <p style={s.phraseLabel}>Sua frase de hoje</p>
              <p style={s.phrase}>{quote}</p>
            </div>
          )}

          <button type="button" style={s.share} onClick={() => setSharing(true)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={s.shareTitle}>Compartilhar meu dia</span>
              <span style={s.shareSub}>Você escolhe o que entra na imagem</span>
            </span>
            <AppIcon name="ChevronRight" size={14} strokeWidth={2.6} color="var(--bento-t5)" style={{ flexShrink: 0 }} />
          </button>
        </div>
      </div>

      <RodapeDoPasso primary={{ label: 'Voltar ao plano', onClick: onBack, dark: true }} />
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  top: { padding: '30px 20px 0' },
  eyebrow: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: 0 },
  headline: { fontFamily: FONT, fontSize: 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.2px', color: 'var(--bento-ink)', margin: '12px 0 0' },
  body: { padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 },

  steps: { borderRadius: 26, background: 'var(--bento-ink)', padding: '16px 18px 12px' },
  bar: { margin: '0 0 10px' },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 10, height: 40 },
  check: { width: 22, height: 22, flexShrink: 0, borderRadius: 8, background: 'var(--bento-sand-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rowName: { flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowMinutes: { flexShrink: 0, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,.6)' },

  numbers: { display: 'flex', gap: 8 },
  number: { flex: 1, minWidth: 0, borderRadius: 18, background: 'var(--bento-card)', padding: '13px 12px 12px' },
  numberValue: { fontFamily: FONT, fontSize: 19, fontWeight: 800, lineHeight: 1, letterSpacing: '-.6px', color: 'var(--bento-ink)', margin: '0 0 6px' },
  numberCaption: { fontFamily: FONT, fontSize: 10.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--bento-t3)', margin: 0 },

  phraseCard: { borderRadius: 24, background: 'var(--bento-sand)', padding: '16px 18px 17px' },
  phraseLabel: { fontFamily: FONT, fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--bento-sand-label)', margin: '0 0 9px' },
  phrase: { fontFamily: FONT, fontSize: 16, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4, letterSpacing: '-.2px', color: 'var(--bento-sand-ink-strong)', margin: 0, textWrap: 'pretty', overflowWrap: 'anywhere' },

  // A linha tem 56px dentro de um cartão com 4px de respiro em cima e embaixo.
  share: { width: '100%', height: 64, boxSizing: 'border-box', border: 'none', borderRadius: 24, background: 'var(--bento-card)', padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' },
  shareTitle: { display: 'block', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 2px' },
  shareSub: { display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, lineHeight: 1.2, color: 'var(--bento-t3)' },
}
