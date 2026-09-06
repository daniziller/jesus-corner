# PROMPT PARA CLAUDE CODE — Jesus' Corner, app completo

## LEIA ISTO ANTES DE ESCREVER UMA LINHA DE CÓDIGO

**Não pule nenhuma linha deste prompt.** Ele é a lista de trabalho, não um resumo. Cada tabela abaixo tem telas que precisam existir no app. Se você pular uma linha, uma tela fica de fora e a entrega está incompleta.

**Leia absolutamente tudo antes de começar:** este prompt, o `CONFERENCIA-TELA-A-TELA.md` inteiro (as 82 telas com **screenshot**, todos os textos e cores de cada uma), o `README.md` inteiro (rodadas 3 a 23), o `ADENDO-TURNOS-24-32.md` inteiro (rodadas 24 a 32) e o arquivo de design `Jesus Corner Redesign.dc.html` aberto no navegador, com `support.js` na mesma pasta.

**O app hoje ainda mostra páginas antigas e quebradas.** Por isso existe o `CONFERENCIA-TELA-A-TELA.md`: para cada tela ele traz a imagem em `screens/<id>.png`, a lista de **todos os textos que aparecem na tela, na ordem**, as cores usadas e um checklist. **Nenhuma tela é dada como feita sem passar pelo checklist dela**, e você me devolve o checklist preenchido. Se um texto da lista não está no app, a tela está incompleta; se o app mostra um texto que não está na lista, a tela está errada.

**Faça exatamente como está no design.** Cores, tipografia, espaçamentos, raios, ordem dos blocos, textos dos rótulos e dos botões: copie do design. Onde o design mostra um número ou um nome de exemplo (Diego, Marina, Gênesis 41), troque por dado real do app — o resto é final.

**Se uma tela do design depende de algo que ainda não existe no código, você escreve o código.** Isso inclui tabela nova no banco, campo novo, endpoint novo, job agendado, registro de duração de sessão, cálculo de projeção, tabela de ordem cronológica, fila de moderação, geração de resumo por IA. Não simule com dado falso, não deixe `TODO`, não pule a tela por falta de backend. A lista do que hoje não tem código está na seção 5 — comece por ela quando o bloco pedir.

**Ordem de trabalho obrigatória:** (1) auditoria, (2) fundação, (3) blocos na ordem da seção 6. Uma revisão minha entre blocos.

---

## 1. Arquivos deste pacote

| Arquivo | O que é |
| --- | --- |
| `PROMPT-PARA-CLAUDE-CODE.md` | Este documento — lista de trabalho e ordem |
| `CONFERENCIA-TELA-A-TELA.md` | **As 82 telas, uma a uma: screenshot, todos os textos, cores, checklist.** É o documento de conferência final |
| `screens/*.png` | Screenshot de cada tela do design, nomeado pelo id (`26a.png`, `31b.png`…) |
| `README.md` | Especificação detalhada das telas das rodadas 3 a 23 |
| `ADENDO-TURNOS-24-32.md` | Especificação detalhada das rodadas 24 a 32 (mais recentes) |
| `Jesus Corner Redesign.dc.html` | **As 82 telas**, cada uma com um id visível (`3c`, `26a`, `31b`…) |
| `Site Jesus Corner Bento.dc.html` | Home do site |
| `support.js` | Runtime para abrir os dois `.dc.html` |

**Precedência quando dois documentos discordarem:** o arquivo de design vence sobre qualquer texto; entre os textos, o `ADENDO` (rodadas 24–32) vence sobre o `README` (rodadas 3–23). O design está organizado em rodadas, **a mais recente no topo** — rodada 32 primeiro, rodada 3 no fim.

---

## 2. Regras absolutas

