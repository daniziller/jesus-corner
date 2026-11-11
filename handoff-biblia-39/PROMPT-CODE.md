# Prompt para o Claude Code — aba Bíblia

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-biblia-39/` disponível no projeto.

---

Implemente a **aba Bíblia** do Jesus Corner a partir do pacote em `handoff-biblia-39/`.

**Leia primeiro, nesta ordem:** `README.md` (mapa de navegação, ordem de implementação) e `HANDOFF-39-biblia.md` (especificação tela por tela, com os textos fixos e as regras). Os dois têm os screenshots embutidos; **abra os nove PNGs antes de escrever qualquer código**:

`39a-biblia-raiz.png`, `39b-livros.png`, `39c-grade-capitulos.png`, `39d-leitura-livre.png`, `39e-versiculo-acoes.png`, `39f-anotar.png`, `39g-copiar.png`, `39i-compartilhar.png`, `39j-perguntar.png`, `39k-busca.png`, `39l-tema.png`.

Não existe `39h` — era comparar versões, retirada porque o app tem uma versão só por enquanto. Mantenha a numeração do design; não renumere.

Estas telas **substituem** implementações anteriores das mesmas telas (raiz, lista de livros, grade de capítulos, leitura livre). Se já existir código dessas versões antigas, ele é trocado por este.

## Fidelidade: 100% ao quadro

Os PNGs não são referência aproximada — são o layout final. Para cada tela, reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar ou reordenar nada;
- o **agrupamento e o enquadramento**: o que está dentro de um bloco no quadro fica dentro dele no código;
- **cores, raios, pesos e tamanhos de fonte, alturas de controle, paddings e gaps** como especificados no HANDOFF (inclusive os hex das quatro cores de marcação e das barras de progresso);
- o **texto de interface em português, palavra por palavra** — inclusive "toque abre · segure marca", a tarja "Leitura livre · não conta no plano", "Marcar o livro inteiro como lido", "Copiado para a área de transferência" e a linha de conferência de 39j com a frase de que a resposta não substitui o pastor. Esses textos **são** o design;
- os **estados**: capítulo lido no app / marcado à mão / próximo do plano / não lido, livro em curso / inteiro lido / não começado, cor de marcação escolhida, formato de cópia selecionado, interruptor ligado/desligado, grupo selecionado;
- as **telas altas são uma tela só com rolagem** — cabeçalho rola, botão primário fixo no rodapé, barra de abas fixa **só em 39a**. Nunca quebre uma tela alta em duas. 39b tem ~2.600px de altura: é a lista dos 39 livros inteira, rolando, sem paginação nem "ver mais".
- **39e e 39g são folhas**, não telas cheias: sobem sobre a leitura, que fica visível e escurecida (`rgba(26,23,20,.45)`) na parte de cima.

Se algo no quadro parecer estranho ou faltar informação, **pergunte antes de decidir**. Não "melhore" o layout, não troque ícone, não adicione seções, não mude hierarquia tipográfica.

## Os valores são de exemplo, os quadros não

Tudo nas imagens é de uma conta de exemplo: "Gênesis", "Salmos 23:4", "50 de 1.189 capítulos", "4,2% lidos", "80%", "38 lidos no app · 2 marcados por você antes dele", "sábado à noite · versículo 4", os nomes dos grupos, a nota escrita, o texto da resposta da IA. Cada usuário terá os seus.

Portanto **nada disso hardcoded** — tudo vem do modelo de dados e do texto bíblico. O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam. Os textos fixos de interface listados no HANDOFF, sim, são idênticos.

Quando o número muda, a frase muda junto, em português correto: "1 capítulo" / "50 capítulos"; "1 pessoa" / "6 pessoas"; "Um versículo selecionado" / "Três versículos selecionados".

## Você vai precisar escrever o que falta

Implemente de verdade, não simule:

1. **Mapa de leitura com duas origens** — capítulo pode ser *lido no app* ou *marcado à mão*; as duas contam igual na porcentagem, mas são registradas e exibidas separadamente (cores diferentes na grade, linhas diferentes no bloco de progresso).
2. **Marcar sem abrir** — segurar o número (~450ms, com haptic) marca/desmarca sem diálogo; "Marcar o livro inteiro como lido" marca todos de uma vez como manuais. Nada disso mexe no plano.
3. **Progresso agregado** — por livro, por testamento e total, alimentando os anéis e as barras.
4. **Leitura livre** — variante de 35f sem cronômetro e sem "Concluir", com "Marcar como lido" e o seletor de capítulo no cabeçalho; guardar onde a pessoa parou (capítulo + versículo) para o cartão "Continuar a leitura livre" de 39a.
5. **Marcação de texto em quatro cores** — por versículo ou por trecho selecionado, persistida, com remoção pelo "x". Sem nome e sem significado atribuído pelo app.
6. **Notas** — texto opcional (nota vazia salva), etiquetas com criação de novas, e publicação **por grupo escolhido** (seleção múltipla, desligada por padrão). Etiquetas nunca são publicadas.
7. **Copiar em três formatos** — com pré-visualização do texto real, a versão sempre junto da referência, memória do último formato usado e a confirmação que some em ~3s.
8. **Exportar imagem** — PNG 2x em três proporções (1080×1350, 1080×1080, 1080×1920), quatro estilos da paleta, opção de incluir a nota, assinatura da marca em todos eles, sem nenhum elemento de interface do app.
9. **IA por versículo** — perguntas sugeridas geradas do versículo, resposta com referências cruzadas em bloco separado, "Salvar na Biblioteca" e conversa contínua no rodapé. **Toda referência citada é conferida contra o texto da versão do usuário antes de aparecer**; o que não bate não entra.
10. **Busca (39k)** — índice do texto da versão do usuário (sem acento, sem caixa) destacando **todas** as ocorrências do termo; palpite de referência ("sl 23", "jo 3.16") alimentando o bloco "Ir direto"; busca por nome de livro; e **temas** como agrupamentos de trechos com as referências conferidas — tema reúne, não interpreta. Ordem canônica nos versículos, com o capítulo já lido subindo. O **estado vazio** não foi desenhado: monte na mesma casca e me mostre antes de finalizar.
11. **Tema como estudo (39l)** — a tela do tema reúne os trechos por testamento e oferece **virar estudo**: a duração escolhida distribui os trechos pelos dias, o gerador é o mesmo de 35d e a proposta é a de **35e** — nada entra no plano sem aprovação. Tocar num trecho abre 39d rolado até o versículo, com ele em foco.

## Links entre as telas

O mapa completo está no README. Os caminhos essenciais:

- 39a: "Continuar a leitura livre" → **39d** onde parou · testamento "Abrir" → **39b** · "Ler pela sessão de hoje" → **35f** (única porta desta aba que conta no plano).
- 39b: toque no livro → **39c**; chips de seção filtram sem sair da tela.
- 39c: toque no capítulo → **39d** · **segurar** marca sem abrir · "Começar meu plano aqui" → **35i**.
- 39d: segurar um versículo → **39e** · "Marcar como lido" volta a **39c**.
- 39e: "Anotar" → **39f** · "Copiar" → **39g** · "Compartilhar" → **39i** · "Perguntar sobre este versículo" → **39j**.
- 39e vale igual na leitura do plano (**35f**) e na livre (**39d**).
- 39a, busca → **39k**; em 39k: "Ir direto" e um versículo → **39d** · um livro → **39c** · um tema → **39l**.
- 39l: um trecho → **39d** rolado até o versículo · "Montar estudo de N dias" → **35e** → aprovado, entra no plano (**35h**/**35b**).

## Regras que valem para a aba inteira

1. **Nesta aba a leitura é livre e não mexe no plano** — nenhuma ação consome sessão, adianta ou atrasa o plano, exceto "Ler pela sessão de hoje".
2. **Marcar sem abrir é requisito, não atalho** — muita gente já leu a Bíblia antes do app e o mapa precisa ser honesto.
3. **A IA mora dentro da leitura**, nunca numa aba própria.
4. **Nada é publicado sem toque explícito** — notas nascem privadas, a publicação é por grupo.

## Como entregar

Implemente na ordem sugerida no README (39a/39b/39c → 39d → 39e → 39f/39g → 39i/39j → 39k/39l). **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, mais o checklist do fim do HANDOFF preenchido para as telas daquele bloco. Só siga para o próximo bloco depois do meu ok.
