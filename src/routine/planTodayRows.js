// planTodayRows.js — lógica pura por trás da lista "Seu plano de hoje" em
// RoutineScreen.jsx (atualização 35a/35b, atualizacao-35-meu-plano/). Separado
// do componente pra poder testar a parte que mais importa pra fidelidade ao
// quadro (ordem dos passos + qual estado/motivo cada linha mostra) sem
// precisar montar o React inteiro — mesmo padrão de stepDaysMath.js/
// bibleOrderMath.js. A tradução em si (t()) fica no componente; aqui só a
// decisão estrutural (ordem, status, "de onde vem a meta").
export const STEP_ORDER = ['prayer', 'reading', 'study', 'reflection']

// Passos de hoje (já com a substituição leitura↔estudo aplicada por quem
// chama, ver RoutineScreen.jsx) + os "desligados" no fim — README: "passos
// desligados vão para o fim da lista, não somem da tela". Qualquer passo
// canônico que não esteja em `todaysSteps` conta como "de fora hoje", seja
// porque não tem dia marcado, seja porque foi substituído pelo estudo ativo.
export function orderStepsWithOff(todaysSteps) {
  const offSteps = STEP_ORDER.filter(k => !todaysSteps.includes(k))
  return { orderedKeys: [...todaysSteps, ...offSteps], offSteps }
}

// Estado visual de UM passo na lista.
export function statusFor(key, { offSteps, todayRoutine, currentKey }) {
  if (offSteps.includes(key)) return 'off'
  if (todayRoutine[key]) return 'done'
  if (key === currentKey) return 'now'
  return 'pending'
}

// De onde vem o texto da linha "meta" — cada combinação de passo/estado
// mostra um tipo de informação diferente no quadro (35a/35b): horário
// quando feito, posição/pergunta quando é a vez, motivo quando está fora
// de hoje. Quem chama traduz o metaKind pro texto final (ver metaFor em
// RoutineScreen.jsx).
export function metaKindFor(key, status, { activeStudyId, pausedStudyHasBook, hasNoPlan, reflectionMethod }) {
  if (status === 'off') {
    if (key === 'reading' && activeStudyId && pausedStudyHasBook) return 'pausedUntil'
    return 'notToday'
  }
  if (key === 'prayer') return status === 'done' ? 'prayerDone' : 'prayerMethod'
  if (key === 'reading') {
    if (status === 'done') return 'doneFem'
    if (hasNoPlan && !activeStudyId) return 'noPlanReading'
    if (status === 'now') return 'readingResume'
    return 'chainAfter'
  }
  if (key === 'study') {
    if (status === 'done') return 'doneMasc'
    if (activeStudyId) return 'studyProgress'
    return 'chainAfter'
  }
  // reflection
  if (status === 'done') return 'doneFem'
  if (activeStudyId) return 'studyQuestion'
  return reflectionMethod === 'free' ? 'reflectionFree' : 'reflectionQuestions'
}
