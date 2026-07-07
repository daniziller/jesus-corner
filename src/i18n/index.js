// Infraestrutura de tradução da UI. Nenhum componente precisa receber
// `lang` via prop: t() sempre lê o idioma do usuário logado no momento da
// chamada (mesmo padrão de getCurrentUser() no authStore), então qualquer
// re-render após uma troca de idioma já mostra o texto certo.
import { STRINGS } from './translations'
import { getCachedUser } from '../auth/authStore'
import { getAppLanguage } from './appLanguageStore'

export const LANGUAGES = [
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
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
  const lookup = (l) => key.split('.').reduce((node, part) => node?.[part], STRINGS[l])
  const raw = lookup(lang) ?? lookup('pt') ?? key
  if (!vars || typeof raw !== 'string') return raw
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), raw)
}
