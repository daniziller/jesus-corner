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
