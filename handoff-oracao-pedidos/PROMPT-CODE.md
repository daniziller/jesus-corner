# Prompt para o Claude Code — pedidos de oração

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-oracao-pedidos/` disponível no projeto.

---

Implemente os **pedidos de oração** do Jesus Corner a partir do pacote em `handoff-oracao-pedidos/` — quatro telas que cobrem o ciclo inteiro de um pedido: fazer, aparecer para quem ora, ser orado, e ser guardado com a resposta.

**Leia primeiro, nesta ordem:** `README.md` (as quatro decisões que definem esta parte, mapa de navegação e ordem de implementação) e `HANDOFF-pedidos-oracao.md` (tokens e a especificação tela por tela com os textos fixos e os estados). Os dois têm os PNGs embutidos.

## Regra 1 — abra o PNG antes e depois de cada tela

**Antes** de escrever a tela, abra o PNG dela e olhe o quadro inteiro. **Depois** de codar, abra o PNG de novo ao lado do que você fez e compare bloco por bloco.

`pd1-lista-pedidos.png` (a lista, na aba Meu Plano) · `pd2-fazer-pedido.png` (folha de criar) · `pd3-suplica-pedidos.png` (os pedidos dentro da sessão de oração) · `pd4-arquivar-pedido.png` (folha "Como Deus respondeu?").

Os screenshots existem para você entender o **layout**: o que é cada bloco, onde fica, o que está dentro do quê, qual é a hierarquia e o estado de cada controle.

## Regra 2 — o layout é exatamente o do quadro

Os PNGs não são referência aproximada, são o layout final. Para cada tela reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar nem reordenar nada;
- o **enquadramento**: o que está dentro de um cartão no quadro fica dentro dele no código;
- **cores, raios, pesos e tamanhos de fonte, alturas, paddings e gaps** conforme os tokens do HANDOFF — inclusive o significado dos fundos: **branco é pedido ativo**, **areia (`#E6DACB`) é pedido respondido e aviso de privacidade**, preto é o app falando, laranja é a ação de orar;
- o **texto de interface em português, palavra por palavra**, em tudo que o HANDOFF marca como **fixo** — "A única oração que não produz fé é a que nunca foi orada.", "Comece pelos seus — depois leve os três pedidos abaixo. Um toque marca que você orou.", "Uma frase basta. Ninguém pode comentar — só orar.", "Você recebe só o número de pessoas que oraram, nunca os nomes. Pode encerrar o pedido quando quiser.", "Como Deus respondeu?", "Todo pedido orado tem resposta — nem toda resposta é sim.", as cinco respostas com as suas linhas, "Uma linha para lembrar daqui a um ano.". Esses textos **são** o design;
- os **estados**: pílula de filtro ativa, "Orei" (preto) vs. "Você orou" (areia), pedido próprio com "Arquivar" vs. pedido de outro sem, radio de "Quem vê", toggle "Publicar sem meu nome", resposta selecionada em preto com ✓ laranja;
- **folhas inferiores com véu e alça**, tela desfocada atrás, ação primária no rodapé da folha.

Não "melhore" o layout, não troque ícone, não adicione seção, não mude hierarquia tipográfica. Se algo parecer estranho ou faltar informação, **pergunte antes de decidir**.

## Regra 3 — o que esta parte do app não tem

Não existe, em nenhuma tela: **curtida, reação, comentário, resposta escrita, compartilhar, feed, contador de visualizações**. Um pedido recebe oração e nada mais. Se você sentir falta de algo assim, é a ausência que é intencional — pergunte antes de acrescentar.

E nada de emoji.

## Regra 4 — os valores mudam de pessoa para pessoa; os quadros não

Tudo escrito nas imagens é exemplo: "Sabedoria para decidir sobre a mudança de cidade", "orando há 24 dias", "A cirurgia da mãe da Marina, na quinta", "5 pessoas do grupo já oraram", "Trabalho para a Juliana · orado por 61 dias", "Grupo Semente · 6 pessoas", "63 / 240", "3 ativos · 12 respondidos".

**Nada disso hardcoded.** O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam.

Quando o número muda, a frase muda junto, em português correto: "1 pessoa orou" / "12 pessoas oraram", "orando há 1 dia" / "orando há 24 dias" / "orando há 3 meses", "1 ativo · 1 respondido", "Esperando oração · 1".

Tempo relativo: até 24 h em horas ("há 2 h"), depois em dias, a partir de ~60 dias em meses ("orado por 8 meses").

## Regra 5 — o que não estiver codado, você escreve

Não simule, implemente:

1. **Criar pedido (PD2)** — texto até 240 caracteres; visibilidade **grupo / amigos / só eu**; anônimo opcional. "Só eu" não publica para ninguém, fica no diário e **volta na Súplica dos próximos dias**.
2. **"Escrever com ajuda"** — a IA condensa um texto longo numa frase; a pessoa **vê e aprova** antes de publicar. Nunca reescreve automaticamente, nunca publica sozinha.
3. **Anonimato real** — publicado sem nome, o autor não é exposto em nenhuma tela, nem para o admin do grupo. Aparece como "Anônimo" com avatar neutro.
4. **"Orei por isso" / "Orei"** — registra a data; repetir no mesmo dia **não** conta duas vezes; o botão passa a "Você orou" (areia) no resto do dia. O autor recebe **apenas a contagem**, jamais os nomes.
5. **Contador de tempo** — todo pedido guarda a data de criação e mostra há quanto tempo está sendo orado; ao arquivar, o total de dias orados fica gravado no cartão de respondido.
6. **Arquivar (PD4)** — as cinco respostas. **"Espere" devolve o pedido aos ativos sem zerar o contador**; as outras quatro arquivam com o selo. A frase "O que eu vi" é opcional e passa a aparecer em itálico no cartão de respondido em PD1.
7. **Pedidos de grupo em PD1** — entram na mesma lista com o selo do grupo, mostram quantos do grupo já oraram e **não têm "Arquivar"**: quem arquiva é o autor.
8. **Súplica (PD3)** — seleciona **no máximo três** pedidos por sessão, **ordenados por quem recebeu menos oração**, para o pedido de quem tem pouca gente por perto não afundar. "Ver todos" abre PD1 **fora do cronômetro** e volta para a etapa no mesmo ponto. "Pular" avança sem marcar oração.
9. **Encerrar o próprio pedido a qualquer momento** — prometido em PD2, tem que existir.
10. **Filtros de PD1** — Ativos / Respondidos / Do meu grupo, com contagens reais.
11. **Estado vazio** — sem pedidos ativos, os filtros e os respondidos continuam; o lugar dos ativos convida a fazer o primeiro. Nunca uma tela em branco.
12. **Privacidade no servidor** — a lista de quem orou nunca é enviada ao cliente do autor; só a contagem. Pedido "só eu" nunca sai do dono.

## Como entregar

Siga a ordem do README: (1) PD2 + PD1, (2) PD4 e a seção "Respondidos" com conteúdo real, (3) PD3. **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, com o checklist do fim do HANDOFF preenchido para aquelas telas. Só siga para o bloco seguinte depois do meu ok.
