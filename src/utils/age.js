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

// A UI só pede a idade (número), nunca a data de nascimento exata — mas o
// resto do app (isAtLeast acima, isUnderMinAge em src/privacy/minAge.js)
// espera uma data. Convertemos pra uma data sintética (1º de janeiro do ano
// correspondente) só pra guardar/recalcular a idade depois; não é a data de
// nascimento real de ninguém. A margem de erro (até ~1 ano) é aceitável: o
// gate de 12+ no cadastro valida a idade informada diretamente (sem passar
// por aqui), e o de 16+ da Comunidade é um recurso, não uma exigência legal
// exata.
export function ageToApproxBirthdate(age) {
  const year = new Date().getFullYear() - Math.trunc(age)
  return `${year}-01-01`
}
