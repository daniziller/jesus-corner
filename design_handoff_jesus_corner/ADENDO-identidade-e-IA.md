# Adendo: identidade Bento + features de IA

> **Atualização (rodadas 11–17).** Marca fechada, onboarding novo, telas de
> conta e leitura social. Resumo no fim deste arquivo, em "O que mudou depois".

Este adendo é mais novo que o `README.md` e **prevalece sobre ele** em qualquer
valor visual. O README continua válido para racional de produto, mudanças de
lógica, navegação e monetização.

O que mudou desde o README: as telas finais usam a identidade **Bento** — blocos
de conteúdo sobre fundo creme, tipografia Manrope, laranja mais vivo, preto mais
quente. Os tokens antigos (`--or #9D4300`, Be Vietnam Pro, `--grad-primary`)
foram substituídos.

---

## Tokens novos

Adicione em `src/index.css`. Os nomes são sugestão; o que importa são os valores.

### Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `--bento-bg` | `#EDE8E2` | Fundo de tela |
| `--bento-card` | `#FFFFFF` | Bloco de conteúdo |
| `--bento-ink` | `#1A1714` | Preto quente: texto principal, blocos escuros, blocos de IA |
| `--bento-accent` | `#F0662B` | Laranja: ação primária, números de versículo, rótulos ativos |
| `--bento-sand` | `#E6DACB` | Bloco de aviso / leitura livre / nota lateral |
| `--bento-sand-ink` | `#5A4327` | Texto sobre `--bento-sand` |
| `--bento-sand-label` | `#9C8B76` | Rótulo sobre `--bento-sand` |
| `--bento-t2` | `#6E655C` | Texto secundário |
| `--bento-t3` | `#8B8279` | Texto terciário / subtítulo |
| `--bento-t4` | `#A29A91` | Rótulo de seção |
| `--bento-t5` | `#BDB5AC` | Metadado, chevron |
| `--bento-line` | `#F2EEE9` | Divisor e fundo de chip inativo |
| `--bento-toggle-off` | `#E6E1DA` | Trilha de interruptor desligado |
| `--bento-mark` | `#FFE3C9` | Trecho marcado no texto bíblico |
| `--bento-select` | `#C9DCEF` | Trecho **selecionado** (borda `#7EA6CE`) — distinto da marcação |

Sobre bloco escuro, os níveis de texto são
`#FFF` → `rgba(255,255,255,.9)` → `.62` → `.45` → `.38`, e as superfícies
internas são `rgba(255,255,255,.06)`; o realce laranja é
`rgba(240,102,43,.14)` com o texto em `#F0662B`.

Não existe mais gradiente. A ação primária é laranja sólido `#F0662B` com texto
em `#1A1714` — não branco.

### Tipografia

Uma família só: **Manrope** (400, 500, 600, 700, 800).

| Papel | Valor |
| --- | --- |
| Título de tela | 19px / 800 / 1.1 / −.6px |
| Título de bloco escuro | 24px / 800 / 1.25 / −.8px |
| Título de destaque | 30–33px / 800 / 1.1 / −1.2px |
| Estatística | 22px / 800 / 1.15 / −.8px |
| **Texto bíblico** | **18.5px / 500 / 1.72** · `text-wrap: pretty` |
| Número de versículo | 10.5px / 800 · `vertical-align: super`, cor `--bento-accent` |
| Resposta da IA | 15px / 500 / 1.65 · `text-wrap: pretty` |
| Título de item | 14.5px / 700 / 1.2 |
| Corpo | 13.5px / 500 / 1.5–1.6 |
| Corpo secundário | 12.5px / 500 / 1.4 |
| Rótulo de seção | 10.5px / 800 / 1 · `letter-spacing: .12em`, uppercase |
| Rótulo laranja de capítulo | 11px / 800 · `letter-spacing: .14em`, uppercase |
| Botão | 13.5–15.5px / 800 |

### Forma

