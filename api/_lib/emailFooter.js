// Rodapé de contato (site, Instagram, e-mail) — igual em todo e-mail
// transacional (convite, confirmação de conta, resposta do admin,
// broadcast, convite de acesso grátis/desconto). Centralizado aqui pra
// trocar um link (ex: handle do Instagram) uma vez só, em vez de nos 5
// arquivos que montam email.
const LINK_STYLE = 'font-size:11px;font-weight:700;color:#9D4300;text-decoration:none;white-space:nowrap;'

// Um <p> com os 3 links separados por espaço, não uma <table> de células
// lado a lado — célula de tabela não reflui em tela estreita, então um
// endereço mais comprido (info@jesuscorner.app) ficava espremido até
// quebrar NO MEIO da palavra, cortando as 2 últimas letras pra linha de
// baixo. Texto corrido quebra nos espaços entre os links, nunca no meio
// de um deles (cada link também tem white-space:nowrap, por garantia).
export function emailFooterLinksHtml() {
  return `<p style="margin:20px 0 0;text-align:center;line-height:1.8;">
              <a href="https://app.jesuscorner.app" style="${LINK_STYLE}">app.jesuscorner.app</a>
              <span style="color:#D4D4D4;font-size:11px;"> &nbsp;·&nbsp; </span>
              <a href="https://www.instagram.com/jesuscorner.app/" style="${LINK_STYLE}">Instagram</a>
              <span style="color:#D4D4D4;font-size:11px;"> &nbsp;·&nbsp; </span>
              <a href="mailto:info@jesuscorner.app" style="${LINK_STYLE}">info@jesuscorner.app</a>
            </p>`
}
