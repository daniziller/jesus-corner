// tr.js — o mesmo t() do app, mas puro: o idioma vem por parâmetro, em vez
// de ser lido da conta logada. Serve às funções de regras (hojeMath,
// meuPlanoMath…), que não podem depender da sessão para continuar
// testáveis em Node. Os textos são os mesmos de translations.js.
import { STRINGS } from './translations.js'

export function tr(lang, key, vars) {
  const lookup = l => key.split('.').reduce((node, part) => node?.[part], STRINGS[l])
  const raw = lookup(lang) ?? lookup('pt') ?? key
  if (!vars || typeof raw !== 'string') return raw
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), raw)
}

// A forma certa pelo número: chave `${base}One` para 1, `${base}Many`
// para o resto (o mesmo padrão das chaves da Comunidade).
export function trN(lang, base, n, vars) {
  return tr(lang, `${base}${n === 1 ? 'One' : 'Many'}`, { n, ...vars })
}