- Bloco escuro de destaque e bloco de texto: raio **28px**.
- Cartão de conteúdo: raio **24px**. Sub-bloco: **20px** ou **18px**.
- Campo, botão, item interno: raio **16px** ou **14px**.
- Chip e interruptor: **99px**. Quadrado de ícone: **12px**.
- Padding: tela **20px** lateral; bloco **20–22px**; bloco de texto bíblico
  **26px 24px**.
- Gap entre blocos empilhados: **10px**.
- Interruptor: 46×28px, botão interno 22px. Ligado: trilha `--bento-ink`,
  botão `--bento-accent`. Desligado: trilha `--bento-toggle-off`, botão branco.
- Botão de ação de rodapé: altura **52–54px**.

### Marca da IA

Todo elemento de IA usa **bloco `--bento-ink`** com um **losango laranja** de
10–11px (`transform: rotate(45deg)`, raio 2px) antes do rótulo. É o sinal único
que diz ao leitor "isso foi escrito por máquina". Não use ícone de estrela,
faísca, cérebro nem robô.

---

## As seis telas de IA

Medidas e textos exatos estão no HTML — aqui está o comportamento.

### 10a — Menu de seleção com "Perguntar"

O usuário seleciona um trecho; o trecho ganha fundo `--bento-select` com borda
`#7EA6CE` (visualmente diferente da marcação amarela, que é permanente).
Aparece um menu escuro flutuante ancorado ao trecho, raio 20px, com quatro
ações de 56px: **Perguntar** (única colorida, laranja), Marcar, Nota, Copiar.

