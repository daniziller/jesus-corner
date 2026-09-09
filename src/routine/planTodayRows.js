// planTodayRows.js — lógica por trás da lista "Seu plano de hoje"
// (atualização 35a/35b, atualizacao-35-meu-plano/) e do card "Seu plano de
// hoje" da Home (2026-09-08) — as duas telas mostram a MESMA informação
// (ordem, status, meta de cada passo), só com layouts diferentes, então a
// decisão fica aqui uma vez só, testada em scripts/test-plan-today-rows.mjs,
// em vez de duplicada e arriscando as duas discordarem entre si. Mesmo
// padrão de stepDaysMath.js/bibleOrderMath.js: funções puras, sem depender
// de React nem de stores.
export const STEP_ORDER = ['prayer', 'reading', 'study', 'reflection']

// Passos de hoje + os "de folga hoje" no fim da lista — README: "passos
// fora do dia vão pro fim da lista, não somem da tela". Mas isso vale só
// pra quem está LIGADO no toggle (`activeSteps`) e não caiu hoje (dia de
// descanso daquele passo) — um passo com o TOGGLE desligado não é "de
// folga hoje", é "não faz parte do seu plano", e por isso nem entra na
// lista (achado dela, 2026-09-09: "toggle desligado, o passo é pausado" —
// olha errado quando o próprio passo desligado ainda aparecia esmaecido
// no fim, como se fosse só um dia de folga).
export function orderStepsWithOff(todaysSteps, activeSteps) {
  const offSteps = activeSteps.filter(k => !todaysSteps.includes(k))
  return { orderedKeys: [...todaysSteps, ...offSteps], offSteps }
}

// Passos "principais" pro card resumido da Home (Seu plano de hoje,
// 2026-09-08) — Leitura/Estudo primeiro, o que estiver agendado hoje; só
// cai pro par Oração/Reflexão quando NENHUM dos dois estiver agendado.
// Meu Plano (RoutineScreen.jsx) não usa isso — lá a lista mostra sempre
// os 4 canônicos, é só a Home que resume pro(s) passo(s) que importam.
export function featuredStepsFor(todaysSteps) {
  const bibleSteps = todaysSteps.filter(k => k === 'reading' || k === 'study')
  if (bibleSteps.length > 0) return bibleSteps
  return todaysSteps.filter(k => k === 'prayer' || k === 'reflection')
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
// de hoje. Quem chama traduz o metaKind pro texto final (ver buildRowMeta
// abaixo). Trilhas independentes (handoff-app-completo): Leitura e Estudo
// têm dias próprios e nunca se "pausam" um pelo outro — um passo fora de
// hoje é sempre só "não é dia dele", não importa qual.
export function metaKindFor(key, status, { activeStudyId, hasNoPlan, reflectionMethod }) {
  if (status === 'off') return 'notToday'
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

function doneAtLine(gender, key, todayRoutine, L) {
  const at = todayRoutine[`${key}At`]
  const d = at ? new Date(at) : null
  if (!d || Number.isNaN(d.getTime())) return L(gender === 'masc' ? 'doneMasc' : 'doneFem')
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return L(gender === 'masc' ? 'doneAtMasc' : 'doneAtFem', { time })
}

// Meta de "a fazer" quando não há descrição própria pro passo (Oração e
// Estudo sem estudo ativo não têm exemplo no quadro) — encadeamento
// antigo ("depois da leitura"), sem repetir os minutos (têm coluna
// própria em Meu Plano; na Home não aparecem de propósito, ver
// HomeScreen.jsx).
function chainAfterMeta(key, todaysSteps, L) {
  const idx = todaysSteps.indexOf(key)
  const prev = todaysSteps[idx - 1]
  return prev ? L(`after${prev[0].toUpperCase()}${prev.slice(1)}`) : ''
}

// Texto final da linha "meta" de um passo — traduz o metaKind (acima) pro
// texto certo, incluindo os poucos casos que precisam de mais que 1 chave
// (gênero de "concluído/a", "{método} · {texto}", "{título do estudo} ·
// dia N de M"). `L` é uma função de tradução já presa ao namespace
// 'routine' (ver RoutineScreen.jsx/HomeScreen.jsx) — o vocabulário de
// passo é o mesmo nas duas telas, por isso mora só na de Meu Plano.
// `ctx.stepTitle` é a função de nome de passo já usada por quem chama
// (RoutineScreen.jsx/HomeScreen.jsx: `t('home.routine'+cap(k), ...)`) — o
// nome bonito do passo mora em home.routineXxx, não em routine.*, então
// vem de fora em vez de L() tentar adivinhar o namespace certo.
export function buildRowMeta(key, status, ctx, L) {
  const { activeStudyId, hasNoPlan, reflectionMethod, prayerMethod, todayRoutine, todaySession, activeStudy, todaysSteps, stepTitle } = ctx
  const kind = metaKindFor(key, status, { activeStudyId, hasNoPlan, reflectionMethod })
  switch (kind) {
    case 'notToday':
      return L('notTodayStep', { step: stepTitle(key).toLowerCase() })
    case 'prayerDone':
      return `${prayerMethod === 'acts' ? L('methodActs') : L('methodFree')} · ${doneAtLine('fem', key, todayRoutine, L)}`
    case 'prayerMethod':
      return `${prayerMethod === 'acts' ? L('methodActs') : L('methodFree')} · ${prayerMethod === 'acts' ? L('methodActsSub') : L('methodFreeSubPrayer')}`
    case 'doneFem':
      return doneAtLine('fem', key, todayRoutine, L)
    case 'doneMasc':
      return doneAtLine('masc', key, todayRoutine, L)
    case 'noPlanReading':
      return L('noPlanReadingSub')
    case 'readingResume':
      return L('readingResumeSubtitle', { title: todaySession?.title ?? '' })
    case 'studyProgress':
      return `${activeStudy?.title ?? ''} · ${L('dayXofY', { n: (activeStudy?.dayDone ?? 0) + 1, total: activeStudy?.dayTotal ?? 1 })}`
    case 'studyQuestion':
      return L('studyQuestionNote')
    case 'reflectionFree':
      return L('reflectionFreeNote')
    case 'reflectionQuestions':
      return L('reflectionPendingQuestions')
    case 'chainAfter':
    default:
      return chainAfterMeta(key, todaysSteps, L)
  }
}
