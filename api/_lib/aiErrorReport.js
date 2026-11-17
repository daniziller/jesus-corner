// O que registrar quando uma chamada à IA falha — só a forma do problema,
// nunca o texto gerado nem o que a pessoa escreveu. Para "response did not
// match schema" (NoObjectGeneratedError), desce pela cadeia de causas até
// a lista de regras do formato que falharam (as `issues` do Zod) e devolve
// cada uma como "campo: regra" — por exemplo
// "moments: Too small: expected array to have exactly 3 items".
// A mensagem de TypeValidationError traz a resposta inteira, então ela
// nunca entra aqui.
const MAX_ISSUES = 6

function causes(err) {
  const chain = []
  let e = err
  for (let i = 0; e && i < 8; i++) { chain.push(e); e = e.cause }
  return chain
}

export function describeAiFailure(err) {
  const chain = causes(err)
  const withIssues = chain.find(e => Array.isArray(e?.issues) && e.issues.length)
  if (withIssues) {
    const issues = withIssues.issues.slice(0, MAX_ISSUES).map(issue => {
      const path = (issue.path ?? []).join('.') || '(raiz)'
      return `${path}: ${issue.message ?? issue.code ?? 'inválido'}`
    })
    const more = withIssues.issues.length > MAX_ISSUES ? ` (+${withIssues.issues.length - MAX_ISSUES})` : ''
    return `formato: ${issues.join('; ')}${more}`
  }
  if (chain.some(e => /JSONParse/i.test(e?.name ?? ''))) return 'formato: a resposta não era JSON válido'
  const noObject = chain.find(e => /NoObjectGenerated/i.test(e?.name ?? ''))
  if (noObject) return `formato: nenhum objeto gerado (finishReason: ${noObject.finishReason?.unified ?? noObject.finishReason ?? '?'})`
  // Outros erros (rede, limite, chave): a mensagem não traz texto gerado.
  const first = chain[0]
  return `${first?.name ?? 'Error'}: ${String(first?.message ?? '').slice(0, 160)}`
}
