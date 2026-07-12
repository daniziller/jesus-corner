// Calcula idade a partir da data de nascimento (string 'YYYY-MM-DD', formato
// nativo do <input type="date">) — usado pra liberar recursos com restrição
// de idade (ex: aba Grupos, 16+).
export function calculateAge(birthdate) {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hadBirthdayThisYear) age -= 1
  return age
}

// Contas criadas antes desse campo existir não têm birthdate — não
// restringimos quem simplesmente não informou a data, só quem informou uma
// data abaixo do mínimo.
export function isAtLeast(birthdate, minAge) {
  const age = calculateAge(birthdate)
  if (age === null) return true
  return age >= minAge
}
