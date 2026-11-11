// activeStudy.js — o estudo ativo como o Meu Plano e o Ajustar mostram:
// nome, dia n de m, referência do dia, dias feitos. Único ponto com I/O
// da aba pra isso (STUDIES + ai_studies + inductive_studies, como o 35a
// já fazia), reaproveitado pelas duas telas.
import { STUDIES } from '../data/studies.js'
import { getAiStudies } from '../studies/aiStudiesStore.js'
import { getInductiveStudies } from '../studies/inductiveStudiesStore.js'
import { getCompletedStudySessions, isStudySessionDone } from '../studies/studiesProgressStore.js'
import { currentDayOf } from '../studies/estudosStore.js'

function isNewFormatStudy(study) { return !!study?.sessions?.[0]?.book }

export async function loadActiveStudy(activeStudyId, lang = 'pt') {
  if (!activeStudyId) return null
  const [ai, inductive, doneSet] = await Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()])
  const study = [...STUDIES, ...ai, ...inductive].find(s => s.id === activeStudyId)
  if (!study) return null
  const title = study.title ?? study.titleEn ?? ''
  if (isNewFormatStudy(study)) {
    const { index, total } = currentDayOf(study)
    const cur = (study.sessions ?? [])[Math.min(index, Math.max(total - 1, 0))]
    const reference = cur ? (cur.chStart === cur.chEnd ? `${cur.book} ${cur.chStart}` : `${cur.book} ${cur.chStart}–${cur.chEnd}`) : ''
    return { title, dayN: Math.min(index, total) + 1, dayTotal: total, dayDone: Math.min(index, total), reference }
  }
  const total = study.sessions?.length ?? 0
  const done = (study.sessions ?? []).filter(s => isStudySessionDone(doneSet, study.id, s.id)).length
  const cur = (study.sessions ?? [])[Math.min(done, total - 1)]
  return { title, dayN: done + 1, dayTotal: total, dayDone: done, reference: cur ? (lang === 'en' ? (cur.passageEn ?? cur.passage) : cur.passage) : '' }
}

// "{n} salvos · {m} concluídos" do cartão Meus estudos.
export async function loadStudiesSummary(activeStudyId) {
  const [ai, inductive, doneSet] = await Promise.all([getAiStudies(), getInductiveStudies(), getCompletedStudySessions()])
  const all = [...STUDIES, ...ai, ...inductive]
  let completed = 0
  for (const s of all) {
    const total = s.sessions?.length ?? 0
    const done = (s.sessions ?? []).filter(x => isStudySessionDone(doneSet, s.id, x.id)).length
    if (total > 0 && done === total) completed++
  }
  return { saved: Math.max(0, all.length - completed - (activeStudyId ? 1 : 0)), completed }
}
