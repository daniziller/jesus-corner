# Handoff: Jesus' Corner — redesign de UX do app e do site

## Visão geral

Este pacote contém um redesign de 8 telas do app **Jesus' Corner** (`daniziller/jesus-corner`) e uma reordenação da home do site (`daniziller/jesus-corner-site`), derivados de uma auditoria de 18 pontos priorizados feita a partir do código real dos dois repositórios.

O redesign resolve três problemas estruturais:

1. **A Home entregava relatórios antes da ação do dia.** Seis métricas (3,3% da Bíblia, dias seguidos, dias/semana, semanas lendo, AT%, NT%) ocupavam as duas primeiras dobras; a ação do dia estava na terceira. Agora a Home é uma tela de uma decisão.
2. **"Meu Plano" misturava executar e configurar.** Interruptores de módulos, duração e acordeões de explicação conviviam com o cartão de "Começar". Agora são duas telas.
3. **Sete sistemas de recompensa competiam** (níveis/XP, metas de constância, conquistas, sequência de dias, desafios de grupo, % da Bíblia, capítulos lidos). Agora são dois placares.

## Sobre os arquivos de design

Os arquivos `.dc.html` deste pacote são **referências de design criadas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não código de produção para copiar**. A tarefa é **recriar estes designs no ambiente já existente do app**: React 18 + Vite, com os componentes e os tokens CSS que já estão em `src/index.css`. Não introduza framework, biblioteca de UI ou sistema de estilo novo.

Os HTMLs usam estilos inline por serem protótipos. No app, use as classes e variáveis CSS existentes.

Para abrir os arquivos: os dois `.dc.html` precisam do `support.js` ao lado (incluído). Abra direto no navegador.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, raios e sombras são finais e vêm dos tokens que já existem no app. Recrie a UI fielmente usando os tokens do `src/index.css` — não reinvente valores. As únicas coisas propositalmente aproximadas são os textos de exemplo (versículos, nomes, números) e os ícones, que devem vir da biblioteca de ícones já usada no app.

## Arquivos deste pacote

| Arquivo | Conteúdo |
| --- | --- |
| `Jesus Corner Redesign.dc.html` | As 8 telas redesenhadas, identificadas por `1a`–`1h` |
| `Auditoria UX Jesus Corner.dc.html` | A auditoria de 18 pontos com o racional de cada mudança (P1/P2/P3) |
| `support.js` | Runtime necessário para abrir os dois arquivos acima |

---

## Design tokens

Todos já existem em `src/index.css` do repositório `jesus-corner`. **Use as variáveis, não os hex literais.**

### Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `--or` | `#9D4300` | Laranja queimado da marca; ação primária, rótulos de seção, números de versículo |
| `--olt` | `#B5651D` | Laranja claro; início dos gradientes |
| `--brand-deep` | `#7A2E00` | Laranja escuro; fim dos gradientes, hover de link |
| `--bk` | `#121212` | Preto; texto principal, cartões escuros |
| `--white` | `#FFFFFF` | Cartões sobre fundo creme |
| `--g1` | `#F5E9DE` | Creme; fundo de todas as telas |
| `--g2` | `#E5E5E5` | Bordas de campos e botões inativos |
| `--g3` | `#D4D4D4` | Bordas tracejadas de passo pendente |
| `--g4` | `#A3A3A3` | Ícones e rótulos inativos, placeholders |
| `--g5` | `#737373` | Texto secundário |
| `--g6` | `#404040` | Texto terciário, ícones do cabeçalho |
| — | `#B5005D` | Magenta da marca; oração, sermões, fim do gradiente vívido |
| — | `#E08A3C` | Âmbar; barras de gráfico e progresso sobre fundo escuro |
| — | `#B8860B` | Dourado; marcações/destaques |
| — | `rgba(255,196,0,.32)` | Fundo de trecho marcado no texto bíblico |

### Gradientes

| Token | Valor | Uso |
| --- | --- | --- |
| `--grad-primary` | `linear-gradient(135deg, #B5651D 0%, #9D4300 55%, #7A2E00 100%)` | Cartão da ação principal, botões primários |
| `--grad-vivid` | `linear-gradient(135deg, #9D4300 0%, #B5005D 100%)` | Botão central da barra inferior, avatares de destaque |

**Regra nova e importante:** no máximo **um** elemento com `--grad-primary` por tela — o da ação principal. Hoje o app aplica gradiente em vários cartões da mesma tela, e isso anula a hierarquia.

