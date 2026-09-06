// Parte pura de weeklyDaysStore.js (sem import de I/O) — separada só pra
// poder ser testada com `node` puro, sem precisar de sessão Supabase (ver
// scripts/test-weekly-days.mjs). weeklyDaysStore.js reexporta tudo daqui.
export const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const WEEKLY_DAYS_PRESETS = {
  threeDays: [true, false, true, false, true, false, false], // Seg/Qua/Sex
  fourDays: [true, false, true, false, true, false, true], // Seg/Qua/Sex/Dom (padrão do exemplo do ADENDO)
  weekdays: [true, true, true, true, true, false, false],
  everyDay: [true, true, true, true, true, true, true],
}

export function countTrue(days) {
  return days.filter(Boolean).length
}

// Abreviação de 3 letras (Seg/Ter/Qua…) e nome cheio — usados no grid "Esta
// semana" de HomeDashboard.jsx (30a), que agora mostra só os dias marcados
// em vez de sempre 7, então precisa do nome de cada um, não só uma letra
// ambígua (WEEKDAY_LETTERS em weekRings.js continua existindo pra outros
// widgets que ainda mostram os 7 dias sempre).
export const WEEKDAY_ABBR3 = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}
export const WEEKDAY_FULL = {
  pt: ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
}