No rodapé, um bloco branco com até três **sugestões de pergunta geradas para
aquele trecho** ("O que isso significa?", "Por que sete?", "Contexto
histórico"). Dúvida vira toque, não digitação. As sugestões mudam com o trecho.

### 10b — Folha de resposta

Folha inferior ocupando ~75% da altura, `--bento-ink`, raio superior 34px, com
alça de arraste. O versículo em questão continua visível acima dela — o leitor
não perde o lugar.

Estrutura fixa da resposta, de cima para baixo:
1. Rótulo "Resposta sobre <referência>" + losango laranja + "fechar".
2. A pergunta do usuário, num bloco `rgba(255,255,255,.06)`.
3. A resposta — dois parágrafos no máximo.
4. **Citação de sustentação** — bloco `rgba(240,102,43,.14)`, rótulo
   "No texto · <referência>", o versículo em itálico.
5. **Citação de expansão** — bloco `rgba(255,255,255,.05)`, rótulo
   "Leia também · <referência>", uma linha de por quê.
6. Rodapé: "Salvar na nota" + botão de feedback + campo "Perguntar outra coisa…"
   com botão laranja de envio.

Os itens 4 e 5 são obrigatórios. Se o modelo não conseguir citar, a resposta não
sai — ver 10e.

### 10c — Contexto antes do capítulo

Tela opcional e pulável, mostrada antes de abrir o texto. Um bloco escuro com
"Onde você está na história" (3–4 linhas), dois sub-blocos ("Quem aparece",
"Fio do capítulo"), e um cartão branco "Fique de olho em" com três pontos.

O objetivo é resolver o abandono de quem cai em Gênesis 41 sem lembrar do 39.
Nunca é uma parede antes do texto: "Pular contexto e ir direto ao texto" fica
sempre visível.

### 10d — Reflexão com perguntas geradas

Substitui o campo em branco da reflexão atual, que é o maior ponto de abandono
do app. A IA faz **três perguntas curtas**, uma por vez, ancoradas no capítulo
lido — a primeira liga o texto à vida do leitor.

O bloco escuro traz a pergunta (24px/800) e a linha de privacidade ("Ninguém lê
o que você escreve aqui"). Abaixo, o campo de escrita em cartão branco, com dois
escapes em chip: "Não sei o que escrever" e "Outra pergunta". Ao fim das três, a
IA junta as respostas num parágrafo para o diário — **e o usuário aprova antes
de salvar**.

### 10e — Quando a IA não deve responder

Três recusas com texto pronto no HTML. Implemente as três como caminhos de
verdade, não como texto genérico de erro:

| Caso | Comportamento |
| --- | --- |
| Doutrina divergente | Não decide. Oferece "Ver os textos" (os dois lados) e "Anotar pra perguntar" (vai para a Biblioteca) |
| Fora do texto | Diz que não sabe e oferece ler o que a Bíblia diz sobre o tema próximo |
| Sinal de risco | **Interrompe** a resposta. Mostra CVV 188, 24h, gratuito, com botão "Falar com alguém agora", antes de qualquer versículo |

Rodapé permanente em toda resposta: "escrito por IA, confira no texto".

### 10f — Ajustes do assistente

Três interruptores independentes (Perguntar sobre o texto · Contexto antes do
capítulo · Perguntas na reflexão — este último **desligado por padrão**), um
seletor de tom de resposta em três blocos (**Direto** 2 frases · Explicado com
contexto · Estudo com referências — muda tamanho e tom, nunca o conteúdo), e
"Guardar minhas perguntas" com "Apagar todas as perguntas" em laranja.

Bloco `--bento-sand` no rodapé: sem internet, leitura, áudio baixado e notas
funcionam igual; só o assistente fica indisponível, **e o app diz isso na hora,
não depois de esperar**.

---

## Implicações técnicas

1. **Seleção de texto sobre o texto bíblico** precisa ser própria, não a nativa
   do navegador — o menu é customizado e o trecho vira referência
   (livro/capítulo/versículo inicial e final) enviada ao modelo.
2. **O prompt do modelo recebe o capítulo inteiro como contexto** e a instrução
   de citar apenas dentro dele. Resposta sem citação verificável é descartada.
3. **Classificação de risco antes da resposta**, não depois — a mensagem de
   ajuda precisa aparecer sem passar pelo modelo de conteúdo.
4. **Perguntas e respostas salvas em `localStorage`** por padrão, agrupadas por
   capítulo, e aparecem na Biblioteca junto das notas.
5. **Degradação offline explícita**: o item "Perguntar" fica visivelmente
   indisponível, sem tentativa de rede e sem spinner.
6. **Custo por leitura**: o contexto de 10c e as perguntas de 10d podem ser
   gerados uma vez por capítulo e cacheados — são iguais para todos os
   usuários. Só 10a/10b são por usuário.

---

## O que mudou depois (rodadas 11–17)

### Marca (16a–16c)
- Símbolo: livro aberto — tile `#1A1714` raio ~29% do lado, duas páginas
  `#A29A91` com linhas de texto em `#1A1714`, lombada `#F0662B`.
- Logotipo: Manrope 800, tracking −5%. "Jesus'" em `#1A1714` (branco sobre
  escuro); **"Corner" sempre em `#F0662B`**.
- Redução: 72px três linhas por página, 44px duas, 28px e 16px nenhuma.
- Sobre fundo escuro: manter o símbolo igual, dentro de uma placa `#EDE8E2`
  com 7px de respiro (ver 13a). Variante sobre laranja: tile preto, logotipo
  todo preto. Monocromática só para carimbo/favicon.
- Não usar o símbolo dentro dos blocos de IA (ali o sinal é o losango).
- Dentro do app o logotipo aparece só na tela de boas-vindas; os cabeçalhos
  usam saudação.

### Conta (13a–13d)
- Ninguém precisa de conta para ler. "Começar a ler" é primário; "Já tenho
  conta" secundário.
- Criar conta acontece **depois** da primeira leitura e mostra o que a pessoa
  perde sem conta. Consentimento e idade mínima ficam aqui, não antes de ler.
- Campos: bloco branco raio 24, campo `#F2EEE9` raio 16, 50–52px de altura.
- Recuperar senha tem contador de reenvio e nunca bloqueia a leitura local.

### Onboarding (15 + 14) — 7 telas até o primeiro versículo
Ordem: 15a → 15b → uma demonstração (14b/14c/14e/14f) → 15f → 15c → 15d → 15e.

| Tela | Pergunta | O que a resposta muda |
| --- | --- | --- |
| 15a | Já tentou ler a Bíblia toda? | Plano recomeça em Gênesis ou vai a plano temático |
| 15b | O que te faz parar? (multi) | Qual demonstração aparece em seguida |
| 14x | Demonstração | "Não entendo" → 14c · "perco o ritmo" → 14e · "leio sozinho" → 14f · outras → 14b |
| 15f | Quanto tempo por dia para o método? (15/30/45/60) | Duração do plano e divisão oração/leitura/reflexão; opção "só quero ler" |
| 15c | Quando dá pra parar e ler? | Horário do único lembrete; permissão de notificação pedida aqui |
| 15d | Quantos dias por semana? (3–7, padrão 5) | Meta semanal; bloco recalcula a data de conclusão |
| 15e | Resultado | Repete as respostas; "Ler Gênesis 1 agora" |

- Toda pergunta tem "Pular" no mesmo lugar e uma linha "Por que eu pergunto".
- 5c (pergunta única antiga) está substituída por 15f.
- 15e mostra "conclusão prevista: mês/ano" — confirmar com o autor se fica.

### Início (3c e 12a)
- 3c é a Home padrão e a Home obrigatória nos primeiros 7 dias ou sempre que
  o painel estiver zerado. 12a (painel de métricas) entra depois da primeira
  semana cumprida. Título é sempre a saudação; a aba é "Hoje".
- 12a: gráfico das últimas 9 semanas, três números que só sobem (capítulos,
  horas, livros), "3,3% da Bíblia" em cinza no pé do cartão, ação fixa acima
  da barra. "Horas de leitura" exige registrar tempo de sessão.

### IA — ajustes
- 10b: botão de texto **"Reportar resposta"**. Ao reportar, a resposta sai do
  histórico e vai para revisão. Obrigatório antes de a IA ir ao ar.
- 10f: quarta chave "Aviso do grupo" ("seu grupo terminou o capítulo de
  hoje"), desligada por padrão, visível só para quem está num grupo.

### Leitura social (17a–17c) — implementar por último
- **17a Sala do capítulo**: uma sala por capítulo, aberta só para quem
  concluiu; quem não leu vê "7 de 12 concluíram". Pergunta da semana vem do
  líder do grupo (humano). Reação única "Amém". Campo de resposta no rodapé.
- **17b Retrospectiva do mês**: cartão escuro compartilhável, aparece uma vez
  no 1º dia do mês seguinte, vai para a Biblioteca. Só mostra números que
  subiram; mês ruim vira "Você voltou". Marca discreta no canto do cartão.
- **17c Camada do grupo na leitura**: pontilhado laranja 2.5px sob o versículo
  marcado por outros + chip "N do grupo marcaram · N notas". Só contagens por
  padrão; nomes e notas só de quem compartilhou. Chave para desligar no
  rodapé. Botão "Grupo" no cabeçalho abre 17a.

---

## O que mudou depois (rodadas 18–23)

### Bíblia (5f, 18a, 18b)
- 5f: livros por **nome completo**, agrupados por seção (Pentateuco,
  Históricos…). Linha de 48px: nome (Manrope 700 15px), barra de progresso
  56×4px (laranja em curso, preta concluído), nº de capítulos em cinza.
- 18a: bloco escuro com nome do livro, seção e anel de progresso
  (conic-gradient laranja). Grade 6 colunas, células 44px raio 13:
  preta = lido, laranja = atual, `#F2EEE9` = por ler. Botão fixo
  "Continuar em Gênesis 41".
- 18b: folha escura (mesma da IA, sem losango) com Cap. anterior/próximo e
  grade centrada no atual. Abre pelo chip escuro do cabeçalho de 4a.

### Perfil (19a–19c) — não é aba
- Barra continua com 5 abas: Hoje · Meu Plano · Bíblia · Biblioteca · Comunidade.
- Iniciais no cabeçalho de Hoje = tile laranja 38px raio 13, texto `#1A1714`.
  Tocar abre a folha 19a.
- 19a: bloco escuro (nome, e-mail, etiqueta Admin quando for), cartão com
  Meus dados / Lembrete / Idioma / Versão da Bíblia, cartão com Administração
  do grupo (só admin) / Assistente / Aparência, Ajuda + Sair no rodapé.
- Sem conta: o bloco escuro vira "guarde sua leitura" (13c curto); somem
  Meus dados e Administração.
- 19b: idioma do app e versão da Bíblia em cartões separados; trocar versão
  não mexe no progresso. 19c: código de convite, pedidos de entrada
  (aceitar/recusar), membros, pergunta da semana.

### Meu Plano — tempos independentes (15f, 4b, 5a, 21a–c)
- **Cada passo tem o seu tempo**: oração, leitura, reflexão. Só a leitura
  define o trecho diário. Stepper de 5 em 5 min; 0 desliga o passo.
  Padrão: 10 + 15 + 5.
- 15f (onboarding) pergunta os três tempos; 5a (Ajustar) tem os mesmos
  steppers; 4b mostra "10 + 15 + 5 min".
- 21a Oração = **método ACTS**: Adoração, Confissão, Gratidão (Thanksgiving),
  Súplica. Tempo dividido em 4 etapas iguais; barra de 4 segmentos no topo;
  areia = feita, preto = agora, branco = depois. "Próxima etapa" avança antes
  do tempo; rodapé conclui a oração.
- 21b Reflexão = 10d com chip "passo 3 de 3", microfone e 3 barras.
- 21c Rotina concluída: fundo escuro, resumo dos 3 passos, meta da semana
  (nunca "sequência"), atalho para a sala 17a.
- Cabeçalho comum dos passos: chip escuro "Nome · passo N de 3" + "Pular".

### Estudos e planos com IA (22a–22d)
- Entrada: botão "Criar" (escuro com losango) ao lado de "Ajustar" em 4b;
  admin de grupo cria pelo 19c.
- Quatro formatos: Plano temático · Livro · Tema (referências cruzadas) ·
  Para o grupo. Pedido em texto livre ou chip de sugestão; formato inferido
  e corrigível.
- Estudo ativo **substitui a leitura do dia**; plano principal pausa e volta
  sozinho na data mostrada. Cartão "Gênesis pausado" com "Retomar já" fica
  sempre visível em 22c.
- 22b: a IA propõe, a pessoa revisa dia a dia (botão trocar trecho) ou
  "Refazer". "Começar amanhã" se a leitura de hoje já estiver em andamento.

### Admin do app (23a–23d) — web 1280px
- Shell: sidebar 232px (`#EDE8E2`), 9 seções, usuário no rodapé. Conteúdo
  em grid 12 colunas, gap 10, cartões brancos raio 24, KPI raio 20.
- Bloco escuro = o que exige atenção (assinantes, IA, prévia); areia =
  "Precisa de ação"; laranja só no botão primário e em números que subiram.
- 23a: KPIs (assinantes, MRR, DAU, trials), novos assinantes/semana, funil
  até "iniciou trial", retenção por coorte, IA + reportes, saúde técnica,
  grupos (retenção 2,4× vs. solo), lista de ação.
- 23b: busca + segmentos + filtros; tabela (Usuário, Plano, Último acesso,
  Grupo); painel lateral 340px com "Onde está", "Sinal" e ações (mensagem,
  estender trial, aplicar código, ver como usuário, desativar — com
  confirmação).
- 23c: segmentos pré-montados, canal (Push / E-mail / No app), variáveis
  {nome} {livro} {capítulo} {dias_de_trial} {link_assinar}, prévia do push,
  "Testar em mim", agendar. Limite do app: 1 push/pessoa/dia, 8h–21h local.
- 23d: códigos Promo (teto de usos) / Igreja (entra no grupo, sem teto) /
  Indicação (gerado por membro). Código de igreja aparece para o líder em 19c.

### Regras de produto adicionadas
- Hoje: 3c nos primeiros 7 dias e sempre que o painel estiver zerado.
- IA: "Reportar resposta" em 10b; "Aviso do grupo" em 10f desligado por
  padrão; referência gerada que não bater com o texto é descartada.