### Sombras

| Token | Valor | Uso |
| --- | --- | --- |
| `--shadow-glow` | `0 10px 28px rgba(157,67,0,.35)` | Cartão da ação principal, botão central da nav, FAB |
| `--shadow-premium` | `0 12px 30px rgba(0,0,0,.22)` | Player de áudio escuro |
| — | `0 3px 10px rgba(0,0,0,.08), 0 20px 44px rgba(0,0,0,.14)` | Apenas moldura do protótipo — **não recriar no app** |

### Tipografia

| Token | Família | Uso |
| --- | --- | --- |
| `--font` | `'Be Vietnam Pro', system-ui, sans-serif` | Texto corrido, rótulos, botões, texto bíblico |
| `--font-display` | `'Plus Jakarta Sans', sans-serif` | Títulos, números grandes, nomes de capítulo |

Escala usada (tamanho / peso / entrelinha / tracking):

| Papel | Valor |
| --- | --- |
| Título de tela | 24px / 800 / 1.1 / −0.7px · display |
| Título de cartão principal | 30px / 800 / 1.1 / −0.8px · display |
| Título de onboarding | 32px / 800 / 1.15 / −1px · display |
| Número grande (estatística) | 44px / 800 / 1 / −1.6px · display |
| Título de item de lista | 15.5px / 700 / 1.3 · display |
| **Texto bíblico** | **19px / 400 / 1.72** · font · `text-wrap: pretty` |
| Número de versículo | 11px / 700 · font · `vertical-align: super`, cor `--or` |
| Corpo | 14px / 400 / 1.5–1.6 · font |
| Corpo secundário | 13px / 400 / 1.5 · font, cor `--g5` |
| Rótulo de seção | 11px / 700 / 1 · font · `letter-spacing: .14em`, `text-transform: uppercase`, cor `--or` |
| Rótulo da barra inferior | 10px / 600–700 · font |
| Botão primário | 16–17px / 700 · display |

### Espaçamento e forma

- Padding horizontal das telas: **22px** (26px na tela de Leitura, para dar respiro ao texto).
- Gap entre cartões empilhados: **10–12px**. Entre grupos de seção: **20–30px**.
- Raios: cartão da ação principal **22px**; cartões de conteúdo **16–20px**; campos e botões retangulares **14px**; chips e botões primários **99px** (pílula); ícones em quadrado **8–12px**.
- Bordas: `1px solid rgba(18,18,18,.07)` para divisores e bordas de cartão claro.
- **Altura de toque mínima 44px** em qualquer elemento clicável.
- Todo container rolável precisa de `padding-bottom` que **inclua a altura da barra inferior (74px)** — hoje há conteúdo cortado no fim da rolagem em várias telas (ex.: Método Indutivo).

---

## Navegação — mudança estrutural

A barra inferior muda de composição. **Confirme com o autor antes de implementar**, pois afeta rotas e analytics.

**Hoje:** Início · Meu Plano 🔒 · Bíblia · Progresso · Comunidade 🔒

**Proposta:** Início · Meu Plano · **Bíblia** (botão central elevado) · **Biblioteca** · Comunidade

- **Progresso sai da barra** e passa a ser alcançado de dentro de Início (a Home já mostra o resumo da semana e o bloco atual; o detalhe completo é uma tela abaixo dela).
- **Biblioteca entra** reunindo Notas, marcações, sermões e estudos — que hoje vivem espalhados entre a aba Bíblia, Meu Plano e Perfil.
- **Os cadeados saem da barra.** Ver "Monetização" abaixo.

Especificação da barra: altura 74px, `padding: 10px 8px 0`, fundo `rgba(255,255,255,.92)`, borda superior `1px solid rgba(18,18,18,.06)`, itens distribuídos com `justify-content: space-around`, cada item com 66px de largura, ícone 20px sobre rótulo 10px com gap de 5px. Ativo usa `--or`; inativo usa `--g4`. O item central (Bíblia) é um círculo de 38px com `--grad-vivid` e `--shadow-glow`, deslocado com `margin-top: -9px`, e seu rótulo fica em `--bk` peso 700.

---

## Telas

### 1a — Início

**Propósito:** dar ao usuário uma única decisão: continuar a leitura de hoje. Nada mais compete com isso.

