// Descadastro de e-mail por link (LGPD art. 8º §5º e art. 18 IX: revogar
// consentimento tem que ser tão fácil quanto dar). Vem do link no rodapé
// dos e-mails e do cabeçalho List-Unsubscribe (ver api/_lib/emailConsent.js).
//
// GET mostra uma página com um botão de confirmar — leitores de e-mail e
// antivírus abrem links sozinhos, e um GET que já descadastrasse desligaria
// e-mails que a pessoa quer. POST (o botão, ou o "cancelar inscrição" do
// Gmail/Apple Mail, RFC 8058) grava a revogação: uma linha nova em
// consents com granted=false, igual a desligar pelo app.
import { createClient } from '@supabase/supabase-js'
import { EMAIL_PURPOSES, verifyUnsubscribeToken } from './_lib/emailConsent.js'
import { POLICY_VERSION } from '../src/privacy/policyVersion.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TEXT = {
  [EMAIL_PURPOSES.WEEKLY]: { pt: 'o e-mail do resumo semanal', en: 'the weekly summary email' },
  [EMAIL_PURPOSES.MARKETING]: { pt: 'os e-mails de novidades', en: 'news emails' },
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function page(body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Jesus' Corner</title><style>body{margin:0;background:#EDE8E2;color:#1A1714;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
main{max-width:440px;margin:0 auto;padding:56px 20px}h1{font-size:22px;margin:0 0 12px}p{font-size:15px;line-height:1.55;color:#5C544C;margin:0 0 12px}
button{margin-top:12px;width:100%;padding:14px;border:0;border-radius:12px;background:#F0662B;color:#fff;font-size:15px;font-weight:800;cursor:pointer}
.en{color:#8B8279;font-size:13px}a{color:#9D4300}</style></head><body><main>${body}</main></body></html>`
}

export default async function handler(req, res) {
  const { u, p, t } = req.query ?? {}
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  if (!verifyUnsubscribeToken(u, p, t)) {
    return res.status(400).send(page(`<h1>Link inválido</h1><p>Este link de descadastro não é válido. Você também pode desligar os e-mails no app, em Perfil → Privacidade.</p><p class="en">This unsubscribe link isn't valid. You can also turn emails off in the app, under Profile → Privacy.</p>`))
  }
  const what = TEXT[p]

  if (req.method === 'GET') {
    const action = `/api/unsubscribe?${new URLSearchParams({ u, p, t })}`
    return res.status(200).send(page(`<h1>Parar de receber ${esc(what.pt)}?</h1>
<p>Você continua usando o app normalmente. Dá para ligar de novo em Perfil → Privacidade.</p>
<p class="en">Stop receiving ${esc(what.en)}? You can turn it back on in Profile → Privacy.</p>
<form method="post" action="${esc(action)}"><button type="submit">Parar de receber · Unsubscribe</button></form>`))
  }
  if (req.method !== 'POST') return res.status(405).send(page('<h1>Método não permitido</h1>'))

  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || null
  const { error } = await supabaseAdmin.from('consents').insert({
    user_id: u, purpose: p, granted: false, policy_version: POLICY_VERSION, ip,
    user_agent: (req.headers['user-agent'] ?? '').slice(0, 500) || null,
  })
  // Conta já excluída (FK): não há mais o que descadastrar — também é "pronto".
  if (error && error.code !== '23503') {
    console.error('unsubscribe: falha ao gravar:', error.message)
    return res.status(500).send(page('<h1>Não deu certo agora</h1><p>Tente de novo em alguns minutos, ou desligue no app, em Perfil → Privacidade.</p><p class="en">Please try again in a few minutes, or turn it off in the app under Profile → Privacy.</p>'))
  }
  return res.status(200).send(page(`<h1>Pronto</h1><p>Você não vai mais receber ${esc(what.pt)}.</p><p class="en">You won't receive ${esc(what.en)} anymore.</p><p><a href="https://app.jesuscorner.app">Abrir o app · Open the app</a></p>`))
}
