// URLs pras páginas legais no site de marketing. O site guarda seu próprio
// idioma isolado (localStorage do domínio dele, ver jesus-corner-site/src/App.jsx)
// e não tem como saber em que idioma o app está — por isso linkamos sempre
// com ?lang=, que o site usa pra abrir a página já no idioma certo.
const LEGAL_BASE_URL = 'https://jesuscorner.app'

export function termsUrl(lang) {
  return `${LEGAL_BASE_URL}/termos?lang=${lang}`
}

export function privacyUrl(lang) {
  return `${LEGAL_BASE_URL}/privacidade?lang=${lang}`
}
