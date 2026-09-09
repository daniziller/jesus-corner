// StudyDayCompleteScreen.jsx — "Fim do dia do estudo" (41e, turno 41,
// handoff-estudos-41/). Fecho de um dia recém-concluído — `day`/
// `dayIndex` vêm de App.jsx (o dia que ACABOU de ser marcado, não o novo
// "atual" — que já avançou pro dia seguinte no momento em que esta tela
// monta, ver App.jsx/justCompletedStudyDay).
//
// Recap do topo ("Você disse em voz alta o que estava girando." no
// quadro) é texto gerado à mão pelo design pra aquele exemplo específico
// — implementá-lo de verdade exigiria uma frase nova por IA a cada
// conclusão de dia (não está entre os 11 itens da regra 4). Por ora uso
// uma frase curta e honesta, variando só se ela respondeu ou pulou —
// sinalizado no relatório do bloco, ajusto se preferir outra coisa.
//
// "Sem adiantar o dia 3..." do quadro é o dia N+1 (a autora escreveu pro
// exemplo dela, dia 2→3) — tratado aqui como template com o número real
// (regra 3: "quando o número muda, a frase muda junto").
import { useState } from 'react'
import { t } from '../i18n'
import AppIcon from '../icons/AppIcon'
import { markStudyDayEditing, markStudyDayPrayerRequest } from '../studies/studyDayStore'
import { createPrayerRequest } from '../groups/prayerRequestsStore'
import { postComment } from '../groups/commentsStore'
import { nextScheduledDate } from '../studies/estudosStore'
import { formatWeekdayDate } from '../utils/weekdayDateLabel'
import { dateKey } from '../utils/dateKey'

const FONT = 'var(--font-bento)'

function firstExcerpt(text, maxLen = 40) {
  if (!text) return ''
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text
  if (firstSentence.length <= maxLen) return firstSentence.replace(/[.!?]$/, '')
  return `${text.slice(0, maxLen).trim()}…`
}

