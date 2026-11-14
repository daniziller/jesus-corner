# Prompt para o Claude Code — anotação de pregação

Cole o texto abaixo como primeira mensagem, com a pasta `handoff-anotacao-34/` disponível no projeto.

---

Implemente a **anotação de pregação** do Jesus Corner a partir do pacote em `handoff-anotacao-34/` — as cinco telas que existem depois de tocar em **"Anotar uma pregação"** no Hoje.

**Leia primeiro, nesta ordem:** `README.md` (mapa de navegação e ordem de implementação) e `HANDOFF-34-anotacao.md` (especificação tela por tela, com os textos fixos, os estados e os tokens). Os dois têm os PNGs embutidos.

## Regra 1 — abra o PNG antes e depois de cada tela

**Antes** de escrever a tela, abra o PNG dela e olhe o quadro inteiro. **Depois** de codar, abra o PNG de novo ao lado do que você fez e compare bloco por bloco. Os cinco arquivos:

`34d-folha-sobre-o-texto.png`, `34e-lapis-flutuante.png`, `34f-campos-da-anotacao.png`, `34g-escrevendo.png`, `34h-resumo-da-anotacao.png`.

Os screenshots existem para você entender o **layout**: o que é cada bloco, onde ele fica, o que está dentro do quê, qual é a hierarquia e o estado de cada controle.

## Regra 2 — o layout é exatamente o do quadro

Os PNGs não são referência aproximada, são o layout final. Para cada tela reproduza **exatamente**:

- a **ordem dos blocos** de cima para baixo, sem inserir, remover, agrupar nem reordenar nada;
- o **enquadramento**: o que está dentro de um cartão no quadro fica dentro dele no código — em especial o versículo citado de 34g, que fica **dentro** do texto e não num cartão à parte;
- **cores, raios, pesos e tamanhos de fonte, alturas de controle, paddings e gaps** conforme os tokens do HANDOFF — inclusive o significado dos fundos: branco é o texto bíblico e o que a pessoa escreveu, areia são as passagens, preto é o app falando (só a tarja de 34e e o resumo de 34h);
- o **texto de interface em português, palavra por palavra**, em tudo que o HANDOFF marca como **fixo** — "Na tela agora", "O que você está anotando", "tudo opcional", "Sermão / Culto / Aula / Palestra / Vídeo online / Outros", "O que ficou desta anotação", "Escrito a partir das suas próprias palavras. Nada aqui foi acrescentado ao que você anotou.", "Os pontos que você marcou", "Levar ao grupo", "Guardar na biblioteca", "Voltar e escrever mais". Esses textos **são** o design;
- os **estados**: folha expandida / meia / recolhida no lápis, lápis com e sem selo, tipo selecionado e não selecionado, campo preenchido e placeholder, sem passagem presa, sem tópico nenhum, anotação curta sem resumo, toggle de grupo desligado;
- a folha de 34d **por cima do texto rolável**, com véu; 34g **sem** o texto atrás.

Não "melhore" o layout, não troque ícone, não adicione seção, não mude hierarquia tipográfica. Se algo no quadro parecer estranho ou faltar informação, **pergunte antes de decidir**.

## Regra 3 — os valores mudam de conta para conta; os quadros não

Tudo escrito nas imagens é de uma conta de exemplo: "A espera que forma", "Pr. João Ribeiro", "Batista Central", "Gênesis 43", "Terça, 2 de setembro · 20:14", "2 passagens", "24 min anotando", "Manhã com a Palavra · 8 pessoas", os três tópicos, o texto que a pessoa escreveu.

**Nada disso hardcoded** — tudo vem do modelo de dados, do texto bíblico e do que o usuário escreveu. O que precisa ser idêntico ao quadro é a **estrutura**: quais blocos existem, em que ordem, com que aparência, em que estado e para onde levam.

Quando o número muda, a frase muda junto, em português correto: "1 passagem" / "2 passagens", "A passagem" / "As três passagens", "1 pessoa" / "8 pessoas".

## Regra 4 — o que não estiver codado, você escreve

Não simule, implemente:

1. **Entrada pelo Hoje** — o cartão "Anotar uma pregação" abre a Bíblia **no último capítulo lido** com 34d já expandida. Se não houver capítulo lido, abre onde o plano está.
2. **Folha arrastável em três alturas** — recolhida (lápis), meia folha, folha cheia; o capítulo continua rolável por baixo em todas, com o véu `rgba(26,23,20,.18)` enquanto a folha está por cima.
3. **Lápis flutuante persistente** — arrastável, com posição lembrada, presente nas duas leituras e na Bíblia inteira; selo com o número de passagens; sem anotação em andamento aparece sem selo e começa uma nova ao toque. A tarja escura some sozinha depois de alguns segundos.
4. **"Na tela agora"** — o app sabe qual versículo está visível no viewport da leitura e oferece **essa** referência no botão marrom; tocar prende a passagem na anotação. Referência nunca é digitada à mão.
5. **Tipo "Outros"** — abre campo de texto curto; o que a pessoa escreve fica salvo como tipo reaproveitável nas próximas anotações dela.
6. **Rascunho automático** — gravado a cada pausa da digitação e ao sair do app; reabrir restaura o cursor onde estava. É o que permite 34g não ter "Salvar".
7. **Inserção de versículo no meio do texto** — o botão "Versículo" abre busca de referência; o resultado entra como **bloco citado inline** com o texto real da versão do usuário e a referência embaixo. Editar o texto ao redor não quebra o bloco; apagar o bloco solta a passagem da lista.
8. **Tópicos** — o botão "Tópico" quebra a escrita em pontos numerados, que são o que alimenta o cartão "Os pontos que você marcou" de 34h.
9. **Ditado** — transcrição por voz inserida no ponto do cursor, para quem não consegue digitar acompanhando a fala.
10. **Resumo de 34h** — escrito **a partir das palavras da anotação**: o que voltou mais de uma vez, onde a atenção esteve, a diferença entre o tema anunciado e o que a pessoa guardou. Nunca acrescenta teologia, nunca elogia. **Com menos de ~40 palavras escritas, o bloco preto não aparece.**
11. **"Marcar na Bíblia"** — transforma todas as passagens da anotação em marcações de uma vez, na cor padrão, e elas passam a aparecer na Biblioteca.
12. **Publicação por grupo** — desligada por padrão, escolha explícita de grupo, a mesma folha de 39f.
13. **Guardar na biblioteca** — a anotação entra na Biblioteca sob o chip **Sermões**, com tipo, preletor, instituição, data, duração, passagens e tópicos pesquisáveis.

## Como entregar

Siga a ordem do README: (1) 34d + 34e, (2) 34f, (3) 34g, (4) 34h. **Depois de cada bloco, pare** e me mostre a tela ao lado do PNG correspondente, com o checklist do fim do HANDOFF preenchido para aquelas telas. Só siga para o bloco seguinte depois do meu ok.
