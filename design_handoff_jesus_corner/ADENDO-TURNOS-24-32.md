# ADENDO — rodadas 24 a 32

Especificação das telas criadas depois do `README.md`. **Onde este documento discordar do README, este vence.** O arquivo de design é a referência final.

Rodadas: 24 Comunidade · 25 Pedidos de oração · 26 Os três passos e estudos · 27 Dias da semana · 28 Bíblia por testamento e onde começar · 29 Início e aplicação · 30 Constância e métricas · 31 Resumo semanal · 32 Leitura livre e grade clicável.

**Persona única de todos os exemplos:** 50 capítulos lidos (Gênesis 40 + Êxodo 6 + Rute 4) de 1.189 = 4,2%; AT 5,4%; parou em Gênesis 41; 9 h 05 no app (2 h 05 orando, 5 h 40 lendo, 1 h 20 refletindo); 4 dias marcados por semana (seg, qua, sex, dom); 18 semanas na meta. Se você mudar um número, mude em todas as telas.

---

## Rodada 24 — Comunidade

A aba Comunidade **abre em `24a`**, não dentro de um grupo. `5d` passa a ser página interna, aberta ao tocar num grupo, e ganha botão de voltar.

### `24a` Início da Comunidade
- Cabeçalho "Comunidade" + "3 grupos · 12 amigos"; à direita busca e "+".
- **Bloco escuro "Sala aberta agora"**: só aparece quando existe sala do capítulo que a pessoa acabou de ler. Mostra grupo + capítulo, avatares, "4 de 6 leram · 7 mensagens novas", botão laranja "Entrar na sala". Sem sala, vira o grupo com mais gente atrasada ("3 do Semente pararam em Gênesis 38"); sem isso, desaparece e a lista sobe.
- **"Seus grupos"**: linha por grupo com iniciais, nome, "6 pessoas · Gênesis, junto com você", badge laranja de não lidas; grupo silenciado em cinza com "Silenciado".
- **Dois blocos de ação**: "Criar grupo" (areia) e "Entrar com código" (branco).
- **"Amigos"** com "2 pedidos" em laranja, faixa horizontal: primeiro o tile "Adicionar" (tracejado), depois amigos com iniciais; ponto laranja = leu hoje.

### `24b` Criar grupo (folha)
Três decisões: **nome** (iniciais geradas), **o que o grupo lê** (cada um no seu plano · um plano só para todos — esta segunda é a que liga a sala por capítulo e a pergunta da semana), **quem entra** (só com meu convite · com o código). Nota areia: link + código de 6 letras depois de criar. CTA "Criar e convidar".

### `24c` Adicionar amigos
Abre no que espera resposta: **bloco escuro "Querem te acompanhar · 2"** com Aceitar / recusar por pedido. Depois: cartão areia "Compartilhar meu convite" com link pessoal; "Talvez você conheça" (dos seus grupos) com Adicionar / Enviado; linha "Ver meus 12 amigos"; rodapé fixo "Convidar pelo WhatsApp". Regra escrita na tela: **amigo vê ritmo e notas compartilhadas — nunca notas privadas, marcações ou conversas com a IA.**

---

## Rodada 25 — Pedidos de oração

### `25a` Súplica (dentro do passo Oração)
- Cabeçalho de passo + barra do ACTS com a 4ª etapa ativa e o relógio.
- Bloco escuro "Súplica · para hoje": "Comece pelos seus — depois leve os três pedidos abaixo."
- **Lista "Esperando oração · 3"**: cada pedido é uma linha com iniciais, nome (ou "Anônimo"), origem e tempo, o texto, botão **"Orei"** (preto → areia "Você orou") e o contador "5 pessoas oraram".
- **Máximo 3 pedidos por sessão**, ordenados por quem recebeu menos oração. "Ver todos" abre a lista completa na Comunidade, fora do cronômetro.
- Linha "Fazer um pedido · você escolhe quem vê" → `25b`.

### `25b` Fazer um pedido (folha)
Texto curto (240 caracteres) com "Escrever com ajuda" (a IA encurta um desabafo; a pessoa aprova), **quem vê** (grupo · amigos · só eu, que guarda no diário e volta na Súplica), **publicar sem meu nome**. Nota: **quem pede recebe só o número de pessoas que oraram, nunca os nomes**, e pode encerrar o pedido. Ninguém comenta pedido — só ora.

---

## Rodada 26 — Os três passos, o tempo e os estudos