1. **Identidade Bento em 100% das telas.** Fundo `#EDE8E2`, tinta `#1A1714`, laranja `#F0662B`, areia `#E6DACB`, fonte única **Manrope** (500/700/800). Zero gradiente. Zero sombra dentro do app. Se uma tela ficar em Be Vietnam Pro, Plus Jakarta Sans, `#9D4300` ou `#121212`, ela não foi migrada.
2. **Texto sobre laranja é `#1A1714`, nunca branco.**
3. **Um só elemento laranja por tela** (a ação primária). Exceções: número de versículo e o marcador "onde você parou".
4. **Tudo que a IA diz mora em bloco escuro com o losango laranja** (quadrado de 8–9px em `#F0662B` rotacionado 45°), cita referência e termina com "escrito por IA, confira no texto". Quem não cita, não responde. O símbolo da marca nunca aparece em bloco de IA.
5. **Contraste:** nunca use `#BDB5AC` ou `#CFC7BE` em texto que o usuário precisa ler (porcentagem, valor, rótulo de dia). O tom de inativo legível é `#6E655C`; `#8B8279` para texto secundário. `#BDB5AC` só em placeholder e chevron.
6. **Nada corta.** Todo container rolável leva `padding-bottom` que inclui a barra de abas (74px). Nenhum texto pode ficar cortado no fim de um cartão.
7. **Toque mínimo 44px.**
8. **A meta é semanal, nunca sequência de dias corridos.** Nenhuma tela mostra "sequência perdida". Nenhuma métrica em destaque pode zerar por um dia perdido.
9. **Ninguém precisa de conta para ler.** "Continuar sem conta" nunca desaparece.
10. **React 18 + Vite com o CSS e os componentes que já existem no projeto.** Não introduza Tailwind, CSS-in-JS, biblioteca de UI nem framework novo. Ícones: a biblioteca de ícones que o app já usa.

---

## 3. Inventário completo — as 82 telas

Legenda da coluna **Status**: `CANÔNICA` = é a versão a implementar · `SUPERSEDIDA por X` = existe no arquivo mas foi substituída; **não implemente, use X** (a linha está aqui para você não implementar a versão errada por engano) · `REFERÊNCIA` = regra/estado especial descrito na coluna ao lado.

Preencha a coluna **Feito** e me devolva esta tabela no fim de cada bloco.

### 3.1 Entrada e conta (4)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `13a` | Boas-vindas — ler antes de cadastrar (tela escura, única com a marca) | CANÔNICA | |
| `13b` | Entrar | CANÔNICA | |
| `13c` | Criar conta — depois de já ter lido | CANÔNICA | |
| `13d` | Recuperar senha — pedido e confirmação | CANÔNICA | |

### 3.2 Onboarding (11)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `15a` | Pergunta 1 — histórico | CANÔNICA | |
| `15b` | Pergunta 2 — a dor (roteia a próxima tela) | CANÔNICA | |
| `14b` | Demonstração — a tela de leitura | CANÔNICA | |
| `14c` | Demonstração — perguntar sobre o texto | CANÔNICA | |
| `14e` | Demonstração — constância sem culpa | CANÔNICA | |
| `14f` | Demonstração — comunidade | CANÔNICA | |
| `15f` | Pergunta 3 — tempo de cada passo **+ projeção da Bíblia inteira** | CANÔNICA | |
| `27a` | **Pergunta 4 — quais dias da semana** (tela nova) | CANÔNICA | |
| `15c` | Pergunta 5 — a hora do dia (era 4) | CANÔNICA | |
| `15d` | Pergunta 6 — compromisso da semana (era 5) | CANÔNICA · ver nota | |
| `15e` | Resultado — o plano montado | CANÔNICA | |

**Nota obrigatória:** o onboarding passa de 5 para **6 perguntas**. As barras de progresso de `15a`, `15b`, `15f`, `27a`, `15c`, `15d` passam a ter **seis segmentos** e o contador vira "Pergunta N de 6". `27a` escolhe os dias da semana; `15d` continua existindo só se você mantiver a pergunta de quantidade — se `27a` já cobre (ela cobre), **funda as duas em `27a`** e o onboarding fica com 5 perguntas numeradas de 1 a 5. Escolha uma das duas saídas, aplique em todas as telas e me diga qual escolheu.

### 3.3 Hoje / Início (5)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `29a` | **Início — versículo do dia, último texto lido, frase de aplicação** | CANÔNICA (topo da tela) | |
| `30a` | **Início rolando — constância, semana, aplicações, porta para métricas** | CANÔNICA (continuação da mesma tela) | |
| `3c` | Início — versão de ação, sem painel | REFERÊNCIA: usar nos **primeiros 7 dias** e sempre que o painel estiver zerado | |
| `12a` | Início com painel de métricas | SUPERSEDIDA por `29a`+`30a` | |
| `5b` | Sua caminhada | SUPERSEDIDA por `30b`+`30c` | |

