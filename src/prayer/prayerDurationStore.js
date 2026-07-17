// Duração total de oração escolhida manualmente na tela de Oração — por
// dispositivo (não por conta), como appLanguageStore.js. Sobrescreve o
// padrão vindo do plano (session.plan.prayerMinutes) até a pessoa trocar de
// novo; sem preferência salva, o plano continua mandando.
const KEY = 'jc_prayer_minutes'

export function getSavedPrayerMinutes() {
  const raw = localStorage.getItem(KEY)
  return raw ? Number(raw) : null
}

export function setSavedPrayerMinutes(minutes) {
  localStorage.setItem(KEY, String(minutes))
}
