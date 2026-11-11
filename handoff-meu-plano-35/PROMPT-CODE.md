# Prompt para o Claude Code — aba "Meu Plano" do Jesus Corner

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-meu-plano-35/` disponível no projeto.

---

Implemente a aba **Meu Plano** do app Jesus Corner a partir do pacote de design em `handoff-meu-plano-35/`.

**Leia primeiro, na ordem:** `README.md` (mapa de navegação e regras do pacote) e `HANDOFF-35-meu-plano.md` (especificação tela por tela, com as regras de produto e de backend). Os dois documentos têm os screenshots embutidos; abra **todos** os dez PNGs antes de escrever qualquer código:

`35a-meu-plano.png`, `35b-estudo-ativo.png`, `35c-ajustar.png`, `35d-criar-estudo.png`, `35e-proposta.png`, `35f-leitura-relogio.png`, `35g-fim-antes-do-tempo.png`, `35h-estudos.png`, `35i-organizar-leitura.png`, `35j-organizar-estudo.png`.

## Fidelidade: 100% ao quadro

Os PNGs não são referência aproximada — são o layout final. Para cada tela, reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar ou reordenar nada;
- o **agrupamento**: o que está dentro de um contêiner no quadro fica dentro dele no código (ex.: em 35a os três passos, a faixa de tempos e o botão "Ajustar meu plano" vivem todos dentro de um único bloco de fundo levemente escurecido — não são cartões soltos);
- **cores, raios, pesos e tamanhos de fonte, alturas de controle, paddings e gaps** como especificados no HANDOFF;
- o **texto de interface em português**, palavra por palavra, incluindo rótulos, subtítulos, avisos e microcópia;
- os **estados**: passo feito (areia), passo de agora (bloco preto), passo por vir (branco translúcido), interruptor ligado/desligado, opção de método selecionada/não selecionada, dia marcado/não marcado/descanso;
- as **telas altas são uma tela só com rolagem** — cabeçalho rola, barra de abas fixa no rodapé, botão primário fixo onde o HANDOFF indica. Nunca quebre uma tela alta em duas.

Se algo no quadro parecer estranho ou faltar informação, **pergunte antes de decidir**. Não "melhore" o layout, não troque ícone por outro, não adicione seções, não mude hierarquia tipográfica.

## Os valores são de exemplo, os quadros não

Todo dado nas imagens é de uma conta de exemplo: "Diego", "Gênesis 41", "Terça", "1,4 capítulo por 15 min", "Ansiedade: o que a Bíblia diz", "Marina Reis", 10/15/10/5 min, "novembro de 2031", "1 completo de 6". Cada usuário terá os seus.

Portanto: **nada disso hardcoded**. Tudo vem do modelo de dados. O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam. Textos fixos de interface (rótulos, títulos de seção, microcópia) **são** conteúdo do design e devem ser idênticos.

Onde o número mudar, mude a frase junto — o app fala em português correto: "1 completo de 6" / "3 completos de 6"; "3 dias" / "1 dia"; "Hoje é terça: oração, leitura e reflexão".

## Links entre as telas

O `README.md` traz o mapa completo. Implemente todos os caminhos, inclusive:

- **35a e 35b são a mesma rota**, dois estados do mesmo dia (com e sem estudo ativo) — não crie duas telas.
- 35a: "Criar" → 35d · "Ajustar meu plano" → 35c · "Ler agora" → 35f · "Mudar" (grade da semana) → 35c rolando até *Dias da semana* · "Meus estudos" → 35h.
- 35b: "Retomar já" encerra o estudo e devolve 35a ao estado normal, em um toque.
- 35c: "Organizar a leitura" → 35i · "Organizar o estudo" → 35j · "Salvar plano" volta para 35a já refletindo as mudanças.
- 35i: "Escolher" → lista de livros · "Trocar" → versão · "Minha ordem" → ordenação dos livros · "Salvar" volta para 35c.
- 35j: "Ver os 7 dias" → lista de dias editável · "Encerrar" encerra o estudo · "Meus estudos" → 35h.
- 35h: "Criar um estudo" → 35d · "Mudar dias" → 35j · qualquer cartão de estudo → prévia (estrutura de 35e, com "Começar").
- 35d: "Montar estudo" → 35e. 35e: "Refazer" gera outra proposta; "Salvar p/ depois" guarda em 35h; "Começar amanhã" ativa o estudo (35a passa ao estado 35b).
- 35f: pílula do relógio pausa/retoma · "Concluir" com tempo sobrando abre **35g**, sem tempo sobrando segue para a Reflexão.
- 35g: "Continuar lendo" segue no trecho seguinte **e reescreve o plano a partir do último versículo lido**; "Finalizar por aqui" fecha o passo e vai para a Reflexão.

## Comportamentos que precisam de código (detalhados no HANDOFF)

1. **Passos ligáveis** — cada passo entra/sai do plano; minutos por passo; total = soma dos ligados. Passo desligado desaparece da rotina, da faixa de tempos, do total, do "passo N de M" e da grade da semana.
2. **Oração**: método ACTS (4 etapas) ou Livre (mesmo cronômetro, sem etapas). **Reflexão**: com perguntas geradas ou folha em branco.
3. **Dias por passo** — cada passo ativo tem seu próprio conjunto de dias (Bíblia e estudo podem cair em dias diferentes). A rotina de cada dia é montada pelos passos marcados naquele dia.
4. **Meta semanal** = dias cumpridos ÷ dias com **algum** passo marcado. O mesmo número em três lugares: grade de 35a, pílula de 35c e cartão "Esta semana".
5. **Relógio da leitura** — contagem regressiva, pausa ao tocar e ao sair do app, ao zerar apenas avisa (nunca bloqueia nem fecha a tela).
6. **Terminar antes do tempo** — 35g; ao continuar, o ponto de retomada passa a ser onde a pessoa parar e as sessões seguintes são recalculadas.
7. **Ritmo aprendido** — mediana móvel de palavras/min das últimas 10–12 sessões; blocos montados por capítulos inteiros com 15% de tolerância; cold start e limites de variação como está no HANDOFF. Reprojetar a data de término a cada atualização.
8. **Estudos** — quatro origens (criar com IA, Jesus Corner, grupos, banco público), busca por tema/livro/autor, filtro por origem, e a regra de ouro: **nenhum trecho gerado pela IA é mostrado sem ser conferido contra o texto da versão do usuário**.

## Como entregar

Implemente em blocos, na ordem sugerida no README (35c → 35i → 35j → 35a/35b → 35f → 35g → 35h → 35d → 35e). **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, mais o checklist do fim do HANDOFF preenchido para as telas daquele bloco. Só siga para o próximo bloco depois do meu ok.