### 3.4 Leitura (6)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `32a` | **Leitura livre — começo do capítulo** (identidade nova) | CANÔNICA | |
| `32b` | **Fim do capítulo — "marcar como lido?"** | CANÔNICA | |
| `4a` | Leitura | SUPERSEDIDA por `32a` (livre) e `26b` (no plano) | |
| `5e` | Ferramentas — folha sobre a leitura | CANÔNICA | |
| `18b` | Trocar de capítulo sem sair da leitura (folha) | CANÔNICA | |
| `17c` | Leitura com a camada do grupo | CANÔNICA | |

### 3.5 Bíblia (5)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `28a` | **Bíblia — os dois testamentos com % lido de cada** | CANÔNICA | |
| `28b` | **Lista de livros do testamento, com métrica por livro** | CANÔNICA | |
| `32c` | **Grade de capítulos — toque abre o capítulo** | CANÔNICA | |
| `28c` | **Modo "Marcar lidos" — marcação livre de capítulos** | CANÔNICA | |
| `18a` | Página do livro — capítulos | SUPERSEDIDA por `32c` | |
| `5f` | Bíblia — lista de livros por nome | SUPERSEDIDA por `28a`+`28b` | |

### 3.6 Meu Plano e os três passos (12)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `4b` | Meu Plano — só hoje, um passo ativo | CANÔNICA | |
| `26a` | **Passo 1 · Oração (ACTS)** — tempo como botão, "+2 min", chip de método | CANÔNICA | |
| `26h` | **Passo 1 · Oração livre** (ACTS opcional) | CANÔNICA | |
| `26b` | **Passo 2 · Leitura dentro da rotina** | CANÔNICA | |
| `26c` | **Passo 3 · Reflexão** — Escrever / Falar / Só pensar | CANÔNICA | |
| `29b` | **Reflexão · a frase de aplicação** (4º passo da reflexão) | CANÔNICA | |
| `21c` | Rotina concluída — fechamento do dia | CANÔNICA (com os tempos escolhidos) | |
| `26d` | **Tempo de cada passo — folha do relógio + projeção da Bíblia** | CANÔNICA | |
| `28d` | **Por onde começar** — Gênesis / Mateus / sem plano + ordem bíblica ou cronológica | CANÔNICA | |
| `28e` | **Já leu parte do livro** — seguir / reler / limpar / já terminei | CANÔNICA | |
| `5a` | Ajustar meu plano | CANÔNICA para ritmo e estudo; a parte de tempo por passo é `26d` | |
| `21a` | Oração — ACTS | SUPERSEDIDA por `26a` | |
| `21b` | Reflexão | SUPERSEDIDA por `26c`+`29b` | |

### 3.7 IA na leitura (6)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `10a` | Selecionou um trecho — "Perguntar" no menu | CANÔNICA | |
| `10b` | Resposta — folha de meia tela com citações | CANÔNICA | |
| `10c` | Contexto antes de ler (pulável) | CANÔNICA | |
| `10d` | Depois de concluir — reflexão gerada | CANÔNICA (base de `26c`) | |
| `10e` | **Quando a IA não deve responder** — obrigatória antes de a IA ir ao ar | CANÔNICA | |
| `10f` | Ajustes de IA — o leitor no controle | CANÔNICA | |

### 3.8 Oração e pedidos (2)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `25a` | **Súplica — pedidos de quem ora com você, um toque "Orei"** | CANÔNICA | |
| `25b` | **Fazer um pedido — quem vê, anônimo, sem comentários** | CANÔNICA | |

### 3.9 Estudos (7)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `26e` | **Adicionar estudo — prontos primeiro, IA depois** | CANÔNICA | |
| `26f` | **Ajustar o estudo — dias, tema, quem vê, com quem fazer** | CANÔNICA | |
| `26g` | **Banco de estudos públicos — busca por tema** | CANÔNICA | |
| `22a` | Criar estudo — o pedido | CANÔNICA (entrada por `26e`) | |
| `22b` | Proposta — revisar dia a dia | CANÔNICA | |
| `22c` | Meu Plano com o estudo ativo | CANÔNICA | |
| `22d` | Plano do grupo — admin cria, líder revisa | CANÔNICA | |

