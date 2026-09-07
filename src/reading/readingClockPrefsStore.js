// Preferências do relógio de leitura (35c, bloco "Cronômetro"; 35f/35g
// usam essas 3 no Bloco 3) — reading_clock_prefs (jsonb, migration 0058).
// Mesmo padrão fino das outras stores sobre fetchRow/updateRow.
import { fetchRow, updateRow } from '../backend/userDataStore'

const DEFAULT_PREFS = { showOnReading: true, warnAtZero: true, askToContinue: true }

export async function getReadingClockPrefs() {
  const row = await fetchRow()
  return { ...DEFAULT_PREFS, ...(row?.reading_clock_prefs ?? {}) }
}

export async function setReadingClockPrefs(patch) {
  const row = await fetchRow()
  const next = { ...DEFAULT_PREFS, ...(row?.reading_clock_prefs ?? {}), ...patch }
  await updateRow({ reading_clock_prefs: next })
  return next
}
