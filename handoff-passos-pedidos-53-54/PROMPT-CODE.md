# Prompt para o Claude Code — passos do plano e pedidos de oração

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-passos-pedidos-53-54/` copiada para a raiz do repositório `jesus-corner`.

---

Redesenhe as telas **de dentro do plano** e as de **pedidos de oração** do Jesus Corner a partir do pacote em `handoff-passos-pedidos-53-54/`: a oração ACTS (S1/S2), a leitura com relógio (S3), a reflexão com perguntas (S4), o dia concluído (S5), a lista de pedidos (O1), "Fazer um pedido" (O2) e "Como Deus respondeu?" (O3). **Nada mais muda no app.**

## Antes de escrever qualquer código

1. Leia por inteiro `handoff-passos-pedidos-53-54/README.md` e `HANDOFF-passos-pedidos.md`, abra os oito PNGs de `screens/` e abra no navegador `referencia/Passos e Pedidos 53-54.dc.html` — é a fonte de verdade para cores, tamanhos e espaçamentos.
2. Leia os pacotes de onde estas telas vêm, porque **as regras de dados e de privacidade continuam valendo**: `handoff-passos-36-37/`, `handoff-oracao-pedidos/` e `handoff-meu-plano-35/`. E os de que dependem: `handoff-meu-plano-47/`, `handoff-biblia-52/`, `handoff-gamificacao-43-46/`.
3. Leia no código, sem alterar nada: as telas atuais de oração, leitura com relógio, reflexão, dia concluído e pedidos; o fluxo que emenda os passos; o relógio; onde o "orei" é gravado; `src/index.css`.
4. Me responda, **antes de codar**, com:
   - **o que já está implementado** dos pacotes de que este depende: a barra do dia e o Meu Plano novo; a tela de leitura B3; blocos e cores; a família "Oração pelos outros"; o contador de semanas. Se faltar algo, **pare e me diga** — não reimplemente aqui;
   - a lista de componentes e arquivos das telas atuais, e para cada um: **fica, muda ou sai** — e quais outras telas usam os que saem;
   - como o "orei" funciona hoje: onde é gravado, se há limite de um por pedido por dia, como entra na contagem de quem pediu e na minha;
   - de onde vem cada dado novo que as telas mostram: quantas vezes orei por um pedido meu ("9 vezes"), se orei hoje, tempo real de cada passo, total de orações pelos outros e próximo degrau;
   - **o que falta** no banco para isso. Não improvise: me diga e proponha;
   - o plano em etapas, na ordem do README.

## Regras de código — para nada quebrar

- **Só as telas listadas mudam.** A abertura da oração (36a), a oração livre (36c), a bênção (36f), a reflexão livre (37b), a imagem compartilhável (37d), concluir leitura (37e) e fim antes do tempo (35g) **não são tocadas** — serão redesenhadas depois. O fluxo entre os passos continua passando por elas exatamente como hoje.
- **Não reescreva o que funciona:** o fluxo que emenda os passos, o relógio e o que acontece ao zerar, o salvamento ao pausar, a geração e a troca das perguntas, a frase do dia, "Escrever com ajuda", a publicação de pedidos, a contagem de quem orou. As telas novas trocam a apresentação, não a lógica. Se precisar mudar a assinatura de uma função compartilhada, pare e pergunte.
- **Privacidade é contrato:** o que se escreve na oração nunca sai do aparelho/conta da pessoa; a reflexão só vai ao grupo por toque explícito; ninguém comenta pedido; quem pediu vê só o número de pessoas que oraram, nunca os nomes. Nenhuma mudança deste pacote pode afrouxar isso — inclua testes que provem.
- **"Só eu" é o padrão de "Quem vê", sempre.** Toda vez que a folha abre, vem em "Só eu"; a última escolha não é lembrada. Um pedido só é publicado se a pessoa escolher um grupo **e** tocar em "Publicar pedido". "Publicar sem meu nome" vem desligado.
- **O "orei" é um só.** O check da Súplica (S2) e o botão da lista (O1) chamam a mesma função, com o mesmo limite de uma vez por pedido por dia. Orar por pedido próprio não conta na família "Oração pelos outros".
- **S3 é o componente de leitura da aba Bíblia**, com o relógio, a barra do dia e o botão "Concluir a leitura". Não crie uma segunda tela de leitura. A tipografia do texto bíblico não muda.
- **Reaproveite:** a barra do dia do Meu Plano, o cartão preto, o botão de voltar, o chevron, o interruptor, a folha inferior, os tokens de `src/index.css`, os helpers de plural, de tempo ("há 24 dias", "há 3 meses") e de número. Nenhuma cor solta, nenhuma dependência nova.
- **Lógica em funções puras, com testes:** qual etapa do ACTS é a atual e o rótulo do botão; inserir uma frase de começo no campo (vazio, com texto, repetida); a lista de pedidos da Súplica (ordem, limite de 5, vazio); o estado da reflexão (pergunta atual, "Trocar" some na 3ª, avançar vazio, cartão "Depois" × "Já respondidas", rótulo do botão quando a reflexão não é o último passo); os números de S5 (dia com leitura, dia de estudo, sem frase); o estado do botão "orei" (hoje × outro dia, virada de dia no fuso do usuário); os dois estados de O2 e o texto do botão; "Espere" mantém o pedido ativo.
- **Acessibilidade:** alvos de toque ≥ 44px (as pastilhas de frase têm 34px de altura visual); o relógio é anunciado sem interromper a leitura de tela a cada segundo; a trilha do ACTS e a barra do dia têm texto alternativo ("Etapa 2 de 4, Confissão"); o check de um pedido é `aria-pressed` com o texto do pedido; as folhas prendem o foco e fecham com voltar; o teclado nunca cobre o campo nem o botão principal.
- **Sem código morto.** Aprovadas as telas, apague o que só as antigas usavam (HANDOFF §10), depois de confirmar que nada mais usa.
- Rode lint, testes e build ao fim de cada etapa e me mostre a saída. Não avance com teste quebrado.

## Regras de design — para nada sair do quadro

- **Abra o PNG antes e depois de cada tela** e compare bloco por bloco: mesma ordem, mesmo enquadramento, mesmas cores, raios, pesos, tamanhos e espaçamentos. **Em dúvida de valor, vale o arquivo de `referencia/`**; se ele e o HANDOFF discordarem, pare e pergunte.
- **Em todo passo:** a barra do dia no topo, proporcional aos minutos; um cartão preto dizendo o que fazer agora; **um** botão laranja para seguir, com no máximo uma ação branca à esquerda.
- **S1:** a citação fixa e o cartão "Pedidos de oração" **não** aparecem. A trilha das etapas é fina, com os quatro nomes; não volte às pastilhas grandes.
- **S2:** os pedidos ficam dentro da tela, um check por pedido; não abra outra tela para isso.
- **S4:** uma pergunta por vez no cartão preto; as outras ficam pequenas no cartão "Depois". Não mostre os três campos juntos.
- **S5:** a tela é o resumo do dia, não o cartão de compartilhar. Um botão preto no fim. Nada de confete ou "Parabéns!".
- **O1:** um botão por pedido — laranja se ainda não orei hoje, marrom se já orei. Não volte a "Orei por isso" / "Arquivar". A citação do topo não aparece.
- **O2:** três blocos lado a lado, "Só eu" primeiro e selecionado. **O3:** cinco respostas em grade de duas colunas, nenhuma pré-selecionada.
- **Texto fixo em português, palavra por palavra**, em tudo o que o HANDOFF marca como fixo — entre eles: "SE AJUDAR, COMECE ASSIM", "Escreva, ou só ore. Nada aqui é obrigatório.", "Só seu. Nunca vai para grupo nem para a Biblioteca.", "Pular", "Peça. Pelos seus e pelos outros. Toque no pedido depois de orar por ele.", "PEDIDOS DE ORAÇÃO", "Fazer um pedido", "Terminar a oração", "Concluir a leitura", "Escreva se quiser. Pensar também conta.", "DEPOIS", "Fica na sua Biblioteca. Nada vai ao grupo sem você compartilhar.", "Trocar", "Próxima pergunta", "DIA CONCLUÍDO", "SUA FRASE DE HOJE", "Compartilhar meu dia", "Você escolhe o que entra na imagem", "Voltar ao plano", "orações pelos outros", "RESPONDIDOS", "Uma frase basta. Começa só seu — você escolhe se alguém mais vê.", "QUEM VÊ", "Só eu", "Guardar pedido", "Publicar pedido", "Como Deus respondeu?", as cinco respostas e seus apoios, "O QUE EU VI (OPCIONAL)", "Guardar o pedido".
- **Texto sobre laranja é `#1A1714`, nunca branco.**
- **Nada hardcoded.** Tudo o que está nas imagens é de uma conta de exemplo. Frases mudam com os números, em português correto: "1 de 1 orado", "1 pessoa já orou", "Falta 1 para …", "Orado por 1 dia · 1 vez", "1 minuto com Deus.".
- Implemente e me mostre os estados sem captura: as outras três etapas do ACTS; Súplica sem pedidos e com mais de cinco; reflexão na pergunta 2 e na 3; dia concluído sem frase e em dia de estudo; lista de pedidos vazia, aba Respondidos, aba Do grupo; **"Fazer um pedido" com um grupo selecionado**; "Como Deus respondeu?" com "Espere".
- Não "melhore" o layout, não troque ícone, não adicione seção, não traga de volta o que saiu. Se algo parecer estranho, faltar informação ou conflitar com o código, **pergunte antes de decidir**.

## Como entregar

Siga a ordem do README: (1) S1 + S2; (2) S3; (3) S4; (4) S5; (5) O1; (6) O2 + O3; (7) limpeza.

**Depois de cada etapa, pare** e me mostre: a tela ao lado do PNG correspondente, o checklist do fim do HANDOFF preenchido para aquelas telas, a lista de arquivos criados / alterados / apagados, e a saída de lint, testes e build. Deixe um seletor de debug, só em desenvolvimento, para eu ver cada estado. Só siga para a etapa seguinte depois do meu ok.

Comece pelo levantamento do item 4. Não escreva código ainda.
