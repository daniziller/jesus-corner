// Temas (39k bloco 6 / 39l) — agrupamentos por assunto, com as referências
// CONFERIDAS no texto real (script de verificação rodado à parte, não
// commitado: confirma que cada trecho abaixo existe de verdade no arquivo
// de texto e que o `term` de destaque aparece em pelo menos um versículo
// do trecho). Autoria própria — não existe esse dado em lugar nenhum do
// app hoje. Conjunto DELIBERADAMENTE modesto (5 temas) pra abrir com o
// pacote: cada um é um percurso real, específico, verificado — não uma
// lista genérica de palavras-chave. Crescer esse conjunto é trabalho de
// curadoria, não de código; a estrutura já suporta quantos temas quiser.
//
// `term` no nível do tema é só o destaque PADRÃO; uma passagem pode trazer
// o próprio `term` quando a conjugação muda de forma a ponto de a palavra-
// raiz não bater mais em toda passagem (ex: "criou" vs "criação" vs
// "criaste" — ver tema "A criação" abaixo). "thread"/"threadEn" descreve o
// PERCURSO do assunto no texto (regra da aba: "reúne, não interpreta") —
// nunca uma conclusão doutrinária.
export const THEMES = [
  {
    id: 'pastor',
    title: 'O bom pastor',
    titleEn: 'The good shepherd',
    keywords: ['pastor', 'ovelhas', 'rebanho', 'shepherd', 'sheep'],
    term: 'pastor',
    thread: 'Davi chama o Senhor de pastor em um salmo de confiança. Ezequiel registra a promessa de Deus de cuidar pessoalmente do rebanho que os maus pastores abandonaram. Jesus se apresenta como o bom pastor, que conhece as ovelhas e dá a vida por elas. Pedro e Apocalipse retomam a imagem — o Pastor que também é o Cordeiro.',
    threadEn: 'David calls the Lord his shepherd in a psalm of trust. Ezekiel records God\'s promise to personally care for the flock the bad shepherds abandoned. Jesus presents himself as the good shepherd, who knows the sheep and lays down his life for them. Peter and Revelation return to the image — the Shepherd who is also the Lamb.',
    aiScope: 'Deus como pastor: Salmo 23, a promessa de Ezequiel 34, Jesus como o bom pastor em João 10, e como essa imagem volta em 1 Pedro e Apocalipse.',
    aiScopeEn: 'God as shepherd: Psalm 23, the promise in Ezekiel 34, Jesus as the good shepherd in John 10, and how the image returns in 1 Peter and Revelation.',
    passages: [
      { book: 'Salmos', chStart: 23, verseStart: 1, chEnd: 23, verseEnd: 6 },
      { book: 'Ezequiel', chStart: 34, verseStart: 11, chEnd: 34, verseEnd: 16 },
      { book: 'João', chStart: 10, verseStart: 11, chEnd: 10, verseEnd: 16 },
      { book: '1 Pedro', chStart: 2, verseStart: 24, chEnd: 2, verseEnd: 25 },
      { book: 'Apocalipse', chStart: 7, verseStart: 15, chEnd: 7, verseEnd: 17 },
    ],
  },
  {
    id: 'perdao',
    title: 'Perdão',
    titleEn: 'Forgiveness',
    keywords: ['perdão', 'perdoar', 'forgiveness', 'forgive'],
    term: 'perdo',
    thread: 'Um salmo descreve o alívio de ser perdoado depois de confessar. No Pai-nosso, Jesus liga o perdão que a pessoa recebe ao perdão que oferece, e depois conta uma parábola sobre um servo que não perdoou como tinha sido perdoado. Paulo, em duas cartas, pede que a igreja perdoe uns aos outros como foi perdoada.',
    threadEn: 'A psalm describes the relief of being forgiven after confessing. In the Lord\'s Prayer, Jesus ties the forgiveness a person receives to the forgiveness they offer, then tells a parable about a servant who didn\'t forgive as he had been forgiven. Paul, in two letters, asks the church to forgive one another as they were forgiven.',
    aiScope: 'Perdão: o alívio do Salmo 32, o pedido de perdão no Pai-nosso, a parábola do servo que não perdoou, e o que Paulo escreve sobre perdoar uns aos outros.',
    aiScopeEn: 'Forgiveness: the relief of Psalm 32, the request for forgiveness in the Lord\'s Prayer, the parable of the unforgiving servant, and what Paul writes about forgiving one another.',
    passages: [
      { book: 'Salmos', chStart: 32, verseStart: 1, chEnd: 32, verseEnd: 5 },
      { book: 'Mateus', chStart: 6, verseStart: 9, chEnd: 6, verseEnd: 15 },
      { book: 'Mateus', chStart: 18, verseStart: 21, chEnd: 18, verseEnd: 35 },
      { book: 'Efésios', chStart: 4, verseStart: 31, chEnd: 4, verseEnd: 32 },
      { book: 'Colossenses', chStart: 3, verseStart: 12, chEnd: 3, verseEnd: 13 },
    ],
  },
  {
    id: 'nao-se-preocupe',
    title: 'Não se preocupe',
    titleEn: 'Do not worry',
    keywords: ['ansiedade', 'preocupação', 'confiança', 'worry', 'anxiety'],
    term: 'preocup',
    thread: 'Um salmo lembra que preocupar-se com o sustento é inútil diante do cuidado de Deus. No Sermão do Monte, Jesus repete quatro vezes "não se preocupem", olhando para os pássaros e os lírios do campo. Na casa de Marta, ele nomeia a preocupação diretamente. Paulo termina o mesmo raciocínio com uma instrução prática: oração no lugar da preocupação.',
    threadEn: 'A psalm notes that worrying about provision is pointless given God\'s care. In the Sermon on the Mount, Jesus repeats "do not worry" four times, pointing to the birds and the lilies. At Martha\'s house, he names the worry directly. Paul closes the same thread with a practical instruction: prayer in place of worry.',
    aiScope: 'Não se preocupar: o Salmo 127, o "não se preocupem" repetido no Sermão do Monte, a cena de Marta e Maria, e a instrução de Paulo em Filipenses.',
    aiScopeEn: 'Not worrying: Psalm 127, the repeated "do not worry" in the Sermon on the Mount, the Martha and Mary scene, and Paul\'s instruction in Philippians.',
    passages: [
      { book: 'Salmos', chStart: 127, verseStart: 1, chEnd: 127, verseEnd: 2 },
      { book: 'Mateus', chStart: 6, verseStart: 25, chEnd: 6, verseEnd: 34 },
      { book: 'Lucas', chStart: 12, verseStart: 22, chEnd: 12, verseEnd: 31 },
      { book: 'Filipenses', chStart: 4, verseStart: 6, chEnd: 4, verseEnd: 7 },
    ],
  },
  {
    id: 'criacao',
    title: 'A criação',
    titleEn: 'Creation',
    keywords: ['criação', 'criador', 'creation', 'creator'],
    term: 'cria',
    thread: 'Gênesis abre com Deus criando os céus e a terra, dia a dia. Um salmo diz que os próprios céus, sem palavras, anunciam essa obra. João e Colossenses recuam essa mesma criação até a Palavra/o Filho, por quem tudo foi feito. Apocalipse fecha o percurso com uma cena de adoração ao Criador.',
    threadEn: 'Genesis opens with God creating the heavens and the earth, day by day. A psalm says the heavens themselves, wordlessly, declare that work. John and Colossians trace that same creation back to the Word/the Son, through whom everything was made. Revelation closes the arc with a scene of worship to the Creator.',
    aiScope: 'A criação: Gênesis 1, o Salmo 19 sobre os céus, como João e Colossenses ligam a criação a Jesus, e a cena de adoração ao Criador em Apocalipse.',
    aiScopeEn: 'Creation: Genesis 1, Psalm 19 on the heavens, how John and Colossians tie creation to Jesus, and the worship scene to the Creator in Revelation.',
    passages: [
      { book: 'Gênesis', chStart: 1, verseStart: 1, chEnd: 1, verseEnd: 31, term: 'criou' },
      { book: 'Salmos', chStart: 19, verseStart: 1, chEnd: 19, verseEnd: 6, term: 'céus' },
      { book: 'João', chStart: 1, verseStart: 1, chEnd: 1, verseEnd: 5 },
      { book: 'Colossenses', chStart: 1, verseStart: 15, chEnd: 1, verseEnd: 17 },
      { book: 'Apocalipse', chStart: 4, verseStart: 8, chEnd: 4, verseEnd: 11 },
    ],
  },
  {
    id: 'luz',
    title: 'Luz',
    titleEn: 'Light',
    keywords: ['luz', 'light'],
    term: 'luz',
    thread: 'A luz é a primeira coisa que Deus chama à existência em Gênesis. Um salmo e um profeta usam a mesma imagem para falar de salvação em meio à escuridão. Jesus se chama a si mesmo de luz do mundo, e no Sermão do Monte chama seus ouvintes de luz também. Apocalipse termina com uma cidade que não precisa mais de sol nem lua.',
    threadEn: 'Light is the first thing God calls into existence in Genesis. A psalm and a prophet use the same image to speak of salvation amid darkness. Jesus calls himself the light of the world, and in the Sermon on the Mount calls his listeners light too. Revelation ends with a city that no longer needs sun or moon.',
    aiScope: 'A luz na Bíblia: a criação da luz em Gênesis, a imagem de luz em meio à escuridão nos profetas e salmos, Jesus como luz do mundo, e a cidade sem necessidade de sol em Apocalipse.',
    aiScopeEn: 'Light in the Bible: the creation of light in Genesis, the image of light amid darkness in the prophets and psalms, Jesus as the light of the world, and the city with no need of the sun in Revelation.',
    passages: [
      { book: 'Gênesis', chStart: 1, verseStart: 1, chEnd: 1, verseEnd: 5 },
      { book: 'Salmos', chStart: 27, verseStart: 1, chEnd: 27, verseEnd: 1 },
      { book: 'Isaías', chStart: 9, verseStart: 2, chEnd: 9, verseEnd: 2 },
      { book: 'Mateus', chStart: 5, verseStart: 14, chEnd: 5, verseEnd: 16 },
      { book: 'João', chStart: 8, verseStart: 12, chEnd: 8, verseEnd: 12 },
      { book: 'Apocalipse', chStart: 21, verseStart: 22, chEnd: 21, verseEnd: 24 },
    ],
  },
]

export function getThemeById(id) {
  return THEMES.find(th => th.id === id) ?? null
}