**Layout:** coluna. Cabeçalho fixo 52px → conteúdo rolável com padding 22px → barra inferior 74px.

**Cabeçalho (52px):** logotipo "JESUS' CORNER" à esquerda (15px/800 display, tracking −0.4px, "CORNER" em `--or`); à direita, seletor de idioma e avatar circular de 28px com iniciais sobre `--or`.

**Conteúdo, em ordem:**

1. **Data** — "Terça, 2 de setembro", 13px/500, cor `--g5`, margem inferior 10px.
2. **Versículo do dia** — itálico 17px/1.5, cor `--g6`, `text-wrap: pretty`, máximo duas ou três linhas. Referência abaixo em 12px/600 na cor `--or`. Sem cartão em volta, sem tela cheia. Margem inferior 20px.
3. **Cartão da ação principal** — o único elemento com `--grad-primary` e `--shadow-glow`. Raio 22px, padding `24px 22px 22px`, texto branco. Contém:
   - Rótulo de seção "CONTINUE DE ONDE PAROU" em `rgba(255,255,255,.72)`.
   - Nome do capítulo — 30px/800 display, tracking −0.8px. Ex.: "Gênesis 41".
   - Linha de contexto — "Oração · Leitura · Reflexão — cerca de 30 min", 14px/400, `rgba(255,255,255,.85)`.
   - **Indicador de 3 passos** — três barras de 5px de altura, raio total, com `gap: 8px`; concluídas em `rgba(255,255,255,.9)`, pendentes em `rgba(255,255,255,.28)`.
   - **Botão "Começar"** — pílula branca de 52px de altura, texto 17px/700 display na cor `--or`, com seta "→". Ao lado, um botão circular de 52px com borda `1.5px solid rgba(255,255,255,.4)` e ícone de áudio, que inicia a rotina em modo mãos-livres.
4. **Sua semana** — rótulo de seção "SUA SEMANA" (cor `--g5` aqui, não `--or`) com "2 de 7 dias" à direita em `--or`. Abaixo, sete blocos de 44px de altura, raio 12px, `gap: 10px`, iniciais S T Q Q S S D:
   - Concluído: fundo `--or`, texto branco 12px/700.
   - Hoje: fundo branco, borda `1.5px solid --or`, texto `--or`.
   - Futuro: fundo `rgba(18,18,18,.05)`, texto `--g4` peso 600.
   - Abaixo, uma linha em 12.5px cor `--g5`: "Sua meta é 5 dias por semana — você pode descansar dois sem perder nada."
5. **Bloco atual da Bíblia** — cartão branco, raio 16px, padding `16px 18px`, em linha: ícone 38px em quadrado de raio 10px sobre `--g1`; título "Pentateuco" (14px/600) com subtítulo "Gênesis 40 de 50 capítulos" (12.5px, `--g5`); percentual "18,8%" à direita em 14px/700 display cor `--or`. Toque leva a Progresso.

**O que sai da Home:** o anel de percentual, "3,3% da Bíblia", "dias seguidos", "dias/semana", "semanas lendo", as barras AT/NT e o bloco duplicado dos três passos. Tudo isso vive em Progresso (1f), que já apresenta melhor.

**Regra de conteúdo:** o número em destaque nunca é o mais próximo de zero. "Gênesis 40 de 50" e "Pentateuco 18,8%" crescem visivelmente toda semana; "3,3% da Bíblia" fica meses parado e desanima.

---

### 1b — Leitura

**Propósito:** ler. É a tela mais usada do app e deve ser a mais silenciosa.

**Problema resolvido:** hoje o primeiro versículo começa a cerca de um terço da tela, atrás de quatro chips (um deles cortado na borda), o player de áudio com dois modos, o cabeçalho do livro, o do capítulo, o rótulo da versão e "Cap. 1" — quatro níveis de cartão aninhado antes da Palavra.

**Layout:** cabeçalho compacto 48px → texto rolável → controles fixos no rodapé. **Sem barra de navegação inferior** nesta tela.

**Cabeçalho (48px):** fundo `rgba(245,233,222,.86)` com `backdrop-filter: blur(12px)`. Seta "←", depois duas linhas: "Gênesis 41" (14px/700 display) e "NVT · 40 de 50" (10.5px, `--g5`). À direita, dois ícones de 19px em `--g6`: áudio e menu. **O cabeçalho se esconde ao rolar para baixo e reaparece ao rolar para cima.**