Cabeçalho igual nos três passos: voltar · chip escuro do passo ("Oração 1 de 3") · **chip do tempo, que é botão** ("10 min ˅" → `26d`).

### `26a` Passo 1 · Oração (ACTS)
Cartão branco com o **chip "Método ACTS ˅"** (alterna para oração livre, `26h`), barra das 4 etapas, relógio e pílula **"+2 min"**. As quatro etapas em três estados (areia feita · escura agora · branca depois); Súplica mostra "3 pedidos esperando". Bloco escuro da etapa atual com o texto-guia, "Pausar" e "Próxima etapa". Rodapé "Ir para a leitura".

### `26h` Passo 1 · Oração livre
Mesmo cabeçalho e rodapé; miolo sem etapas: uma barra só, bloco escuro "Sem etapas · só você e Deus", "Pausar" e "Silenciar o relógio", e chips opcionais de empurrão (Agradecer · Confessar · Pedir · 3 pedidos do grupo). **A escolha é lembrada:** quem escolhe livre não vê mais as quatro etapas.

### `26b` Passo 2 · Leitura
Cabeçalho de passo + chip escuro do capítulo + barra fina de **progresso do capítulo** (não do tempo) com o relógio à direita. Texto em cartão branco. Rodapé: "Perguntar à IA" + salvar/marcar/nota, e CTA "Ir para a reflexão". **Concluir o passo marca o capítulo como lido** — aqui não existe a pergunta de `32b`.

### `26c` Passo 3 · Reflexão
Segmentado no topo: **Escrever · Falar · Só pensar**. Bloco escuro da pergunta com "trocar" dentro do cartão. Cartão de resposta com chips ("Não sei o que escrever", "Outra pergunta", "Versículo"). Barra "Três perguntas hoje · dá para parar na primeira". Depois das três vem `29b`.

### `26d` Tempo de cada passo (folha)
Bloco escuro: total da sessão, proporção entre os três passos e a **projeção**: "Neste ritmo, a Bíblia inteira em 2 anos e 3 meses · termina em dezembro de 2028 · faltam 1.139 dos 1.189 capítulos" — recalcula a cada toque no − / + da Leitura, desconta o já lido e usa **só os dias marcados** em `27a`. Steppers de 1 min (1–60) por passo; **zerar remove o passo da rotina** e o chip dele sai do cabeçalho. Presets (Rápido 8 · Padrão 33 · Longo 60) e "Sem cronômetro".

### `26e` Adicionar estudo
Aviso de que o estudo **substitui a leitura do dia** e Gênesis pausa. **Estudos prontos primeiro** (título, dias, livros, botão "Usar"), linha "Explorar estudos da comunidade" (→ `26g`), depois o bloco escuro "Criar com a IA — você escolhe o tema e quantos dias" com campo e CTA. Rodapé "Continuar em Gênesis 41, sem estudo".

### `26f` Ajustar o estudo
Bloco escuro com o roteiro gerado e "refazer". Stepper de dias. **Quem pode ver**: só eu · quem eu convidar · público (entra no banco com seu nome — só o roteiro, nunca notas). Linha "Fazer junto com" (amigos/grupos). Linha **Tema** com chips iguais aos filtros de `26g` — é o que torna o estudo público encontrável. CTA "Começar hoje".

### `26g` Banco de estudos
Busca por tema, chips (Perdão · Ansiedade · Casamento · Luto · Dinheiro · Salmos), destaque "Mais feito em perdão" com autor e quantas pessoas fizeram, lista com autor + dias + pessoas + "Usar", rodapé "Ordenar e filtrar". Todo estudo público mostra **autor e quantas pessoas fizeram**; três denúncias tiram do banco até revisão.

---

## Rodada 27 — Dias da semana

### `27a` Pergunta 4 — quais dias
Sete pílulas (Seg…Dom) com marcadas em preto + ponto laranja e não marcadas legíveis (`#6E655C`). Atalhos: 3 dias · 4 dias · Dias úteis · Todos. Bloco escuro: "4 dias por semana · 15 min de leitura em cada" + projeção ("3 anos e 4 meses · termina em janeiro de 2030"). Rodapé: "A sequência conta semanas cumpridas, não dias seguidos."
**Consequências:** as barras do onboarding viram 6 segmentos; o lembrete cai só nos dias marcados; "Esta semana" mostra 4 círculos, não 7; a projeção de `15f`/`26d`/`30b` usa estes dias.

---

## Rodada 28 — Bíblia por testamento e onde começar

