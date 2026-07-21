// Versões bíblicas de domínio público / uso livre disponíveis hoje — uma
// lista por idioma (o português já tem 2, o inglês 1). A primeira da lista
// de cada idioma é a padrão. Quando um idioma só tem 1 opção, o seletor de
// versão não aparece na UI (ver BibleTextPanel em ReadingBlockView.jsx).
// Adicionar uma versão nova = nova entrada aqui + nova pasta em
// public/bible-text/ (gerada por scripts/build-bible-text.mjs).
export const BIBLE_VERSIONS = {
  en: [
    {
      id: 'en-web',
      label: 'World English Bible',
      folder: 'en-web',
      attribution: null, // domínio público, sem exigência de atribuição
    },
  ],
  pt: [
    {
      id: 'pt-almeida1911',
      label: 'Almeida 1911',
      folder: 'pt-almeida1911',
      // Exigido pela fonte (JFAAL, CC BY 3.0 Brasil) — citar exatamente como pedido.
      attribution: "As Escrituras em português são da JFAAL, Copyright © Marcos Cristiano Alves Ferreira. Setembro de 2024",
    },
    {
      id: 'pt-blivre',
      label: 'Bíblia Livre (BLIVRE)',
      folder: 'pt-blivre',
      // Exigido pela fonte (CC BY 3.0 Brasil) — sugestão de crédito do próprio projeto.
      attribution: "Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, sites.google.com/site/biblialivre. Licença Creative Commons Atribuição 3.0 Brasil.",
    },
  ],
}

export function findBibleVersion(id) {
  for (const versions of Object.values(BIBLE_VERSIONS)) {
    const found = versions.find(v => v.id === id)
    if (found) return found
  }
  return null
}