**Texto:**
- Rótulo "CAPÍTULO 41" em 11px/700, tracking .1em, uppercase, cor `--or`, margem inferior 16px.
- Parágrafos em **19px/1.72**, cor `--bk`, `text-wrap: pretty`, margem entre parágrafos 18px.
- **Sem cartão em volta do texto.** Ele ocupa a largura da tela menos 26px de cada lado.
- Números de versículo inline: 11px/700, cor `--or`, `vertical-align: super`, 3px à direita e 5px à esquerda quando no meio do parágrafo.
- Trecho marcado: fundo `rgba(255,196,0,.32)`, raio 3px, padding `1px 2px`.

**Rodapé fixo (padding `0 20px 12px`):**
1. **Player de áudio** — barra escura: fundo `--bk`, raio 18px, padding `12px 14px`, `--shadow-premium`. Botão play circular de 40px com `--grad-vivid`; título "Ouvir Gênesis 41" (12.5px/600, branco) sobre uma barra de progresso de 3px (`rgba(255,255,255,.22)` com preenchimento `#E08A3C`); tempo "7:12" à direita em 11px `rgba(255,255,255,.55)`. Um player só — os dois modos atuais viram uma opção dentro do menu.
2. **Dois botões, 46px, raio 14px, `gap: 8px`:**
   - **"Ferramentas"** — fundo branco, texto `--g6`. Abre uma **folha inferior (bottom sheet)** com Contexto, Mapa, Notas e Curiosidades. Isso substitui a fileira de chips.
   - **"Concluir leitura"** — `--grad-primary`, texto branco 13px/700. Marca o passo como feito e avança para Reflexão.

**Folha de Ferramentas** (a especificar em detalhe se desejado): folha inferior com raio superior 22px, fundo branco, alça de arraste, e quatro itens em lista com ícone, título e uma linha de descrição.

---

### 1c — Meu Plano (executar)

**Propósito:** fazer a rotina de hoje. Só isso.

**Cabeçalho (52px):** título "Meu plano" (22px/800 display, tracking −0.6px) à esquerda; link **"Ajustar"** (12.5px/600, cor `--or`) à direita, que leva a 1d.

**Conteúdo:**
- Subtítulo: "Três passos, 30 minutos. Um por vez." (13.5px, `--g5`), margem inferior 20px.
- **Três cartões de passo, em três estados visuais distintos:**

| Estado | Aparência |
| --- | --- |
| **Concluído** | Cartão branco, raio 18px, padding 18px. Círculo de 34px em `#B5005D` com ✓ branco. Título em `--bk`, subtítulo "10 min · concluído às 6:42" em `--g5`. |
| **Atual** | Cartão com `--grad-primary` + `--shadow-glow`, raio 22px, padding 22px. Rótulo "PASSO 2 DE 3 · AGORA", título 24px/800 display, estimativa de tempo, e botão pílula branco de 48px "Ler agora →" com texto em `--or`. |
| **Pendente** | Cartão `rgba(255,255,255,.55)`, raio 18px. Círculo de 34px com `1.5px dashed --g3`, vazio. Título em `--g6`, subtítulo em `--g4`. Sem botão. |

- **Modo mãos-livres** — cartão escuro (`--bk`), raio 18px, padding `16px 18px`: ícone 36px em quadrado de raio 10px com `--grad-vivid`; título branco 14px/600 "Modo mãos-livres"; subtítulo "Faça a rotina só ouvindo" em `rgba(255,255,255,.6)`; chevron "›" à direita.
- **Link de escape** ao fim, centralizado, 12.5px cor `#8a8078`: "Quer mudar duração ou passos? **Ajustar meu plano**" (as três últimas palavras em `--or` peso 600).

**O que sai desta tela:** o acordeão "Como funciona o método", os quatro interruptores de "Adicionar ao meu plano", o seletor de duração e a seção de Estudos. Interruptores e duração vão para 1d; Estudos vai para a Biblioteca (1e).

**"Como funciona o método"** deve aparecer apenas nos primeiros dias de uso e se recolher sozinho depois — não é conteúdo permanente de uma tela diária.

---

### 1d — Ajustar meu plano (configurar)

**Propósito:** toda a configuração da rotina, num lugar só, visitado raramente. Alcançada pelo link "Ajustar" em 1c e pelo onboarding.

