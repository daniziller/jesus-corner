# Prompt para o Claude Code — fazendo os passos (oração, leitura, reflexão, fecho do dia)

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-passos-36-37/` disponível no projeto.

---

Implemente as telas de **execução da rotina diária** do Jesus Corner a partir do pacote em `handoff-passos-36-37/`. Elas complementam o pacote `handoff-meu-plano-35/`: lá está o plano (quais passos, quanto tempo, quais dias), aqui é a hora de fazer.

**Leia primeiro, na ordem:** `README.md` (mapa de navegação, ordem de implementação) e `HANDOFF-36-37-passos.md` (especificação tela por tela, com os textos fixos e as regras). Os dois têm os screenshots embutidos; **abra todos os onze PNGs antes de escrever qualquer código**:

`36a-inicio-oracao.png`, `36b-oracao-acts.png`, `36c-oracao-livre.png`, `36d-pedidos.png`, `36e-arquivar-pedido.png`, `36f-bencao.png`, `37e-concluir-leitura.png`, `37a-reflexao-perguntas.png`, `37b-reflexao-livre.png`, `37c-dia-concluido.png`, `37d-imagem-compartilhavel.png`.

## Fidelidade: 100% ao quadro

Os PNGs não são referência aproximada — são o layout final. Para cada tela, reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar ou reordenar nada;
- o **agrupamento e o enquadramento**: o que está dentro de um bloco no quadro fica dentro dele no código;
- **cores, raios, pesos e tamanhos de fonte, alturas de controle, paddings e gaps** como especificados no HANDOFF;
- o **texto de interface em português, palavra por palavra** — inclusive a frase fixa do topo da oração, as explicações das quatro etapas do ACTS, as cinco respostas de 36e com suas linhas de significado, a bênção de 36f e a pergunta 3 de 37a. Esses textos **são** o design;
- os **estados**: etapa feita / atual / futura, pedido ativo / respondido, pedido meu / do grupo, chip ligado / desligado, relógio correndo / pausado / estourado;
- as **telas altas são uma tela só com rolagem** — cabeçalho rola, botão primário fixo no rodapé, barra de abas fixa onde ela aparece. Nunca quebre uma tela alta em duas.

Duas exceções, marcadas no HANDOFF: **36f** é uma tela de altura de celular, fundo escuro inteiro, sem rolagem; **37d não é tela** — é a imagem exportada em 9:16 (arquivo real 1080×1920).

Se algo no quadro parecer estranho ou faltar informação, **pergunte antes de decidir**. Não "melhore" o layout, não troque ícone, não adicione seções, não mude hierarquia tipográfica.

## Você vai precisar escrever o que falta

Boa parte disto não existe no app ainda. Implemente de verdade, não simule:

1. **Cronômetro por etapa (ACTS)** — tempo do passo ÷ 4; o relógio do cabeçalho conta a etapa, o filete conta a oração inteira; etapa que zera **não avança sozinha** (passa a contar para cima); "Pular etapa" redistribui o tempo restante entre as etapas que faltam; tocar pausa, sair do app pausa.
2. **Ciclo de vida dos pedidos de oração** — criar, "Orei por isso" contando **por dia** (não por clique), contador "orando há N dias", pedidos do grupo agregando quem orou, arquivar com uma das cinco respostas (Sim / Não / Espere / Aprenda / Se mova) + frase opcional. **"Espere" devolve para Ativos sem zerar o contador.** Nada é apagado pela interface.
3. **Resumo do capítulo (37e)** — frase-tese, três momentos com faixas de versículos, "o que mostra sobre Deus / sobre o personagem" e a linha **"O fio da história"** (capítulo anterior → próximo). Estável no dia: reabrir a tela mostra o mesmo texto.
4. **Oração de transição (37e)** — curta, escrita a partir do capítulo, nunca genérica.
5. **Perguntas da reflexão (37a)** — 1 e 2 geradas do capítulo e citando o texto; **a 3 é fixa** ("Em uma frase: o que você vai fazer com isso amanhã?") e "Trocar perguntas" **não** mexe nela. A resposta da 3 é a frase de aplicação que alimenta o Início e o resumo do dia.
6. **Marcações e anotações em 37e** — ler tudo o que a pessoa marcou/anotou no capítulo, com "Editar"; blocos vazios simplesmente não aparecem.
7. **Exportação da imagem (37c/37d)** — PNG 1080×1920, sem elementos de interface, blocos desligados nos chips não renderizados, assinatura (símbolo + Jesus' Corner + @jesuscorner) no rodapé e margens de segurança (12% no topo, 9% na base) livres de informação.
8. **Checagem de IA** — toda referência gerada é conferida contra o texto da versão do usuário antes de aparecer. Trecho que não bate não entra.

## Os valores são de exemplo, os quadros não

Tudo nas imagens é de uma conta de exemplo: "Diego", "Gênesis 41", "02:14", "orando há 24 dias", "5 pessoas do grupo já oraram", "18 semanas", "32 min", "3,4%", as frases escritas, os nomes dos pedidos e dos grupos. Cada usuário terá os seus.

Portanto **nada disso hardcoded** — tudo vem do modelo de dados. O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam. Os textos fixos de interface listados no HANDOFF, sim, são idênticos.

Quando o número muda, a frase muda junto, em português correto: "orando há 1 dia" / "há 24 dias"; "1 trecho" / "2 trechos"; "1 pessoa do grupo já orou" / "5 pessoas do grupo já oraram".

## Links entre as telas

O mapa completo está no README. Os caminhos essenciais:

- 35a: o bloco "Seu plano de hoje" lista todos os passos do dia em ordem (os que não acontecem hoje ficam no fim, esmaecidos, com o motivo). O botão é **um só** — "Começar meu plano", ou "Continuar meu plano" se algo já foi feito: ele abre o passo da vez (Oração → **36b** ACTS ou **36c** livre, conforme 35c) e **emenda os passos seguintes automaticamente**, sem voltar ao Meu Plano entre eles.
- 36b/36c → "Pedidos de oração" → **36d** → "Arquivar" → **36e** → volta para 36d.
- Fim da oração ("Terminei de orar" / última etapa) → **36f** → "Ir para a leitura" (35f) ou "Voltar ao meu plano" (35a). Se a oração era o último passo do dia, o botão vira "Terminar o dia" → 37c.
- 35f, "Concluir" → **37e** → "Começar a reflexão" → **37a** (com perguntas) ou **37b** (livre); "Ver o capítulo outra vez" volta a 35f.
- 37a/37b → "Terminar o dia" → **37c** → "Compartilhar" / "Salvar imagem" exporta **37d**; "Só voltar ao plano" → 35a.

## Regras que valem para todas as telas

1. **Escrever nunca é obrigatório**, em nenhum passo: botão de avançar sempre ativo, campo vazio não é erro, nenhuma mensagem de "você não escreveu nada".
2. **O relógio nunca bloqueia** nem fecha tela: ao zerar, avisa e conta para cima. 37e não consome tempo de passo nenhum.
3. **Privacidade:** oração, anotações e reflexões ficam na conta da pessoa; nada vai para grupo ou banco público sem toque explícito em compartilhar.

## Como entregar

Implemente na ordem sugerida no README (36b/36c/36f → 36d/36e → 37e → 37a/37b → 37c/37d). **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, mais o checklist do fim do HANDOFF preenchido para as telas daquele bloco. Só siga para o próximo bloco depois do meu ok.
