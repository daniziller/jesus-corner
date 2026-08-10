// Iniciais (até 2 letras: primeiro nome + sobrenome) usadas como fallback
// visual em todo avatar do app quando a pessoa não tem foto.
export function avatarInitialsOf(name) {
  const parts = (name ?? '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