**Layout:** fundo **branco** (não creme — sinaliza "tela de ajuste"). Cabeçalho 56px com "←" e título "Ajustar meu plano" (16px/700 display) sobre borda inferior. Conteúdo rolável com padding 22px. Rodapé fixo com botão de salvar.

**Seções** (cada uma com rótulo de seção em `--or` e uma linha de explicação em 13px cor `--g5`):

1. **"TEMPO POR DIA"** — "Define o tamanho da leitura diária." Quatro blocos em linha, 64px de altura, raio 14px, `gap: 8px`: 10 / 30 / 45 / 60, cada um com o número em 18px/700 display sobre "min" em 10px/500. Selecionado: fundo `--or`, número branco, "min" em `rgba(255,255,255,.75)`. Não selecionado: borda `1px solid --g2`, número em `--g6`, "min" em `--g4`.
2. **"PASSOS DO DIA"** — "Leitura é obrigatória; o resto é seu." Quatro linhas de 15px de padding vertical, separadas por `1px solid rgba(18,18,18,.07)`. Cada linha: quadrado de 30px raio 8px com a cor do módulo a 10% de opacidade; nome (15px/600); duração à direita (12px, `--g4`); interruptor de 44×26px, raio total, botão interno branco de 20px. Cores dos interruptores ligados: Oração `#B5005D`, Leitura `--or`, Reflexão `--bk`. Desligado: fundo `--g2` com o botão à esquerda. **Leitura fica ligada e desabilitada.** Estudo entra desligado por padrão.
3. **"RITMO DA SEMANA"** — "Quantos dias você quer se comprometer? Os outros são descanso, sem culpa." Cinco blocos de 44px, raio 12px, `gap: 6px`: 3 / 4 / 5 / 6 / 7. Selecionado em `--or` com texto branco; os outros com borda `--g2`. **Padrão: 5.**

**Rodapé:** borda superior, padding `16px 22px 24px`, botão pílula de 52px com `--grad-primary`, texto "Salvar plano" 16px/700 display branco.

---

### 1e — Biblioteca

**Propósito:** um endereço único para tudo que o usuário produziu — notas, marcações, sermões e estudos. Hoje Notas vive na aba Bíblia e no Perfil; Estudos vive em Meu Plano e no Perfil; e o usuário não sabe onde procurar.

**Problema resolvido:** "Minhas anotações" hoje abre com o formulário de sermão **expandido** ocupando a tela inteira; a busca e os filtros ficam abaixo dele, e a lista — o motivo de entrar ali — só aparece depois de rolar tudo.

**Layout:** cabeçalho não rolável (título + busca + filtros) → lista rolável → FAB → barra inferior.

**Cabeçalho:**
- Título "Biblioteca" (24px/800 display, tracking −0.7px).
- **Campo de busca** — 44px, raio 14px, fundo branco, ícone de lupa 17px em `--g4`, placeholder "Buscar nas suas anotações" (14px, `--g4`).
- **Fileira de filtros** — chips de 32px, raio total, padding lateral 14px, `gap: 7px`: Todas · Notas · Marcações · Estudos · Sermões. Ativo: fundo `--bk`, texto branco. Inativo: fundo branco, texto `--g6`, 12px/600.
- **A fileira rola horizontalmente com máscara de esmaecimento:** `mask-image: linear-gradient(to right, #000 88%, transparent)`. Hoje o último chip aparece cortado ao meio na borda e parece defeito de layout. Aplique a mesma correção em qualquer fileira rolável do app.

**Lista** (`gap: 10px`, cartões brancos de raio 16px, padding `16px 18px`). Cada item começa com uma linha de metadados: ponto de 6px na cor do tipo + tipo em 11px/700 uppercase tracking .08em na mesma cor + data em 11px cor `--g4` alinhada à direita.

| Tipo | Cor | Corpo |
| --- | --- | --- |
| Reflexão | `--or` | Referência em 14px/600 + texto da reflexão em 13.5px/1.55 cor `#5a5350` |
| Marcação | `#B8860B` | Trecho em itálico 14px/1.55 cor `--g6` + referência em 12px/600 cor `--or` |
| Sermão | `#B5005D` | Pregador e igreja em 14px/600 + resumo em 13.5px |
| Estudo | — | Cartão `rgba(255,255,255,.55)` em linha: ícone 34px, título "Estudo: Filipenses", progresso "Passo 2 de 6 · retomar", chevron "›" |

