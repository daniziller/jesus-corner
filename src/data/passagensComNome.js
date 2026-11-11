// passagensComNome.js — passagens conhecidas pelo nome ("O filho pródigo"
// → Lucas 15:11-32), para a busca da aba Bíblia (handoff-biblia-52 §6.4):
// "Passagens mais procuradas" (B5), o grupo PASSAGENS e o filtro de mesmo
// nome (B6).
//
// PROPOSTA INICIAL, À ESPERA DE REVISÃO DA AUTORA: o app não tinha essa
// lista e ela não veio no pacote. É conteúdo curado — nomes pelos quais
// cada passagem costuma ser procurada, não títulos do texto bíblico — e
// vive só aqui: acrescentar, tirar ou renomear é editar este arquivo.
// Lista vazia = os três lugares da busca que a usam simplesmente somem.
//
// Cada passagem: nome · palavras alternativas (o que mais a pessoa pode
// digitar para achá-la) · livro (nome canônico em português) · início e
// fim (capítulo e versículo; versículo nulo = o capítulo inteiro).
// `destaque` marca as quatro de "Passagens mais procuradas". Em ordem
// canônica. As referências são conferidas contra a tabela de capítulos e
// versículos em scripts/test-busca.mjs.
const p = (nome, palavras, livro, capInicio, versInicio, capFim, versFim, destaque = false) => ({ nome, palavras, livro, capInicio, versInicio, capFim, versFim, destaque })

export const NAMED_PASSAGES = [
  p('A criação', ['no princípio', 'criação do mundo', 'adão e eva'], 'Gênesis', 1, null, 2, null),
  p('A arca de Noé', ['dilúvio', 'noé', 'arco-íris'], 'Gênesis', 6, null, 9, null),
  p('A travessia do mar Vermelho', ['mar vermelho', 'moisés abre o mar', 'êxodo do egito'], 'Êxodo', 14, null, 14, null),
  p('Os dez mandamentos', ['mandamentos', 'decálogo', 'tábuas da lei'], 'Êxodo', 20, 1, 20, 17),
  p('Seja forte e corajoso', ['coragem', 'forte e corajoso'], 'Josué', 1, 1, 1, 9),
  p('Davi e Golias', ['golias', 'gigante', 'davi'], '1 Samuel', 17, null, 17, null),
  p('O Senhor é o meu pastor', ['salmo 23', 'pastor', 'vale da sombra da morte'], 'Salmos', 23, null, 23, null, true),
  p('O abrigo do Altíssimo', ['salmo 91', 'esconderijo do altíssimo', 'proteção'], 'Salmos', 91, null, 91, null),
  p('A mulher virtuosa', ['mulher de valor', 'esposa exemplar', 'virtuosa'], 'Provérbios', 31, 10, 31, 31),
  p('Tudo tem o seu tempo', ['tempo para tudo', 'há tempo para tudo'], 'Eclesiastes', 3, 1, 3, 8),
  p('Renovar as forças', ['os que esperam no senhor', 'asas como águias', 'cansaço'], 'Isaías', 40, 28, 40, 31),
  p('O servo sofredor', ['servo do senhor', 'homem de dores'], 'Isaías', 53, null, 53, null),
  p('Daniel na cova dos leões', ['cova dos leões', 'leões', 'daniel'], 'Daniel', 6, null, 6, null),
  p('O sermão do monte', ['sermão da montanha', 'sermão do monte', 'monte'], 'Mateus', 5, null, 7, null, true),
  p('As bem-aventuranças', ['bem-aventurados', 'felizes os'], 'Mateus', 5, 3, 5, 12),
  p('O Pai-nosso', ['pai nosso', 'oração do senhor', 'oração dominical'], 'Mateus', 6, 9, 6, 13),
  p('Venham a mim', ['cansados e sobrecarregados', 'descanso', 'jugo suave'], 'Mateus', 11, 28, 11, 30),
  p('O semeador', ['parábola do semeador', 'semente', 'solo'], 'Mateus', 13, 1, 13, 23),
  p('A última ceia', ['santa ceia', 'ceia do senhor', 'páscoa'], 'Mateus', 26, 17, 26, 30),
  p('A grande comissão', ['ide', 'façam discípulos', 'missão'], 'Mateus', 28, 16, 28, 20),
  p('O nascimento de Jesus', ['natal', 'manjedoura', 'belém'], 'Lucas', 2, 1, 2, 20),
  p('O bom samaritano', ['samaritano', 'quem é o meu próximo'], 'Lucas', 10, 25, 10, 37),
  p('A ovelha perdida', ['cem ovelhas', 'ovelha', 'parábola da ovelha'], 'Lucas', 15, 1, 15, 7),
  p('O filho pródigo', ['filho perdido', 'pródigo', 'parábola do filho'], 'Lucas', 15, 11, 15, 32, true),
  p('Nascer de novo', ['nicodemos', 'novo nascimento'], 'João', 3, 1, 3, 21),
  p('O bom pastor', ['pastor', 'ovelhas', 'porta das ovelhas'], 'João', 10, 1, 10, 18),
  p('A ressurreição de Lázaro', ['lázaro', 'marta e maria'], 'João', 11, 1, 11, 44),
  p('A videira verdadeira', ['videira', 'ramos', 'permaneçam em mim'], 'João', 15, 1, 15, 17),
  p('Pentecostes', ['espírito santo', 'línguas de fogo'], 'Atos', 2, 1, 2, 13),
  p('A conversão de Saulo', ['saulo', 'paulo', 'caminho de damasco'], 'Atos', 9, 1, 9, 19),
  p('Nada nos separa do amor de Deus', ['mais que vencedores', 'amor de deus'], 'Romanos', 8, 31, 8, 39),
  p('O amor', ['hino ao amor', 'o amor é paciente', 'amor'], '1 Coríntios', 13, null, 13, null, true),
  p('O fruto do Espírito', ['frutos do espírito', 'fruto'], 'Gálatas', 5, 22, 5, 23),
  p('A armadura de Deus', ['armadura', 'batalha espiritual'], 'Efésios', 6, 10, 6, 18),
  p('A paz de Deus', ['ansiedade', 'não se preocupem', 'alegrem-se'], 'Filipenses', 4, 4, 4, 9),
  p('Os heróis da fé', ['galeria da fé', 'fé'], 'Hebreus', 11, null, 11, null),
]