### `28a` Bíblia
Título + "50 de 1.189 capítulos · 4,2% lidos" + busca. **Dois cartões do mesmo tamanho**: Antigo (escuro, 39 livros, 50 de 929, anel 5,4%, "Você está em Gênesis 41", "Abrir") e Novo (branco, 27 livros, 0 de 260, anel 0%, "Mateus é um bom começo", "Abrir"). Cartão areia "Última leitura livre". Barra de abas com Bíblia ativa.

### `28b` Lista de livros do testamento
Cabeçalho com "50 de 929 capítulos · 5,4%" e chip da versão. Chips de grupo (Todos os 39 · Pentateuco · Históricos · Profetas) — **o chip ativo tem de bater com a lista mostrada**. Cada livro: nome, "40 de 50 capítulos", barra e porcentagem. Rodapé "Marcar capítulos que já li · antes do app" → `28c`.

### `28c` Modo "Marcar lidos"
Chip escuro "Marcando" no cabeçalho. Bloco escuro com "42 de 50 lidos", anel e "2 marcados agora, ainda não salvos". Grade onde **tocar marca/desmarca** (não abre o texto), atalho "Marcar 1 a 41", legenda e "Marcar todo o livro / Desmarcar tudo". Rodapé: cancelar + "Salvar 2 capítulos". **Capítulo marcado à mão entra na porcentagem; não conta como sessão nem mexe na sequência.**

### `28d` Por onde começar
Três modos juntos: **Gênesis 1** (sugerido) · **Mateus 1** ("o começo mais fácil para quem nunca leu e para quem está voltando") · **Sem plano — leio e vou marcando**. Depois, e só para os modos com plano: **ordem da Bíblia** ou **ordem cronológica**. Linha "Escolher outro livro". Cartão areia: "Você já tem 40 capítulos marcados em Gênesis — na próxima tela você escolhe o que fazer com eles." CTA "Continuar" → `28e`.

### `28e` Já leu parte do livro
Quatro saídas: **Seguir de onde parei** (sugerido, mantém marcações) · **Reler do capítulo 1** (marcações ficam) · **Começar limpo** (desmarca — única ação destrutiva, pede confirmação) · **Já terminei Gênesis** (marca o que falta e começa em Êxodo 1). Prévia "Como fica a sua semana" muda com a escolha. Nota: dá para marcar e desmarcar depois em `28c`.

---

## Rodada 29 — Início e frase de aplicação

### `29a` Início (topo)
Ordem dos blocos: saudação + iniciais → **versículo do dia** (cartão branco, rótulo laranja, versículo em itálico, referência, salvar/compartilhar; **preferir um versículo do trecho que a pessoa está lendo**) → **bloco escuro "Onde você está"** com "Você parou em Gênesis 41", **o último texto lido** ("ontem às 6:48: o faraó sonha com as sete vacas..."), barra de 80% e os botões "Continuar em 42" / "Reler 41" → **cartão areia "Sua aplicação de ontem"** com a frase, botão "Cumpri" e "3 de 4 aplicações cumpridas nesta semana" → linha "Hoje · Oração 10 · Leitura 15 · Reflexão 8".

### `29b` Reflexão · a frase de aplicação
Quarto e último passo da reflexão (as barras viram quatro). Bloco escuro: "Em uma frase: o que você vai fazer hoje com isso? · Uma ação de hoje, não uma intenção geral. Aparece amanhã no seu Início." Campo com chips "Me ajuda a escrever" (transforma as respostas anteriores em frase de ação — **proposta, nunca salva sozinha**), "Mais curta", "Falar". Toggle "Me lembrar às 18h". Nota: a frase é privada. CTA "Salvar e concluir o dia".

---

## Rodada 30 — Constância e métricas

### `30a` Início (rolando)
Depois do bloco de hoje: **constância** (18 semanas na meta, 9 barras, a clara é a semana em curso) → **"Esta semana"** com os **dias marcados** (4 círculos) e a frase "Hoje é sexta — falta a sessão de hoje e domingo" → cartão areia "Aplicações cumpridas · 3 de 4" → três números (50 capítulos · 9 h com Deus · 1 livro) → linha "Minhas métricas completas" → `30b`.

### `30b` Minhas métricas
Chips de período (30 dias · Este ano · Desde o começo). Bloco escuro "Tempo com Deus · 9 h 05" com a divisão orando/lendo/refletindo e legenda. Três tiles: 2 h 05 orando · 5 h 40 lendo (50 capítulos) · 1 h 20 refletindo (34 respostas). Cartão "Capítulos": 50 lidos · faltam 1.139 · 4,2% · "os 1.139 que faltam levam 3 anos e 4 meses". Linhas: sessão média 25 min · horário que mais lê 6h–7h. Rodapé "Ver progresso por bloco".