**FAB** — círculo de 56px, `position: absolute`, `right: 22px`, `bottom: 96px` (acima da barra de 74px), `--grad-primary` + `--shadow-glow`, ícone "+" branco de 22px. **Abre o formulário de anotação numa folha inferior** — ele deixa de ser conteúdo fixo da tela.

**Estado vazio:** se não há itens, mostrar um texto curto com dois exemplos concretos do que se pode guardar ali (uma reflexão sobre o capítulo do dia; a anotação do sermão de domingo) — não um formulário.

---

### 1f — Progresso ("Sua caminhada")

**Propósito:** mostrar história e crescimento com **dois** placares, não sete.

**Decisão de produto:** os dois placares escolhidos são **constância (semanal)** e **caminhada pela Bíblia (bloco/livro atual)**. Níveis e XP passam a ser consequência silenciosa, reveladas discretamente no fim desta tela. Conquistas aparecem **apenas no momento em que são ganhas** (um toast ou uma folha de celebração), não como grade permanente. Desafios de grupo vivem em Comunidade.

**Conteúdo:**

1. **Título** "Sua caminhada" (24px/800 display).
2. **Cartão de constância** — fundo `--bk`, raio 20px, padding 22px, texto branco:
   - Rótulo "CONSTÂNCIA" em `rgba(245,233,222,.6)`.
   - Número grande: "**18**" (44px/800 display, tracking −1.6px) + "semanas na meta" (14px/500, `rgba(245,233,222,.7)`).
   - **Gráfico de barras das últimas 9 semanas** — 52px de altura, `gap: 4px`, barras de raio 4px. Semana na meta: `#E08A3C` em altura total ou 80%. Semana abaixo da meta: `rgba(224,138,60,.5)`. Semana em curso: `rgba(245,233,222,.22)`.
   - Legenda: "Últimas 9 semanas. Uma semana abaixo da meta não apaga as anteriores." (12.5px, `rgba(245,233,222,.6)`).
3. **Cartão de posição na Bíblia** — branco, raio 20px, padding 22px:
   - Rótulo "ONDE VOCÊ ESTÁ NA BÍBLIA" em `--or`.
   - "Gênesis 40 de 50" (22px/800 display) + "Pentateuco · 1º de 8 blocos" (13px, `--g5`).
   - Barra de progresso de 10px, raio total, trilha `--g1`, preenchimento com gradiente `#B5651D → #9D4300`.
   - **Lista dos 8 blocos** (`gap: 12px`), cada linha: nome à esquerda (13.5px), trilha de 110×6px à direita com preenchimento em `--or`, percentual em 38px de largura alinhado à direita. Blocos não iniciados: nome em `--g4` peso 500, trilha vazia `#F0EAE4`, "—" em `#C6BFB8`.
   - **Rodapé do cartão, discreto:** "3,3% da Bíblia inteira · 40 de 1.189 capítulos" em 12px cor `--g4`. É o único lugar onde esse número aparece.
4. **Nível, discreto** — cartão `rgba(255,255,255,.55)`, raio 16px, em linha: círculo de 34px com o número do nível em `--or` sobre `--g1`; "Aprendiz da Palavra" (13.5px/600) e "Nível 2 · faltam 260 XP pro próximo" (12px, `--g5`); chevron "›".

---

### 1g — Entrada (onboarding)

**Propósito:** deixar a pessoa **ler antes de cadastrar**. Hoje idioma, consentimento, idade mínima, conta, plano, módulos e duração vêm todos antes do primeiro versículo — e quem chega do site desiste no caminho.

**Fluxo novo:**

1. **Uma pergunta** (tela escura) → 2. **Leitura imediata** (tela 1b, com dados em memória) → 3. **Convite a salvar** (tela creme, no fim da primeira leitura).

**Tela 1 — a pergunta.** Fundo `--bk`, padding `56px 30px 0`.
- Marca: quadrado de 44px, raio 12px, com `--grad-vivid`.
- Rótulo "PASSO 1 DE 1" em `#E08A3C` — comunica que é só uma pergunta.
- Título: "Quanto tempo você tem por dia?" (32px/800 display, tracking −1px, branco).
- Subtítulo: "É a única coisa que preciso saber pra montar sua leitura. Dá pra mudar depois." (15px/1.6, `rgba(245,233,222,.65)`).
- **Três opções**, 62px de altura, raio 16px, `gap: 10px`, cada uma com o número em 20px/800 display numa coluna fixa de 44px + a consequência ao lado em 14px:
  - "10 — min · um capítulo por dia"
  - "30 — min · Bíblia inteira em 2 anos" *(padrão, selecionado com `--grad-primary` + `--shadow-glow`)*
  - "60 — min · Bíblia inteira em 1 ano"
  - Não selecionado: borda `1px solid rgba(245,233,222,.2)`, número branco, texto em `rgba(245,233,222,.6)`.
