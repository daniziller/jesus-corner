// Idioma padrão por geolocalização: português no Brasil, inglês em
// qualquer outro lugar — só usado no primeiro acesso, antes de existir uma
// preferência salva no dispositivo (ver appLanguageStore.js) ou na conta
// (ver authStore.updateLanguage). Nunca sobrescreve uma escolha já feita.
const TIMEOUT_MS = 2500

export async function detectLanguageFromIp() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/geo', { signal: controller.signal })
    if (!res.ok) return null
    const { country } = await res.json()
    if (!country) return null
    return country === 'BR' ? 'pt' : 'en'
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
