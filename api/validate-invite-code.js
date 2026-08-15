// Confere um código de convite ANTES da pessoa terminar o cadastro — sem
// exigir sessão (ainda não existe uma nesse ponto do fluxo, ver
// SignupStep em AuthScreen.jsx) e sem consumir o convite: só olha se
// existe um convite 'pending' com esse código e devolve o benefício, pra
// mostrar na hora ("Acesso vitalício grátis!" / "20% de desconto!") antes
// mesmo de submeter o formulário. O resgate de verdade (que marca o
// convite como 'claimed') continua acontecendo depois, com sessão real,
// em api/redeem-invite-code.js — este endpoint nunca escreve nada.
//
// Não expõe o e-mail do convite (só quem criou/o dono deveria saber pra
// quem foi mandado) nem exige autenticação — é seguro por não ter nenhum
// efeito colateral, e o espaço de códigos (8 caracteres de um alfabeto de
// 32, sem 0/O/1/I/L) é grande o bastante pra não valer a pena forçar por
// tentativa e erro.
import { supabaseAdmin } from './_lib/invites.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const code = (req.body?.code ?? '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'missing_code' })

  const { data: invite, error } = await supabaseAdmin
    .from('admin_invites')
    .select('kind, status, discount_percent, discount_duration')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[validate-invite-code] query failed:', error.message)
    return res.status(500).json({ error: 'query_failed' })
  }
  if (!invite || invite.status !== 'pending') {
    return res.status(200).json({ valid: false })
  }

  return res.status(200).json({
    valid: true,
    kind: invite.kind,
    discountPercent: invite.discount_percent,
    discountDuration: invite.discount_duration,
  })
}