- **Rodapé:** botão pílula branco de 54px "Começar a ler →" com texto em `--or`; abaixo, "Sem cadastro agora. A conta entra quando você quiser salvar." (12.5px, `rgba(245,233,222,.45)`, centralizado).

**Idioma** passa a vir do aparelho (`navigator.language`), com troca disponível no cabeçalho. **Consentimento e idade mínima** entram no momento do cadastro, não antes da leitura.

**Tela 2 — o convite a salvar.** Fundo `--g1`, padding `50px 30px 0`. Aparece **depois** da primeira leitura concluída.
- Círculo de 52px em `--or` com ✓ branco de 24px.
- Título: "Você leu Gênesis 1" (30px/800 display, tracking −0.9px).
- Corpo: "Quer guardar isso? Com uma conta, sua leitura, suas marcações e seu ritmo ficam salvos em qualquer aparelho." (15px/1.6, `#5a5350`).
- **Cartão do que se perde** — branco, raio 18px, padding 20px, duas linhas separadas por borda, cada uma com ponto de 7px em `--or`: "1 capítulo lido hoje" e "Plano de 30 min montado pra você".
- Campo de e-mail: 52px, raio 14px, branco, borda `--g2`.
- Botão: 52px, raio 14px, `--grad-primary`, "Salvar minha leitura" (15.5px/700 display).
- **Saída sem atrito:** "Continuar sem conta" em 13.5px/500 cor `--g5`, centralizado. Se escolhida, guardar o progresso localmente e repetir o convite depois da terceira leitura.

**Estado antes da conta:** o app precisa funcionar com progresso em `localStorage` e migrar esses dados para o servidor no momento do cadastro. Isto é a principal implicação técnica deste redesign.

---

### 1h — Home do site

Repositório `daniziller/jesus-corner-site`, arquivos `src/App.jsx` e `src/content.js`.

**Problemas:** o produto só aparece na quarta seção (duas seções de manifesto vêm antes); a mesma chamada laranja com o mesmo texto de apoio repete cinco vezes; dois dos três cartões de Download estão apagados com "em breve"; a captura do Hero mostra uma conta quase vazia (3,3%, dois dias de sequência, NT em 0%) e comunica sem querer "pouca coisa acontece aqui"; e não há nenhuma prova social.

**Nova ordem:**

| # | Seção | Nota |
| --- | --- | --- |
| 1 | **Hero** | Trocar a captura: usar a tela de **Leitura**, não a Home — é o que a pessoa vai fazer. **CTA em destaque.** |
| 2 | **Como funciona** | **Nova.** Os três passos — Oração, Leitura, Reflexão. É a ideia central do app e hoje está invisível no site. |
| 3 | **Telas** | Recapturar tudo a partir de uma **conta madura**: meses de constância, livros concluídos, marcações e anotações reais. |
| 4 | **Depoimentos** | **Nova.** Três depoimentos curtos com primeiro nome e cidade. |
| 5 | **Recursos** | Mantida. |
| 6 | **Preço** | **CTA em destaque** (o segundo e último). |
| 7 | **Instalar** | Um cartão só (app na web) + tutorial. Google Play e App Store viram **uma linha de lista de espera com campo de e-mail**, não dois cartões apagados. |
| 8 | **Por que fiz o app** | Propósito + origem do nome, fundidos. Um parágrafo em primeira pessoa. |
| 9 | **FAQ + contato** | Fundidos. |

**Chamadas:** exatamente **duas em destaque** (Hero e Preço) mais **uma barra fixa discreta** que aparece depois da primeira dobra. Se uma seção intermediária precisar de convite, que seja um **link em texto** com a frase daquela seção — não o mesmo botão laranja.

---

## Interações e comportamento

