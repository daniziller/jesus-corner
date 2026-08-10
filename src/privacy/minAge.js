// Idade mínima — art. 14 da LGPD.
//
// A lei trata como CRIANÇA quem tem menos de 12 anos, e exige, para tratar
// dados dessa faixa, consentimento específico e em destaque de pelo menos um
// dos pais ou responsável legal. Não há como verificar isso de forma
// confiável num cadastro por email, então a porta fica fechada.
//
// Acima de 12 (adolescente) o critério legal é o melhor interesse, sem
// exigência de consentimento parental — por isso o corte é em 12 e não em 18.
export const MIN_AGE = 12

// Idade em anos completos na data de hoje. Retorna null se a data for vazia
// ou inválida — quem chama decide o que fazer com isso.
export function ageFromBirthdate(birthdate) {
  if (!birthdate) return null
  const born = new Date(birthdate)
  if (Number.isNaN(born.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDiff = today.getMonth() - born.getMonth()
  // Ainda não fez aniversário este ano.
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--
  return age
}

// True só quando dá para afirmar que a pessoa é menor de 12. Data ausente ou
// malformada devolve false: a validação de formato é responsabilidade do
// campo, e não queremos bloquear cadastro por erro de digitação.
export function isUnderMinAge(birthdate) {
  const age = ageFromBirthdate(birthdate)
  return age !== null && age < MIN_AGE
}
