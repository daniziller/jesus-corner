// Semana atual (segunda a domingo) com o status dos 3 passos em cada dia —
// usado pelos "anéis da semana" (referência: o resumo semanal do app Apple
// Health/Fitness, um anel por dia) tanto na Home quanto na imagem
// compartilhável (ver src/screens/HomeScreen.jsx e
// src/share/shareProgressCard.js — mesma função, pra nunca divergir o que
// aparece nos dois lugares).
import { dateKey } from '../utils/dateKey'

export function computeCurrentWeekDays(dailyRoutine, today = new Date()) {
  const dow = today.getDay() // 0=domingo..6=sábado
  const diff = (dow === 0 ? -6 : 1) - dow
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
  const todayKey = dateKey(today)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const key = dateKey(d)
    const entry = dailyRoutine?.[key]
    days.push({
      date: d,
      key,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      prayer: !!entry?.prayer,
      reading: !!entry?.reading,
      reflection: !!entry?.reflection,
    })
  }
  return days
}

// Uma letra por dia, segunda a domingo — mesma abreviação ambígua (T/Q/S
// repetidos) que calendários em português já usam; a posição na fileira
// desambigua.
export const WEEKDAY_LETTERS = {
  pt: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}

// Cores dos 3 anéis (de fora pra dentro: oração·leitura·reflexão) — só pra
// uso sobre o gradiente escuro do card de % (Home e imagem compartilhável).
// Diferentes de ROUTINE_STEP_COLORS (src/utils/routineColors.js), que são
// pensadas pra fundo claro — --or ali é quase a mesma cor do início deste
// gradiente, e branco puro (testado antes) lia "sem graça"/genérico demais.
// Centralizado aqui (não duplicado em HomeScreen.jsx e
// shareProgressCard.js) pra nunca divergir qual cor é qual passo.
export const WEEK_RING_COLORS = {
  prayer: '#8ECAE6',     // azul suave
  reading: '#D9AF6B',    // dourado
  reflection: '#F3A6C6', // rosa
}