| Interação | Especificação |
| --- | --- |
| "Começar" na Home | Vai para o passo atual da rotina (não para o início dela) |
| Botão de áudio na Home | Inicia a rotina em modo mãos-livres |
| Cabeçalho da Leitura | Esconde ao rolar para baixo, reaparece ao rolar para cima; transição de transform 200ms `ease-out` |
| "Ferramentas" | Abre folha inferior; entra de baixo em 260ms `cubic-bezier(.32,.72,0,1)`; fecha por arraste ou toque no fundo |
| "Concluir leitura" | Marca o passo, anima o indicador de 3 passos, avança para Reflexão |
| Filtros da Biblioteca | Filtram a lista no cliente, sem recarregar a tela |
| FAB da Biblioteca | Abre o formulário em folha inferior |
| Interruptores de 1d | Alteram a duração estimada exibida em tempo real; Leitura fica travada |
| Cartão de passo | Concluído e pendente não são clicáveis para "começar"; concluído abre o que foi feito |
| Retorno após ausência | **Nunca** mostrar "sequência perdida". Mostrar "Que bom te ver de volta — continue em Gênesis 41." |

**Estados a especificar na implementação:** carregamento (esqueleto dos cartões, sem spinner de tela cheia), erro de rede na leitura (o texto bíblico é local — deve funcionar offline), e áudio indisponível.

---

## Estado e dados

Nenhuma migração de esquema é exigida pelo visual, mas três mudanças de lógica são:

1. **Constância passa a ser semanal.** Substituir "dias seguidos" por "dias na semana corrente / meta semanal" e "semanas na meta" como contador histórico. Novo campo de preferência: `weekly_goal_days` (3–7, padrão 5). Um dia perdido não zera nada. **Isto é a mudança de retenção mais importante do pacote** — num app devocional, culpa é o principal motivo de alguém não voltar.
2. **"Plano completo" deixa de exigir os três módulos no mesmo dia.** O dia conta como cumprido quando a **Leitura** é concluída; Oração e Reflexão somam qualidade, não obrigação.
3. **Progresso antes da conta.** Progresso em `localStorage`, migrado no cadastro.

---

## Monetização

**Hoje:** Meu Plano e Comunidade aparecem com cadeado na barra de navegação, e o toque leva direto ao upgrade. São justamente as duas coisas que fazem a pessoa voltar amanhã — o cadeado está na porta de entrada do hábito.

**Proposta — bloquear profundidade, não a porta:**

- **Meu Plano** funciona no gratuito, no formato simples (um plano, duração fixa). Premium libera múltiplos planos, planos temáticos e o modo mãos-livres.
- **Comunidade:** o gratuito **participa** de um grupo; criar grupos é Premium.
- **Momento da cobrança:** depois da **primeira semana completa** na meta, não na primeira sessão. O paywall aparece quando o valor já apareceu.
- **Tirar os cadeados da barra de navegação.** Ícone de cadeado no ponto exato do recurso avançado, dentro da tela.

---

## Ícones

Todos os ícones dos protótipos são traçados simples de 16–24px com `stroke-width: 1.7`, `stroke-linecap: round`, sem preenchimento — desenhados apenas para o mock. **Use a biblioteca de ícones já adotada no app**, mantendo peso e tamanho equivalentes. Ícones ativos em `--or`, inativos em `--g4`, sobre fundo escuro em branco.

## Assets

Nenhum asset novo. Os ícones e o logotipo da marca já existem em `brand/` no repositório do app. As capturas de tela do site precisam ser **refeitas a partir de uma conta madura** — este é o único trabalho de asset que o redesign exige.

---

## Ordem de implementação sugerida

Cada etapa é independente e entrega valor por si:

1. **Início (1a)** — maior retorno pelo menor esforço; é reordenar e mover o que já existe.
2. **Leitura (1b)** — a tela mais usada; ganho imediato de qualidade percebida.
3. **Meu Plano + Ajustes (1c, 1d)** — separação de execução e configuração.
4. **Constância semanal** — mudança de lógica, com efeito direto na retenção.
5. **Progresso (1f)** e recolhimento dos sistemas de recompensa.
6. **Biblioteca (1e)** — envolve mexer na navegação; confirmar a barra antes.
7. **Entrada (1g)** — exige o progresso pré-conta em `localStorage`.
8. **Site (1h)** — independente do app; pode andar em paralelo.

## Duas decisões que precisam do autor antes do código

1. **A barra inferior troca Progresso por Biblioteca?** Afeta rotas e analytics.
2. **A sequência de dias corridos vira meta semanal?** Afeta metas, conquistas e notificações já implementadas.
