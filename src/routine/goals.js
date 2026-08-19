// Metas de constância da rotina — não confundir com "Desafios" (que já é o
// nome usado pros desafios de leitura em GRUPO, ver src/groups/
// challengesStore.js). Metas são pessoais e variam "complete a rotina
// (Oração + Leitura + Reflexão) em X dias", usando o MESMO sinal que já
// alimenta o streak/calendário (dailyRoutine + isDayComplete/
// computeRoutineStreak, ver routineStreak.js) — nenhum tracking novo por
// módulo (leitura/oração separados).
//
// Uma vez batida, uma meta fica concluída pra sempre (ver
// src/routine/goalsStore.js) — diferente do streak/janela, que são
// recalculados a cada render a partir de dailyRoutine e PODEM cair de novo
// se a pessoa quebrar a sequência. `computeGoalsStatus` combina os dois:
// progresso ao vivo (current/target) + o que já foi persistido como
// concluído (completedGoals, vindo do backend).
import { computeRoutineStreak, isDayComplete, modulesForDay, DEFAULT_ROUTINE_MODULES } from './routineStreak'
import { dateKey } from '../utils/dateKey'

export const GOALS = [
  {
    id: 'streak-7',
    kind: 'streak',
    target: 7,
    xp: 50,
    icon: 'Flame',
    title: { pt: 'Uma semana seguida', en: 'A week in a row' },
    desc: { pt: 'Rotina completa por 7 dias seguidos', en: 'Complete routine, 7 days in a row' },
  },
  {
    id: 'streak-14',
    kind: 'streak',
    target: 14,
    xp: 100,
    icon: 'Zap',
    title: { pt: 'Duas semanas seguidas', en: 'Two weeks in a row' },
    desc: { pt: 'Rotina completa por 14 dias seguidos', en: 'Complete routine, 14 days in a row' },
  },
  {
    id: 'window-20-30',
    kind: 'window',
    target: 20,
    window: 30,
    xp: 150,
    icon: 'Calendar',
    title: { pt: 'Um mês com folga', en: 'A flexible month' },
    desc: { pt: 'Rotina completa em 20 dos últimos 30 dias', en: 'Complete routine on 20 of the last 30 days' },
  },
  {
    id: 'streak-30',
    kind: 'streak',
    target: 30,
    xp: 200,
    icon: 'Award',
    title: { pt: 'Um mês sem falhar', en: 'A month without missing a day' },
    desc: { pt: 'Rotina completa por 30 dias seguidos', en: 'Complete routine, 30 days in a row' },
  },
  {
    id: 'window-300-365',
    kind: 'window',
    target: 300,
    window: 365,
    xp: 300,
    icon: 'Crown',
    title: { pt: 'Quase um ano inteiro', en: 'Almost a whole year' },
    desc: { pt: 'Rotina completa em 300 dos últimos 365 dias', en: 'Complete routine on 300 of the last 365 days' },
  },
]

// Conta quantos dos últimos `windowDays` dias corridos (terminando hoje)
// tiveram a rotina completa — mesmo loop que computeWeeklyRoutineStats já
// faz por semana (routineStreak.js), só que sobre uma janela de dias
// corridos em vez de semanas de calendário.
function countCompleteDaysInWindow(dailyRoutine, windowDays, today, modules) {
  const todayKeyStr = dateKey(today)
  let count = 0
  const cursor = new Date(today)
  for (let i = 0; i < windowDays; i++) {
    const cursorKeyStr = dateKey(cursor)
    if (isDayComplete(dailyRoutine[cursorKeyStr], modulesForDay(cursorKeyStr, modules, todayKeyStr))) count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

// current/target ao vivo pra uma meta — não sabe (nem precisa saber) se ela
// já foi persistida como concluída antes; isso é responsabilidade de
// computeGoalsStatus, abaixo.
export function computeGoalProgress(goal, dailyRoutine, modules = DEFAULT_ROUTINE_MODULES, today = new Date()) {
  const current = goal.kind === 'streak'
    ? computeRoutineStreak(dailyRoutine, modules, today)
    : countCompleteDaysInWindow(dailyRoutine, goal.window, today, modules)
  return { current: Math.min(current, goal.target), target: goal.target, qualifiesNow: current >= goal.target }
}

// Junta as 5 metas com progresso ao vivo + o que já está persistido
// (completedGoals, formato { [goalId]: { completedAt } }). `completed`
// fica true se JÁ foi persistido OU se qualifica agora — quem decide
// gravar uma qualificação nova no backend é o chamador (App.jsx), não esta
// função (que é pura, sem I/O).
export function computeGoalsStatus(dailyRoutine, completedGoals, modules = DEFAULT_ROUTINE_MODULES, lang = 'pt', today = new Date()) {
  return GOALS.map(g => {
    const persisted = completedGoals?.[g.id] ?? null
    const progress = computeGoalProgress(g, dailyRoutine, modules, today)
    return {
      id: g.id,
      icon: g.icon,
      xp: g.xp,
      title: g.title[lang] ?? g.title.pt,
      desc: g.desc[lang] ?? g.desc.pt,
      current: progress.current,
      target: progress.target,
      percent: Math.round((progress.current / progress.target) * 100),
      completed: Boolean(persisted) || progress.qualifiesNow,
      completedAt: persisted?.completedAt ?? null,
    }
  })
}