export default function StudyDayCompleteScreen({ session, authUser, study, day, dayIndex, totalDays, stepDays, nextStep, onContinuePlan, onFinishHere, onStudyUpdated }) {
  const { lang } = session
  const L = (k, vars) => t(`studyDayComplete.${k}`, vars, lang)

  const [answer, setAnswer] = useState(day.answer ?? '')
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [turnIntoPrayer, setTurnIntoPrayer] = useState(day.turnedIntoPrayer ?? true)
  const [groupPickerOpen, setGroupPickerOpen] = useState(false)
  const [sentToGroup, setSentToGroup] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const passageLabel = day.chStart === day.chEnd ? `${day.book} ${day.chStart}` : `${day.book} ${day.chStart}–${day.chEnd}`
  const minutes = Math.max(1, Math.round((day.durationSeconds ?? 0) / 60))
  const excerpt = firstExcerpt(answer)

  const nextDay = totalDays > dayIndex + 1 ? study.sessions[dayIndex + 1] : null
  const nextDayDate = stepDays?.study ? nextScheduledDate(stepDays.study) : null

  async function handleSaveEdit() {
    setSavingEdit(true)
    try {
      const updated = await markStudyDayEditing(authUser.email, study.id, day.id, answer)
      onStudyUpdated?.(updated)
      setEditing(false)
    } catch (err) {
      console.error('Failed to edit study day answer', err)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSendToGroup(groupId) {
    setGroupPickerOpen(false)
    try {
      await postComment(groupId, `${L('groupShareLabel', { title: study.title, n: dayIndex + 1 })}\n\n${answer}`)
      setSentToGroup(true)
    } catch (err) {
      console.error('Failed to send study answer to group', err)
    }
  }

  // Finaliza (ambos os botões do rodapé passam por aqui) — só cria o
  // pedido de oração na SAÍDA da tela, uma vez (day.turnedIntoPrayer já
  // persistido evita duplicar se a pessoa voltar aqui de novo).
  async function finalize() {
    if (leaving) return
    setLeaving(true)
    try {
      if (turnIntoPrayer && !day.turnedIntoPrayer && answer.trim()) {
        await createPrayerRequest({ body: answer.trim(), scope: 'only_me' }).catch(err => console.error('Failed to create prayer request from study answer', err))
        const updated = await markStudyDayPrayerRequest(authUser.email, study.id, day.id, true)
        onStudyUpdated?.(updated)
      }
    } finally {
      setLeaving(false)
    }
  }

  async function handleContinuePlan() {
    await finalize()
    onContinuePlan?.()
  }
  async function handleFinishHere() {
    await finalize()
    onFinishHere?.()
  }

  return (
    <div style={s.screen}>
      <div style={s.body}>
        <div style={s.headTextBlock}>
          <p style={s.dayDoneLabel}>{L('dayDoneLabel', { n: dayIndex + 1, total: totalDays })}</p>
          <p style={s.recapLine}>{L(day.skippedQuestion ? 'recapSkipped' : 'recapAnswered')}</p>
          <p style={s.metaLine}>{L('metaLine', { min: minutes, passage: passageLabel })}</p>
        </div>

        {/* O que você escreveu (branco). */}
        <div style={s.card}>
          <p style={s.cardLabel}>{L('writtenLabel')}</p>
          {editing ? (
            <>
              <textarea style={s.editInput} value={answer} onChange={e => setAnswer(e.target.value)} rows={4} autoFocus />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={s.actionBtn} onClick={() => setEditing(false)} disabled={savingEdit}>{L('cancelEdit')}</button>
                <button style={{ ...s.actionBtn, background: 'var(--bento-ink)', color: '#fff' }} onClick={handleSaveEdit} disabled={savingEdit}>{L('saveEdit')}</button>
              </div>
            </>
          ) : (
            <>
              <p style={s.writtenText}>{answer || L('noAnswer')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.actionBtn} onClick={() => setEditing(true)}>{L('editAction')}</button>
                {session.myGroups?.length > 0 && !!answer.trim() && (
                  <button style={s.actionBtn} onClick={() => setGroupPickerOpen(true)} disabled={sentToGroup}>
                    {sentToGroup ? L('sentToGroup') : L('sendToGroupAction')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Virar pedido de oração (preto). */}
        {!!answer.trim() && (
          <div style={s.darkCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.darkLabel}>{L('prayerLabel')}</p>
              <p style={s.prayerText}>{L('prayerLine', { excerpt })}</p>
            </div>
            <button
              role="switch" aria-checked={turnIntoPrayer}
              onClick={() => setTurnIntoPrayer(v => !v)}
              style={{ ...s.switch, background: turnIntoPrayer ? 'var(--bento-accent)' : 'rgba(255,255,255,.15)', justifyContent: turnIntoPrayer ? 'flex-end' : 'flex-start' }}
            >
              <span style={s.switchThumb} />
            </button>
          </div>
        )}

        {/* O dia N+1 fica esperando (branco 60%) — sem botão. */}
        {nextDay && (
          <div style={s.nextDayCard}>
            <p style={s.cardLabel}>{L('nextDayLabel', { n: dayIndex + 2 })}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <span style={s.nextDayNum}>{dayIndex + 2}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.nextDayTitle}>{nextDay.book} {nextDay.chStart === nextDay.chEnd ? nextDay.chStart : `${nextDay.chStart}–${nextDay.chEnd}`}</p>
                <p style={s.nextDaySub}>
                  {nextDay.reason}{nextDayDate ? ` · ${formatWeekdayDate(dateKey(nextDayDate), lang)}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Regra 4 §9: no último dia (M de M) esta tela vira 41g (síntese,
            Bloco 5, ainda não construído) — por ora, se não sobrou
            próximo dia, a "linha de respiro" (que só faz sentido citando
            um dia que existe) simplesmente não aparece. */}
        {nextDay && <p style={s.breatheLine}>{L('breatheLine', { n: dayIndex + 2 })}</p>}
      </div>

      <div style={s.footer}>
        <button style={s.continueBtn} onClick={handleContinuePlan} disabled={leaving}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <p style={s.continueBtnTitle}>{L('continuePlanTitle')}</p>
            <p style={s.continueBtnSub}>{nextStep ? L('continuePlanSub', { step: nextStep.label, min: nextStep.minutes }) : L('continuePlanSubDone')}</p>
          </div>
          <AppIcon name="ArrowRight" size={17} color="var(--bento-ink)" />
        </button>
        <button style={s.finishBtn} onClick={handleFinishHere} disabled={leaving}>{L('finishHereBtn')}</button>
      </div>

      {groupPickerOpen && (
        <div style={s.sheetBackdrop} onClick={() => setGroupPickerOpen(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandleWrap}><div style={s.sheetHandle} /></div>
            <p style={s.sheetTitle}>{L('sendToGroupAction')}</p>
            {(session.myGroups ?? []).map(g => (
              <button key={g.groupId} style={s.groupRow} onClick={() => handleSendToGroup(g.groupId)}>{g.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bento-bg)' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 },

  headTextBlock: { marginBottom: 4 },
  dayDoneLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bento-accent)', margin: '0 0 6px' },
  recapLine: { fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '-.7px', lineHeight: 1.2, color: 'var(--bento-ink)', margin: '0 0 6px' },
  metaLine: { fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: 'var(--bento-t3)', margin: 0 },

  card: { borderRadius: 24, background: 'var(--bento-card)', padding: '18px 20px' },
  cardLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bento-t4)', margin: '0 0 10px' },
  writtenText: { fontFamily: FONT, fontSize: 14.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', margin: '0 0 14px' },
  noAnswer: { fontFamily: FONT, fontSize: 13, fontWeight: 500, color: 'var(--bento-t4)' },
  editInput: { width: '100%', border: 'none', outline: 'none', background: 'var(--bento-line)', borderRadius: 14, padding: 12, fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--bento-ink)', resize: 'none', boxSizing: 'border-box' },
  actionBtn: { flex: 1, height: 42, borderRadius: 14, border: 'none', background: 'var(--bento-line)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer' },

  darkCard: { display: 'flex', alignItems: 'center', gap: 14, borderRadius: 24, background: 'var(--bento-ink)', padding: '18px 20px' },
  darkLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', margin: '0 0 6px' },
  prayerText: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: '#fff', margin: 0 },
  switch: { width: 46, height: 28, flexShrink: 0, borderRadius: 99, border: 'none', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' },
  switchThumb: { width: 22, height: 22, borderRadius: '50%', background: '#fff' },

  nextDayCard: { borderRadius: 24, background: 'rgba(255,255,255,.6)', padding: '18px 20px' },
  nextDayNum: { width: 34, height: 34, flexShrink: 0, borderRadius: 12, background: 'var(--bento-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: 'var(--bento-t4)' },
  nextDayTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: 'var(--bento-t4)', margin: '0 0 2px' },
  nextDaySub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: 'var(--bento-t4)', margin: 0 },

  breatheLine: { fontFamily: FONT, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'var(--bento-t3)', margin: '4px 2px' },

  footer: { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 20px calc(20px + var(--safe-bottom))' },
  continueBtn: { height: 58, borderRadius: 18, border: 'none', background: 'var(--bento-accent)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', cursor: 'pointer' },
  continueBtnTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: 'var(--bento-ink)', margin: 0 },
  continueBtnSub: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: 'rgba(26,23,20,.65)', margin: '2px 0 0' },
  finishBtn: { height: 46, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,.6)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: 'var(--bento-t3)', cursor: 'pointer' },

  sheetBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' },
  sheet: { width: '100%', background: 'var(--bento-bg)', borderRadius: '24px 24px 0 0', padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 6 },
  sheetHandleWrap: { display: 'flex', justifyContent: 'center', padding: '4px 0 10px' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, background: 'var(--bento-line)' },
  sheetTitle: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: 'var(--bento-ink)', margin: '0 0 8px', textAlign: 'center' },
  groupRow: { height: 46, borderRadius: 14, border: 'none', background: 'var(--bento-card)', fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: 'var(--bento-ink)', cursor: 'pointer', textAlign: 'left', padding: '0 16px' },
}
