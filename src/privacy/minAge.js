// Idade mínima — o Jesus' Corner é um produto para maiores de 18 anos.
//
// Decisão de produto, não só de conformidade: mantendo a porta fechada para
// menores de idade, o app não trata NENHUM dado de criança ou adolescente,
// e fica de fora das regras específicas para esse público (art. 14 da LGPD,
// política de Famílias da Google Play, seção de dados de menores na Data
// Safety, etc.). O cadastro pede a idade e a tela de criação de conta,
// além do servidor (ver src/auth/authStore.js), barram quem declara menos
// de 18.
export const MIN_AGE = 18

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

// True só quando dá para afirmar que a pessoa é menor de 18. Data ausente
// ou malformada devolve false: a validação de formato é responsabilidade do
// campo, e não queremos bloquear cadastro por erro de digitação. Contas
// criadas antes deste corte não são revalidadas no login (ver
// AskUserQuestion no histórico) — só o cadastro novo é barrado.
export function isUnderMinAge(birthdate) {
  const age = ageFromBirthdate(birthdate)
  return age !== null && age < MIN_AGE
}
