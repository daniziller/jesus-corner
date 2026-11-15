// Infraestrutura de tradução da UI. Nenhum componente precisa receber
// `lang` via prop: t() sempre lê o idioma do usuário logado no momento da
// chamada (mesmo padrão de getCurrentUser() no authStore), então qualquer
// re-render após uma troca de idioma já mostra o texto certo.
import { tr } from './tr.js'
import { getCachedUser } from '../auth/authStore'
import { getAppLanguage } from './appLanguageStore'

export const LANGUAGES = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
]

// Prioridade: idioma salvo na conta logada > idioma escolhido no
// dispositivo antes do login (tela inicial) > português como último recurso.
export function currentLanguage() {
  return getCachedUser()?.language ?? getAppLanguage() ?? 'pt'
}

// t('home.greeting', { name: 'Ana' }) -> substitui {name} pelo valor. Sem
// vars, retorna a string crua (pode conter {placeholders} pra você mesmo
// interpolar, como faz auth.mockEmailBody ao misturar com JSX em negrito).
export function t(key, vars, lang = currentLanguage()) {
  return tr(lang, key, vars)
}