### 3.10 Biblioteca (1)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `4c` | Biblioteca — notas, marcações, sermões, estudos | CANÔNICA + seção "Meus estudos" e perguntas guardadas | |

### 3.11 Comunidade (6)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `24a` | **Início da Comunidade — meus grupos, amigos, criar/entrar** | CANÔNICA (a aba abre aqui) | |
| `24b` | **Criar grupo — nome, plano, quem entra** | CANÔNICA | |
| `24c` | **Adicionar amigos — pedidos primeiro, link de convite** | CANÔNICA | |
| `5d` | Página do grupo — leitura do grupo, pedidos, notas | CANÔNICA como **página interna** (ganha voltar; o cartão antigo de pedido vira a linha de `25a`) | |
| `17a` | Sala do capítulo — só abre para quem leu | CANÔNICA | |
| `17b` | Retrospectiva do mês | CANÔNICA (+ linha "aplicações cumpridas") | |

### 3.12 Perfil (3)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `19a` | Perfil — folha que abre nas iniciais | CANÔNICA + linhas "Minhas métricas" e "Amigos e convites" | |
| `19b` | Idioma do app e versão da Bíblia | CANÔNICA | |
| `19c` | Administração do grupo — só admin | CANÔNICA + linha "Plano do grupo" | |

### 3.13 Métricas (2)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `30b` | **Minhas métricas — tempo por passo, capítulos lidos e restantes** | CANÔNICA | |
| `30c` | **Progresso por bloco da Bíblia (oito blocos) + AT/NT** | CANÔNICA | |

### 3.14 Resumo semanal (3)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `31a` | **Os números da semana — meta, dias, tempo por passo** | CANÔNICA | |
| `31b` | **O resumo escrito pela IA + suas notas** | CANÔNICA | |
| `31c` | **A semana em oração e no grupo + pergunta da próxima** | CANÔNICA | |

### 3.15 Marca (3 — não são telas do app)
| Id | Conteúdo | Status | Feito |
| --- | --- | --- | --- |
| `16a` | Símbolo, logotipo, cores | Exportar SVG 72/44/28/16 + favicon | |
| `16b` | Ícone, tamanhos, cabeçalho do site | Aplicar em `13a` e no site | |
| `16c` | Variações e proibições | Regra, não tela | |

### 3.16 Painel do administrador — web, 1280×800 (4)
| Id | Tela | Status | Feito |
| --- | --- | --- | --- |
| `23a` | Visão geral — números, funil, IA, ação do dia | CANÔNICA | |
| `23b` | Usuários — buscar, entender, agir | CANÔNICA | |
| `23c` | Mensagens — segmento, canal, texto, prévia | CANÔNICA | |
| `23d` | Convites e códigos | CANÔNICA | |

**Total: 82 telas no arquivo · 73 a implementar · 9 marcadas como supersedidas ou referência.** Confira a conta antes de dizer que terminou.

---

## 4. Auditoria — o primeiro trabalho, antes de qualquer código novo

Tentativas anteriores implementaram parte disso com desvios. Antes de escrever qualquer tela:

1. Percorra o app atual e, **para cada uma das 73 telas a implementar**, registre: não existe · existe na identidade antiga · existe na identidade nova mas diferente do design · existe igual ao design.
2. Onde existir e estiver diferente, **liste o desvio** (cor, fonte, ordem dos blocos, texto, comportamento) — não conserte ainda.
3. Me entregue essa lista antes de começar o bloco 1. Não presuma que trabalho anterior está correto.

---

## 5. O que o app hoje NÃO tem código e você vai precisar escrever

Nenhum item aqui é opcional: cada um sustenta telas da lista.