### `30c` Progresso por bloco
AT (escuro, 5,4%, 50 de 929) e NT (branco, 0%, 0 de 260). Os **oito blocos** com capítulos lidos/total e porcentagem: Pentateuco 46/187 · Históricos 4/249 · Poéticos 0/243 · Profetas maiores 0/183 · Profetas menores 0/67 · Evangelhos e Atos 0/117 · Cartas 0/121 · Apocalipse 0/22. Soma a marcação livre. Tocar num bloco abre `28b`. Rodapé "Exportar meu histórico · PDF".

---

## Rodada 31 — Resumo semanal

Chega domingo 20h (push, dentro do limite de 1 por dia), com cartão no Início na segunda e linha nas métricas. Três telas da mesma página.

### `31a` Os números
Bloco escuro "Meta da semana": "3 de 4 dias cumpridos", os quatro dias marcados (cumpridos em laranja com check, o que faltou apagado), "Faltou domingo. Você bateu a meta em 18 das últimas 19 semanas." Três tiles: 4 capítulos (Gênesis 38 a 41) · 3 notas e 4 marcações · 3/4 aplicações. Cartão "Tempo em cada passo · 1 h 14" com barras: Oração 30 min · Leitura 32 min · Reflexão 12 min. Linhas: sessão média 25 min · dia mais longo quarta 31 min · perguntas à IA 2. CTA "Ler o resumo da semana".

### `31b` O resumo escrito pela IA
Bloco escuro com losango: tema da semana em negrito, o parágrafo montado **só com o que existe no app** (capítulos, notas, marcações, respostas, aplicações) e uma segunda linha sobre a aplicação cumprida. Depois: "Leitura · 4 capítulos · Gênesis 38 a 41 · 32 min lendo" com os dias em barras; "O que você anotou · 3 notas" com as citações; cartão areia "Aplicações cumpridas · 3 de 4". CTA "Oração e grupo na semana". **Semana em branco não gera texto motivacional** — gera "semana em branco" com um capítulo curto para recomeçar.

### `31c` Oração e grupo
Cartão "Oração": orou por 5 pedidos · 9 pessoas oraram pelo seu · 10 min em Súplica. Bloco escuro "No Grupo Semente" com o que aconteceu na sala e quem voltou. Cartão "A pergunta da próxima semana" (nasce do que a pessoa escreveu) com "Levar para a reflexão" e "Levar ao grupo". Nota: o resumo é privado; compartilhar gera cartão **só com tema e capítulos** — sem notas, pedidos ou nomes.

---

## Rodada 32 — Leitura livre e grade clicável

### `32c` Grade de capítulos
**Toque abre o capítulo** (`32a`). Bloco escuro do livro com anel e a frase "Toque num número para abrir o capítulo". Legenda preto/laranja. Chip "Marcar lidos" no cabeçalho é a **única** porta para `28c`. Rodapé "Continuar em Gênesis 41".

### `32a` Leitura livre — começo
Substitui `4a`. Cabeçalho: voltar · chip escuro "Gênesis 41 ˅" (seletor) · chip da versão. Linha "Leitura livre · não conta no plano" com barra de progresso do capítulo. **No começo do texto, uma caixa de seleção discreta "Já li este capítulo — marcar como lido"** — marcar aqui não avança nem fecha nada. Texto em cartão branco (18px/1.7, número de versículo laranja em superscript). Rodapé: "Perguntar à IA" + salvar, marcar, notas.

### `32b` Fim do capítulo
Ao chegar no último versículo, aparece o bloco escuro **"Marcar Gênesis 41 como lido?"** com três saídas: **"Marcar e ir para 42"** (laranja), **"Só marcar"**, e no rodapé **"Ir para 42 sem marcar"**. O bloco **não** flutua sobre o texto durante a leitura, e **não** existe dentro da rotina (`26b`), onde concluir o passo já marca.

---

## Varredura de identidade

As últimas telas no sistema antigo eram `4a` (leitura livre) e o seletor de versão. `32a` resolve a primeira; **o seletor de versão ainda não foi redesenhado** — implemente-o no padrão de folha de `19b`/`26d` e me mostre antes de fechar o bloco 5. Todo o resto do app está na identidade Bento.
