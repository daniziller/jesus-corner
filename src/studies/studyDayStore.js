// studyDayStore.js — o dia do estudo (41d/41e, turno 41, handoff-estudos-
// 41/). Cada dia vive dentro de `sessions[i]` do próprio Estudo em
// ai_studies (mesmo array que 41b/41c já usam — ver App.jsx/
// CreateAiStudyScreen.jsx) — sem tabela nova: ensino/versículo-âncora/
// pergunta são campos NOVOS no mesmo objeto de sessão que já tinha book/
// chStart/chEnd/reason/minutes (buildText em api/generate-theme-plan.js).
//
// `updateStudyDay` é o único jeito de escrever aqui — lê o estudo inteiro,
// aplica o patch só no dia certo, salva de volta (saveAiStudy já faz
// upsert por id). `updater` pode ser um objeto (mescla direto) ou uma
// função `(diaAtual) => patch` — usado quando o patch depende do valor
// atual (ex: somar segundos à duração já guardada, nunca sobrescrever).
import { supabase } from '../lib/supabaseClient'
import { getAiStudies, saveAiStudy } from './aiStudiesStore'

// Devolve o ARRAY inteiro de estudos (mesmo formato de saveAiStudy) —
// bug real (2026-09-09, tela branca ao digitar a resposta): antes
// devolvia só o Estudo (updated.find(...)), mas toda tela chama isto e
// passa o retorno direto pra onStudyUpdated/setAiStudies, que espera o
// array. `aiStudies` virava um objeto (não mais array) na primeira
// gravação — studyReplacesReadingToday() chamando `aiStudies.find`
// quebrava (`TypeError: en.find is not a function`, 'en' era aiStudies
// minificado) assim que o rascunho salvava automaticamente.
export async function updateStudyDay(email, studyId, dayId, updater) {
  const studies = await getAiStudies(email)
  const study = studies.find(s => s.id === studyId)
  if (!study) throw new Error('study_not_found')
  const sessions = (study.sessions ?? []).map(s => {
    if (s.id !== dayId) return s
    const patch = typeof updater === 'function' ? updater(s) : updater
    return { ...s, ...patch }
  })
  const updatedStudy = { ...study, sessions }
  return saveAiStudy(email, updatedStudy)
}

// Chama api/generate-study-day.js — devolve o conteúdo PRONTO (ensino,
// versículo-âncora, pergunta); quem chama decide guardar com
// updateStudyDay (StudyDayScreen.jsx faz isso na hora, uma vez só — ver
// comentário lá sobre "gerado uma vez e guardado com o dia").
export async function generateStudyDayContent({ book, bookEn, chStart, chEnd, scope, lang }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-study-day', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, bookEn, chStart, chEnd, scope, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.day
}

// "Salvar e voltar depois" (41d) — rascunho + o tempo já gasto nesta
// sessão de visita (somado ao que já existia, nunca substituído — o chip
// de tempo de 41d conta só a visita atual, mas a duração TOTAL do dia,
// mostrada em "16 minutos" no fecho de 41e, acumula entre visitas).
export async function saveStudyDayDraft(email, studyId, dayId, draft, elapsedSeconds) {
  return updateStudyDay(email, studyId, dayId, day => ({
    draft,
    durationSeconds: (day.durationSeconds ?? 0) + Math.max(0, elapsedSeconds ?? 0),
  }))
}

// "Concluir o dia N" (41d) — resposta final (ou confirmação de pular),
// zera o rascunho, soma o tempo desta visita, marca concluído.
export async function completeStudyDay(email, studyId, dayId, { answer, skippedQuestion, elapsedSeconds }) {
  return updateStudyDay(email, studyId, dayId, day => ({
    answer: answer?.trim() || null,
    skippedQuestion: !!skippedQuestion,
    draft: null,
    durationSeconds: (day.durationSeconds ?? 0) + Math.max(0, elapsedSeconds ?? 0),
    completedAt: new Date().toISOString(),
    status: 'done',
  }))
}

export function markStudyDayEditing(email, studyId, dayId, answer) {
  return updateStudyDay(email, studyId, dayId, { answer: answer?.trim() || null })
}

export function markStudyDayPrayerRequest(email, studyId, dayId, on) {
  return updateStudyDay(email, studyId, dayId, { turnedIntoPrayer: on })
}

// "Nos dias de estudo" (41f/41h) — 'substitui' (padrão, ver
// stepsScheduledForWeekday em stepDaysMath.js) ou 'soma'. Campo do
// ESTUDO, não do dia — por isso não passa por updateStudyDay.
export async function setStudyReadingMode(email, studyId, mode) {
  const studies = await getAiStudies(email)
  const study = studies.find(s => s.id === studyId)
  if (!study) throw new Error('study_not_found')
  return saveAiStudy(email, { ...study, readingMode: mode })
}
