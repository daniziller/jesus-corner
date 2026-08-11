// Rodapé de contato (site, Instagram, e-mail) — igual em todo e-mail
// transacional (convite, confirmação de conta, resposta do admin,
// broadcast, convite de acesso grátis/desconto). Centralizado aqui pra
// trocar um link (ex: handle do Instagram) uma vez só, em vez de nos 5
// arquivos que montam email.
const LINK_STYLE = 'font-size:11px;font-weight:700;color:#9D4300;text-decoration:none;'
const SEP_STYLE = 'padding:0;color:#D4D4D4;font-size:11px;'

export function emailFooterLinksHtml() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 0;">
              <tr>
                <td style="padding:0 6px;"><a href="https://app.jesuscorner.app" style="${LINK_STYLE}">app.jesuscorner.app</a></td>
                <td style="${SEP_STYLE}">·</td>
                <td style="padding:0 6px;"><a href="https://www.instagram.com/jesuscorner.app/" style="${LINK_STYLE}">Instagram</a></td>
                <td style="${SEP_STYLE}">·</td>
                <td style="padding:0 6px;"><a href="mailto:info@jesuscorner.app" style="${LINK_STYLE}">info@jesuscorner.app</a></td>
              </tr>
            </table>`
}