1. **Duração de sessão por passo.** Registrar segundos de Oração, Leitura e Reflexão por sessão. Sem isso `30b`, `31a` e o "1 h 14" da semana não existem. Tabela nova, com `user_id`, `data`, `passo`, `segundos`.
2. **Tempo por passo configurável** (`prayer_minutes`, `reading_minutes`, `reflection_minutes`), 1 a 60, zero desliga o passo. Vem de `26d` e `15f`.
3. **Dias da semana escolhidos** (`weekly_days`, array de 7 booleanos) — de `27a`. Substitui o número solto de dias. Lembrete e "esta semana" passam a usar isso.
4. **Meta semanal e histórico** `weeks_on_goal`. Um dia perdido não zera nada.
5. **Marcação livre de capítulo** — `chapters_read(user_id, livro, capítulo, origem: 'sessão'|'manual')`. Capítulo manual entra na porcentagem e **não** conta como sessão nem mexe na sequência. De `28c`, `32b`.
6. **Projeção de término da Bíblia.** Função que recebe capítulos lidos, minutos de leitura e dias marcados e devolve prazo + data. Usada em `15f`, `26d`, `30b`. Recalcula a cada toque.
7. **Progresso por bloco da Bíblia** — os oito blocos com totais de capítulos (Pentateuco 187, Históricos 249, Poéticos 243, Profetas maiores 183, Profetas menores 67, Evangelhos e Atos 117, Cartas 121, Apocalipse 22). De `30c`.
8. **Ordem cronológica de leitura** — tabela de sequência de capítulos. De `28d`. Se não houver lista oficial, proponha uma e **espere minha aprovação** antes de publicar.
9. **Frase de aplicação** — texto por sessão, privado, com estado "cumpri" e lembrete opcional às 18h. De `29b`, `29a`, `30a`, `31a`.
10. **Pedidos de oração** — pedido com escopo (grupo / amigos / só eu), flag anônimo, contador de orações **sem identidade de quem orou**, encerramento pelo autor, ordenação por menos oração recebida, máximo 3 por sessão. De `25a`, `25b`.
11. **Amizade** — pedido, aceite, recusa, sugestões por grupo em comum, link de convite pessoal. De `24c`.
12. **Grupos criados pelo usuário** — nome, plano próprio ou individual, entrada por convite ou código de 6 letras, aprovação de pedidos, silenciar. De `24b`, `24a`.
13. **Banco de estudos** — estudo com autor, tema/tags, dias, visibilidade (privado / convidados / público), contador de quantas pessoas fizeram, busca por tema, denúncia com retirada após 3 denúncias. De `26f`, `26g`.
14. **Estudos prontos** — os estudos que já existiam no app viram registros desta mesma tabela, com autor "Jesus' Corner". **Peça a lista real ao autor** (título, dias, livros) antes de cadastrar exemplos.
15. **Resumo semanal por IA** — job de domingo 20h que monta o resumo a partir de capítulos lidos, notas, respostas de reflexão, aplicações, pedidos e mensagens de sala da semana. Sem inventar versículo. Semana em branco não gera texto motivacional: gera o estado "semana em branco". De `31a`–`31c`.
16. **Versículo do dia** — preferir um versículo do trecho que a pessoa está lendo; fallback para lista curada. De `29a`.
17. **Último texto lido** — guardar capítulo, horário e uma frase-resumo do trecho. De `29a`.
18. **Fila de moderação de IA** — resposta reportada sai do histórico do usuário e aparece em `23a`.
19. **Limite de notificação** — um push por pessoa por dia, nunca antes das 8h nem depois das 21h no fuso local. Vale para lembrete, aplicação das 18h e resumo de domingo: **se competirem, o lembrete diário ganha.**

---

## 6. Ordem de implementação — 14 blocos

Uma revisão minha entre blocos. Não comece o seguinte sem meu aval.

**Bloco 0 · Auditoria** — seção 4. Entrega: a lista de desvios.

**Bloco 1 · Fundação** — tokens Bento em `src/index.css`, Manrope carregada, tokens antigos removidos, barra de abas com cinco itens (Hoje · Meu Plano · Bíblia · Biblioteca · Comunidade), `padding-bottom` de 74px nos roláveis. Correção dos desvios de contraste da auditoria.

**Bloco 2 · Dados** — itens 1 a 8 da seção 5 (duração de sessão, tempos por passo, dias da semana, meta, marcação livre, projeção, blocos, cronológica). Sem tela nova; com testes.

**Bloco 3 · Núcleo diário** — `29a`, `30a`, `4b`, `26b`, `5e`, `21c`.

