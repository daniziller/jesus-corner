// Estudos temáticos — conteúdo mais denso que as "curiosidades" da aba
// Leitura: cada estudo é dividido em sessões de ~35 min (contexto histórico,
// geográfico e teológico/literário + leitura da passagem + perguntas de
// reflexão). Pensado pra complementar o plano de leitura, não substituí-lo.

export const STUDIES = [
  {
    id: 'pentateuco',
    icon: 'Scroll',
    title: 'Pentateuco',
    titleEn: 'The Pentateuch',
    subtitle: 'As origens, a aliança e a lei — os cinco primeiros livros da Bíblia, num estudo profundo e prático em 4 sessões.',
    subtitleEn: 'Origins, covenant, and law — the first five books of the Bible, in a deep, practical 4-session study.',
    minutesPerSession: 35,
    sessions: [
      {
        id: 1,
        title: 'As Origens do Mundo',
        titleEn: 'The Origins of the World',
        passage: 'Gênesis 1–11',
        passageEn: 'Genesis 1–11',
        sections: [
          {
            key: 'historical',
            body: 'Gênesis 1–11 é conhecido como a "história primeva": cobre desde a criação até a Torre de Babel, antes do surgimento de Abraão. É tradicionalmente atribuído a Moisés, compilando tradições muito mais antigas transmitidas ao longo de gerações. O texto dialoga — e se contrapõe teologicamente — com outras narrativas do Antigo Oriente Médio, como o Enuma Elish (mito babilônico da criação) e a Epopeia de Gilgamesh (que traz um relato de dilúvio semelhante ao de Noé). Enquanto essas tradições vizinhas descrevem um panteão caótico de deuses rivais, Gênesis apresenta um único Deus soberano que cria com propósito e ordem. Tudo indica que o livro foi escrito, ou tomou sua forma final, durante ou logo após o período no Egito — um fundamento teológico essencial para um povo escravizado que precisava lembrar quem era seu Deus.',
            bodyEn: 'Genesis 1–11 is known as the "primeval history": it covers everything from creation to the Tower of Babel, before Abraham appears. It is traditionally attributed to Moses, compiling much older traditions passed down across generations. The text engages with — and theologically pushes back against — other Ancient Near Eastern narratives, like the Enuma Elish (a Babylonian creation myth) and the Epic of Gilgamesh (which includes a flood account similar to Noah\'s). While those neighboring traditions describe a chaotic pantheon of rival gods, Genesis presents a single sovereign God who creates with purpose and order. Everything suggests the book was written, or took its final shape, during or shortly after the time in Egypt — an essential theological foundation for an enslaved people who needed to remember who their God was.',
          },
          {
            key: 'geographical',
            body: 'A narrativa começa "em lugar nenhum" (antes da geografia existir), mas rapidamente se ancora na Mesopotâmia: o Jardim do Éden é descrito perto de quatro rios, incluindo o Tigre e o Eufrates (atual Iraque). O monte Ararate, onde a arca repousa, fica na atual Turquia oriental. A Torre de Babel é geralmente associada à Babilônia e seus zigurates — torres-templo cujos vestígios reais foram encontrados por arqueólogos na região, dando um pano de fundo físico à imagem bíblica.',
            bodyEn: 'The narrative begins "nowhere in particular" (before geography even exists), but quickly anchors itself in Mesopotamia: the Garden of Eden is described near four rivers, including the Tigris and Euphrates (modern-day Iraq). Mount Ararat, where the ark comes to rest, is located in eastern Turkey. The Tower of Babel is generally associated with Babylon and its ziggurats — temple-towers whose real remains archaeologists have found in the region, giving physical backdrop to the biblical image.',
          },
          {
            key: 'theological',
            body: 'Um padrão se repete três vezes nesses 11 capítulos: criação (ordem) → pecado humano (desordem) → julgamento → graça, com Deus preservando um remanescente (Adão e Eva, Caim, a geração do dilúvio). Esse ciclo prepara o leitor para entender toda a Bíblia sob essa mesma lente. O tema central da seção culmina em Babel: a humanidade tenta "fazer um nome" para si mesma construindo uma torre — exatamente quando, no capítulo seguinte, Deus promete fazer um nome grande para Abraão (Gênesis 12). É a virada que abre a segunda metade do livro.',
            bodyEn: 'A pattern repeats three times across these 11 chapters: creation (order) → human sin (disorder) → judgment → grace, with God preserving a remnant (Adam and Eve, Cain, the flood generation). This cycle prepares the reader to understand the whole Bible through that same lens. The section\'s central theme culminates at Babel: humanity tries to "make a name" for itself by building a tower — right when, in the very next chapter, God promises to make Abraham\'s name great (Genesis 12). It\'s the turning point that opens the second half of the book.',
          },
        ],
        reflectionQuestions: [
          'Qual das "quedas" narradas em Gênesis 1–11 (Adão e Eva, Caim, a geração do dilúvio, Babel) mais se parece com uma tentação que você já enfrentou?',
          'Como o cuidado de Deus com Noé, mesmo em meio ao julgamento, muda sua visão sobre como Deus lida com um mundo quebrado?',
          'Gênesis mostra pessoas tentando "fazer um nome" por conta própria. Onde você tem buscado reconhecimento ou segurança fora de Deus?',
        ],
        reflectionQuestionsEn: [
          'Which of the "falls" narrated in Genesis 1–11 (Adam and Eve, Cain, the flood generation, Babel) most resembles a temptation you\'ve faced yourself?',
          'How does God\'s care for Noah, even in the middle of judgment, change how you see God dealing with a broken world?',
          'Genesis shows people trying to "make a name" for themselves on their own. Where have you been seeking recognition or security outside of God?',
        ],
      },
      {
        id: 2,
        title: 'Os Patriarcas',
        titleEn: 'The Patriarchs',
        passage: 'Gênesis 12–50',
        passageEn: 'Genesis 12–50',
        sections: [
          {
            key: 'historical',
            body: 'O período patriarcal costuma ser datado entre 2000–1700 a.C. (Idade do Bronze Médio), embora seja difícil confirmar com precisão arqueológica, já que se trata de famílias nômades que deixam poucos vestígios materiais. Ainda assim, práticas culturais descritas no texto — adoção de herdeiro, contratos de casamento, tratados por juramento — coincidem com costumes documentados em tabuinhas cuneiformes de Nuzi e Mari, da mesma época, reforçando a plausibilidade do pano de fundo cultural. A ascensão de José ao poder no Egito tem paralelo com o período dos hicsos, um povo semita que governou parte do Egito entre aproximadamente 1650–1550 a.C. — o que ajudaria a explicar como um estrangeiro hebreu chegaria a um cargo de tanta influência.',
            bodyEn: 'The patriarchal period is usually dated between 2000–1700 BC (Middle Bronze Age), though it\'s hard to confirm with archaeological precision, since these were nomadic families that left few material traces. Still, cultural practices described in the text — heir adoption, marriage contracts, oath-based treaties — match customs documented in cuneiform tablets from Nuzi and Mari from the same era, reinforcing the plausibility of the cultural backdrop. Joseph\'s rise to power in Egypt parallels the Hyksos period, a Semitic people who ruled part of Egypt roughly 1650–1550 BC — which would help explain how a Hebrew foreigner could reach such an influential position.',
          },
          {
            key: 'geographical',
            body: 'Abraão viaja de Ur (sul da Mesopotâmia) até Harã (norte, na fronteira entre a atual Turquia e Síria) e dali para Canaã — uma jornada de mais de 1.500 km, percorrida em etapas ao longo de gerações. Locais-chave da narrativa incluem Siquém, Betel, Hebrom (onde fica a caverna de Macpela, comprada por Abraão como sepultura da família, ainda hoje um local venerado) e Berseba, no extremo sul de Canaã. José é levado ao Egito e vive principalmente na região de Gósen, no fértil delta do Nilo — o que explica por que toda a família se muda pra lá durante a fome.',
            bodyEn: 'Abraham travels from Ur (southern Mesopotamia) to Haran (north, on the border of modern Turkey and Syria) and from there to Canaan — a journey of over 1,500 km, covered in stages across generations. Key locations in the narrative include Shechem, Bethel, Hebron (home to the cave of Machpelah, bought by Abraham as the family burial site — still venerated today) and Beersheba, at the southern edge of Canaan. Joseph is taken to Egypt and lives mainly in the region of Goshen, in the fertile Nile delta — which explains why the whole family moves there during the famine.',
          },
          {
            key: 'theological',
            body: 'A "aliança abraâmica" (Gênesis 12, 15 e 17) é a espinha dorsal teológica de toda a Bíblia: terra, descendência e bênção para as nações — promessas que reaparecem em Êxodo, nos profetas e no Novo Testamento. O ciclo de José (Gênesis 37–50) funciona como uma ponte narrativa: explica como uma família de pastores se transforma numa nação inteira escravizada no Egito, preparando o cenário para o Êxodo. A frase de José aos irmãos — "vocês planejaram o mal contra mim, mas Deus o tornou em bem" (Gênesis 50:20) — resume o tema da soberania de Deus que atravessa todo o livro.',
            bodyEn: 'The "Abrahamic covenant" (Genesis 12, 15, and 17) is the theological backbone of the whole Bible: land, offspring, and blessing for the nations — promises that reappear in Exodus, in the prophets, and in the New Testament. The Joseph cycle (Genesis 37–50) works as a narrative bridge: it explains how a family of shepherds becomes an entire nation enslaved in Egypt, setting the stage for the Exodus. Joseph\'s words to his brothers — "you meant evil against me, but God meant it for good" (Genesis 50:20) — sum up the theme of God\'s sovereignty that runs through the whole book.',
          },
        ],
        reflectionQuestions: [
          'Abraão teve que confiar em promessas que só se cumpririam depois da sua própria vida. Que promessa de Deus você está aprendendo a confiar mesmo sem ver o resultado agora?',
          'Jacó é transformado por décadas de luta e disciplina até se tornar "Israel". Que área da sua vida você sente que Deus ainda está lapidando?',
          'José escolhe perdoar os irmãos que o venderam como escravo, entendendo que Deus usou o mal para um bem maior. Existe alguém que você precisa perdoar sob essa mesma ótica?',
        ],
        reflectionQuestionsEn: [
          'Abraham had to trust promises that would only be fulfilled after his own lifetime. What promise of God are you learning to trust even without seeing the result now?',
          'Jacob is transformed by decades of struggle and discipline until he becomes "Israel". What area of your life do you feel God is still shaping?',
          'Joseph chooses to forgive the brothers who sold him into slavery, understanding that God used evil for a greater good. Is there someone you need to forgive through that same lens?',
        ],
      },
      {
        id: 3,
        title: 'Libertação e Lei',
        titleEn: 'Deliverance and Law',
        passage: 'Êxodo e Levítico',
        passageEn: 'Exodus and Leviticus',
        sections: [
          {
            key: 'historical',
            body: 'Duas datas principais são debatidas pelos estudiosos para o Êxodo: a "data antiga" (~1446 a.C., baseada em 1 Reis 6:1) e a "data tardia" (~1250 a.C., ligada ao faraó Ramessés II e às cidades de armazenamento mencionadas em Êxodo 1:11). Nenhuma tem consenso arqueológico definitivo, mas ambas têm defensores sérios entre os estudiosos. Levítico não é uma narrativa, mas um manual: a maior parte é composta de instruções sacerdotais entregues no monte Sinai num período de cerca de um mês, mostrando como a santidade de Deus deveria moldar cada área da vida de um povo recém-liberto. O sistema sacrificial descrito tem paralelos parciais com práticas de outros povos do Antigo Oriente Médio, mas se distingue por um detalhe central: os sacrifícios não "alimentam" a divindade (como em outras religiões da época), e sim restauram o relacionamento entre um povo pecador e um Deus santo.',
            bodyEn: 'Scholars debate two main dates for the Exodus: the "early date" (~1446 BC, based on 1 Kings 6:1) and the "late date" (~1250 BC, tied to Pharaoh Ramesses II and the store-cities mentioned in Exodus 1:11). Neither has definitive archaeological consensus, but both have serious defenders among scholars. Leviticus isn\'t a narrative but a manual: most of it consists of priestly instructions delivered at Mount Sinai over about a month, showing how God\'s holiness was meant to shape every area of a newly freed people\'s life. The sacrificial system it describes has partial parallels in other Ancient Near Eastern peoples, but stands apart on one key point: the sacrifices don\'t "feed" the deity (as in other religions of the time) — they restore the relationship between a sinful people and a holy God.',
          },
          {
            key: 'geographical',
            body: 'A rota do Êxodo saiu de Ramessés (no delta do Nilo) até o mar Vermelho (ou "mar de Juncos", um debate de tradução ainda em aberto), atravessando-o rumo à península do Sinai. O monte Sinai (também chamado Horebe) é tradicionalmente identificado com o Jebel Musa, no sul da península, embora alguns estudiosos proponham localizações alternativas na Arábia. O Tabernáculo, construído no Sinai, era uma estrutura móvel — "a tenda do encontro" — desenhada para viajar junto com o povo durante toda a peregrinação pelo deserto.',
            bodyEn: 'The Exodus route went from Rameses (in the Nile delta) to the Red Sea (or "Sea of Reeds", a translation debate still open today), crossing it toward the Sinai peninsula. Mount Sinai (also called Horeb) is traditionally identified with Jebel Musa, in the southern peninsula, though some scholars propose alternative locations in Arabia. The Tabernacle, built at Sinai, was a portable structure — "the tent of meeting" — designed to travel with the people throughout their journey through the desert.',
          },
          {
            key: 'theological',
            body: 'Êxodo tem uma estrutura clara: libertação (caps. 1–18) → aliança e lei (19–24) → instruções do Tabernáculo (25–31) → a queda do bezerro de ouro (32–34) → construção do Tabernáculo (35–40) — do caos da escravidão à ordem da presença de Deus habitando no meio do povo. Levítico se conecta diretamente a esse arco: "Sejam santos, porque eu, o Senhor, o Deus de vocês, sou santo" (Levítico 19:2) é o tema central — a lei não é um conjunto arbitrário de regras, mas uma resposta à graça já recebida na libertação do Egito.',
            bodyEn: 'Exodus has a clear structure: deliverance (ch. 1–18) → covenant and law (19–24) → Tabernacle instructions (25–31) → the golden calf (32–34) → building the Tabernacle (35–40) — from the chaos of slavery to the order of God\'s presence dwelling among the people. Leviticus connects directly to that arc: "Be holy, because I, the Lord your God, am holy" (Leviticus 19:2) is the central theme — the law isn\'t an arbitrary set of rules, but a response to grace already received in the deliverance from Egypt.',
          },
        ],
        reflectionQuestions: [
          'Deus liberta o povo antes de dar a Lei — a graça vem antes da obediência. Como isso muda a forma como você vive os "mandamentos" da sua fé hoje?',
          'O sistema sacrificial mostra o quanto custava lidar com o pecado. O que isso revela sobre o sacrifício de Jesus, à luz do Novo Testamento?',
          '"Sejam santos, porque eu sou santo" é o coração de Levítico. Que área prática da sua vida essa frase desafia agora?',
        ],
        reflectionQuestionsEn: [
          'God frees the people before giving the Law — grace comes before obedience. How does that change the way you live out the "commands" of your faith today?',
          'The sacrificial system shows how costly it was to deal with sin. What does that reveal about Jesus\' sacrifice, in light of the New Testament?',
          '"Be holy, because I am holy" is the heart of Leviticus. What practical area of your life does that phrase challenge right now?',
        ],
      },
      {
        id: 4,
        title: 'Peregrinação e Aliança Renovada',
        titleEn: 'Wandering and Renewed Covenant',
        passage: 'Números e Deuteronômio',
        passageEn: 'Numbers and Deuteronomy',
        sections: [
          {
            key: 'historical',
            body: 'Números narra cerca de 39 anos de peregrinação no deserto — praticamente toda uma geração — resultado direto da incredulidade do povo diante do relatório dos espiais em Canaã (Números 13–14). Deuteronômio significa "segunda lei" (do grego), mas é na verdade uma releitura e renovação da aliança do Sinai, apresentada por Moisés como um discurso de despedida à nova geração, na fronteira com a Terra Prometida. Seu formato é muito próximo dos "tratados de suserania" hititas — documentos políticos do Antigo Oriente Médio que seguiam uma estrutura parecida (histórico, estipulações, bênçãos e maldições). Moisés morre no monte Nebo sem entrar em Canaã, um dos momentos mais marcantes de todo o Pentateuco, encerrando a era da geração do Êxodo.',
            bodyEn: 'Numbers narrates roughly 39 years of wandering in the desert — practically an entire generation — a direct result of the people\'s unbelief in the face of the spies\' report on Canaan (Numbers 13–14). Deuteronomy means "second law" (from the Greek), but it is actually a re-reading and renewal of the Sinai covenant, presented by Moses as a farewell speech to the new generation, at the border of the Promised Land. Its format closely resembles Hittite "suzerainty treaties" — Ancient Near Eastern political documents that followed a similar structure (history, stipulations, blessings and curses). Moses dies on Mount Nebo without entering Canaan, one of the most striking moments in the whole Pentateuch, closing out the era of the Exodus generation.',
          },
          {
            key: 'geographical',
            body: 'Cades-Barneia, no deserto de Parã, é o ponto de onde os espiais são enviados e onde o povo se recusa a entrar em Canaã — servindo de base por boa parte da peregrinação. A narrativa termina nas planícies de Moabe, do lado leste do rio Jordão, de frente para Jericó — o último acampamento antes da entrada na terra, já sob a liderança de Josué. O monte Nebo, de onde Moisés vê a Terra Prometida sem poder entrar, oferece uma vista real (ainda visitável hoje) sobre todo o vale do Jordão.',
            bodyEn: 'Kadesh-Barnea, in the Desert of Paran, is the point from which the spies are sent out and where the people refuse to enter Canaan — serving as a base for much of the wandering. The narrative ends on the plains of Moab, on the east side of the Jordan river, facing Jericho — the last camp before entering the land, now under Joshua\'s leadership. Mount Nebo, from which Moses sees the Promised Land without being able to enter it, offers a real view (still visitable today) over the whole Jordan valley.',
          },
          {
            key: 'theological',
            body: 'Deuteronômio funciona como o elo entre o Pentateuco e o restante da narrativa bíblica (de Josué a Reis, um conjunto que estudiosos chamam de "história deuteronomista") — seus temas de obediência, bênção e maldição, e fidelidade a um só Deus moldam a interpretação de toda a história de Israel que vem depois. O "Shemá" (Deuteronômio 6:4-5: "Ouve, Israel... amarás o Senhor teu Deus de todo o teu coração") é citado por Jesus como o maior mandamento (Marcos 12:29-30) — mostrando como o Pentateuco continua moldando a fé, séculos depois.',
            bodyEn: 'Deuteronomy works as the link between the Pentateuch and the rest of the biblical narrative (from Joshua to Kings, a collection scholars call the "Deuteronomistic history") — its themes of obedience, blessing and curse, and faithfulness to one God shape the interpretation of all of Israel\'s history that follows. The "Shema" (Deuteronomy 6:4-5: "Hear, O Israel... you shall love the Lord your God with all your heart") is quoted by Jesus as the greatest commandment (Mark 12:29-30) — showing how the Pentateuch keeps shaping faith, centuries later.',
          },
        ],
        reflectionQuestions: [
          'Uma geração inteira perdeu a Terra Prometida por incredulidade, não por um pecado moral grave. O que isso te ensina sobre o perigo de duvidar das promessas de Deus?',
          'Moisés não entra na terra, mas ainda assim termina fiel até o fim. Como isso muda sua forma de pensar sobre "sucesso" na sua caminhada de fé?',
          'O Shemá pede amor a Deus de todo o coração, alma e força. Qual dessas três áreas você sente mais desafiada a entregar a Deus agora?',
        ],
        reflectionQuestionsEn: [
          'An entire generation lost the Promised Land through unbelief, not a serious moral sin. What does that teach you about the danger of doubting God\'s promises?',
          'Moses doesn\'t enter the land, but still finishes faithful to the end. How does that change the way you think about "success" in your walk of faith?',
          'The Shema calls for loving God with all your heart, soul, and strength. Which of those three areas do you feel most challenged to surrender to God right now?',
        ],
      },
    ],
  },
]
