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
    subtitle: 'As origens, a aliança e a lei — os cinco primeiros livros da Bíblia, num estudo profundo e prático em 6 sessões, um por livro (Gênesis dividido em duas partes).',
    subtitleEn: 'Origins, covenant, and law — the first five books of the Bible, in a deep, practical 6-session study, one per book (Genesis split into two parts).',
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
          'O padrão criação → pecado → julgamento → graça se repete três vezes nesses capítulos. Onde você já viveu esse mesmo ciclo, e como a graça de Deus apareceu no fim dele?',
        ],
        reflectionQuestionsEn: [
          'Which of the "falls" narrated in Genesis 1–11 (Adam and Eve, Cain, the flood generation, Babel) most resembles a temptation you\'ve faced yourself?',
          'How does God\'s care for Noah, even in the middle of judgment, change how you see God dealing with a broken world?',
          'Genesis shows people trying to "make a name" for themselves on their own. Where have you been seeking recognition or security outside of God?',
          'The pattern of creation → sin → judgment → grace repeats three times across these chapters. Where have you lived that same cycle, and how did God\'s grace show up at the end of it?',
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
          'A aliança abraâmica promete bênção pras nações através de Israel. Como isso muda a forma como você entende seu próprio propósito dentro da história maior de Deus?',
        ],
        reflectionQuestionsEn: [
          'Abraham had to trust promises that would only be fulfilled after his own lifetime. What promise of God are you learning to trust even without seeing the result now?',
          'Jacob is transformed by decades of struggle and discipline until he becomes "Israel". What area of your life do you feel God is still shaping?',
          'Joseph chooses to forgive the brothers who sold him into slavery, understanding that God used evil for a greater good. Is there someone you need to forgive through that same lens?',
          'The Abrahamic covenant promises blessing for the nations through Israel. How does that change the way you understand your own purpose within God\'s bigger story?',
        ],
      },
      {
        id: 3,
        title: 'A Libertação',
        titleEn: 'Deliverance',
        passage: 'Êxodo',
        passageEn: 'Exodus',
        sections: [
          {
            key: 'historical',
            body: 'O Êxodo é o evento fundador da identidade de Israel, mas sua datação exata divide os estudiosos há mais de um século. A "data antiga" (~1446 a.C.) se apoia numa leitura literal de 1 Reis 6:1, que situa a construção do templo de Salomão 480 anos depois da saída do Egito. Já a "data tardia" (~1250 a.C.) associa o faraó opressor a Ramessés II e às "cidades de armazenamento", Pitom e Ramessés, mencionadas em Êxodo 1:11 — nomes que batem com projetos de construção reais desse faraó. Nenhum texto egípcio confirma o Êxodo diretamente (o que não surpreende: registros egípcios raramente documentavam derrotas ou fugas de mão de obra escrava), mas a estela de Merneptá (~1208 a.C.) já menciona "Israel" como um povo estabelecido em Canaã, o que estabelece um limite máximo pra quando o evento pode ter acontecido. Um detalhe notável: as dez pragas parecem atacar, uma a uma, divindades específicas do panteão egípcio — o Nilo tornado sangue confronta Hâpi, deus do rio; as trevas confrontam Rá, o deus-sol — sugerindo que o Êxodo é, no fundo, uma disputa entre o Deus de Israel e os deuses do Egito.',
            bodyEn: 'The Exodus is the founding event of Israel\'s identity, but its exact dating has divided scholars for over a century. The "early date" (~1446 BC) rests on a literal reading of 1 Kings 6:1, which places the building of Solomon\'s temple 480 years after the departure from Egypt. The "late date" (~1250 BC) ties the oppressive pharaoh to Ramesses II and to the "store-cities" of Pithom and Rameses mentioned in Exodus 1:11 — names that match real building projects of that pharaoh. No Egyptian text confirms the Exodus directly (unsurprising, since Egyptian records rarely documented defeats or the flight of enslaved labor), but the Merneptah Stele (~1208 BC) already mentions "Israel" as an established people in Canaan, setting an upper limit for when the event could have happened. One notable detail: the ten plagues seem to target, one by one, specific deities of the Egyptian pantheon — the Nile turned to blood confronts Hapi, god of the river; the darkness confronts Ra, the sun god — suggesting the Exodus is, at its core, a contest between the God of Israel and the gods of Egypt.',
          },
          {
            key: 'geographical',
            body: 'A rota exata do Êxodo é outro debate em aberto. O povo sai de Ramessés, passa por Sucote e Etã, e atravessa um corpo d\'água chamado "Yam Suph" — tradicionalmente traduzido "Mar Vermelho", mas que pode significar "Mar de Juncos", apontando talvez para um dos lagos amargos ou lagoas rasas do norte do istmo de Suez, e não o golfo mais profundo mais ao sul. Depois da travessia, o povo entra na península do Sinai, passando por Mara (onde as águas amargas são adoçadas) e Elim (com suas doze fontes e setenta palmeiras) antes de chegar ao deserto de Sim, onde recebe o maná pela primeira vez. O monte Sinai — também chamado Horebe — é tradicionalmente identificado com o Jebel Musa, no extremo sul da península, embora alguns estudiosos proponham localizações alternativas mais a leste, na Arábia, com base em referências a Sinai como estando "além" de Midiã em alguns textos bíblicos.',
            bodyEn: 'The exact route of the Exodus is another open debate. The people leave Rameses, pass through Succoth and Etham, and cross a body of water called "Yam Suph" — traditionally translated "Red Sea", but which could mean "Sea of Reeds", possibly pointing to one of the Bitter Lakes or shallow lagoons in the northern Suez isthmus rather than the deeper gulf further south. After the crossing, the people enter the Sinai peninsula, passing through Marah (where bitter water is sweetened) and Elim (with its twelve springs and seventy palm trees) before reaching the Desert of Sin, where manna appears for the first time. Mount Sinai — also called Horeb — is traditionally identified with Jebel Musa, at the southern tip of the peninsula, though some scholars propose alternative locations further east, in Arabia, based on references that place Sinai "beyond" Midian in some biblical texts.',
          },
          {
            key: 'theological',
            body: 'O nome revelado a Moisés na sarça — "Eu Sou o que Sou" (Êxodo 3:14) — não é apenas uma etiqueta, mas uma declaração da natureza autoexistente e fiel de Deus, e se torna o nome pessoal de Israel para Ele (YHWH) daí em diante. A Páscoa, instituída no capítulo 12, se torna o ritual fundador da identidade judaica, celebrado até hoje, e é diretamente reinterpretada no Novo Testamento: Paulo chama Jesus de "nosso Cordeiro pascal" (1 Coríntios 5:7). Os Dez Mandamentos seguem de perto a estrutura dos tratados de suserania do Antigo Oriente Médio — um rei poderoso estabelecendo termos com um povo vassalo — reforçando que a aliança do Sinai é, ao mesmo tempo, um ato de graça (o rei já libertou o povo) e um chamado à lealdade. E o livro termina não em guerra ou conquista, mas com a glória de Deus enchendo o Tabernáculo (Êxodo 40) — o objetivo final da libertação não era só sair da escravidão, mas Deus voltar a habitar no meio do seu povo, ecoando o Éden.',
            bodyEn: 'The name revealed to Moses at the burning bush — "I Am Who I Am" (Exodus 3:14) — isn\'t just a label, but a declaration of God\'s self-existent, faithful nature, and becomes Israel\'s personal name for him (YHWH) from that point on. Passover, instituted in chapter 12, becomes the founding ritual of Jewish identity, still celebrated today, and is directly reinterpreted in the New Testament: Paul calls Jesus "our Passover lamb" (1 Corinthians 5:7). The Ten Commandments closely follow the structure of Ancient Near Eastern suzerainty treaties — a powerful king setting terms with a vassal people — reinforcing that the Sinai covenant is, at once, an act of grace (the king has already freed the people) and a call to loyalty. And the book ends not with war or conquest, but with God\'s glory filling the Tabernacle (Exodus 40) — the ultimate goal of deliverance wasn\'t just leaving slavery, but God dwelling among his people again, echoing Eden.',
          },
        ],
        reflectionQuestions: [
          'As pragas atacavam, uma a uma, os deuses do Egito. Que "deuses" modernos — dinheiro, aprovação, controle — você já viu serem desmontados na sua própria vida?',
          'Deus se revela como "Eu Sou o que Sou" antes de pedir qualquer coisa a Moisés. O que muda quando você conhece o caráter de Deus antes de tentar obedecer a Ele?',
          'A Páscoa lembra o povo, ano após ano, do que Deus já fez por eles. Que "lembranças" ajudam você a não esquecer o que Deus fez na sua vida?',
          'O Êxodo termina com Deus habitando no meio do povo, não com uma vitória militar. Onde você tem buscado "vitórias" quando o que Deus realmente quer é estar perto de você?',
        ],
        reflectionQuestionsEn: [
          'The plagues targeted, one by one, the gods of Egypt. What modern "gods" — money, approval, control — have you seen dismantled in your own life?',
          'God reveals himself as "I Am Who I Am" before asking anything of Moses. What changes when you know God\'s character before trying to obey him?',
          'Passover reminds the people, year after year, of what God already did for them. What "reminders" help you not forget what God has done in your life?',
          'Exodus ends with God dwelling among the people, not a military victory. Where have you been chasing "victories" when what God actually wants is to be close to you?',
        ],
      },
      {
        id: 4,
        title: 'A Lei da Santidade',
        titleEn: 'The Law of Holiness',
        passage: 'Levítico',
        passageEn: 'Leviticus',
        sections: [
          {
            key: 'historical',
            body: 'Levítico não é uma narrativa: é quase inteiramente um manual entregue a Moisés no Sinai, num período de pouco mais de um mês (compare Êxodo 40:17 com Números 1:1). Boa parte de suas categorias — sacrifícios, pureza, impureza — têm paralelos parciais em textos rituais hititas e mesopotâmicos da mesma época, mas Levítico se distingue num ponto central: os sacrifícios israelitas nunca "alimentam" a divindade, como acontecia em outras religiões antigas (onde as oferendas literalmente supriam as necessidades físicas dos deuses); em vez disso, restauram uma relação quebrada entre um povo pecador e um Deus santo. O sacerdócio é restrito à linhagem de Arão, dentro da tribo de Levi — uma restrição hereditária que contrasta com sistemas sacerdotais mais abertos em culturas vizinhas — e o capítulo 16, sobre o Dia da Expiação, descreve o único momento do ano em que qualquer pessoa (o sumo sacerdote) podia entrar no Lugar Santíssimo, um ritual praticado, com adaptações, até hoje no judaísmo como Yom Kipur.',
            bodyEn: 'Leviticus isn\'t a narrative — it\'s almost entirely a manual given to Moses at Sinai, over a period of just over a month (compare Exodus 40:17 with Numbers 1:1). Many of its categories — sacrifice, purity, impurity — have partial parallels in Hittite and Mesopotamian ritual texts from the same era, but Leviticus stands apart on one central point: Israelite sacrifices never "feed" the deity, as happened in other ancient religions (where offerings literally supplied the gods\' physical needs); instead, they restore a broken relationship between a sinful people and a holy God. The priesthood is restricted to Aaron\'s line within the tribe of Levi — a hereditary restriction that contrasts with more open priestly systems in neighboring cultures — and chapter 16, on the Day of Atonement, describes the only moment of the year when anyone (the high priest) could enter the Most Holy Place, a ritual still practiced, with adaptations, today in Judaism as Yom Kippur.',
          },
          {
            key: 'geographical',
            body: 'Diferente de todos os outros livros do Pentateuco, Levítico não tem praticamente nenhum movimento geográfico — toda a ação acontece dentro do mesmo acampamento, ao pé do Sinai. Mas o livro tem sua própria "geografia", só que vertical, não horizontal: uma geografia da santidade. O acampamento se organiza em zonas de proximidade crescente com Deus — o povo na periferia, os levitas mais perto, os sacerdotes no pátio do Tabernáculo, e só o sumo sacerdote, uma vez por ano, no Lugar Santíssimo, onde repousa a Arca da Aliança. Essa estrutura espacial visualiza fisicamente a mensagem teológica do livro: a santidade de Deus exige aproximação cuidadosa, em camadas, não acesso irrestrito.',
            bodyEn: 'Unlike every other book of the Pentateuch, Leviticus has almost no geographical movement — the entire action happens within the same camp, at the foot of Sinai. But the book has its own "geography", only vertical rather than horizontal: a geography of holiness. The camp is organized in zones of increasing closeness to God — the people at the edge, the Levites closer in, the priests in the Tabernacle\'s courtyard, and only the high priest, once a year, in the Most Holy Place, where the Ark of the Covenant rests. That spatial structure physically visualizes the book\'s theological message: God\'s holiness demands careful, layered approach, not unrestricted access.',
          },
          {
            key: 'theological',
            body: '"Sejam santos, porque eu, o Senhor, o Deus de vocês, sou santo" (Levítico 19:2) é repetido ao longo do livro como seu tema central — e é citado quase literalmente por Pedro no Novo Testamento (1 Pedro 1:16), mostrando sua importância contínua para a igreja primitiva. É fácil ler Levítico como um livro frio e burocrático, mas em meio às leis rituais está Levítico 19:18 — "ame o seu próximo como a si mesmo" — que Jesus cita como o segundo maior mandamento (Mateus 22:39). Hebreus, no Novo Testamento, dedica vários capítulos a mostrar como todo o sistema sacrificial de Levítico apontava, o tempo todo, para um sacrifício definitivo e final em Cristo — não porque os sacrifícios de animais fossem inúteis, mas porque eles ensinavam ano após ano o alto custo real de lidar com o pecado, custo que só seria pago de verdade na cruz.',
            bodyEn: '"Be holy, because I, the Lord your God, am holy" (Leviticus 19:2) is repeated throughout the book as its central theme — and is quoted almost word for word by Peter in the New Testament (1 Peter 1:16), showing its ongoing importance for the early church. It\'s easy to read Leviticus as a cold, bureaucratic book, but tucked inside the ritual laws is Leviticus 19:18 — "love your neighbor as yourself" — which Jesus quotes as the second greatest commandment (Matthew 22:39). Hebrews, in the New Testament, spends several chapters showing how the entire sacrificial system of Leviticus pointed, all along, to one final, definitive sacrifice in Christ — not because the animal sacrifices were pointless, but because they taught, year after year, the real, high cost of dealing with sin — a cost only ever truly paid on the cross.',
          },
        ],
        reflectionQuestions: [
          'Levítico organiza o acampamento em camadas de proximidade com Deus. Como você tem cuidado da sua própria proximidade com Ele — não por medo, mas por reverência?',
          '"Sejam santos porque eu sou santo" não é sobre perfeição, mas sobre refletir o caráter de Deus. Que área da sua vida mais destoa desse chamado hoje?',
          'Em meio a tantas leis rituais, Levítico já continha "ame o seu próximo como a si mesmo". O que isso te ensina sobre onde encontrar o coração de Deus em meio a regras que parecem distantes?',
          'O sistema sacrificial mostrava, repetidas vezes, o custo real do pecado. Como isso muda sua gratidão pelo sacrifício único de Jesus?',
        ],
        reflectionQuestionsEn: [
          '"Be holy because I am holy" isn\'t about perfection, but about reflecting God\'s character. What area of your life feels most out of step with that call today?',
          'Leviticus organizes the camp in layers of closeness to God. How have you been tending to your own closeness to him — not out of fear, but out of reverence?',
          'Amid so many ritual laws, Leviticus already contained "love your neighbor as yourself". What does that teach you about finding God\'s heart inside rules that can feel distant?',
          'The sacrificial system showed, over and over, the real cost of sin. How does that change your gratitude for Jesus\' one-time sacrifice?',
        ],
      },
      {
        id: 5,
        title: 'A Peregrinação',
        titleEn: 'The Wandering',
        passage: 'Números',
        passageEn: 'Numbers',
        sections: [
          {
            key: 'historical',
            body: 'Números cobre cerca de 39 anos — praticamente uma geração inteira — entre a saída do Sinai e a chegada às planícies de Moabe, resultado direto da recusa do povo em confiar no relato dos doze espiais sobre Canaã (Números 13–14). É difícil rastrear arqueologicamente uma peregrinação nômade no deserto — o que é esperado, já que grupos em trânsito raramente deixam vestígios materiais duráveis —, mas alguns elementos do livro têm eco fora da Bíblia: a inscrição de Deir Alla, uma placa aramaica do século VIII a.C. encontrada na Jordânia, menciona um vidente chamado "Balaão, filho de Beor" — o mesmo nome do profeta contratado para amaldiçoar Israel em Números 22–24, um raro caso de confirmação extrabíblica de uma figura nomeada do Pentateuco. A serpente de bronze erguida por Moisés (Números 21) reaparece séculos depois em 2 Reis 18:4, quando o rei Ezequias a destrói por ter se tornado, ela mesma, objeto de idolatria — mostrando como símbolos sagrados podem ser corrompidos com o tempo.',
            bodyEn: 'Numbers covers roughly 39 years — practically an entire generation — between leaving Sinai and arriving at the plains of Moab, a direct result of the people\'s refusal to trust the twelve spies\' report on Canaan (Numbers 13–14). It\'s difficult to trace a nomadic wilderness journey archaeologically — unsurprising, since traveling groups rarely leave durable material remains — but some elements of the book echo outside the Bible: the Deir Alla inscription, an 8th-century BC Aramaic plaster text found in Jordan, mentions a seer named "Balaam, son of Beor" — the same name as the prophet hired to curse Israel in Numbers 22–24, a rare case of extra-biblical confirmation of a named figure from the Pentateuch. The bronze serpent raised by Moses (Numbers 21) resurfaces centuries later in 2 Kings 18:4, when King Hezekiah destroys it for having itself become an object of idol worship — showing how sacred symbols can be corrupted over time.',
          },
          {
            key: 'geographical',
            body: 'Cades-Barneia, no deserto de Parã, funciona como base por boa parte da peregrinação — segundo Deuteronômio 2:14, praticamente os 38 anos inteiros entre a rebelião dos espiais e a travessia final. Dali, o povo tenta e falha em entrar direto em Canaã pelo sul, sendo então forçado a contornar o território de Edom, que se recusa a deixá-los passar (Números 20:14–21), e o de Moabe, chegando finalmente à região de Basã, a leste do Jordão, onde derrotam os reis Seom e Ogue. O livro termina com o povo acampado nas planícies de Moabe, de frente para Jericó — a mesma posição de onde Deuteronômio será proferido.',
            bodyEn: 'Kadesh-Barnea, in the Desert of Paran, functions as a base for much of the wandering — according to Deuteronomy 2:14, practically the entire 38 years between the spies\' rebellion and the final crossing. From there, the people try and fail to enter Canaan directly from the south, and are then forced to go around the territory of Edom, which refuses to let them pass (Numbers 20:14–21), and of Moab, finally reaching the region of Bashan, east of the Jordan, where they defeat kings Sihon and Og. The book ends with the people camped on the plains of Moab, facing Jericho — the same position from which Deuteronomy will be delivered.',
          },
          {
            key: 'theological',
            body: 'A presença de Deus guiando o povo por nuvem de dia e fogo à noite (Números 9:15–23) atravessa o livro inteiro como lembrete visível e constante de que Israel nunca caminhou sozinho, mesmo em meio a décadas de fracasso. Paulo, no Novo Testamento, usa explicitamente os episódios de queixa e rebelião de Números como advertência para a igreja: "essas coisas aconteceram como exemplos para nós" (1 Coríntios 10:6-11). E a serpente de bronze — erguida para que quem olhasse para ela fosse curado da mordida das serpentes venenosas — se torna, na boca do próprio Jesus, uma imagem profética de si mesmo: "assim como Moisés levantou a serpente no deserto, assim também é necessário que o Filho do Homem seja levantado" (João 3:14-15).',
            bodyEn: 'God\'s presence guiding the people by cloud during the day and fire at night (Numbers 9:15–23) runs through the whole book as a visible, constant reminder that Israel never walked alone, even through decades of failure. Paul, in the New Testament, explicitly uses Numbers\' complaint and rebellion episodes as a warning to the church: "these things happened to them as examples" (1 Corinthians 10:6-11). And the bronze serpent — raised so that whoever looked at it would be healed of venomous snake bites — becomes, in Jesus\' own words, a prophetic image of himself: "just as Moses lifted up the snake in the wilderness, so the Son of Man must be lifted up" (John 3:14-15).',
          },
        ],
        reflectionQuestions: [
          'Uma geração inteira perdeu a Terra Prometida por murmuração repetida, não por um único pecado grave. Que reclamações recorrentes na sua vida podem estar revelando falta de confiança em Deus?',
          'Mesmo quando o povo falhava, a nuvem e o fogo nunca desapareciam. Como a fidelidade constante de Deus, mesmo em meio às suas próprias falhas, muda sua forma de se relacionar com Ele?',
          'A serpente de bronze, feita para curar, virou depois um ídolo que precisou ser destruído. Existe algo bom na sua vida que se tornou, sem querer, algo que você adora mais do que a Deus?',
          'Jesus usa a serpente levantada no deserto como imagem da cruz. O que essa conexão te ensina sobre olhar para Jesus quando você se sente "ferido" pelo pecado ou pela vida?',
        ],
        reflectionQuestionsEn: [
          'An entire generation lost the Promised Land through repeated complaining, not one single serious sin. What recurring complaints in your life might be revealing a lack of trust in God?',
          'Even when the people failed, the cloud and fire never disappeared. How does God\'s constant faithfulness, even in the middle of your own failures, change how you relate to him?',
          'The bronze serpent, made to heal, later became an idol that had to be destroyed. Is there something good in your life that has unintentionally become something you worship more than God?',
          'Jesus uses the serpent lifted up in the wilderness as an image of the cross. What does that connection teach you about looking to Jesus when you feel "wounded" by sin or by life?',
        ],
      },
      {
        id: 6,
        title: 'A Aliança Renovada',
        titleEn: 'The Renewed Covenant',
        passage: 'Deuteronômio',
        passageEn: 'Deuteronomy',
        sections: [
          {
            key: 'historical',
            body: '"Deuteronômio" vem do grego e significa "segunda lei", mas o livro não é uma lei nova — é a releitura da aliança do Sinai, apresentada por Moisés como um longo discurso de despedida à nova geração, décadas depois, na fronteira com Canaã. Sua estrutura segue de perto o modelo dos tratados de suserania hititas do segundo milênio a.C.: um preâmbulo identificando o rei suserano, um prólogo histórico relembrando o relacionamento passado, estipulações (as leis), instruções para depósito e leitura pública periódica do documento, e uma lista de bênçãos e maldições — cada um desses elementos aparece, na mesma ordem, em Deuteronômio. Alguns estudiosos associam ainda o "livro da lei" encontrado no templo durante a reforma do rei Josias (2 Reis 22, no século VII a.C.) a alguma forma de Deuteronômio, dado o impacto imediato e radical que sua leitura causou na reforma religiosa de Judá.',
            bodyEn: '"Deuteronomy" comes from the Greek and means "second law", but the book isn\'t a new law — it\'s a re-reading of the Sinai covenant, presented by Moses as a long farewell speech to the new generation, decades later, at the border of Canaan. Its structure closely follows the pattern of second-millennium-BC Hittite suzerainty treaties: a preamble identifying the suzerain king, a historical prologue recalling the past relationship, stipulations (the laws), instructions for storing and periodically reading the document publicly, and a list of blessings and curses — each of these elements appears, in the same order, in Deuteronomy. Some scholars also connect the "book of the law" found in the temple during King Josiah\'s reform (2 Kings 22, 7th century BC) to some form of Deuteronomy, given the immediate, radical impact its reading had on Judah\'s religious reform.',
          },
          {
            key: 'geographical',
            body: 'Todo o livro se passa num único cenário: as planícies de Moabe, do lado leste do rio Jordão, de frente para Jericó — o último acampamento de Israel antes de atravessar para a Terra Prometida, já sob a liderança de Josué. O ponto alto, literal e simbolicamente, é o monte Nebo (também chamado Pisga), de onde Moisés contempla toda a terra — Gileade, Dã, Naftali, Efraim, Manassés, Judá até o mar Mediterrâneo, o Neguebe e o vale do Jordão até Zoar (Deuteronômio 34:1-3) — sem poder atravessar. É uma vista real, ainda visitável hoje, e o contraste entre a amplitude da visão e a impossibilidade de entrar torna a cena um dos momentos mais comoventes de todo o Pentateuco.',
            bodyEn: 'The entire book takes place in a single setting: the plains of Moab, on the east side of the Jordan river, facing Jericho — Israel\'s last camp before crossing into the Promised Land, now under Joshua\'s leadership. The high point, literally and symbolically, is Mount Nebo (also called Pisgah), from which Moses views the whole land — Gilead, Dan, Naphtali, Ephraim, Manasseh, Judah all the way to the Mediterranean Sea, the Negev, and the Jordan valley as far as Zoar (Deuteronomy 34:1-3) — without being able to cross into it. It\'s a real view, still visitable today, and the contrast between the breadth of the vision and the impossibility of entering makes the scene one of the most moving in the whole Pentateuch.',
          },
          {
            key: 'theological',
            body: 'O "Shemá" (Deuteronômio 6:4-5 — "Ouve, Israel... amarás o Senhor teu Deus de todo o teu coração, de toda a tua alma e de todas as tuas forças") é, até hoje, a oração central do judaísmo, e Jesus a cita como o maior mandamento de toda a Lei (Marcos 12:29-30). Quando tentado no deserto, Jesus responde a cada uma das três tentações citando Deuteronômio (6:13, 6:16 e 8:3) — um eco literário deliberado: onde Israel falhou no deserto por 40 anos, Jesus, o verdadeiro Israel, permanece fiel em 40 dias. Deuteronômio também promete que Deus levantaria "um profeta como eu" (Deuteronômio 18:15), uma expectativa que o Novo Testamento aplica diretamente a Jesus (Atos 3:22). E o livro termina com um apelo simples e urgente, resumindo toda a mensagem do Pentateuco: "escolha a vida" (Deuteronômio 30:19).',
            bodyEn: 'The "Shema" (Deuteronomy 6:4-5 — "Hear, O Israel... you shall love the Lord your God with all your heart, with all your soul, and with all your strength") is, to this day, the central prayer of Judaism, and Jesus quotes it as the greatest commandment in the whole Law (Mark 12:29-30). When tempted in the wilderness, Jesus answers each of the three temptations by quoting Deuteronomy (6:13, 6:16, and 8:3) — a deliberate literary echo: where Israel failed in the wilderness for 40 years, Jesus, the true Israel, remains faithful for 40 days. Deuteronomy also promises that God would raise up "a prophet like me" (Deuteronomy 18:15), an expectation the New Testament applies directly to Jesus (Acts 3:22). And the book closes with a simple, urgent appeal that sums up the whole message of the Pentateuch: "choose life" (Deuteronomy 30:19).',
          },
        ],
        reflectionQuestions: [
          'Moisés passa o livro inteiro relembrando o que Deus já fez, antes de pedir obediência. Por que "lembrar" é tão importante pra sua própria fé continuar firme?',
          'Jesus resiste à tentação citando Deuteronômio — as mesmas palavras que Israel ouviu e não guardou. O que isso te ensina sobre conhecer a Palavra de Deus de cor, não só de leitura?',
          'Moisés vê a Terra Prometida de longe, mas nunca entra nela, e ainda assim é chamado fiel até o fim. Como isso desafia sua ideia de "sucesso" na fé?',
          '"Escolha a vida" resume todo o Pentateuco numa frase. Que escolha concreta essa frase te convida a fazer essa semana?',
        ],
        reflectionQuestionsEn: [
          'Moses spends the whole book recalling what God has already done, before asking for obedience. Why is "remembering" so important for your own faith to stay steady?',
          'Jesus resists temptation by quoting Deuteronomy — the same words Israel heard and didn\'t keep. What does that teach you about knowing God\'s word by heart, not just by reading?',
          'Moses sees the Promised Land from a distance but never enters it, and is still called faithful to the end. How does that challenge your idea of "success" in faith?',
          '"Choose life" sums up the whole Pentateuch in one phrase. What concrete choice does that phrase invite you to make this week?',
        ],
      },
    ],
  },
]
