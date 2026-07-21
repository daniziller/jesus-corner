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
    subtitle: 'As origens, a aliança e a lei — os cinco primeiros livros da Bíblia, num estudo profundo e prático em 10 sessões, cada livro dividido por capítulos e principais histórias.',
    subtitleEn: 'Origins, covenant, and law — the first five books of the Bible, in a deep, practical 10-session study, each book split by chapters and its main stories.',
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
        passage: 'Êxodo 1–18',
        passageEn: 'Exodus 1–18',
        sections: [
          {
            key: 'historical',
            body: 'A escravidão de Israel no Egito e sua libertação são o evento fundador da identidade do povo, mas a datação exata do Êxodo divide os estudiosos há mais de um século. A "data antiga" (~1446 a.C.) se apoia numa leitura literal de 1 Reis 6:1, que situa a construção do templo de Salomão 480 anos depois da saída do Egito. Já a "data tardia" (~1250 a.C.) associa o faraó opressor a Ramessés II e às "cidades de armazenamento", Pitom e Ramessés, mencionadas em Êxodo 1:11 — nomes que batem com projetos de construção reais desse faraó. Nenhum texto egípcio confirma o Êxodo diretamente (o que não surpreende: registros egípcios raramente documentavam derrotas ou fugas de mão de obra escrava), mas a estela de Merneptá (~1208 a.C.) já menciona "Israel" como um povo estabelecido em Canaã, estabelecendo um limite máximo pra quando o evento pode ter acontecido. Um detalhe notável: as dez pragas parecem atacar, uma a uma, divindades específicas do panteão egípcio — o Nilo tornado sangue confronta Hâpi, deus do rio; as trevas confrontam Rá, o deus-sol — sugerindo que o Êxodo é, no fundo, uma disputa entre o Deus de Israel e os deuses do Egito.',
            bodyEn: 'Israel\'s slavery in Egypt and its deliverance is the founding event of the people\'s identity, but the exact dating of the Exodus has divided scholars for over a century. The "early date" (~1446 BC) rests on a literal reading of 1 Kings 6:1, which places the building of Solomon\'s temple 480 years after the departure from Egypt. The "late date" (~1250 BC) ties the oppressive pharaoh to Ramesses II and to the "store-cities" of Pithom and Rameses mentioned in Exodus 1:11 — names that match real building projects of that pharaoh. No Egyptian text confirms the Exodus directly (unsurprising, since Egyptian records rarely documented defeats or the flight of enslaved labor), but the Merneptah Stele (~1208 BC) already mentions "Israel" as an established people in Canaan, setting an upper limit for when the event could have happened. One notable detail: the ten plagues seem to target, one by one, specific deities of the Egyptian pantheon — the Nile turned to blood confronts Hapi, god of the river; the darkness confronts Ra, the sun god — suggesting the Exodus is, at its core, a contest between the God of Israel and the gods of Egypt.',
          },
          {
            key: 'geographical',
            body: 'A rota exata do Êxodo é outro debate em aberto. O povo sai de Ramessés, passa por Sucote e Etã, e atravessa um corpo d\'água chamado "Yam Suph" — tradicionalmente traduzido "Mar Vermelho", mas que pode significar "Mar de Juncos", apontando talvez para um dos lagos amargos ou lagoas rasas do norte do istmo de Suez, e não o golfo mais profundo mais ao sul. Depois da travessia, o povo entra na península do Sinai, passando por Mara (onde as águas amargas são adoçadas) e Elim (com suas doze fontes e setenta palmeiras) antes de chegar ao deserto de Sim, onde recebe o maná pela primeira vez — o trecho todo (capítulos 15–18) documenta a transição de um povo escravizado pra uma comunidade aprendendo, na prática, a depender de Deus dia após dia, antes mesmo de chegar ao Sinai.',
            bodyEn: 'The exact route of the Exodus is another open debate. The people leave Rameses, pass through Succoth and Etham, and cross a body of water called "Yam Suph" — traditionally translated "Red Sea", but which could mean "Sea of Reeds", possibly pointing to one of the Bitter Lakes or shallow lagoons in the northern Suez isthmus rather than the deeper gulf further south. After the crossing, the people enter the Sinai peninsula, passing through Marah (where bitter water is sweetened) and Elim (with its twelve springs and seventy palm trees) before reaching the Desert of Sin, where manna appears for the first time — this whole stretch (chapters 15–18) documents the transition of an enslaved people into a community learning, in practice, to depend on God day by day, even before reaching Sinai.',
          },
          {
            key: 'theological',
            body: 'O nome revelado a Moisés na sarça — "Eu Sou o que Sou" (Êxodo 3:14) — não é apenas uma etiqueta, mas uma declaração da natureza autoexistente e fiel de Deus, e se torna o nome pessoal de Israel para Ele (YHWH) daí em diante. A Páscoa, instituída no capítulo 12, se torna o ritual fundador da identidade judaica, celebrado até hoje, e é diretamente reinterpretada no Novo Testamento: Paulo chama Jesus de "nosso Cordeiro pascal" (1 Coríntios 5:7). No capítulo 18, o sogro de Moisés, Jetro, um sacerdote midianita — não israelita —, sugere um sistema de juízes pra dividir a carga da liderança, um lembrete de que a sabedoria prática de Deus às vezes chega através de gente de fora do povo da aliança.',
            bodyEn: 'The name revealed to Moses at the burning bush — "I Am Who I Am" (Exodus 3:14) — isn\'t just a label, but a declaration of God\'s self-existent, faithful nature, and becomes Israel\'s personal name for him (YHWH) from that point on. Passover, instituted in chapter 12, becomes the founding ritual of Jewish identity, still celebrated today, and is directly reinterpreted in the New Testament: Paul calls Jesus "our Passover lamb" (1 Corinthians 5:7). In chapter 18, Moses\' father-in-law Jethro, a Midianite priest — not an Israelite — suggests a system of judges to share the burden of leadership, a reminder that God\'s practical wisdom sometimes arrives through people outside the covenant community.',
          },
        ],
        reflectionQuestions: [
          'As pragas atacavam, uma a uma, os deuses do Egito. Que "deuses" modernos — dinheiro, aprovação, controle — você já viu serem desmontados na sua própria vida?',
          'Deus se revela como "Eu Sou o que Sou" antes de pedir qualquer coisa a Moisés. O que muda quando você conhece o caráter de Deus antes de tentar obedecer a Ele?',
          'A Páscoa lembra o povo, ano após ano, do que Deus já fez por eles. Que "lembranças" ajudam você a não esquecer o que Deus fez na sua vida?',
          'Moisés aceita o conselho prático de Jetro, um estrangeiro, sem orgulho. Você tem dificuldade de aceitar ajuda ou sabedoria de fora do seu círculo de fé?',
        ],
        reflectionQuestionsEn: [
          'The plagues targeted, one by one, the gods of Egypt. What modern "gods" — money, approval, control — have you seen dismantled in your own life?',
          'God reveals himself as "I Am Who I Am" before asking anything of Moses. What changes when you know God\'s character before trying to obey him?',
          'Passover reminds the people, year after year, of what God already did for them. What "reminders" help you not forget what God has done in your life?',
          'Moses accepts practical advice from Jethro, an outsider, without pride. Do you struggle to accept help or wisdom from outside your own circle of faith?',
        ],
      },
      {
        id: 4,
        title: 'A Aliança e o Tabernáculo',
        titleEn: 'Covenant and Tabernacle',
        passage: 'Êxodo 19–40',
        passageEn: 'Exodus 19–40',
        sections: [
          {
            key: 'historical',
            body: 'Os Dez Mandamentos (Êxodo 20) seguem de perto a estrutura dos "tratados de suserania" do Antigo Oriente Médio — documentos onde um rei poderoso estabelecia termos com um povo vassalo, geralmente abrindo com um breve histórico do relacionamento ("Eu sou o Senhor teu Deus, que te tirei da terra do Egito") antes de listar as obrigações. As instruções do Tabernáculo (capítulos 25–31) são extremamente detalhadas — medidas, materiais, cores —, um padrão que se repete em textos de construção de templos de outras culturas antigas, onde a precisão arquitetônica era vista como sinal de reverência à divindade. O episódio do bezerro de ouro (capítulo 32) tem paralelos culturais: touros e bezerros eram símbolos comuns de força e fertilidade divina em várias religiões cananeias e egípcias da época, o que ajuda a explicar por que essa, entre tantas opções, foi a imagem escolhida pelo povo.',
            bodyEn: 'The Ten Commandments (Exodus 20) closely follow the structure of Ancient Near Eastern "suzerainty treaties" — documents where a powerful king set terms with a vassal people, usually opening with a brief history of the relationship ("I am the Lord your God, who brought you out of the land of Egypt") before listing obligations. The Tabernacle instructions (chapters 25–31) are extremely detailed — measurements, materials, colors — a pattern echoed in temple-building texts from other ancient cultures, where architectural precision was seen as a sign of reverence toward the deity. The golden calf episode (chapter 32) has cultural parallels: bulls and calves were common symbols of strength and divine fertility across various Canaanite and Egyptian religions of the time, which helps explain why, among so many options, that was the image the people chose.',
          },
          {
            key: 'geographical',
            body: 'Tudo se passa num único lugar — o monte Sinai, também chamado Horebe, tradicionalmente identificado com o Jebel Musa, no extremo sul da península do Sinai, embora alguns estudiosos proponham localizações alternativas mais a leste, na Arábia. O Tabernáculo, construído ali, era desenhado justamente para não ficar fixo: uma "tenda do encontro" portátil, desmontável e remontável, feita pra viajar com o povo por todo o resto da peregrinação pelo deserto — o monte Sinai vira, literalmente, algo que o povo carrega consigo daquele momento em diante.',
            bodyEn: 'Everything happens in a single place — Mount Sinai, also called Horeb, traditionally identified with Jebel Musa, at the southern tip of the Sinai peninsula, though some scholars propose alternative locations further east, in Arabia. The Tabernacle, built there, was designed precisely to not stay fixed: a portable "tent of meeting", able to be taken apart and reassembled, made to travel with the people through the rest of their journey through the desert — Mount Sinai literally becomes something the people carry with them from that point on.',
          },
          {
            key: 'theological',
            body: 'Êxodo 19–40 tem uma estrutura clara: aliança e lei (19–24) → instruções do Tabernáculo (25–31) → a queda do bezerro de ouro (32–34) → construção do Tabernáculo (35–40). É uma estrutura em forma de "sanduíche": um fracasso grave (o bezerro de ouro) encaixado entre duas seções sobre o mesmo objetivo — Deus habitando no meio do povo —, mostrando que a graça de Deus não depende da perfeição do povo pra se cumprir. O livro termina não em guerra ou conquista, mas com a glória de Deus enchendo o Tabernáculo recém-concluído (Êxodo 40:34-38) — o objetivo final da libertação do Egito nunca foi só a liberdade em si, mas Deus voltar a habitar perto do seu povo, ecoando o Éden.',
            bodyEn: 'Exodus 19–40 has a clear structure: covenant and law (19–24) → Tabernacle instructions (25–31) → the golden calf (32–34) → building the Tabernacle (35–40). It\'s a "sandwich" structure: a serious failure (the golden calf) tucked between two sections about the same goal — God dwelling among the people — showing that God\'s grace doesn\'t depend on the people\'s perfection to be fulfilled. The book ends not with war or conquest, but with God\'s glory filling the newly finished Tabernacle (Exodus 40:34-38) — the ultimate goal of the deliverance from Egypt was never just freedom itself, but God dwelling close to his people again, echoing Eden.',
          },
        ],
        reflectionQuestions: [
          'Deus dá a Lei logo depois de já ter libertado o povo — a graça vem antes da obediência. Como isso muda a forma como você vive os "mandamentos" da sua fé hoje?',
          'O povo troca a presença de Deus por um ídolo visível e controlável assim que Moisés demora um pouco no monte. Onde você já trocou confiar em Deus por algo mais "palpável" e imediato?',
          'Mesmo depois do bezerro de ouro, Deus escolhe renovar a aliança em vez de abandonar o povo. Como essa graça muda a forma como você lida com suas próprias recaídas?',
          'O Êxodo termina com Deus habitando no meio do povo, não com uma vitória militar. Onde você tem buscado "vitórias" quando o que Deus realmente quer é estar perto de você?',
        ],
        reflectionQuestionsEn: [
          'God gives the Law right after already freeing the people — grace comes before obedience. How does that change the way you live out the "commands" of your faith today?',
          'The people trade God\'s presence for a visible, controllable idol the moment Moses takes a while on the mountain. Where have you traded trusting God for something more "tangible" and immediate?',
          'Even after the golden calf, God chooses to renew the covenant instead of abandoning the people. How does that grace change the way you deal with your own setbacks?',
          'Exodus ends with God dwelling among the people, not a military victory. Where have you been chasing "victories" when what God actually wants is to be close to you?',
        ],
      },
      {
        id: 5,
        title: 'Sacrifícios e Sacerdócio',
        titleEn: 'Sacrifice and Priesthood',
        passage: 'Levítico 1–10',
        passageEn: 'Leviticus 1–10',
        sections: [
          {
            key: 'historical',
            body: 'Os primeiros dez capítulos de Levítico detalham cinco tipos de sacrifício — holocausto, oferta de cereal, oferta de paz, oferta pelo pecado e oferta pela culpa — cada um com seu propósito e procedimento específico. Esse sistema tem paralelos parciais em textos rituais hititas e mesopotâmicos da mesma época, mas Levítico se distingue num ponto central: os sacrifícios israelitas nunca "alimentam" a divindade, como acontecia em outras religiões antigas (onde as oferendas literalmente supriam as necessidades físicas dos deuses); em vez disso, restauram uma relação quebrada entre um povo pecador e um Deus santo. A consagração de Arão e seus filhos (capítulos 8–9) segue um rito elaborado de sete dias, e o sacerdócio fica restrito à sua linhagem dentro da tribo de Levi — uma restrição hereditária que contrasta com sistemas sacerdotais mais abertos em culturas vizinhas.',
            bodyEn: 'The first ten chapters of Leviticus detail five types of sacrifice — burnt offering, grain offering, fellowship offering, sin offering, and guilt offering — each with its own purpose and specific procedure. This system has partial parallels in Hittite and Mesopotamian ritual texts from the same era, but Leviticus stands apart on one central point: Israelite sacrifices never "feed" the deity, as happened in other ancient religions (where offerings literally supplied the gods\' physical needs); instead, they restore a broken relationship between a sinful people and a holy God. The consecration of Aaron and his sons (chapters 8–9) follows an elaborate seven-day ritual, and the priesthood is restricted to his line within the tribe of Levi — a hereditary restriction that contrasts with more open priestly systems in neighboring cultures.',
          },
          {
            key: 'geographical',
            body: 'Toda a ação desses capítulos acontece num único ponto: o altar e a entrada do Tabernáculo, no centro do acampamento israelita ao pé do Sinai. É uma geografia extremamente concentrada — nenhum outro trecho do Pentateuco fica tão parado num único lugar —, o que reforça visualmente o propósito do texto: o altar é o ponto de contato entre um povo em movimento constante pelo deserto e um Deus que exige aproximação cuidadosa.',
            bodyEn: 'All the action in these chapters happens in a single spot: the altar and the entrance to the Tabernacle, at the center of the Israelite camp at the foot of Sinai. It\'s an extremely concentrated geography — no other stretch of the Pentateuch stays this still in one place — which visually reinforces the text\'s purpose: the altar is the point of contact between a people in constant motion through the desert and a God who requires careful approach.',
          },
          {
            key: 'theological',
            body: 'A alegria da consagração sacerdotal é interrompida abruptamente pela morte súbita de dois filhos de Arão, Nadabe e Abiú, por oferecerem "fogo estranho" diante do Senhor (Levítico 10:1-2) — um episódio chocante logo depois de tanta cerimônia cuidadosa, que serve de aviso solene: a aproximação a Deus tem que seguir os termos dEle, não os nossos, por mais bem-intencionados que pareçam. O sistema sacrificial como um todo, segundo o livro de Hebreus no Novo Testamento, nunca foi o fim em si mesmo, mas uma sombra apontando repetidamente pra um sacrifício definitivo e final em Cristo (Hebreus 10:1-4) — os sacrifícios de animais precisavam ser repetidos porque nenhum deles resolvia o problema do pecado de forma permanente.',
            bodyEn: 'The joy of the priestly consecration is abruptly interrupted by the sudden death of two of Aaron\'s sons, Nadab and Abihu, for offering "unauthorized fire" before the Lord (Leviticus 10:1-2) — a shocking episode right after so much careful ceremony, serving as a solemn warning: approaching God has to follow his terms, not ours, however well-intentioned they may seem. The sacrificial system as a whole, according to the book of Hebrews in the New Testament, was never the end in itself, but a shadow repeatedly pointing toward one final, definitive sacrifice in Christ (Hebrews 10:1-4) — the animal sacrifices had to be repeated because none of them permanently solved the problem of sin.',
          },
        ],
        reflectionQuestions: [
          'O sistema sacrificial mostra o quanto custava lidar com o pecado. O que isso revela sobre o sacrifício de Jesus, à luz do Novo Testamento?',
          'Nadabe e Abiú morrem por tentar adorar a Deus do seu próprio jeito, não do jeito que Ele pediu. Existe alguma área da sua fé onde você tem seguido seus próprios termos em vez dos de Deus?',
          'O altar era o único ponto de contato entre o povo e Deus no meio do deserto. Que "altares" — lugares, hábitos, momentos — têm sido esse ponto de contato na sua vida hoje?',
          'Os sacrifícios de animais tinham que ser repetidos sempre; o de Jesus, não. Como essa diferença muda sua forma de viver o perdão que já recebeu?',
        ],
        reflectionQuestionsEn: [
          'The sacrificial system shows how costly it was to deal with sin. What does that reveal about Jesus\' sacrifice, in light of the New Testament?',
          'Nadab and Abihu die for trying to worship God their own way, not the way he asked. Is there any area of your faith where you\'ve been following your own terms instead of God\'s?',
          'The altar was the one point of contact between the people and God in the middle of the desert. What "altars" — places, habits, moments — have been that point of contact in your life today?',
          'Animal sacrifices had to be repeated over and over; Jesus\' didn\'t. How does that difference change the way you live out the forgiveness you\'ve already received?',
        ],
      },
      {
        id: 6,
        title: 'Santidade e Festas',
        titleEn: 'Holiness and Festivals',
        passage: 'Levítico 11–27',
        passageEn: 'Leviticus 11–27',
        sections: [
          {
            key: 'historical',
            body: 'A extensa seção de leis de pureza (capítulos 11–15) — animais que podem ou não ser comidos, doenças de pele, fluxos corporais — deu origem a boa parte das leis alimentares (kashrut) ainda praticadas no judaísmo hoje. O capítulo 16, sobre o Dia da Expiação, descreve o único momento do ano em que o sumo sacerdote podia entrar no Lugar Santíssimo, ritual praticado, com adaptações, até hoje como Yom Kipur, a data mais sagrada do calendário judaico. O calendário de festas (capítulos 23–25) e, especialmente, a lei do jubileu — que a cada 50 anos devolvia terras à família original e libertava escravos hebreus — é um dos códigos legais mais radicais do Antigo Oriente Médio; não há evidência arqueológica clara de que o jubileu tenha sido implementado à risca na prática, mas seu ideal de "reinício" econômico periódico moldou profundamente a visão bíblica de justiça social.',
            bodyEn: 'The extensive section of purity laws (chapters 11–15) — animals that may or may not be eaten, skin diseases, bodily discharges — gave rise to much of the dietary law (kashrut) still practiced in Judaism today. Chapter 16, on the Day of Atonement, describes the only moment of the year when the high priest could enter the Most Holy Place, a ritual still practiced, with adaptations, today as Yom Kippur, the holiest date on the Jewish calendar. The festival calendar (chapters 23–25) and, especially, the law of the jubilee — which every 50 years returned land to its original family and freed Hebrew slaves — is one of the most radical legal codes in the Ancient Near East; there\'s no clear archaeological evidence the jubilee was ever literally implemented in practice, but its ideal of a periodic economic "reset" deeply shaped biblical thinking about social justice.',
          },
          {
            key: 'geographical',
            body: 'Diferente da primeira metade do livro, que se concentra no altar, esses capítulos tratam de fronteiras — entre puro e impuro, entre o povo e as nações vizinhas, entre trabalho e descanso (o sábado e o ano sabático), entre posse permanente e posse temporária da terra (o jubileu). É uma geografia menos física e mais social e temporal, mas que aponta pra frente: essas leis sobre terra e propriedade só fazem sentido plenamente quando o povo já estiver estabelecido em Canaã, o que ainda não aconteceu neste ponto da narrativa.',
            bodyEn: 'Unlike the first half of the book, which centers on the altar, these chapters deal with boundaries — between pure and impure, between the people and neighboring nations, between work and rest (the sabbath and the sabbatical year), between permanent and temporary possession of the land (the jubilee). It\'s a geography that\'s less physical and more social and temporal, but one that looks ahead: these laws about land and property only fully make sense once the people are settled in Canaan, which hasn\'t happened yet at this point in the narrative.',
          },
          {
            key: 'theological',
            body: '"Sejam santos, porque eu, o Senhor, o Deus de vocês, sou santo" (Levítico 19:2) é repetido ao longo dessa seção como tema central — e é citado quase literalmente por Pedro no Novo Testamento (1 Pedro 1:16). É fácil ler essas leis como frias e distantes, mas em meio a elas está Levítico 19:18 — "ame o seu próximo como a si mesmo" — que Jesus cita como o segundo maior mandamento (Mateus 22:39). O jubileu, por sua vez, ecoa profeticamente séculos depois: quando Jesus lê Isaías na sinagoga de Nazaré e anuncia "o ano aceitável do Senhor" (Lucas 4:18-19), ele está citando linguagem de jubileu — anunciando a si mesmo como o cumprimento definitivo desse "reinício" que a lei só conseguia simbolizar.',
            bodyEn: '"Be holy, because I, the Lord your God, am holy" (Leviticus 19:2) is repeated throughout this section as its central theme — and is quoted almost word for word by Peter in the New Testament (1 Peter 1:16). It\'s easy to read these laws as cold and distant, but tucked inside them is Leviticus 19:18 — "love your neighbor as yourself" — which Jesus quotes as the second greatest commandment (Matthew 22:39). The jubilee, in turn, echoes prophetically centuries later: when Jesus reads Isaiah in the synagogue at Nazareth and announces "the year of the Lord\'s favor" (Luke 4:18-19), he\'s quoting jubilee language — announcing himself as the ultimate fulfillment of the "reset" the law could only symbolize.',
          },
        ],
        reflectionQuestions: [
          '"Sejam santos porque eu sou santo" não é sobre perfeição, mas sobre refletir o caráter de Deus. Que área da sua vida mais destoa desse chamado hoje?',
          'Em meio a tantas leis rituais, Levítico já continha "ame o seu próximo como a si mesmo". O que isso te ensina sobre onde encontrar o coração de Deus em meio a regras que parecem distantes?',
          'O jubileu devolvia terras e liberdade a cada 50 anos — um "recomeço" garantido por lei. Que área da sua vida você sente que precisa desse tipo de recomeço agora?',
          'Jesus se anuncia como o cumprimento do jubileu. Como isso muda sua forma de enxergar a liberdade que você já tem em Cristo?',
        ],
        reflectionQuestionsEn: [
          '"Be holy because I am holy" isn\'t about perfection, but about reflecting God\'s character. What area of your life feels most out of step with that call today?',
          'Amid so many ritual laws, Leviticus already contained "love your neighbor as yourself". What does that teach you about finding God\'s heart inside rules that can feel distant?',
          'The jubilee restored land and freedom every 50 years — a legally guaranteed "fresh start". What area of your life do you feel needs that kind of fresh start right now?',
          'Jesus announces himself as the fulfillment of the jubilee. How does that change the way you see the freedom you already have in Christ?',
        ],
      },
      {
        id: 7,
        title: 'Rebelião no Deserto',
        titleEn: 'Rebellion in the Desert',
        passage: 'Números 1–19',
        passageEn: 'Numbers 1–19',
        sections: [
          {
            key: 'historical',
            body: 'O primeiro censo (capítulo 1) organiza Israel como um exército, contando apenas homens de 20 anos ou mais aptos pra guerra — um método padrão de recenseamento militar no Antigo Oriente Médio. Cada tribo recebe uma posição fixa em torno do Tabernáculo (capítulo 2), e os levitas assumem funções especiais de cuidado com os objetos sagrados (capítulos 3–4). O momento decisivo dessa primeira metade do livro é o relatório dos doze espiais enviados a Canaã (capítulos 13–14): dez trazem um relatório de medo, apenas Josué e Calebe defendem que o povo deveria confiar em Deus e avançar — uma divisão de 10 contra 2 que custa à geração inteira o direito de entrar na terra. A rebelião de Coré, Datã e Abirão (capítulo 16), um desafio direto à liderança de Moisés e Arão, termina de forma dramática com a terra se abrindo pra engolir os rebeldes — um dos episódios mais chocantes de todo o Pentateuco.',
            bodyEn: 'The first census (chapter 1) organizes Israel like an army, counting only men 20 years and older fit for war — a standard military census method in the Ancient Near East. Each tribe is given a fixed position around the Tabernacle (chapter 2), and the Levites take on special duties caring for the sacred objects (chapters 3–4). The decisive moment of this first half of the book is the report of the twelve spies sent into Canaan (chapters 13–14): ten bring back a fearful report, and only Joshua and Caleb argue the people should trust God and move forward — a 10-to-2 split that costs the entire generation their right to enter the land. The rebellion of Korah, Dathan, and Abiram (chapter 16), a direct challenge to the leadership of Moses and Aaron, ends dramatically with the ground opening up to swallow the rebels — one of the most shocking episodes in the whole Pentateuch.',
          },
          {
            key: 'geographical',
            body: 'O livro começa no mesmo lugar onde Levítico termina — o acampamento ao pé do Sinai —, mas logo o povo parte, guiado pela nuvem de Deus, rumo ao deserto de Parã, quase um ano depois de terem chegado ao Sinai (Números 10:11-12). É dali, de Cades-Barneia, que os espiais são enviados a Canaã — o mesmo Cades-Barneia que se tornará a base do povo por praticamente toda a peregrinação que ainda está por vir.',
            bodyEn: 'The book begins in the same place Leviticus ends — the camp at the foot of Sinai — but the people soon set out, guided by God\'s cloud, toward the Desert of Paran, almost a year after arriving at Sinai (Numbers 10:11-12). It\'s from there, from Kadesh-Barnea, that the spies are sent into Canaan — the same Kadesh-Barnea that will become the people\'s base for practically the entire wandering still to come.',
          },
          {
            key: 'theological',
            body: 'O padrão de queixa constante do povo — sobre comida, água, liderança — atravessa essa primeira metade do livro e prepara o terreno pra entender por que uma geração inteira perde a Terra Prometida: não por um único pecado grave, mas por uma incredulidade repetida e cultivada. A rebelião de Coré levanta uma pergunta teológica central: quem tem autoridade pra se aproximar de Deus, e em que condições? A resposta do texto — julgamento severo sobre quem tenta tomar essa autoridade por conta própria — reforça que a mediação sacerdotal estabelecida em Levítico não era um detalhe burocrático, mas parte de como Deus escolheu se relacionar com um povo pecador.',
            bodyEn: 'The pattern of constant complaining from the people — about food, water, leadership — runs through this first half of the book and sets up why an entire generation loses the Promised Land: not through one serious sin, but through repeated, cultivated unbelief. Korah\'s rebellion raises a central theological question: who has authority to approach God, and under what conditions? The text\'s answer — severe judgment on those who try to seize that authority for themselves — reinforces that the priestly mediation established in Leviticus wasn\'t a bureaucratic detail, but part of how God chose to relate to a sinful people.',
          },
        ],
        reflectionQuestions: [
          'Dez espiais viram gigantes; dois viram um Deus maior que os gigantes. O que determina se você olha pros seus "gigantes" com medo ou com fé?',
          'Uma geração inteira perde a promessa por murmuração repetida, não por um pecado único. Que reclamações recorrentes na sua vida podem estar revelando falta de confiança em Deus?',
          'Coré desafia a ordem que Deus estabeleceu, achando que merecia mais autoridade. Onde você já se pegou questionando o lugar que Deus te deu, em vez de confiar nele?',
          'Mesmo em meio a tanta rebelião, Deus continua guiando o povo por nuvem e fogo. Como a fidelidade constante de Deus, mesmo quando você falha, muda sua forma de se relacionar com Ele?',
        ],
        reflectionQuestionsEn: [
          'Ten spies saw giants; two saw a God bigger than the giants. What determines whether you look at your own "giants" with fear or with faith?',
          'An entire generation loses the promise through repeated complaining, not one single sin. What recurring complaints in your life might be revealing a lack of trust in God?',
          'Korah challenges the order God established, thinking he deserved more authority. Where have you caught yourself questioning the place God gave you, instead of trusting him?',
          'Even amid so much rebellion, God keeps guiding the people by cloud and fire. How does God\'s constant faithfulness, even when you fail, change how you relate to him?',
        ],
      },
      {
        id: 8,
        title: 'Rumo à Terra Prometida',
        titleEn: 'Toward the Promised Land',
        passage: 'Números 20–36',
        passageEn: 'Numbers 20–36',
        sections: [
          {
            key: 'historical',
            body: 'Depois da morte de Miriã e Arão, Moisés desobedece a Deus ao ferir a rocha em vez de falar a ela (capítulo 20) — um momento de frustração que lhe custará a entrada na Terra Prometida, mostrando que nem mesmo o maior líder do Pentateuco fica isento de consequências. A história de Balaão (capítulos 22–24), o profeta pagão contratado pelo rei moabita Balaque pra amaldiçoar Israel, tem um raro eco fora da Bíblia: a inscrição de Deir Alla, uma placa aramaica do século VIII a.C. encontrada na Jordânia, menciona um vidente chamado "Balaão, filho de Beor" — uma confirmação extrabíblica rara de uma figura nomeada do Pentateuco. A serpente de bronze erguida por Moisés (capítulo 21) reaparece séculos depois em 2 Reis 18:4, quando o rei Ezequias a destrói por ter se tornado, ela mesma, objeto de idolatria.',
            bodyEn: 'After the deaths of Miriam and Aaron, Moses disobeys God by striking the rock instead of speaking to it (chapter 20) — a moment of frustration that will cost him entry into the Promised Land, showing that not even the greatest leader of the Pentateuch is exempt from consequences. The story of Balaam (chapters 22–24), the pagan prophet hired by the Moabite king Balak to curse Israel, has a rare echo outside the Bible: the Deir Alla inscription, an 8th-century BC Aramaic plaster text found in Jordan, mentions a seer named "Balaam, son of Beor" — a rare extra-biblical confirmation of a named figure from the Pentateuch. The bronze serpent raised by Moses (chapter 21) resurfaces centuries later in 2 Kings 18:4, when King Hezekiah destroys it for having itself become an object of idol worship.',
          },
          {
            key: 'geographical',
            body: 'Depois de décadas baseado em Cades-Barneia, o povo finalmente se move: tenta passar pelo território de Edom, que se recusa a deixá-los atravessar (Números 20:14-21), forçando um desvio; derrota os reis Seom e Ogue na região de Basã, a leste do Jordão; e finalmente chega às planícies de Moabe, de frente para Jericó — a última parada antes da Terra Prometida, e o mesmo lugar de onde Deuteronômio será proferido.',
            bodyEn: 'After decades based at Kadesh-Barnea, the people finally move: they try to pass through the territory of Edom, which refuses to let them cross (Numbers 20:14-21), forcing a detour; they defeat kings Sihon and Og in the region of Bashan, east of the Jordan; and they finally reach the plains of Moab, facing Jericho — the last stop before the Promised Land, and the same place from which Deuteronomy will be delivered.',
          },
          {
            key: 'theological',
            body: 'Balaão tenta amaldiçoar Israel três vezes e, cada vez, só consegue abençoar o povo — uma demonstração poderosa de que nem mesmo profetas pagãos contratados por reis inimigos conseguem ir contra o que Deus já decidiu abençoar. A serpente de bronze — erguida pra que quem olhasse pra ela fosse curado da mordida das serpentes venenosas — se torna, na boca do próprio Jesus, uma imagem profética de si mesmo: "assim como Moisés levantou a serpente no deserto, assim também é necessário que o Filho do Homem seja levantado" (João 3:14-15). E o caso das filhas de Zelofeade (capítulo 27), que pedem — e recebem — o direito de herdar terra na ausência de irmãos homens, mostra a lei sendo ajustada com justiça diante de uma situação nova, um raro exemplo bíblico de reforma legal por petição direta do povo.',
            bodyEn: 'Balaam tries to curse Israel three times and, each time, can only bless the people — a powerful demonstration that not even pagan prophets hired by enemy kings can go against what God has already decided to bless. The bronze serpent — raised so that whoever looked at it would be healed of venomous snake bites — becomes, in Jesus\' own words, a prophetic image of himself: "just as Moses lifted up the snake in the wilderness, so the Son of Man must be lifted up" (John 3:14-15). And the case of Zelophehad\'s daughters (chapter 27), who ask for — and receive — the right to inherit land in the absence of brothers, shows the law being adjusted with justice in response to a new situation, a rare biblical example of legal reform through the people\'s own direct petition.',
          },
        ],
        reflectionQuestions: [
          'Mesmo Moisés, o maior líder do Pentateuco, sofre consequências por um momento de frustração. Isso muda como você pensa sobre suas próprias falhas debaixo de pressão?',
          'Balaão tenta amaldiçoar Israel e só consegue abençoar. Que situação na sua vida parecia uma ameaça, mas Deus transformou em bênção?',
          'Jesus usa a serpente levantada no deserto como imagem da cruz. O que essa conexão te ensina sobre olhar para Jesus quando você se sente "ferido" pelo pecado ou pela vida?',
          'As filhas de Zelofeade pedem justiça e são ouvidas por Deus. Existe algo que você sente que precisa pedir a Deus com a mesma coragem?',
        ],
        reflectionQuestionsEn: [
          'Even Moses, the greatest leader of the Pentateuch, suffers consequences for a moment of frustration. Does that change how you think about your own failures under pressure?',
          'Balaam tries to curse Israel and can only bless them. What situation in your life looked like a threat, but God turned into a blessing?',
          'Jesus uses the serpent lifted up in the wilderness as an image of the cross. What does that connection teach you about looking to Jesus when you feel "wounded" by sin or by life?',
          'Zelophehad\'s daughters ask for justice and are heard by God. Is there something you feel you need to ask God for with that same courage?',
        ],
      },
      {
        id: 9,
        title: 'O Chamado à Fidelidade',
        titleEn: 'The Call to Faithfulness',
        passage: 'Deuteronômio 1–11',
        passageEn: 'Deuteronomy 1–11',
        sections: [
          {
            key: 'historical',
            body: '"Deuteronômio" vem do grego e significa "segunda lei", mas o livro não é uma lei nova — é a releitura da aliança do Sinai, apresentada por Moisés como um longo discurso de despedida à nova geração, décadas depois, na fronteira com Canaã. Esses primeiros onze capítulos formam o "prólogo histórico" do livro — a parte inicial de um tratado de suserania do Antigo Oriente Médio, onde o rei relembrava o relacionamento passado com o povo vassalo antes de listar qualquer obrigação nova. É uma técnica retórica deliberada: antes de pedir obediência, Moisés garante que a nova geração — que não viveu o Egito nem o Sinai em primeira pessoa — conheça a própria história.',
            bodyEn: '"Deuteronomy" comes from the Greek and means "second law", but the book isn\'t a new law — it\'s a re-reading of the Sinai covenant, presented by Moses as a long farewell speech to the new generation, decades later, at the border of Canaan. These first eleven chapters form the book\'s "historical prologue" — the opening part of an Ancient Near Eastern suzerainty treaty, where the king would recall the past relationship with the vassal people before listing any new obligation. It\'s a deliberate rhetorical technique: before asking for obedience, Moses makes sure the new generation — who didn\'t experience Egypt or Sinai firsthand — knows their own history.',
          },
          {
            key: 'geographical',
            body: 'O discurso acontece nas planícies de Moabe, do lado leste do rio Jordão, de frente para Jericó, mas seu conteúdo é uma viagem no tempo: Moisés relembra Horebe (outro nome pro Sinai), Cades-Barneia, o território de Edom e Moabe, a derrota de Seom e Ogue em Basã — basicamente repassando toda a geografia de Números, mas agora como memória compartilhada, não como jornada em andamento.',
            bodyEn: 'The speech happens on the plains of Moab, on the east side of the Jordan river, facing Jericho, but its content is a journey through time: Moses recalls Horeb (another name for Sinai), Kadesh-Barnea, the territory of Edom and Moab, the defeat of Sihon and Og in Bashan — essentially retracing all of Numbers\' geography, but now as shared memory, not an ongoing journey.',
          },
          {
            key: 'theological',
            body: 'O "Shemá" (Deuteronômio 6:4-5 — "Ouve, Israel... amarás o Senhor teu Deus de todo o teu coração, de toda a tua alma e de todas as tuas forças") aparece nesse trecho e é, até hoje, a oração central do judaísmo; Jesus a cita como o maior mandamento de toda a Lei (Marcos 12:29-30). Quando tentado no deserto, Jesus responde à primeira tentação citando Deuteronômio 8:3 ("nem só de pão viverá o homem") — um versículo que, no contexto original, explica por que Deus deixou o povo passar fome no deserto antes de alimentá-lo com maná: pra ensinar que a dependência de Deus vem antes de qualquer necessidade física.',
            bodyEn: 'The "Shema" (Deuteronomy 6:4-5 — "Hear, O Israel... you shall love the Lord your God with all your heart, with all your soul, and with all your strength") appears in this section and is, to this day, the central prayer of Judaism; Jesus quotes it as the greatest commandment in the whole Law (Mark 12:29-30). When tempted in the wilderness, Jesus answers the first temptation by quoting Deuteronomy 8:3 ("man shall not live by bread alone") — a verse that, in its original context, explains why God let the people go hungry in the desert before feeding them with manna: to teach that dependence on God comes before any physical need.',
          },
        ],
        reflectionQuestions: [
          'Moisés passa capítulos inteiros relembrando o que Deus já fez, antes de pedir obediência. Por que "lembrar" é tão importante pra sua própria fé continuar firme?',
          'O Shemá pede amor a Deus de todo o coração, alma e força. Qual dessas três áreas você sente mais desafiada a entregar a Deus agora?',
          'Jesus responde à tentação citando um versículo sobre depender de Deus antes de qualquer necessidade física. Em que área você tem buscado suprir suas próprias necessidades antes de buscar a Deus?',
          'A nova geração precisa aprender uma história que não viveu em primeira pessoa. Que histórias de fé — suas ou de outros — você tem repassado adiante?',
        ],
        reflectionQuestionsEn: [
          'Moses spends whole chapters recalling what God has already done, before asking for obedience. Why is "remembering" so important for your own faith to stay steady?',
          'The Shema calls for loving God with all your heart, soul, and strength. Which of those three areas do you feel most challenged to surrender to God right now?',
          'Jesus responds to temptation by quoting a verse about depending on God before any physical need. In what area have you been trying to meet your own needs before seeking God?',
          'The new generation has to learn a history they didn\'t live firsthand. What stories of faith — yours or others\' — have you been passing on?',
        ],
      },
      {
        id: 10,
        title: 'A Lei e a Aliança Renovada',
        titleEn: 'The Law and the Renewed Covenant',
        passage: 'Deuteronômio 12–34',
        passageEn: 'Deuteronomy 12–34',
        sections: [
          {
            key: 'historical',
            body: 'Esses capítulos formam o restante da estrutura de tratado de suserania iniciada na primeira parte do livro: as estipulações (leis específicas para a vida em Canaã, capítulos 12–26), seguidas por instruções de depósito e leitura pública periódica do documento, e uma extensa lista de bênçãos e maldições (capítulos 27–30) — um formato quase idêntico aos tratados hititas do segundo milênio a.C. Alguns estudiosos associam o "livro da lei" encontrado no templo durante a reforma do rei Josias (2 Reis 22, século VII a.C.) a alguma forma de Deuteronômio, dado o impacto imediato e radical que sua leitura causou na reforma religiosa de Judá — uma reação que faz mais sentido se o texto redescoberto já continha esse chamado urgente à fidelidade exclusiva.',
            bodyEn: 'These chapters form the rest of the suzerainty-treaty structure begun in the book\'s first part: the stipulations (specific laws for life in Canaan, chapters 12–26), followed by instructions for storing and periodically reading the document publicly, and an extensive list of blessings and curses (chapters 27–30) — a format nearly identical to second-millennium-BC Hittite treaties. Some scholars connect the "book of the law" found in the temple during King Josiah\'s reform (2 Kings 22, 7th century BC) to some form of Deuteronomy, given the immediate, radical impact its reading had on Judah\'s religious reform — a reaction that makes more sense if the rediscovered text already contained this urgent call to exclusive faithfulness.',
          },
          {
            key: 'geographical',
            body: 'O ponto alto, literal e simbolicamente, é o monte Nebo (também chamado Pisga), de onde Moisés contempla toda a terra — Gileade, Dã, Naftali, Efraim, Manassés, Judá até o mar Mediterrâneo, o Neguebe e o vale do Jordão até Zoar (Deuteronômio 34:1-3) — sem poder atravessar. É uma vista real, ainda visitável hoje, e o contraste entre a amplitude da visão e a impossibilidade de entrar torna a cena um dos momentos mais comoventes de todo o Pentateuco.',
            bodyEn: 'The high point, literally and symbolically, is Mount Nebo (also called Pisgah), from which Moses views the whole land — Gilead, Dan, Naphtali, Ephraim, Manasseh, Judah all the way to the Mediterranean Sea, the Negev, and the Jordan valley as far as Zoar (Deuteronomy 34:1-3) — without being able to cross into it. It\'s a real view, still visitable today, and the contrast between the breadth of the vision and the impossibility of entering makes the scene one of the most moving in the whole Pentateuch.',
          },
          {
            key: 'theological',
            body: 'Deuteronômio promete que Deus levantaria "um profeta como eu" (Deuteronômio 18:15), uma expectativa que o Novo Testamento aplica diretamente a Jesus (Atos 3:22). O livro termina com um apelo simples e urgente, resumindo toda a sua própria mensagem: "escolha a vida" (Deuteronômio 30:19). E a morte de Moisés (capítulo 34) — que vê a terra de longe, entrega a liderança a Josué e morre fiel até o fim sem nunca receber a recompensa terrena da promessa — se torna um dos retratos mais claros de todo o Antigo Testamento sobre o que significa uma fé que não depende de ver o resultado final.',
            bodyEn: 'Deuteronomy promises that God would raise up "a prophet like me" (Deuteronomy 18:15), an expectation the New Testament applies directly to Jesus (Acts 3:22). The book closes with a simple, urgent appeal that sums up its own entire message: "choose life" (Deuteronomy 30:19). And Moses\' death (chapter 34) — seeing the land from a distance, handing leadership to Joshua, and dying faithful to the end without ever receiving the promise\'s earthly reward — becomes one of the clearest portraits in the whole Old Testament of what it means to have faith that doesn\'t depend on seeing the final result.',
          },
        ],
        reflectionQuestions: [
          'Moisés vê a Terra Prometida de longe, mas nunca entra nela, e ainda assim é chamado fiel até o fim. Como isso desafia sua ideia de "sucesso" na fé?',
          '"Escolha a vida" resume todo o Pentateuco numa frase. Que escolha concreta essa frase te convida a fazer essa semana?',
          'Deuteronômio promete um profeta como Moisés, cumprido em Jesus. Como isso muda sua forma de ler todo o Antigo Testamento — como uma história que aponta pra Cristo?',
          'Moisés passa a liderança a Josué antes de morrer, sem se apegar ao próprio papel. Existe algo que você precisa "passar adiante" em vez de segurar com as próprias mãos?',
        ],
        reflectionQuestionsEn: [
          'Moses sees the Promised Land from a distance but never enters it, and is still called faithful to the end. How does that challenge your idea of "success" in faith?',
          '"Choose life" sums up the whole Pentateuch in one phrase. What concrete choice does that phrase invite you to make this week?',
          'Deuteronomy promises a prophet like Moses, fulfilled in Jesus. How does that change the way you read the whole Old Testament — as a story pointing toward Christ?',
          'Moses hands leadership to Joshua before dying, without clinging to his own role. Is there something you need to "hand off" instead of holding onto with your own hands?',
        ],
      },
    ],
  },
]