**Bloco 4 · Os três passos** — `26a`, `26h`, `26c`, `29b`, `26d`, `5a`. Aqui entra a frase de aplicação (item 9).

**Bloco 5 · Bíblia** — `28a`, `28b`, `32c`, `28c`, `32a`, `32b`, `18b`. Toque na grade **abre** o capítulo.

**Bloco 6 · Plano: onde começar** — `28d`, `28e`.

**Bloco 7 · Métricas** — `30b`, `30c` e a linha "Minhas métricas" em `19a`.

**Bloco 8 · Onboarding e conta** — `13a`–`13d`, `15a`, `15b`, `14b`/`14c`/`14e`/`14f`, `15f`, `27a`, `15c`, `15e` (+ `15d` se você mantiver as 6 perguntas). Progresso pré-conta em `localStorage` com migração no cadastro.

**Bloco 9 · IA na leitura** — `10a`, `10b`, depois `10f`, `10c`, `10d`. **`10e` é obrigatória antes de a IA ir ao ar.** Fila de moderação (item 18).

**Bloco 10 · Comunidade** — `24a`, `24b`, `24c`, `5d` como página interna, `17a`, `17c`, `17b`. Itens 11 e 12.

**Bloco 11 · Oração** — `25a`, `25b` (item 10), ligados ao passo Súplica de `26a`.

**Bloco 12 · Estudos** — `26e`, `26f`, `26g`, `22a`–`22d`, `4c` (Biblioteca com "Meus estudos"). Itens 13 e 14.

**Bloco 13 · Resumo semanal** — `31a`, `31b`, `31c` (item 15).

**Bloco 14 · Painel do admin** — `23a`–`23d`, web em 1280px. Independente do app.

**Em paralelo:** SVG do símbolo (72/44/28/16) + favicon; site.

---

## 7. Checklist de entrega por tela

Para cada tela, antes de marcar como feita, abra a seção dela no `CONFERENCIA-TELA-A-TELA.md`, coloque o app ao lado de `screens/<id>.png` e confira:

- [ ] **Todos os textos listados na seção da tela aparecem, letra por letra** (só nomes e números de exemplo mudam).
- [ ] Nenhum texto que não está na lista aparece.
- [ ] Abri a tela correspondente no arquivo de design e comparei lado a lado.
- [ ] Fundo, blocos, raios, tipografia e cores conferem com o design.
- [ ] Nenhum texto cortado; rolagem termina acima da barra de abas.
- [ ] Nenhum texto ilegível (nada de `#BDB5AC`/`#CFC7BE` em valor ou rótulo).
- [ ] Um só elemento laranja, exceto as exceções da regra 3.
- [ ] Bloco de IA com losango, citação e rodapé "escrito por IA".
- [ ] Toque mínimo de 44px em tudo que é tocável.
- [ ] Os dados vêm do app, não de exemplo fixo.
- [ ] Estado vazio e estado de carregamento existem (esqueleto de bloco, nunca spinner de tela cheia).

---

## 8. Proibido

- Pular tela por falta de backend — escreva o backend.
- Deixar tela na identidade antiga.
- Marcar capítulo como lido por toque na grade (só no modo "Marcar lidos" e nos botões da leitura).
- Texto branco sobre laranja.
- Mostrar "sequência perdida", zerar métrica por um dia, ou fazer do número mais próximo de zero o número grande da tela.
- Resposta de IA sem citação, sem losango ou sem o rodapé.
- Expor quem orou por um pedido, ou o conteúdo de nota privada em qualquer tela de grupo.
- Publicar estudo como público sem a pessoa ter escolhido isso em `26f`.
- Introduzir framework, Tailwind, CSS-in-JS ou biblioteca de UI.

---

## 9. O que precisa de decisão minha (pergunte, não escolha sozinho)

1. Onboarding com **5 ou 6 perguntas** (fundir `15d` em `27a` ou manter as duas).
2. **Lista real dos estudos prontos** do app antigo — título, dias, livros.
3. **Ordem cronológica** — aprovar a tabela de sequência antes de virar código.
4. **Fusão de dados** quando alguém lê sem conta e depois entra numa conta que já tem progresso: servidor vence, local vence, ou perguntar.
5. **Cota de IA no plano gratuito** — quantas perguntas por dia.
