// Versões bíblicas disponíveis hoje — uma lista por idioma. A primeira da
// lista de cada idioma é a padrão. Quando um idioma só tem 1 opção, o
// seletor de versão não aparece na UI (ver BibleTextPanel em
// ReadingBlockView.jsx). Adicionar uma versão nova = nova entrada aqui +
// nova pasta em public/bible-text/ (gerada por scripts/build-bible-text.mjs).
//
// NLT e NVT são versões licenciadas via API.Bible (rest.api.bible) — o
// texto de attribution abaixo é exatamente o retornado pelo campo
// "copyright" da API pra cada uma, exigido pela licença Tyndale House.
export const BIBLE_VERSIONS = {
  en: [
    {
      id: 'en-nlt',
      label: 'New Living Translation (NLT)',
      folder: 'en-nlt',
      attribution: 'Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. All rights reserved. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
    },
  ],
  pt: [
    {
      id: 'pt-nvt',
      label: 'Nova Versão Transformadora (NVT)',
      folder: 'pt-nvt',
      attribution: 'Bíblia Sagrada, Nova Versão Transformadora © 2016 por Editora Mundo Cristão. Copyright atribuído a Tyndale House Foundation, 2021. Todos os direitos reservados.',
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
