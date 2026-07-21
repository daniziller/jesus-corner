// Versões bíblicas de domínio público disponíveis hoje — 1 por idioma. A
// versão é escolhida automaticamente pelo idioma da sessão (session.lang),
// sem seletor na UI ainda: com 1 opção por idioma, um seletor seria
// prematuro. Adicionar uma versão nova no futuro = nova entrada aqui +
// nova pasta em public/bible-text/ (gerada por scripts/build-bible-text.mjs).
export const BIBLE_VERSIONS = {
  en: {
    id: 'en-web',
    label: 'World English Bible',
    folder: 'en-web',
    attribution: null, // domínio público, sem exigência de atribuição
  },
  pt: {
    id: 'pt-almeida1911',
    label: 'Almeida 1911',
    folder: 'pt-almeida1911',
    // Exigido pela fonte (JFAAL, CC BY 3.0 Brasil) — citar exatamente como pedido.
    attribution: "As Escrituras em português são da JFAAL, Copyright © Marcos Cristiano Alves Ferreira. Setembro de 2024",
  },
}
