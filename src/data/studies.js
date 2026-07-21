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
  {
    id: 'cronologia',
    icon: 'Hourglass',
    title: 'Cronologia da Bíblia',
    titleEn: 'Bible Chronology',
    subtitle: 'Uma linha do tempo pela Bíblia inteira, dos patriarcas à igreja primitiva — as datas, lugares e evidências históricas por trás da narrativa bíblica, em 13 sessões.',
    subtitleEn: 'A timeline through the whole Bible, from the patriarchs to the early church — the dates, places, and historical evidence behind the biblical narrative, in 13 sessions.',
    sessions: [
      {
        id: 1,
        title: 'Das Origens aos Patriarcas',
        titleEn: 'From the Beginnings to the Patriarchs',
        passage: 'Criação até ~1800 a.C.',
        passageEn: 'Creation to ~1800 BC',
        sections: [
          {
            key: 'historical',
            body: 'A Bíblia não começa com datas fixas: as genealogias de Gênesis 1–11 seguem um padrão comum na literatura antiga do Oriente Médio, mais preocupado em mostrar continuidade e propósito do que em fornecer uma cronologia exata — por isso estudiosos evitam calcular uma data literal para a criação a partir delas. A cronologia bíblica começa a ganhar contornos mais firmes com Abraão, geralmente datado por volta de 2000–1800 a.C. (Idade do Bronze Médio). Embora seja impossível confirmar arqueologicamente uma família nômade específica, práticas culturais descritas no texto — adoção de herdeiro, contratos de casamento, tratados por juramento — coincidem com costumes documentados em tabuinhas cuneiformes de Nuzi e Mari, da mesma época, dando credibilidade histórica ao pano de fundo da narrativa.',
            bodyEn: 'The Bible doesn\'t open with fixed dates: the genealogies in Genesis 1–11 follow a pattern common in ancient Near Eastern literature, more concerned with showing continuity and purpose than providing an exact chronology — which is why scholars avoid calculating a literal date for creation from them. Biblical chronology starts to take firmer shape with Abraham, generally dated around 2000–1800 BC (Middle Bronze Age). While it\'s impossible to archaeologically confirm one specific nomadic family, cultural practices described in the text — heir adoption, marriage contracts, oath-based treaties — match customs documented in cuneiform tablets from Nuzi and Mari, from the same era, lending historical credibility to the narrative\'s backdrop.',
          },
          {
            key: 'geographical',
            body: 'A história sai do "Crescente Fértil" — a faixa de terra fértil que vai do golfo Pérsico, sobe pela Mesopotâmia, e desce até o Egito, contornando o deserto da Arábia. Abraão viaja de Ur (sul da Mesopotâmia) até Harã (norte) e dali para Canaã, uma jornada de mais de 1.500 km percorrida em etapas ao longo de gerações. É o primeiro grande deslocamento geográfico de toda a Bíblia, e estabelece Canaã — não a Mesopotâmia nem o Egito — como o centro geográfico de toda a história que vem depois.',
            bodyEn: 'The story sets out from the "Fertile Crescent" — the arc of fertile land running from the Persian Gulf, up through Mesopotamia, and down into Egypt, curving around the Arabian desert. Abraham travels from Ur (southern Mesopotamia) to Haran (north) and from there to Canaan, a journey of over 1,500 km covered in stages across generations. It\'s the first major geographical shift in the whole Bible, and establishes Canaan — not Mesopotamia or Egypt — as the geographic center of everything that follows.',
          },
          {
            key: 'theological',
            body: 'Antes de Abraão, a narrativa bíblica cobre a humanidade inteira; a partir dele, ela se estreita pra uma única família, através da qual Deus promete abençoar "todas as famílias da terra" (Gênesis 12:3) — o ponto de partida de toda a trama que se desenrola no resto das Escrituras. É uma cronologia que começa devagar, quase pessoal, e só depois se expande de novo: de uma família, pra uma nação, pra um reino, e por fim pra "todas as famílias da terra" de volta, através de Jesus.',
            bodyEn: 'Before Abraham, the biblical narrative covers all of humanity; from him on, it narrows to a single family, through whom God promises to bless "all the families of the earth" (Genesis 12:3) — the starting point of the whole plot that unfolds through the rest of Scripture. It\'s a chronology that starts slow, almost personal, and only later expands again: from a family, to a nation, to a kingdom, and finally back to "all the families of the earth" through Jesus.',
          },
        ],
        reflectionQuestions: [
          'A Bíblia leva capítulos inteiros antes mesmo de chegar em datas mais firmes. O que isso ensina sobre como Deus trabalha — mais devagar do que a gente gostaria, às vezes?',
          'A promessa a Abraão começa pequena (uma família) e termina enorme ("todas as famílias da terra"). Onde na sua vida Deus pode estar começando algo pequeno que um dia vai ficar grande?',
          'Abraão sai de tudo que conhecia sem saber exatamente pra onde ia. Que "saída" você sente que Deus está te chamando a dar hoje?',
          'A cronologia bíblica começa a fazer mais sentido a partir de Abraão. Como ter mais "ancoragem" histórica ou factual afeta sua fé — ajuda, atrapalha, ou não muda nada?',
        ],
        reflectionQuestionsEn: [
          'The Bible takes whole chapters before even reaching firmer dates. What does that teach about how God works — sometimes slower than we\'d like?',
          'The promise to Abraham starts small (one family) and ends enormous ("all the families of the earth"). Where in your life might God be starting something small that will one day grow huge?',
          'Abraham leaves everything he knew without knowing exactly where he was going. What "departure" do you feel God is calling you to make today?',
          'Biblical chronology starts making more sense from Abraham onward. How does having more historical or factual anchoring affect your faith — help, hinder, or not change anything?',
        ],
      },
      {
        id: 2,
        title: 'Egito e o Êxodo',
        titleEn: 'Egypt and the Exodus',
        passage: '~1800–1400 a.C.',
        passageEn: '~1800–1400 BC',
        sections: [
          {
            key: 'historical',
            body: 'Gênesis 15:13-16 já havia previsto que os descendentes de Abraão passariam 400 anos como estrangeiros escravizados numa terra que não era deles, antes de saírem "com muitos bens" — um número que Êxodo 12:40 confirma quase que como checklist cronológico cumprido. A ascensão de José ao poder no Egito coincide, na maioria das reconstruções, com o período dos hicsos, um povo semita que governou parte do Egito entre aproximadamente 1650–1550 a.C. — o que ajudaria a explicar como um estrangeiro hebreu chegaria a um cargo de tanta influência. A datação exata do próprio Êxodo segue dividida entre a "data antiga" (~1446 a.C., baseada em 1 Reis 6:1) e a "data tardia" (~1250 a.C., ligada a Ramessés II); a estela de Merneptá (~1208 a.C.) já registra "Israel" como povo estabelecido em Canaã, fixando um limite máximo pra quando o Êxodo teria que ter acontecido.',
            bodyEn: 'Genesis 15:13-16 had already predicted that Abraham\'s descendants would spend 400 years as enslaved foreigners in a land not their own, before leaving "with great possessions" — a number Exodus 12:40 confirms almost like a chronological checklist fulfilled. Joseph\'s rise to power in Egypt coincides, in most reconstructions, with the Hyksos period, a Semitic people who ruled part of Egypt roughly 1650–1550 BC — which would help explain how a Hebrew foreigner could reach such an influential position. The exact dating of the Exodus itself remains divided between the "early date" (~1446 BC, based on 1 Kings 6:1) and the "late date" (~1250 BC, tied to Ramesses II); the Merneptah Stele (~1208 BC) already records "Israel" as an established people in Canaan, setting an upper limit for when the Exodus would have had to happen.',
          },
          {
            key: 'geographical',
            body: 'O deslocamento vai do delta do Nilo, no Egito, até a península do Sinai, cruzando o mar Vermelho (ou "Mar de Juncos") no meio do caminho — e dali para quarenta anos de peregrinação pelo deserto antes de finalmente chegar às planícies de Moabe, na fronteira leste de Canaã.',
            bodyEn: 'The journey runs from the Nile delta in Egypt to the Sinai peninsula, crossing the Red Sea (or "Sea of Reeds") along the way — and from there into forty years of wilderness wandering before finally reaching the plains of Moab, on Canaan\'s eastern border.',
          },
          {
            key: 'theological',
            body: 'Os "400 anos" não são só um detalhe cronológico: são uma promessa profética específica sendo cumprida quase ao pé da letra, um padrão que se repete várias vezes na Bíblia — Deus anuncia um prazo, e a história, séculos depois, confirma exatamente esse prazo. A libertação do Egito se torna o evento de referência que todo o resto do Antigo Testamento vai citar como prova do caráter fiel de Deus, muito antes de qualquer outro milagre nacional acontecer.',
            bodyEn: 'The "400 years" aren\'t just a chronological detail: they\'re a specific prophetic promise being fulfilled almost to the letter, a pattern that repeats several times in the Bible — God announces a timeframe, and history, centuries later, confirms that exact timeframe. The deliverance from Egypt becomes the reference event that the rest of the Old Testament will cite as proof of God\'s faithful character, long before any other national miracle takes place.',
          },
        ],
        reflectionQuestions: [
          'Deus anuncia 400 anos de antemão, e a história cumpre exatamente esse prazo séculos depois. Que promessa de Deus você está esperando, sem saber exatamente quando ela vai se cumprir?',
          'O período mais duro da escravidão vem logo antes da libertação. Você já viveu algo parecido — um momento mais difícil bem antes de uma virada?',
          'A libertação do Egito vira a "prova" que o resto da Bíblia usa pra lembrar do caráter de Deus. Qual foi a sua "libertação do Egito" pessoal, que você usa como prova da fidelidade de Deus?',
          'Passam-se gerações inteiras entre a promessa a Abraão e o cumprimento no Êxodo. Isso muda como você pensa sobre promessas de Deus que ainda não viu se cumprirem na sua própria vida?',
        ],
        reflectionQuestionsEn: [
          'God announces 400 years in advance, and history fulfills that exact timeframe centuries later. What promise of God are you waiting on, without knowing exactly when it will be fulfilled?',
          'The hardest period of slavery comes right before the deliverance. Have you lived through something similar — a harder moment right before a turning point?',
          'The deliverance from Egypt becomes the "proof" the rest of the Bible uses to remember God\'s character. What was your own personal "deliverance from Egypt" that you use as proof of God\'s faithfulness?',
          'Whole generations pass between the promise to Abraham and its fulfillment in the Exodus. Does that change how you think about promises of God you haven\'t yet seen fulfilled in your own life?',
        ],
      },
      {
        id: 3,
        title: 'Conquista e Juízes',
        titleEn: 'Conquest and Judges',
        passage: '~1400–1050 a.C.',
        passageEn: '~1400–1050 BC',
        sections: [
          {
            key: 'historical',
            body: 'A conquista de Canaã sob Josué e o período seguinte, dos Juízes, cobrem juntos cerca de 300 anos — embora os "juízes" listados no livro provavelmente não governassem em sequência estrita um após o outro, e sim, em vários casos, sobre regiões diferentes ao mesmo tempo, o que explica por que a soma direta dos anos de cada juiz ultrapassaria o período disponível. A arqueologia da conquista é um dos temas mais debatidos da área: camadas de destruição em cidades como Hazor coincidem, pra muitos estudiosos, com o relato bíblico, enquanto outras cidades mencionadas (como Jericó) têm cronologia mais disputada. A já citada estela de Merneptá (~1208 a.C.) é a evidência mais sólida de que, àquela altura, "Israel" já existia como povo identificável em Canaã.',
            bodyEn: 'The conquest of Canaan under Joshua and the following period of the Judges together span roughly 300 years — though the judges listed in the book probably didn\'t rule in strict succession, one after another, but in several cases over different regions at the same time, which explains why simply adding up each judge\'s years would exceed the available timeframe. The archaeology of the conquest is one of the field\'s most debated topics: destruction layers in cities like Hazor line up, for many scholars, with the biblical account, while other mentioned cities (like Jericho) have more disputed chronology. The already-mentioned Merneptah Stele (~1208 BC) remains the strongest evidence that, by that point, "Israel" already existed as an identifiable people in Canaan.',
          },
          {
            key: 'geographical',
            body: 'A terra é dividida entre as doze tribos (Josué 13–21), e o centro religioso do povo se estabelece em Siló, no território de Efraim, onde o Tabernáculo permanece por praticamente todo o período dos Juízes — bem antes de Jerusalém se tornar o centro que conhecemos depois.',
            bodyEn: 'The land is divided among the twelve tribes (Joshua 13–21), and the people\'s religious center is established at Shiloh, in the territory of Ephraim, where the Tabernacle remains for practically the entire period of the Judges — long before Jerusalem becomes the center we know later.',
          },
          {
            key: 'theological',
            body: 'O livro de Juízes segue um ciclo que se repete pelo menos sete vezes: o povo se afasta de Deus → é oprimido por um inimigo → clama a Deus → Deus levanta um libertador (juiz) → segue-se um período de paz → o povo se afasta de novo. A frase que fecha o livro — "cada um fazia o que parecia certo aos seus próprios olhos" (Juízes 21:25) — resume o problema de fundo da era inteira e prepara silenciosamente o terreno pra pergunta que o próximo período vai responder: o povo precisa de um rei?',
            bodyEn: 'The book of Judges follows a cycle that repeats at least seven times: the people turn away from God → are oppressed by an enemy → cry out to God → God raises up a deliverer (judge) → a period of peace follows → the people turn away again. The line that closes the book — "everyone did what was right in their own eyes" (Judges 21:25) — sums up the whole era\'s underlying problem and quietly sets up the question the next period will answer: does the people need a king?',
          },
        ],
        reflectionQuestions: [
          'O ciclo de Juízes se repete sete vezes: afastamento, opressão, clamor, libertação, paz — e de novo. Você reconhece esse ciclo em alguma área da sua própria vida?',
          '"Cada um fazia o que parecia certo aos seus próprios olhos" resume a era dos Juízes. Onde isso ainda descreve bem a cultura ao seu redor — ou até você mesmo?',
          'Deus levanta libertadores inesperados (Gideão, um lavrador medroso; Sansão, um homem cheio de falhas) repetidas vezes. O que isso ensina sobre o tipo de pessoa que Deus costuma usar?',
          'O período dos Juízes prepara silenciosamente o terreno pra pedir um rei. Que "solução errada" você já buscou pra um problema que, no fundo, só Deus podia resolver?',
        ],
        reflectionQuestionsEn: [
          'The cycle in Judges repeats seven times: turning away, oppression, crying out, deliverance, peace — and again. Do you recognize that cycle in any area of your own life?',
          '"Everyone did what was right in their own eyes" sums up the era of the Judges. Where does that still describe the culture around you — or even yourself?',
          'God repeatedly raises up unlikely deliverers (Gideon, a fearful farmer; Samson, a deeply flawed man). What does that teach about the kind of person God tends to use?',
          'The period of the Judges quietly sets the stage for asking for a king. What "wrong solution" have you reached for, for a problem only God could really solve?',
        ],
      },
      {
        id: 4,
        title: 'O Reino Unido',
        titleEn: 'The United Kingdom',
        passage: '~1050–930 a.C.',
        passageEn: '~1050–930 BC',
        sections: [
          {
            key: 'historical',
            body: 'Saul se torna o primeiro rei de Israel por volta de 1050 a.C., seguido por Davi (~1010–970 a.C.) e Salomão (~970–930 a.C.). A existência histórica da dinastia davídica, antes contestada por parte da acadêmica, ganhou um respaldo importante em 1993, com a descoberta da Estela de Tel Dã — uma inscrição aramaica do século IX a.C. que menciona a "Casa de Davi" (bytdwd), a primeira referência extrabíblica conhecida ao rei Davi. O reinado de Salomão é marcado pela construção do Templo, datada por 1 Reis 6:1 em cerca de 966 a.C.; excavações em Meguido, Hazor e Gezer revelaram portões monumentais com um padrão arquitetônico quase idêntico entre si, que muitos arqueólogos associam justamente aos "projetos de construção" atribuídos a Salomão em 1 Reis 9:15.',
            bodyEn: 'Saul becomes Israel\'s first king around 1050 BC, followed by David (~1010–970 BC) and Solomon (~970–930 BC). The historical existence of the Davidic dynasty, once contested by part of academia, gained major support in 1993 with the discovery of the Tel Dan Stele — a 9th-century BC Aramaic inscription mentioning the "House of David" (bytdwd), the first known extra-biblical reference to King David. Solomon\'s reign is marked by the building of the Temple, dated by 1 Kings 6:1 to around 966 BC; excavations at Megiddo, Hazor, and Gezer uncovered monumental gates with an almost identical architectural pattern, which many archaeologists link precisely to the "building projects" attributed to Solomon in 1 Kings 9:15.',
          },
          {
            key: 'geographical',
            body: 'Jerusalém, até então uma cidade cananeia relativamente pequena (conquistada por Davi dos jebuseus, 2 Samuel 5), se torna a capital política e religiosa do reino unido, e permanece o centro simbólico de Israel até hoje. Sob Salomão, o território israelita atinge sua maior extensão de toda a história bíblica, com influência comercial e diplomática que chegava até territórios distantes, como sugere a visita da rainha de Sabá (1 Reis 10).',
            bodyEn: 'Jerusalem, until then a relatively small Canaanite city (conquered by David from the Jebusites, 2 Samuel 5), becomes the political and religious capital of the united kingdom, and remains Israel\'s symbolic center to this day. Under Solomon, Israelite territory reaches its greatest extent in all of biblical history, with commercial and diplomatic influence reaching distant lands, as suggested by the visit of the Queen of Sheba (1 Kings 10).',
          },
          {
            key: 'theological',
            body: 'A aliança que Deus faz com Davi (2 Samuel 7) promete que sua dinastia — seu "trono" — duraria pra sempre, uma promessa que parece, à primeira vista, ter sido quebrada quando o reino cai séculos depois. Mas é exatamente essa promessa que o Novo Testamento retoma pra apresentar Jesus como "filho de Davi" (Mateus 1:1) — o cumprimento definitivo de um trono que, de fato, nunca deixou de existir, só mudou de forma. O Templo de Salomão, por sua vez, é o ponto culminante de uma trajetória que começa na tenda móvel do Sinai: Deus, que uma vez habitou num santuário portátil no meio de um povo em trânsito, agora tem uma casa fixa, no coração da capital.',
            bodyEn: 'The covenant God makes with David (2 Samuel 7) promises his dynasty — his "throne" — would last forever, a promise that at first glance seems broken when the kingdom falls centuries later. But it\'s exactly that promise the New Testament picks back up to present Jesus as "son of David" (Matthew 1:1) — the ultimate fulfillment of a throne that, in fact, never stopped existing, it just changed form. Solomon\'s Temple, in turn, is the high point of a trajectory that begins with the portable tent at Sinai: God, who once dwelled in a mobile sanctuary among a traveling people, now has a fixed house, at the heart of the capital.',
          },
        ],
        reflectionQuestions: [
          'A dinastia de Davi parecia ter acabado, mas ressurge em Jesus séculos depois. Que promessa de Deus na sua vida parece "quebrada" hoje, mas pode só estar tomando uma forma diferente?',
          'O Templo de Salomão é o ápice de uma jornada que começou numa tenda simples no deserto. Como sua própria caminhada de fé cresceu desde onde começou?',
          'Davi é escolhido rei apesar de ser o mais novo e menos óbvio entre seus irmãos (1 Samuel 16). Onde você já foi subestimado, e como Deus pode estar te preparando mesmo assim?',
          'O reino de Salomão atinge seu auge material, mas ele próprio se afasta de Deus mais tarde na vida. O que isso ensina sobre a diferença entre sucesso e fidelidade?',
        ],
        reflectionQuestionsEn: [
          'David\'s dynasty seemed to have ended, but resurfaces in Jesus centuries later. What promise of God in your life seems "broken" today, but might just be taking a different shape?',
          'Solomon\'s Temple is the peak of a journey that began with a simple tent in the desert. How has your own walk of faith grown since where it started?',
          'David is chosen as king despite being the youngest and least obvious of his brothers (1 Samuel 16). Where have you been underestimated, and how might God be preparing you anyway?',
          'Solomon\'s kingdom reaches its material peak, but he himself drifts from God later in life. What does that teach about the difference between success and faithfulness?',
        ],
      },
      {
        id: 5,
        title: 'Os Profetas do Norte e a Queda de Israel',
        titleEn: 'The Northern Prophets and the Fall of Israel',
        passage: '~930–722 a.C.',
        passageEn: '~930–722 BC',
        sections: [
          {
            key: 'historical',
            body: 'Depois da divisão do reino, o Reino de Israel, no norte, atravessa quase dois séculos de instabilidade política — nove dinastias diferentes se revezam no trono em pouco mais de 200 anos, boa parte delas chegando ao poder por golpe. É nesse cenário caótico que surgem Elias e Eliseu, dois dos profetas mais marcantes do Antigo Testamento, atuando não através de livros escritos, mas de confrontos diretos com reis como Acabe e Jezabel — o duelo no monte Carmelo (1 Reis 18) é um dos episódios mais dramáticos de toda a Bíblia. Já os profetas escritores Amós e Oseias, ambos ativos no século VIII a.C., documentam por escrito a prosperidade superficial e a corrupção moral que precedem a queda do reino. Em 722 a.C., depois de um cerco de três anos, a Assíria conquista Samaria, capital do Reino de Israel — evento confirmado de forma independente pelos anais do rei assírio Sargão II, que registra a deportação de mais de 27 mil israelitas.',
            bodyEn: 'After the kingdom splits, the northern Kingdom of Israel goes through nearly two centuries of political instability — nine different dynasties take the throne in just over 200 years, many seizing power through coups. It\'s in this chaotic setting that Elijah and Elisha emerge, two of the Old Testament\'s most striking prophets, working not through written books but through direct confrontations with kings like Ahab and Jezebel — the showdown on Mount Carmel (1 Kings 18) is one of the most dramatic episodes in the whole Bible. The writing prophets Amos and Hosea, both active in the 8th century BC, meanwhile document in writing the surface-level prosperity and moral corruption that precede the kingdom\'s fall. In 722 BC, after a three-year siege, Assyria conquers Samaria, the capital of the Kingdom of Israel — an event independently confirmed by the annals of the Assyrian king Sargon II, which record the deportation of over 27,000 Israelites.',
          },
          {
            key: 'geographical',
            body: 'Samaria, fundada pelo rei Onri como nova capital (1 Reis 16:24), se torna o centro político do Reino de Israel; arqueólogos encontraram ali marfins luxuosos que confirmam a riqueza descrita em Amós 6:4 ("camas de marfim"). Depois da conquista assíria, a política de deportação em massa do império espalha os israelitas do norte por outras regiões e traz outros povos pra colonizar a área — o início do que depois se tornaria a população samaritana, misturada e rejeitada pelos judeus do sul.',
            bodyEn: 'Samaria, founded by King Omri as the new capital (1 Kings 16:24), becomes the Kingdom of Israel\'s political center; archaeologists found luxurious ivories there that confirm the wealth described in Amos 6:4 ("beds of ivory"). After the Assyrian conquest, the empire\'s mass-deportation policy scatters the northern Israelites across other regions and brings other peoples in to colonize the area — the beginning of what would later become the Samaritan population, mixed and rejected by the Jews of the south.',
          },
          {
            key: 'theological',
            body: 'O ministério de Elias termina de forma única na Bíblia: ele não morre, mas é levado ao céu num redemoinho (2 Reis 2:11) — um detalhe que o torna, séculos depois, a figura que aparece ao lado de Moisés na Transfiguração de Jesus (Mateus 17:3). Amós resume o problema teológico da era com uma frase dura: o povo buscava rituais religiosos enquanto ignorava a justiça social — "corra a justiça como águas" (Amós 5:24). A queda de Israel em 722 a.C. se torna, pro resto da Bíblia, o exemplo definitivo do que acontece quando um povo ignora repetidos avisos proféticos.',
            bodyEn: 'Elijah\'s ministry ends uniquely in the Bible: he doesn\'t die, but is taken up to heaven in a whirlwind (2 Kings 2:11) — a detail that makes him, centuries later, the figure who appears beside Moses at Jesus\' Transfiguration (Matthew 17:3). Amos sums up the era\'s theological problem in one harsh line: the people pursued religious ritual while ignoring social justice — "let justice roll on like a river" (Amos 5:24). Israel\'s fall in 722 BC becomes, for the rest of the Bible, the definitive example of what happens when a people ignores repeated prophetic warnings.',
          },
        ],
        reflectionQuestions: [
          'Elias enfrenta reis sozinho, mas depois cai em desânimo profundo (1 Reis 19). Você já viveu esse contraste — força pública seguida de exaustão privada?',
          'Amós denuncia um povo religioso por fora, mas injusto por dentro. Onde sua própria fé pode estar mais preocupada com aparência do que com justiça real?',
          'Nove dinastias em 200 anos mostram um reino instável desde a raiz. Que "instabilidade" na sua vida vem de decisões tomadas há muito tempo, não de um problema recente?',
          'A queda de Israel vira o "exemplo" que o resto da Bíblia usa como aviso. Que avisos repetidos você tem recebido, mas ainda não levou a sério?',
        ],
        reflectionQuestionsEn: [
          'Elijah confronts kings alone, but then falls into deep discouragement (1 Kings 19). Have you lived that same contrast — public strength followed by private exhaustion?',
          'Amos calls out a people religious on the outside but unjust on the inside. Where might your own faith be more concerned with appearance than real justice?',
          'Nine dynasties in 200 years show a kingdom unstable at its root. What "instability" in your life comes from decisions made long ago, not a recent problem?',
          'Israel\'s fall becomes the "example" the rest of the Bible uses as a warning. What repeated warnings have you received but still haven\'t taken seriously?',
        ],
      },
      {
        id: 6,
        title: 'Judá Sozinho: Reforma e Declínio',
        titleEn: 'Judah Alone: Reform and Decline',
        passage: '~722–586 a.C.',
        passageEn: '~722–586 BC',
        sections: [
          {
            key: 'historical',
            body: 'Com a queda de Israel, Judá segue sozinho como o único reino remanescente da linhagem davídica, por mais 136 anos. O profeta Isaías atua nesse período, aconselhando reis como Ezequias, cuja fé é testada quando a Assíria cerca Jerusalém em 701 a.C. — um cerco que, segundo o relato bíblico (2 Reis 19), termina sem a queda da cidade, um evento que os próprios anais assírios de Senaqueribe, de forma reveladora, nunca afirmam ter conquistado Jerusalém (apenas dizem tê-la "trancado como um pássaro numa gaiola"). Décadas depois, o rei Josias promove a maior reforma religiosa da história de Judá (2 Reis 22–23, ~622 a.C.), depois que um "livro da lei" — provavelmente alguma forma de Deuteronômio — é redescoberto no Templo durante uma reforma estrutural. Mas a reforma não é suficiente: o profeta Jeremias passa décadas alertando sobre a invasão babilônica que se aproxima, sendo perseguido e ignorado pela própria liderança de Judá.',
            bodyEn: 'With Israel\'s fall, Judah continues alone as the last remaining kingdom of the Davidic line, for another 136 years. The prophet Isaiah is active during this period, advising kings like Hezekiah, whose faith is tested when Assyria besieges Jerusalem in 701 BC — a siege that, according to the biblical account (2 Kings 19), ends without the city falling, an event the Assyrian annals of Sennacherib himself, tellingly, never claim to have conquered Jerusalem in (they only say they "shut it up like a bird in a cage"). Decades later, King Josiah leads the greatest religious reform in Judah\'s history (2 Kings 22–23, ~622 BC), after a "book of the law" — probably some form of Deuteronomy — is rediscovered in the Temple during structural repairs. But the reform isn\'t enough: the prophet Jeremiah spends decades warning about the approaching Babylonian invasion, persecuted and ignored by Judah\'s own leadership.',
          },
          {
            key: 'geographical',
            body: 'O túnel de Ezequias, escavado através da rocha sólida sob Jerusalém pra garantir acesso à água durante o cerco assírio, ainda existe hoje e pode ser percorrido por visitantes — uma das obras de engenharia mais impressionantes confirmadas arqueologicamente do Antigo Testamento, mencionada em 2 Reis 20:20.',
            bodyEn: 'Hezekiah\'s Tunnel, carved through solid rock beneath Jerusalem to secure a water supply during the Assyrian siege, still exists today and can be walked through by visitors — one of the most impressive engineering works from the Old Testament confirmed archaeologically, mentioned in 2 Kings 20:20.',
          },
          {
            key: 'theological',
            body: 'A oração de Ezequias diante da ameaça assíria (2 Reis 19:14-19) se torna um modelo de intercessão em meio à crise — ele literalmente estende a carta ameaçadora do inimigo diante de Deus no Templo. Já a descoberta do "livro da lei" sob Josias mostra como a Palavra de Deus, mesmo esquecida ou perdida por gerações, ainda tem poder de provocar reforma imediata quando redescoberta. Jeremias, por sua vez, personifica o peso de ser fiel a uma mensagem impopular: ele é chamado de "profeta chorão" por lamentar profundamente o julgamento que ele mesmo é forçado a anunciar.',
            bodyEn: 'Hezekiah\'s prayer in the face of the Assyrian threat (2 Kings 19:14-19) becomes a model of intercession in the middle of crisis — he literally spreads the enemy\'s threatening letter out before God in the Temple. The discovery of the "book of the law" under Josiah, meanwhile, shows how God\'s word, even forgotten or lost for generations, still has power to spark immediate reform once rediscovered. Jeremiah, in turn, embodies the weight of being faithful to an unpopular message: he\'s called the "weeping prophet" for deeply mourning the very judgment he\'s forced to announce.',
          },
        ],
        reflectionQuestions: [
          'Ezequias leva o problema literalmente pra dentro do templo, diante de Deus. Como você tem "estendido diante de Deus" as ameaças que enfrenta hoje?',
          'A reforma de Josias começa quando um livro esquecido é redescoberto. Que parte da Palavra de Deus você sente que redescobriu recentemente — ou precisa redescobrir?',
          'Jeremias é fiel a uma mensagem impopular, mesmo sendo perseguido por isso. Você já teve que dizer uma verdade difícil, sabendo que ninguém ia gostar de ouvir?',
          'Mesmo com bons reis como Ezequias e Josias, a reforma não impede a queda final de Judá. Isso muda como você pensa sobre "consertar" uma situação profundamente enraizada?',
        ],
        reflectionQuestionsEn: [
          'Hezekiah literally brings the problem into the temple, before God. How have you "spread out before God" the threats you\'re facing today?',
          'Josiah\'s reform begins when a forgotten book is rediscovered. What part of God\'s word do you feel you\'ve recently rediscovered — or need to?',
          'Jeremiah stays faithful to an unpopular message, even while persecuted for it. Have you ever had to speak a hard truth, knowing no one wanted to hear it?',
          'Even with good kings like Hezekiah and Josiah, reform doesn\'t stop Judah\'s eventual fall. Does that change how you think about "fixing" a deeply rooted situation?',
        ],
      },
      {
        id: 7,
        title: 'O Exílio Babilônico',
        titleEn: 'The Babylonian Exile',
        passage: '~605–538 a.C.',
        passageEn: '~605–538 BC',
        sections: [
          {
            key: 'historical',
            body: 'A queda de Judá aconteceu em etapas: uma primeira deportação em 605 a.C. (que inclui Daniel), uma segunda em 597 a.C. (que inclui Ezequiel), e a destruição final de Jerusalém e do Templo em 586 a.C. As Crônicas Babilônicas — registros administrativos do próprio império babilônico, preservados em tabuinhas cuneiformes — confirmam essas datas de forma independente, incluindo a data exata da queda de Jerusalém. O fim do exílio também tem confirmação arqueológica notável: o Cilindro de Ciro, descoberto em 1879, registra a política do rei persa Ciro de permitir que povos deportados voltassem às suas terras e reconstruíssem seus templos — a mesma política que Esdras 1 descreve como o decreto que libertou os judeus em 538 a.C.',
            bodyEn: 'Judah\'s fall happened in stages: a first deportation in 605 BC (which includes Daniel), a second in 597 BC (which includes Ezekiel), and the final destruction of Jerusalem and the Temple in 586 BC. The Babylonian Chronicles — administrative records from the Babylonian empire itself, preserved on cuneiform tablets — independently confirm these dates, including the exact date of Jerusalem\'s fall. The end of the exile also has notable archaeological confirmation: the Cyrus Cylinder, discovered in 1879, records the Persian king Cyrus\'s policy of allowing deported peoples to return to their lands and rebuild their temples — the same policy Ezra 1 describes as the decree that freed the Jews in 538 BC.',
          },
          {
            key: 'geographical',
            body: 'A elite de Judá é levada pra Babilônia, às margens do rio Quebar (onde Ezequiel recebe suas visões), a centenas de quilômetros de Jerusalém — a primeira vez que uma parte significativa do povo vive fora da Terra Prometida desde o Êxodo, mais de 800 anos antes.',
            bodyEn: 'Judah\'s elite is taken to Babylon, along the Chebar river (where Ezekiel receives his visions), hundreds of kilometers from Jerusalem — the first time a significant part of the people lives outside the Promised Land since the Exodus, over 800 years earlier.',
          },
          {
            key: 'theological',
            body: 'O exílio cumpre, quase ponto por ponto, as maldições da aliança anunciadas em Deuteronômio 28 séculos antes — mas os profetas do exílio, especialmente Jeremias, também anunciam um prazo específico de restauração: "setenta anos" (Jeremias 25:11-12; 29:10), um número que se cumpre com notável precisão entre a primeira deportação (605 a.C.) e a reconstrução do Templo (516 a.C.). Ezequiel, por sua vez, recebe visões que ensinam algo teologicamente revolucionário pra época: a presença de Deus não está presa ao Templo de Jerusalém — Ele pode estar presente até em terra estrangeira, no meio do seu povo exilado.',
            bodyEn: 'The exile fulfills, almost point by point, the covenant curses announced in Deuteronomy 28 centuries earlier — but the exile\'s prophets, especially Jeremiah, also announce a specific timeframe for restoration: "seventy years" (Jeremiah 25:11-12; 29:10), a number fulfilled with remarkable precision between the first deportation (605 BC) and the rebuilding of the Temple (516 BC). Ezekiel, meanwhile, receives visions that teach something theologically revolutionary for the time: God\'s presence isn\'t tied to the Jerusalem Temple — he can be present even in a foreign land, in the middle of his exiled people.',
          },
        ],
        reflectionQuestions: [
          'As "setenta anos" de Jeremias se cumprem com precisão notável. Que prazo ou promessa de Deus você está tentando confiar, mesmo sem saber a data exata?',
          'Ezequiel aprende que Deus está presente mesmo fora da "terra santa". Existe algum lugar ou situação na sua vida onde você duvida que Deus esteja presente?',
          'O exílio é consequência direta de avisos que vinham sendo dados havia séculos. Que avisos você tem ignorado, esperando que as consequências nunca cheguem?',
          'Mesmo no julgamento mais duro da história de Israel, Deus já tinha um plano de restauração anunciado. Como isso muda sua forma de encarar as piores fases da sua própria vida?',
        ],
        reflectionQuestionsEn: [
          'Jeremiah\'s "seventy years" are fulfilled with remarkable precision. What timeframe or promise of God are you trying to trust, even without knowing the exact date?',
          'Ezekiel learns that God is present even outside the "holy land". Is there a place or situation in your life where you doubt God is present?',
          'The exile is the direct consequence of warnings that had been given for centuries. What warnings have you been ignoring, hoping the consequences never arrive?',
          'Even in the harshest judgment in Israel\'s history, God had already announced a plan for restoration. How does that change how you face the worst seasons of your own life?',
        ],
      },
      {
        id: 8,
        title: 'Retorno e Período Persa',
        titleEn: 'Return and the Persian Period',
        passage: '~538–400 a.C.',
        passageEn: '~538–400 BC',
        sections: [
          {
            key: 'historical',
            body: 'O retorno acontece em pelo menos três levas: a primeira, liderada por Zorobabel logo após o decreto de Ciro (538 a.C.), reconstrói o altar e, eventualmente, o Templo, concluído em 516 a.C. — exatamente setenta anos após sua destruição, cumprindo a profecia de Jeremias quase ao dia. Décadas depois, Esdras lidera uma segunda leva focada na reforma religiosa (~458 a.C.), e Neemias uma terceira, focada na reconstrução dos muros de Jerusalém (~445 a.C.), concluída, segundo o próprio livro, em apenas 52 dias apesar de forte oposição. O livro de Ester se passa nesse mesmo período persa, mas geograficamente longe de Jerusalém, na capital Susa, durante o reinado de Xerxes I (~486–465 a.C.) — mostrando que a vida judaica continuava, e prosperava, mesmo fora da Terra Prometida.',
            bodyEn: 'The return happens in at least three waves: the first, led by Zerubbabel right after Cyrus\'s decree (538 BC), rebuilds the altar and, eventually, the Temple, completed in 516 BC — exactly seventy years after its destruction, fulfilling Jeremiah\'s prophecy almost to the day. Decades later, Ezra leads a second wave focused on religious reform (~458 BC), and Nehemiah a third, focused on rebuilding Jerusalem\'s walls (~445 BC), completed, according to the book itself, in just 52 days despite fierce opposition. The book of Esther takes place in this same Persian period, but geographically far from Jerusalem, in the capital Susa, during the reign of Xerxes I (~486–465 BC) — showing that Jewish life continued, and thrived, even outside the Promised Land.',
          },
          {
            key: 'geographical',
            body: 'O centro de gravidade da narrativa volta a ser Jerusalém, mas agora dentro de um império muito maior — o Império Persa, que se estendia da Índia até a Etiópia (Ester 1:1) —, o que explica por que boa parte da vida judaica da época acontecia na diáspora, espalhada por cidades como Susa e Babilônia, não apenas na terra natal.',
            bodyEn: 'The narrative\'s center of gravity returns to Jerusalem, but now within a much larger empire — the Persian Empire, which stretched from India to Ethiopia (Esther 1:1) — which explains why much of Jewish life at the time happened in the diaspora, spread across cities like Susa and Babylon, not just in the homeland.',
          },
          {
            key: 'theological',
            body: 'Ciro, um rei pagão que nunca adorou o Deus de Israel, é chamado pelo profeta Isaías de "ungido" do Senhor (Isaías 45:1) — escrito, segundo a maioria dos estudiosos, mais de um século antes do nascimento de Ciro —, um lembrete impressionante de que a soberania de Deus se estende sobre impérios inteiros, não só sobre o povo da aliança. O livro de Ester, por sua vez, é o único livro do Antigo Testamento que nunca menciona o nome de Deus diretamente, mas mesmo assim narra uma providência divina evidente por trás de "coincidências" — uma forma diferente de mostrar a mesma verdade dos outros livros históricos.',
            bodyEn: 'Cyrus, a pagan king who never worshiped the God of Israel, is called the Lord\'s "anointed" by the prophet Isaiah (Isaiah 45:1) — written, according to most scholars, over a century before Cyrus was born — a striking reminder that God\'s sovereignty extends over entire empires, not just over the covenant people. The book of Esther, in turn, is the only Old Testament book that never mentions God\'s name directly, yet it narrates unmistakable divine providence behind a string of "coincidences" — a different way of showing the same truth as the other historical books.',
          },
        ],
        reflectionQuestions: [
          'Ciro cumpre uma profecia escrita mais de cem anos antes dele nascer, sem nunca ter adorado o Deus de Israel. Como isso muda sua visão sobre o quanto Deus está no controle, mesmo através de pessoas que não o conhecem?',
          'Ester não menciona Deus nem uma vez, mas mostra Sua mão em cada "coincidência". Onde você consegue enxergar a mão de Deus na sua vida, mesmo quando Ele parece "silencioso"?',
          'Neemias reconstrói o muro em 52 dias apesar de oposição forte. Que "muro" você está tentando reconstruir agora, apesar da oposição ao seu redor?',
          'A vida judaica prosperava tanto em Jerusalém quanto na distante Susa. Isso muda como você pensa sobre viver sua fé fora do seu "lugar ideal"?',
        ],
        reflectionQuestionsEn: [
          'Cyrus fulfills a prophecy written over a hundred years before he was born, without ever worshiping the God of Israel. How does that change your view of how much God is in control, even through people who don\'t know him?',
          'Esther never mentions God once, yet shows his hand in every "coincidence". Where can you spot God\'s hand in your own life, even when he seems "silent"?',
          'Nehemiah rebuilds the wall in 52 days despite fierce opposition. What "wall" are you trying to rebuild right now, despite opposition around you?',
          'Jewish life thrived both in Jerusalem and in distant Susa. How does that change how you think about living out your faith outside your "ideal place"?',
        ],
      },
      {
        id: 9,
        title: 'Período Intertestamentário',
        titleEn: 'The Intertestamental Period',
        passage: '~400–4 a.C.',
        passageEn: '~400–4 BC',
        sections: [
          {
            key: 'historical',
            body: 'Entre o último livro do Antigo Testamento (Malaquias, ~430 a.C.) e o nascimento de Jesus, se passam cerca de 400 anos sem nenhum livro reconhecido como Escritura no cânon protestante — os chamados "anos de silêncio". Mas não foi um período histórico vazio: Alexandre, o Grande conquista a região em 332 a.C., espalhando a língua e cultura grega (helenização) por todo o Oriente Médio; depois de sua morte, a Judeia passa das mãos dos Ptolomeus (Egito) para os Selêucidas (Síria); a profanação do Templo por Antíoco IV Epifânio em 167 a.C. provoca a Revolta dos Macabeus, que conquista independência judaica temporária sob a dinastia hasmoneia — evento ainda celebrado hoje como Hanucá. Roma toma o controle da região em 63 a.C. (general Pompeu), e Herodes, o Grande é instalado como rei-cliente romano da Judeia em 37 a.C., o mesmo Herodes que aparece nos relatos do nascimento de Jesus.',
            bodyEn: 'Between the last book of the Old Testament (Malachi, ~430 BC) and the birth of Jesus, roughly 400 years pass with no book recognized as Scripture in the Protestant canon — the so-called "silent years". But it wasn\'t a historical vacuum: Alexander the Great conquers the region in 332 BC, spreading Greek language and culture (Hellenization) across the whole Near East; after his death, Judea passes from the Ptolemies (Egypt) to the Seleucids (Syria); the desecration of the Temple by Antiochus IV Epiphanes in 167 BC sparks the Maccabean Revolt, which wins temporary Jewish independence under the Hasmonean dynasty — an event still celebrated today as Hanukkah. Rome takes control of the region in 63 BC (General Pompey), and Herod the Great is installed as Rome\'s client king of Judea in 37 BC — the same Herod who appears in the accounts of Jesus\' birth.',
          },
          {
            key: 'geographical',
            body: 'A região passa por sucessivas trocas de domínio imperial — grego, depois romano —, o que espalha comunidades judaicas (a "diáspora") por todo o Mediterrâneo, de Alexandria a Roma, criando exatamente a rede de sinagogas e o idioma grego comum (koiné) que o cristianismo primitivo vai usar, poucas décadas depois, pra se espalhar tão rápido.',
            bodyEn: 'The region passes through successive changes of imperial rule — Greek, then Roman — which spreads Jewish communities (the "diaspora") across the entire Mediterranean, from Alexandria to Rome, creating precisely the network of synagogues and the common Greek language (koine) that early Christianity would use, just decades later, to spread so quickly.',
          },
          {
            key: 'theological',
            body: 'É durante esse "silêncio" que os principais grupos religiosos judaicos do Novo Testamento — fariseus, saduceus, essênios, zelotes — tomam forma, cada um com sua própria resposta pra pergunta que ficou pairando desde o exílio: como viver fielmente sob domínio estrangeiro, esperando o Messias prometido? A tradução da Bíblia hebraica pro grego (a Septuaginta, iniciada por volta de 250 a.C.) se torna, sem que ninguém soubesse na época, a ferramenta que tornaria possível ao cristianismo primitivo citar o Antigo Testamento em praticamente qualquer lugar do império romano.',
            bodyEn: 'It\'s during this "silence" that the major Jewish religious groups of the New Testament — Pharisees, Sadducees, Essenes, Zealots — take shape, each with its own answer to the question that had lingered since the exile: how do you live faithfully under foreign rule, waiting for the promised Messiah? The translation of the Hebrew Bible into Greek (the Septuagint, begun around 250 BC) becomes, without anyone realizing it at the time, the tool that would let early Christianity quote the Old Testament almost anywhere in the Roman empire.',
          },
        ],
        reflectionQuestions: [
          '400 anos sem nenhuma palavra profética registrada — mas Deus ainda estava agindo nos bastidores da história. Você já passou por um período de "silêncio" de Deus que, olhando pra trás, via que Ele estava preparando algo?',
          'A Septuaginta é traduzida sem que ninguém soubesse o quanto ela seria importante depois. Que "trabalho invisível" você está fazendo hoje que pode ter um propósito maior do que você imagina?',
          'Diferentes grupos judaicos respondem de formas diferentes à mesma pergunta: como viver fielmente sob pressão? Como você tem respondido a essa mesma pergunta na sua própria vida?',
          'O silêncio profético termina exatamente quando Jesus nasce. Como isso muda sua forma de esperar por respostas de Deus que ainda não vieram?',
        ],
        reflectionQuestionsEn: [
          '400 years with no recorded prophetic word — but God was still working behind the scenes of history. Have you gone through a period of God\'s "silence" that, looking back, you realized he was preparing something?',
          'The Septuagint is translated without anyone knowing how important it would later become. What "invisible work" are you doing today that might have a bigger purpose than you realize?',
          'Different Jewish groups answer the same question in different ways: how do you live faithfully under pressure? How have you been answering that same question in your own life?',
          'The prophetic silence ends exactly when Jesus is born. How does that change the way you wait for answers from God that haven\'t come yet?',
        ],
      },
      {
        id: 10,
        title: 'Nascimento e Ministério de Jesus',
        titleEn: 'The Birth and Ministry of Jesus',
        passage: '~4 a.C.–29 d.C.',
        passageEn: '~4 BC–29 AD',
        sections: [
          {
            key: 'historical',
            body: 'Jesus provavelmente nasceu entre 6 e 4 a.C. — o próprio sistema de calendário "antes/depois de Cristo", criado só em 525 d.C. pelo monge Dionísio Exíguo, contém um pequeno erro de cálculo, já que Herodes, o Grande (que aparece vivo no relato do nascimento) morreu em 4 a.C. Depois de cerca de 30 anos "silenciosos" (só um episódio aos 12 anos é registrado, Lucas 2:41-52), o ministério público de Jesus pode ser datado com razoável precisão a partir de Lucas 3:1 ("no décimo quinto ano do governo de Tibério César"), o que aponta pra cerca de 27–29 d.C. Os Evangelhos descrevem um ministério de aproximadamente três anos, concentrado majoritariamente na Galileia, com idas periódicas a Jerusalém pras festas judaicas — um padrão de itinerância que reflete o de outros mestres itinerantes (rabinos) da época.',
            bodyEn: 'Jesus was likely born between 6 and 4 BC — the very BC/AD calendar system, created only in 525 AD by the monk Dionysius Exiguus, contains a small calculation error, since Herod the Great (who appears alive in the birth narrative) died in 4 BC. After roughly 30 "silent" years (only one episode at age 12 is recorded, Luke 2:41-52), Jesus\' public ministry can be dated with reasonable precision from Luke 3:1 ("in the fifteenth year of the reign of Tiberius Caesar"), pointing to around 27–29 AD. The Gospels describe a ministry of roughly three years, concentrated mostly in Galilee, with periodic trips to Jerusalem for Jewish festivals — a pattern of itinerancy reflecting that of other traveling teachers (rabbis) of the time.',
          },
          {
            key: 'geographical',
            body: 'A base do ministério de Jesus é Cafarnaum, uma cidade pesqueira às margens do mar da Galileia, cujas ruínas — incluindo o que muitos arqueólogos identificam como a "casa de Pedro" e uma sinagoga do século I — ainda podem ser visitadas hoje. Dali, Jesus percorre toda a região da Galileia e ocasionalmente cruza pra territórios vizinhos (Decápolis, Fenícia, Samaria), sempre voltando pra base antes de subir a Jerusalém pras grandes festas.',
            bodyEn: 'Jesus\' ministry is based in Capernaum, a fishing town on the shore of the Sea of Galilee, whose ruins — including what many archaeologists identify as "Peter\'s house" and a 1st-century synagogue — can still be visited today. From there, Jesus travels throughout the region of Galilee and occasionally crosses into neighboring territories (the Decapolis, Phoenicia, Samaria), always returning to base before going up to Jerusalem for the major festivals.',
          },
          {
            key: 'theological',
            body: 'O batismo de Jesus (Mateus 3) marca o início formal do ministério com uma cena trinitária rara na Bíblia — Pai, Filho e Espírito Santo presentes ao mesmo tempo. Os milagres de Jesus não são apresentados como espetáculos isolados, mas como "sinais" (especialmente no Evangelho de João) que apontam pra sua identidade messiânica; e seus ensinos, centrados no "Reino de Deus", anunciam algo que já começou a acontecer, mas ainda não se completou totalmente — uma tensão teológica que atravessa todo o Novo Testamento.',
            bodyEn: 'Jesus\' baptism (Matthew 3) marks the formal start of his ministry with a rare Trinitarian scene in the Bible — Father, Son, and Holy Spirit present at the same moment. Jesus\' miracles aren\'t presented as isolated spectacles, but as "signs" (especially in John\'s Gospel) pointing to his messianic identity; and his teaching, centered on the "Kingdom of God," announces something that has already begun but hasn\'t yet fully arrived — a theological tension that runs through the whole New Testament.',
          },
        ],
        reflectionQuestions: [
          'Jesus passa cerca de 30 anos numa vida comum antes de qualquer ministério público. O que isso ensina sobre o valor dos anos "escondidos" antes de um propósito maior se revelar?',
          'O ministério de Jesus é itinerante — ele vai até as pessoas, não espera elas virem até ele. Onde você tem esperado que as pessoas "venham até você" em vez de ir ao encontro delas?',
          'Os milagres de Jesus são "sinais" que apontam pra algo maior, não só demonstrações de poder. Que "sinais" de Deus você já viu na sua própria vida, e o que eles apontavam?',
          'O Reino de Deus já começou, mas ainda não se completou. Como você vive nessa tensão entre o "já" e o "ainda não" da sua fé?',
        ],
        reflectionQuestionsEn: [
          'Jesus spends about 30 years in an ordinary life before any public ministry. What does that teach about the value of "hidden" years before a bigger purpose is revealed?',
          'Jesus\' ministry is itinerant — he goes to people, rather than waiting for them to come to him. Where have you been waiting for people to "come to you" instead of going out to meet them?',
          'Jesus\' miracles are "signs" pointing to something bigger, not just displays of power. What "signs" of God have you seen in your own life, and what were they pointing to?',
          'The Kingdom of God has already begun but isn\'t yet complete. How do you live in that tension between the "already" and the "not yet" of your faith?',
        ],
      },
      {
        id: 11,
        title: 'A Semana Santa, a Cruz e a Ressurreição',
        titleEn: 'Holy Week, the Cross, and the Resurrection',
        passage: '~30 d.C.',
        passageEn: '~30 AD',
        sections: [
          {
            key: 'historical',
            body: 'A crucificação de Jesus, na maioria das reconstruções acadêmicas, aconteceu em 30 ou 33 d.C. — a datação depende de detalhes específicos sobre em que dia da semana caiu a Páscoa judaica naquele ano, um cálculo astronômico ainda debatido entre estudiosos. Fora da Bíblia, o historiador romano Tácito (início do século II) confirma que "Cristo" foi executado sob Pôncio Pilatos durante o reinado de Tibério, e o historiador judeu Flávio Josefo também menciona Jesus e sua execução em sua obra "Antiguidades Judaicas". A crucificação romana, como método de execução, é bem documentada por fontes não bíblicas como uma forma de morte reservada a escravos e inimigos do Estado — o que torna ainda mais chocante, do ponto de vista histórico, sua aplicação a alguém aclamado como rei dias antes.',
            bodyEn: 'Jesus\' crucifixion, in most scholarly reconstructions, happened in 30 or 33 AD — the dating depends on specific details about which day of the week the Jewish Passover fell on that year, an astronomical calculation still debated among scholars. Outside the Bible, the Roman historian Tacitus (early 2nd century) confirms that "Christ" was executed under Pontius Pilate during Tiberius\' reign, and the Jewish historian Josephus also mentions Jesus and his execution in his work "Jewish Antiquities". Roman crucifixion, as a method of execution, is well documented by non-biblical sources as a death reserved for slaves and enemies of the state — which makes its use, from a historical standpoint, all the more shocking against someone hailed as king just days earlier.',
          },
          {
            key: 'geographical',
            body: 'A semana começa com a entrada triunfal em Jerusalém, vindo de Betânia, e passa pelo Monte das Oliveiras, o Templo, o Cenáculo (onde acontece a Última Ceia) e o jardim do Getsêmani, também no Monte das Oliveiras — todos locais ainda identificáveis em Jerusalém hoje. A crucificação acontece no Gólgota, fora dos muros da cidade da época (conforme o costume romano de executar publicamente fora dos limites urbanos), e o sepultamento, num túmulo emprestado nas proximidades.',
            bodyEn: 'The week begins with the triumphal entry into Jerusalem, coming from Bethany, and moves through the Mount of Olives, the Temple, the Upper Room (where the Last Supper happens), and the garden of Gethsemane, also on the Mount of Olives — all locations still identifiable in Jerusalem today. The crucifixion happens at Golgotha, outside the city walls of the time (following the Roman custom of public executions outside city limits), and the burial in a borrowed tomb nearby.',
          },
          {
            key: 'theological',
            body: 'A Última Ceia reinterpreta a própria Páscoa judaica — o pão e o vinho, elementos centrais da ceia pascal que celebrava a libertação do Egito, passam a representar o corpo e o sangue de Jesus, uma nova "libertação" ainda maior. A ressurreição, atestada por múltiplas testemunhas em momentos e lugares diferentes (1 Coríntios 15:3-8 lista mais de 500 pessoas), se torna o evento central que toda a pregação apostólica vai repetir daquele momento em diante — sem ela, segundo o próprio Paulo, "a nossa fé é vã" (1 Coríntios 15:14).',
            bodyEn: 'The Last Supper reinterprets the Jewish Passover itself — the bread and wine, central elements of the Passover meal that celebrated the deliverance from Egypt, come to represent Jesus\' body and blood, an even greater "deliverance" still to come. The resurrection, attested by multiple witnesses in different times and places (1 Corinthians 15:3-8 lists over 500 people), becomes the central event that all apostolic preaching will repeat from that moment forward — without it, according to Paul himself, "our faith is in vain" (1 Corinthians 15:14).',
          },
        ],
        reflectionQuestions: [
          'Jesus reinterpreta a Páscoa — uma celebração de libertação passada — como uma libertação ainda maior que estava para acontecer. Como isso muda sua forma de celebrar memórias importantes da sua própria fé?',
          'A crucificação era reservada a escravos e inimigos do Estado — um método pensado pra humilhar. Como isso aprofunda o que significa Jesus ter escolhido esse caminho por você?',
          'Mais de 500 pessoas testemunharam a ressurreição, segundo Paulo. Como a existência de tantas testemunhas muda (ou não) sua confiança na ressurreição?',
          'Paulo diz que, sem a ressurreição, a fé cristã "é vã". O que isso revela sobre o quanto a ressurreição — não só os ensinamentos de Jesus — é central pra sua própria fé?',
        ],
        reflectionQuestionsEn: [
          'Jesus reinterprets Passover — a celebration of past deliverance — as an even greater deliverance still to come. How does that change the way you celebrate important memories of your own faith?',
          'Crucifixion was reserved for slaves and enemies of the state — a method designed to humiliate. How does that deepen what it means that Jesus chose that path for you?',
          'Over 500 people witnessed the resurrection, according to Paul. How does having that many witnesses change (or not) your confidence in the resurrection?',
          'Paul says that without the resurrection, the Christian faith "is in vain". What does that reveal about how central the resurrection — not just Jesus\' teachings — is to your own faith?',
        ],
      },
      {
        id: 12,
        title: 'A Expansão do Evangelho',
        titleEn: 'The Expansion of the Gospel',
        passage: '~30–62 d.C.',
        passageEn: '~30–62 AD',
        sections: [
          {
            key: 'historical',
            body: 'Cinquenta dias depois da ressurreição, no Pentecostes judaico, o Espírito Santo desce sobre os discípulos em Jerusalém (Atos 2) — um evento que a igreja tradicionalmente marca como seu nascimento oficial. Perseguição logo se segue: Estêvão se torna o primeiro mártir cristão (Atos 7), e a dispersão que vem depois espalha o evangelho pra além de Jerusalém, cumprindo o padrão anunciado por Jesus em Atos 1:8. Saulo de Tarso, um perseguidor ativo da igreja, se converte no caminho de Damasco por volta de 34–36 d.C., e se torna Paulo, o missionário mais influente do Novo Testamento — sua cronologia detalhada de viagens pode ser ancorada com precisão rara pra época antiga graças à Inscrição de Gálio, encontrada em Delfos, que registra Gálio como procônsul de Acaia entre 51–52 d.C., o mesmo Gálio que julga Paulo em Corinto (Atos 18:12). O Concílio de Jerusalém (~49 d.C., Atos 15) resolve a primeira grande controvérsia teológica da igreja: gentios convertidos precisam seguir a lei judaica?',
            bodyEn: 'Fifty days after the resurrection, on the Jewish festival of Pentecost, the Holy Spirit descends on the disciples in Jerusalem (Acts 2) — an event the church traditionally marks as its official birth. Persecution soon follows: Stephen becomes the first Christian martyr (Acts 7), and the scattering that follows spreads the gospel beyond Jerusalem, fulfilling the pattern Jesus announced in Acts 1:8. Saul of Tarsus, an active persecutor of the church, converts on the road to Damascus around 34–36 AD, and becomes Paul, the New Testament\'s most influential missionary — his detailed travel chronology can be anchored with a precision rare for ancient texts thanks to the Gallio Inscription, found at Delphi, which records Gallio as proconsul of Achaia between 51–52 AD, the same Gallio who judges Paul in Corinth (Acts 18:12). The Jerusalem Council (~49 AD, Acts 15) resolves the church\'s first major theological controversy: do converted Gentiles need to follow Jewish law?',
          },
          {
            key: 'geographical',
            body: 'O evangelho se espalha exatamente na ordem anunciada em Atos 1:8 — Jerusalém, depois Judeia e Samaria, depois "os confins da terra" —, passando por Antioquia (onde os discípulos são chamados "cristãos" pela primeira vez, Atos 11:26, e que se torna a base das viagens missionárias de Paulo), por toda a Ásia Menor e Grécia, estabelecendo igrejas em cidades como Filipos, Corinto e Éfeso.',
            bodyEn: 'The gospel spreads in exactly the order announced in Acts 1:8 — Jerusalem, then Judea and Samaria, then "the ends of the earth" — passing through Antioch (where the disciples are first called "Christians", Acts 11:26, and which becomes the base for Paul\'s missionary journeys), across Asia Minor and Greece, establishing churches in cities like Philippi, Corinth, and Ephesus.',
          },
          {
            key: 'theological',
            body: 'A conversão de Cornélio, um centurião romano gentio (Atos 10), choca até Pedro, mostrando que a expansão do evangelho pra além do povo judeu não foi um plano óbvio nem imediato mesmo pros primeiros apóstolos — precisou de uma visão sobrenatural específica pra Pedro aceitar. O Concílio de Jerusalém formaliza essa mudança: a salvação pela fé em Cristo, não pela observância da lei judaica, se torna a posição oficial da igreja primitiva, abrindo caminho pra que o evangelho se tornasse, de fato, uma mensagem universal.',
            bodyEn: 'The conversion of Cornelius, a Gentile Roman centurion (Acts 10), shocks even Peter, showing that the gospel\'s expansion beyond the Jewish people wasn\'t an obvious or immediate plan even for the first apostles — it took a specific supernatural vision for Peter to accept it. The Jerusalem Council formalizes that shift: salvation through faith in Christ, not observance of Jewish law, becomes the early church\'s official position, opening the way for the gospel to truly become a universal message.',
          },
        ],
        reflectionQuestions: [
          'A igreja nasce no meio da perseguição, não da tranquilidade. Que "nascimentos" na sua própria vida vieram de momentos difíceis, não fáceis?',
          'Pedro precisa de uma visão sobrenatural pra aceitar que gentios também eram incluídos no plano de Deus. Que preconceito ou limite você já teve que deixar Deus quebrar em você?',
          'Paulo, um perseguidor ativo da igreja, se torna seu maior missionário. Existe alguém que você já descartou como "impossível de mudar", à luz da história de Paulo?',
          'O evangelho se espalha na ordem exata que Jesus previu — de perto pra longe. Onde você está começando a espalhar sua fé "por perto" antes de pensar em ir "mais longe"?',
        ],
        reflectionQuestionsEn: [
          'The church is born in the middle of persecution, not calm. What "births" in your own life have come out of hard moments, not easy ones?',
          'Peter needs a supernatural vision to accept that Gentiles were also included in God\'s plan. What prejudice or limit have you needed God to break in you?',
          'Paul, an active persecutor of the church, becomes its greatest missionary. Is there someone you\'ve written off as "impossible to change", in light of Paul\'s story?',
          'The gospel spreads in the exact order Jesus predicted — from near to far. Where are you starting to spread your faith "nearby" before thinking about going "far"?',
        ],
      },
      {
        id: 13,
        title: 'Perseguição e o Fim de uma Era',
        titleEn: 'Persecution and the End of an Era',
        passage: '~64–100 d.C.',
        passageEn: '~64–100 AD',
        sections: [
          {
            key: 'historical',
            body: 'Em 64 d.C., um grande incêndio destrói boa parte de Roma, e o imperador Nero, segundo o historiador romano Tácito, culpa publicamente os cristãos, iniciando a primeira perseguição imperial oficial contra a igreja. É nesse mesmo período que a tradição cristã situa o martírio de Pedro e Paulo em Roma (~64–67 d.C.). Em 70 d.C., depois de uma revolta judaica contra Roma, as legiões romanas, sob o comando do futuro imperador Tito, destroem Jerusalém e o Templo — cumprindo o que Jesus havia previsto décadas antes ("não ficará pedra sobre pedra", Mateus 24:2) — um evento tão significativo que o historiador Flávio Josefo, testemunha ocular, dedica um livro inteiro a ele. Décadas depois, sob o reinado de Domiciano, o apóstolo João é exilado na ilha de Patmos, onde recebe as visões registradas no livro de Apocalipse, geralmente datado por volta de 95 d.C.',
            bodyEn: 'In 64 AD, a great fire destroys much of Rome, and Emperor Nero, according to the Roman historian Tacitus, publicly blames Christians, launching the first official imperial persecution against the church. Christian tradition places the martyrdom of Peter and Paul in Rome in this same period (~64–67 AD). In 70 AD, following a Jewish revolt against Rome, Roman legions, under the command of the future emperor Titus, destroy Jerusalem and the Temple — fulfilling what Jesus had predicted decades earlier ("not one stone will be left on another", Matthew 24:2) — an event so significant that the historian Josephus, an eyewitness, devotes an entire book to it. Decades later, under Domitian\'s reign, the apostle John is exiled to the island of Patmos, where he receives the visions recorded in the book of Revelation, generally dated around 95 AD.',
          },
          {
            key: 'geographical',
            body: 'O centro simbólico da fé judaica-cristã se desloca definitivamente: com o Templo destruído, Jerusalém deixa de ser o centro geográfico prático da fé, e comunidades cristãs já espalhadas por Roma, Ásia Menor e além — as mesmas sete igrejas endereçadas no início de Apocalipse (capítulos 2–3) — se tornam os novos centros de atividade da igreja.',
            bodyEn: 'The symbolic center of Jewish-Christian faith shifts permanently: with the Temple destroyed, Jerusalem stops being the practical geographic center of the faith, and Christian communities already scattered across Rome, Asia Minor, and beyond — the same seven churches addressed at the start of Revelation (chapters 2–3) — become the church\'s new centers of activity.',
          },
          {
            key: 'theological',
            body: 'A destruição do Templo em 70 d.C. marca o fim definitivo do sistema sacrificial que atravessa desde Levítico — mas acontece justamente quando a igreja já havia entendido, através das cartas de Paulo e da carta aos Hebreus, que o sacrifício definitivo já tinha acontecido em Cristo, e nunca mais precisaria ser repetido. O livro de Apocalipse, escrito num contexto de perseguição crescente sob Domiciano, não é primariamente sobre prever o futuro distante, mas sobre encorajar uma igreja perseguida com a certeza de que, apesar das aparências, Cristo já venceu — encerrando toda a cronologia bíblica com a mesma promessa que abriu a Bíblia inteira: Deus habitando definitivamente com o seu povo (Apocalipse 21:3), um eco direto do Éden em Gênesis.',
            bodyEn: 'The destruction of the Temple in 70 AD marks the definitive end of the sacrificial system running all the way back to Leviticus — but it happens right when the church had already understood, through Paul\'s letters and the letter to the Hebrews, that the definitive sacrifice had already happened in Christ, and would never need to be repeated again. The book of Revelation, written in a context of growing persecution under Domitian, isn\'t primarily about predicting the distant future, but about encouraging a persecuted church with the certainty that, despite appearances, Christ has already won — closing out all of biblical chronology with the same promise that opened the whole Bible: God dwelling permanently with his people (Revelation 21:3), a direct echo of Eden in Genesis.',
          },
        ],
        reflectionQuestions: [
          'A igreja primitiva enfrenta perseguição oficial do próprio império. Como a fé de cristãos perseguidos há 2000 anos desafia sua forma de viver a fé em segurança hoje?',
          'O Templo é destruído justamente quando a igreja já não precisava mais dele. Que "estruturas antigas" na sua própria vida podem estar prontas pra serem deixadas para trás?',
          'Apocalipse foi escrito pra encorajar, não pra assustar, uma igreja perseguida. Como ler esse livro como uma carta de esperança, e não de medo, muda sua forma de recebê-lo?',
          'A Bíblia termina exatamente onde começou — Deus habitando com seu povo (Éden / Apocalipse 21). Como essa "linha do tempo completa", do início ao fim, muda sua visão sobre pra onde a sua própria história está indo?',
        ],
        reflectionQuestionsEn: [
          'The early church faces official persecution from the empire itself. How does the faith of Christians persecuted 2,000 years ago challenge the way you live out your faith in safety today?',
          'The Temple is destroyed right when the church no longer needed it. What "old structures" in your own life might be ready to be left behind?',
          'Revelation was written to encourage, not to scare, a persecuted church. How does reading it as a letter of hope, not fear, change the way you receive it?',
          'The Bible ends exactly where it began — God dwelling with his people (Eden / Revelation 21). How does that "complete timeline", start to finish, change your view of where your own story is headed?',
        ],
      },
    ],
  },
]
