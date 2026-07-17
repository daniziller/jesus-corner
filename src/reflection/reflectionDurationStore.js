// Duração total de reflexão escolhida manualmente na tela de Reflexão — por
// dispositivo (não por conta), como prayerDurationStore.js. Sobrescreve o
// padrão vindo do plano (session.plan.reflectionMinutes) até a pessoa trocar
// de novo; sem preferência salva, o plano continua mandando.
const KEY = 'jc_reflection_minutes'

export function getSavedReflectionMinutes() {
  const raw = localStorage.getItem(KEY)
  return raw ? Number(raw) : null
}

export function setSavedReflectionMinutes(minutes) {
  localStorage.setItem(KEY, String(minutes))
}
