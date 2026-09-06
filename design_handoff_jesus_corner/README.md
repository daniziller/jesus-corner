# Jesus' Corner — handoff de design, rodadas 3 a 23

> **Leia antes:** este documento cobre as **rodadas 3 a 23** (52 telas). As rodadas **24 a 32** (30 telas novas, que substituem várias daqui) estão em `ADENDO-TURNOS-24-32.md`, e a lista de trabalho completa das **82 telas** está em `PROMPT-PARA-CLAUDE-CODE.md`. **Comece pelo PROMPT.** Onde este README discordar do ADENDO, o ADENDO vence; onde discordar do arquivo de design, o design vence.
>
> Telas deste documento que **não** devem ser implementadas como estão: `4a` (use `32a` e `26b`), `5f` (use `28a`+`28b`), `18a` (use `32c`), `12a` (use `29a`+`30a`), `5b` (use `30b`+`30c`), `21a` (use `26a`), `21b` (use `26c`+`29b`).

Contém as 52 telas das rodadas 3 a 23, o design system fechado, as regras de produto, as mudanças de lógica e a ordem de implementação.

---

## Índice

1. [Como usar este pacote](#1-como-usar-este-pacote)
2. [A mudança de identidade](#2-a-mudança-de-identidade-leia-antes-de-tudo)
3. [Design system](#3-design-system)
4. [Marca](#4-marca)
5. [Arquitetura de navegação](#5-arquitetura-de-navegação)
6. [Mapa de telas e estado](#6-mapa-de-telas-e-estado)
7. [Especificação — Entrada e onboarding](#7-entrada-e-onboarding-13-15-14)
8. [Especificação — Hoje e Caminhada](#8-hoje-e-caminhada-3c-12a-5b)
9. [Especificação — Leitura e Bíblia](#9-leitura-e-bíblia-4a-5e-5f-18a-18b)
10. [Especificação — Meu Plano e passos](#10-meu-plano-e-os-três-passos-4b-5a-21a-21b-21c)
11. [Especificação — IA na leitura](#11-ia-na-leitura-10a-10f)
12. [Especificação — Estudos gerados](#12-estudos-gerados-22a-22d)
13. [Especificação — Biblioteca](#13-biblioteca-4c)
14. [Especificação — Comunidade](#14-comunidade-5d-17a-17b-17c)
15. [Especificação — Perfil e ajustes](#15-perfil-e-ajustes-19a-19b-19c)
16. [Especificação — Painel do admin](#16-painel-do-administrador-23a-23d)
17. [Especificação — Site](#17-site)
18. [Regras de produto transversais](#18-regras-de-produto-transversais)
19. [Mudanças de lógica e dados](#19-mudanças-de-lógica-e-dados)
20. [Monetização](#20-monetização)
21. [Ordem de implementação](#21-ordem-de-implementação)
22. [Decisões pendentes](#22-decisões-que-precisam-do-autor)

---

## 1. Como usar este pacote

| Arquivo | Conteúdo |
| --- | --- |
| `README.md` | Este documento — a especificação |
| `Jesus Corner Redesign.dc.html` | As 52 telas do app e do admin, identificadas por id (`3c`, `4a`, `10b`…) |
| `Site Jesus Corner Bento.dc.html` | A home do site em alta fidelidade |
| `support.js` | Runtime necessário para abrir os dois arquivos acima |
| `PROMPT-PARA-CLAUDE-CODE.md` | O prompt inicial para o desenvolvedor |

Para ver os designs: abra os `.dc.html` no navegador, com `support.js` na mesma pasta. O arquivo do app é um canvas — dá para arrastar e dar zoom. As telas estão agrupadas por rodada, **a mais recente no topo**. Cada tela tem um id visível (badge cinza) que é a referência usada neste documento.

**Os arquivos `.dc.html` são referências visuais, não código de produção.** São protótipos em HTML com estilos inline. A tarefa é **recriar os designs no app existente** — React 18 + Vite, com o CSS e os componentes que já estão no projeto. Não introduza framework, biblioteca de UI, Tailwind ou CSS-in-JS.

**Fidelidade: alta.** Cores, tipografia, espaçamentos e raios são finais. Recrie fielmente. O que é propositalmente aproximado: os textos de exemplo (versículos, nomes, números) e os ícones — que devem vir da biblioteca de ícones já usada no app.

**Quadros de 390×800** são telas de celular. **Quadros de 1280×800** (rodada 23) são o painel web do administrador.

---

## 2. A mudança de identidade (leia antes de tudo)

Esta é a causa mais provável de trabalho incompleto em tentativas anteriores.

O app hoje usa uma paleta laranja-queimado (`#9D4300`) com as fontes **Be Vietnam Pro** e **Plus Jakarta Sans**, cartões arredondados claros e gradientes.

**Todo o redesign usa uma identidade diferente, chamada "Bento":**

- Fundo creme mais frio, `#EDE8E2`
- Tinta preta quente, `#1A1714` — não `#121212`, não preto puro
- Laranja vivo, `#F0662B` — não `#9D4300`
- Fonte única: **Manrope**, nos pesos 500/700/800
- **Zero gradientes.** Blocos de cor sólida
- Blocos grandes de raio alto (24–28px) em lugar de cartões com borda

Consequências práticas:

1. **Nenhuma tela fica na paleta antiga.** Se uma tela do app não estiver em Manrope + `#EDE8E2` + `#F0662B`, ela não foi migrada.
2. **Os tokens antigos saem.** `--or`, `--olt`, `--grad-primary`, `--grad-vivid`, `--shadow-glow`, `--brand-deep` e as duas famílias antigas devem ser substituídos, não coexistir.
3. **Texto sobre laranja é preto (`#1A1714`), nunca branco.** É a decisão mais fácil de errar. O laranja `#F0662B` é claro; texto branco sobre ele não passa em contraste.

As rodadas 1 e 2 do arquivo de design (que não estão mais no arquivo) usavam a identidade antiga e foram removidas. Se você viu referências a `1a`–`1h`, elas correspondem a `3c`, `4a`, `4b`, `4c`, `5a`, `5b` na numeração atual. **Use só os ids deste documento.**

---

## 3. Design system

### 3.1 Cores

Adicione em `src/index.css`. Os nomes dos tokens são sugestão; os valores não.

| Token sugerido | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#EDE8E2` | Fundo de toda tela do app |
| `--card` | `#FFFFFF` | Bloco de conteúdo |
| `--ink` | `#1A1714` | Preto quente: texto principal, blocos escuros, blocos de IA |
| `--accent` | `#F0662B` | Laranja: ação primária, número de versículo, estado ativo, "onde você parou" |
| `--sand` | `#E6DACB` | Bloco de aviso, nota lateral, item concluído, leitura livre |
| `--sand-ink` | `#5A4327` | Texto sobre `--sand` |
| `--sand-label` | `#9C8B76` | Rótulo sobre `--sand` |
| `--sand-strong` | `#3A2A18` | Título sobre `--sand` |
| `--highlight` | `#FFE3C9` | Realce de trecho marcado no texto bíblico |
| `--t2` | `#6E655C` | Texto secundário |
| `--t3` | `#8B8279` | Texto terciário, subtítulo, data |
| `--t4` | `#A29A91` | Rótulo de seção (uppercase) |
| `--t5` | `#BDB5AC` | Metadado, estado inativo, placeholder |
| `--line` | `#DDD6CE` | Divisor sobre fundo creme |
| `--line-soft` | `#D6CFC7` | Borda de campo, trilha de progresso |
| `--field` | `#F2EEE9` | Fundo de campo de formulário dentro de bloco branco |
| `--accent-ink` | `#7A4A1E` | Texto laranja escuro sobre creme, quando `--accent` não tem contraste |

Sobre blocos escuros (`--ink`), use branco com alfa em lugar de cinzas: `rgba(255,255,255,.45)` para rótulo, `.5` para metadado, `.7` para corpo, `1` para título.

**Regras de cor:**

- **Um só elemento laranja por tela** — a ação primária. Números de versículo e o marcador de "onde você parou" são as duas exceções permitidas.
- **No máximo um bloco escuro por tela**, exceto nas telas que são inteiramente escuras (`13a`, `15e`, `21c`, e as folhas de IA).
- **Sem gradiente em nenhum lugar.**
- Areia (`--sand`) significa uma de três coisas, sempre: já concluído, aviso/consequência, ou leitura fora do plano. Nunca decoração.

### 3.2 Tipografia

**Manrope**, única família. Carregue os pesos 400, 500, 700, 800.

```
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap');
```

| Papel | Especificação |
| --- | --- |
| Saudação / título de tela | 21px / 800 / 1.1 / `-.7px` |
| Título de tela grande | 24px / 800 / 1.1 / `-.8px` |
| Número grande em bloco escuro | 32px / 800 / 1.05 / `-1.2px` |
| Número de estatística | 34px / 800 / 1 / `-1.2px` |
| Título de onboarding | 26–28px / 800 / 1.15 / `-.9px` |
| Título de bloco | 15px / 800 |
| Título de item de lista | 14px / 700 |
| Botão primário | 15.5px / 800 |
| Corpo | 13.5px / 500 / 1.55 |
| Corpo secundário | 12.5px / 500 / 1.5 — cor `--t3` |
| Rótulo de seção | 10.5px / 700 · `letter-spacing: .12em` · uppercase · cor `--t4` |
| Metadado | 11px / 500 — cor `--t5` |
| Rótulo de aba | 10px / 600–800 |
| **Texto bíblico** | **17px / 400 / 1.75** · `text-wrap: pretty` |
| Número de versículo | 10px / 800 · `vertical-align: super` · cor `--accent` |

Tracking negativo apenas em tamanhos ≥ 21px. Nunca abaixo disso.

### 3.3 Forma e espaçamento

| Elemento | Raio |
| --- | --- |
| Bloco de destaque (ação principal, painel) | 28px |
| Bloco de conteúdo branco | 24px |
| Bloco secundário / item de lista | 18px |
| Botão retangular, chip quadrado, célula de capítulo | 12–14px |
| Tile de iniciais (avatar) | 13px |
| Pílula (chip de filtro, botão de tempo) | 99px |
| Realce de texto | 3px |

- Padding lateral da tela: **20px**. Na tela de Leitura: **24px**.
- Padding interno de bloco: **20px** (24px no bloco de destaque).
- Gap entre blocos empilhados: **12px**. Entre grupos de seção: **20–24px**.
- **Sem sombras dentro do app.** A sombra dos protótipos é só a moldura do celular — não recriar.
- **Sem bordas em blocos.** A separação vem do contraste entre `--card` e `--bg`.
- Altura de toque mínima **44px**.
- Todo container rolável precisa de `padding-bottom` que inclua a altura da barra de abas (**74px**). Conteúdo cortado no fim da rolagem era um defeito recorrente do app antigo.

### 3.4 Linguagem visual da IA

**Regra dura: tudo que a IA diz mora em bloco escuro (`--ink`) marcado com um losango laranja** — um quadrado de 8px em `--accent` rotacionado 45°, à esquerda do rótulo.

- O losango é o único sinal de "isto foi gerado por máquina". Ele nunca aparece em conteúdo humano.
- **O símbolo da marca nunca aparece em bloco de IA.** Confundir marca com máquina é a única coisa que a identidade proíbe explicitamente.
- Bloco escuro **sem** losango = conteúdo do app ou humano (ex.: o seletor de capítulo `18b`, o bloco de convite `19c`).
- Toda resposta de IA termina com o rodapé **"escrito por IA, confira no texto"**, sem exceção.
- Toda resposta de IA cita referência. **Quem não cita, não responde** — se o modelo não produzir referência verificável, a resposta é descartada.

### 3.5 Padrão de estado em três níveis

Usado nos passos do plano (`4b`, `22c`), nas etapas do ACTS (`21a`) e na grade de capítulos (`18a`):

| Estado | Tratamento |
| --- | --- |
| **Concluído** | Bloco areia (`--sand`), texto `--sand-ink` |
| **Agora** | Bloco escuro (`--ink`), texto branco, botão laranja |
| **Ainda não** | Bloco branco translúcido (`rgba(255,255,255,.5)`), texto `--t5` |

Na grade de capítulos o mesmo código vira: **preto = lido, laranja = onde você parou, cinza-claro = por ler.**

---

## 4. Marca

Telas `16a`, `16b`, `16c`.

**Símbolo:** um livro aberto visto de frente — bloco preto (`#1A1714`) com duas páginas em cinza (`#A29A91`) e a lombada em laranja (`#F0662B`). Linhas de texto nas páginas.

**Logotipo:** "Jesus'" em preto (ou branco sobre escuro) e "Corner" no mesmo laranja da lombada. O contraste entre as duas palavras **é** a assinatura.

**Construção:** altura do símbolo igual à da caixa alta do logotipo. Distância entre símbolo e texto = metade da largura do símbolo.

**As três cores da identidade de marca:**

| Cor | Valor | Papel |
| --- | --- | --- |
| Preto quente | `#1A1714` | Bloco do livro, palavra "Jesus'" |
| Cinza página | `#A29A91` | As páginas — único cinza neutro da identidade |
| Laranja lombada | `#F0662B` | Lombada, palavra "Corner" |

**Redução do ícone do app:** 72px com três linhas de texto nas páginas; 44px com duas; 28px e 16px sem nenhuma — só as duas páginas e a lombada.

**Três variações, e só três:**
1. Sobre preto — tile laranja, páginas pretas
2. Sobre laranja — logotipo todo preto
3. Monocromática — carimbo, fatura, favicon

**Proibido:**
- Inclinar, abrir em perspectiva, ou arredondar as páginas além de 6px
- Trocar a cor da lombada — é a única peça laranja e é o que identifica a marca
- Colorir "Jesus'" de laranja, ou deixar as duas palavras na mesma cor
- Inverter o quadrado para branco — o cinza da página perde contraste e o livro desaparece
- Usar o símbolo em bloco de IA

**Dentro do app a marca aparece em uma única tela: `13a` (boas-vindas).** No resto do produto o cabeçalho é a saudação ("Bom dia, Diego"), não o logotipo. Isso é intencional.

**Entregável de asset:** exportar o símbolo em SVG nos quatro tamanhos (72/44/28/16) para o repositório, mais o favicon monocromático.

---

## 5. Arquitetura de navegação

### 5.1 A barra de abas — cinco itens

**Hoje · Meu Plano · Bíblia · Biblioteca · Comunidade**

Mudanças em relação ao app atual:

| Antes | Depois |
| --- | --- |
| "Início" | **"Hoje"** — a aba se chama Hoje; "Sua caminhada" é o nome da tela de métricas |
| Progresso como aba | **Sai da barra.** Vira `5b`, alcançada por "Sua caminhada" dentro de Hoje |
| — | **Biblioteca entra** (`4c`) — notas, marcações, sermões e estudos num só endereço |
| Perfil como aba/tela | **Vira folha** (`19a`), aberta ao tocar nas iniciais no cabeçalho de Hoje |
| Cadeados em Meu Plano e Comunidade | **Saem da barra.** Ver [Monetização](#20-monetização) |

Especificação da barra: altura 74px, fundo `--card`, sem borda superior (o contraste basta), cinco itens distribuídos igualmente, ícone de 20px sobre rótulo de 10px, gap 5px. Ativo em `--accent`; inativo em `--t5`. **Sem botão central elevado** — a barra é plana, os cinco itens têm o mesmo peso.

### 5.2 Telas que não são abas

| Tela | Como se chega |
| --- | --- |
| `5b` Sua caminhada | Link "Sua caminhada" em Hoje |
| `19a` Perfil | Toque nas iniciais no cabeçalho de Hoje |
| `19b` Idioma | Linha "Idioma" no Perfil |
| `19c` Administração do grupo | Linha "Administração do grupo" no Perfil (só admin) |
| `5a` Ajustar meu plano | Botão "Ajustar" no cabeçalho de Meu Plano |
| `21a` `21b` | Passos 1 e 3 de Meu Plano |
| `21c` Rotina concluída | Fim do passo 3 |
| `18a` Página do livro | Toque num livro na lista da Bíblia (`5f`) |
| `18b` Seletor de capítulo | Toque no chip do capítulo no cabeçalho da Leitura |
| `5e` Ferramentas | Botão "Ferramentas" no rodapé da Leitura |
| `10a`–`10f` | Gestos e ajustes dentro da Leitura |
| `22a`–`22d` | Botão "Criar" no cabeçalho de Meu Plano |
| `17a` Sala do capítulo | Botão "Grupo" na Leitura, ou Comunidade |
| `17b` Retrospectiva | Automática, primeiro dia do mês |

---

## 6. Mapa de telas e estado

**Preencha a coluna "Estado" verificando o código atual.** Não confie em trabalho anterior.

Legenda: `OK` = implementada na identidade Bento · `ANTIGA` = existe, mas na identidade antiga · `FALTA` = não existe

### Entrada e conta
| Id | Tela | Estado |
| --- | --- | --- |
| `13a` | Boas-vindas — ler antes de cadastrar | |
| `13b` | Entrar | |
| `13c` | Criar conta | |
| `13d` | Recuperar senha (dois estados) | |

### Onboarding
| Id | Tela | Estado |
| --- | --- | --- |
| `15a` | Pergunta 1 — histórico | |
| `15b` | Pergunta 2 — a dor | |
| `14b` | Demonstração — leitura | |
| `14c` | Demonstração — perguntar sobre o texto | |
| `14e` | Demonstração — constância sem culpa | |
| `14f` | Demonstração — comunidade | |
| `15f` | Pergunta 3 — tempo de cada passo | |
| `15c` | Pergunta 4 — hora do dia | |
| `15d` | Pergunta 5 — compromisso da semana | |
| `15e` | Resultado — o plano montado | |

### Hoje e métricas
| Id | Tela | Estado |
| --- | --- | --- |
| `3c` | Hoje — versão de referência | |
| `12a` | Hoje — painel de métricas | |
| `5b` | Sua caminhada | |

### Leitura e Bíblia
| Id | Tela | Estado |
| --- | --- | --- |
| `4a` | Leitura | |
| `5e` | Ferramentas (folha) | |
| `5f` | Bíblia — lista de livros | |
| `18a` | Página do livro — capítulos | |
| `18b` | Seletor de capítulo (folha) | |

### Meu Plano e passos
| Id | Tela | Estado |
| --- | --- | --- |
| `4b` | Meu Plano — só hoje | |
| `5a` | Ajustar meu plano | |
| `21a` | Oração — ACTS | |
| `21b` | Reflexão | |
| `21c` | Rotina concluída | |

### IA na leitura
| Id | Tela | Estado |
| --- | --- | --- |
| `10a` | Menu de seleção com "Perguntar" | |
| `10b` | Resposta (folha de meia tela) | |
| `10c` | Contexto antes de ler | |
| `10d` | Reflexão com pergunta gerada | |
| `10e` | Limites — quando a IA não responde | |
| `10f` | Ajustes do assistente | |

### Estudos gerados
| Id | Tela | Estado |
| --- | --- | --- |
| `22a` | Criar estudo — o pedido | |
| `22b` | Proposta — revisar dia a dia | |
| `22c` | Meu Plano com estudo ativo | |
| `22d` | Plano para o grupo | |

### Biblioteca
| Id | Tela | Estado |
| --- | --- | --- |
| `4c` | Biblioteca | |

### Comunidade
| Id | Tela | Estado |
| --- | --- | --- |
| `5d` | Comunidade — grupo e pedidos de oração | |
| `17a` | Sala do capítulo | |
| `17b` | Retrospectiva do mês | |
| `17c` | Leitura com camada do grupo | |

### Perfil e ajustes
| Id | Tela | Estado |
| --- | --- | --- |
| `19a` | Perfil (folha) | |
| `19b` | Idioma e versão da Bíblia | |
| `19c` | Administração do grupo | |

### Marca
| Id | Tela | Estado |
| --- | --- | --- |
| `16a` | Assinatura e cores | |
| `16b` | Ícone e cabeçalho do site | |
| `16c` | Variações e limites | |

### Painel do admin (web, 1280px)
| Id | Tela | Estado |
| --- | --- | --- |
| `23a` | Visão geral | |
| `23b` | Usuários | |
| `23c` | Mensagens | |
| `23d` | Convites e códigos | |

**Total: 52 telas.**

---

## 7. Entrada e onboarding (`13`, `15`, `14`)

### A decisão que sustenta tudo

**Ninguém precisa de conta para ler.** "Começar a ler" é o botão primário; entrar e cadastrar são caminhos secundários. Consentimento e idade mínima ficam no cadastro, **não** antes da primeira leitura. Idioma vem do aparelho (`navigator.language`).

**Implicação técnica principal:** o app precisa funcionar com progresso em `localStorage` e migrar esses dados para o servidor no momento do cadastro.

### O caminho até o primeiro versículo — 7 telas

```
13a  boas-vindas
 ↓
15a  pergunta 1 — histórico
 ↓
15b  pergunta 2 — a dor            ← a resposta escolhe a tela seguinte
 ↓
14b | 14c | 14e | 14f              ← UMA demonstração, escolhida pela dor
 ↓
15f  pergunta 3 — tempo de cada passo
 ↓
15c  pergunta 4 — hora do lembrete
 ↓
15d  pergunta 5 — meta da semana
 ↓
15e  resultado — o plano montado
 ↓
4a   Gênesis 1
```

**A regra que não pode ser quebrada: nenhuma pergunta é enquete.** Cada resposta muda algo real — o texto da tela seguinte, o horário do lembrete, a meta da semana ou a ordem da leitura. Pergunta que não muda nada é pedágio, e o usuário sente.

Cada tela de pergunta tem: "Pular" no mesmo lugar (canto superior direito), o contador "Pergunta N de 5", e **uma linha em cinza começando com "Por que eu pergunto:"** explicando o motivo. Isso custa uma frase e devolve confiança — especialmente num app de fé, onde perguntar demais soa a cadastro disfarçado.

### `13a` Boas-vindas

Tela **inteiramente escura** (`#1A1714`) — a única tela do app que pode ser uma capa, e a única onde a marca aparece.

- Símbolo + logotipo (`16a`), com "leitura diária" como descritor
- Título: **"A Bíblia inteira, um dia por vez."**
- Corpo: "Do primeiro ao último livro, com um plano que cabe na sua rotina. Você diz quanto tempo tem — eu organizo o caminho."
- **Três linhas de promessa**, cada uma com marcador laranja. São as três promessas reais do produto, não adjetivos:
  - "Oração, leitura e reflexão, no seu ritmo"
  - "Pergunte sobre o texto enquanto lê"
  - "Meta semanal — um dia perdido não zera nada"
- Botão primário laranja: **"Começar a ler →"** → vai para `15a`
- Secundário, texto: "Já tenho conta" → `13b`
- Nota: "Sem cadastro agora. A conta entra quando você quiser salvar."

### `15a` Pergunta 1 — o histórico

**"Você já tentou ler a Bíblia toda?"**
Subtítulo: "Não tem resposta errada. Quase todo mundo aqui já parou em Levítico pelo menos uma vez."

Três opções, cada uma com título e uma linha de apoio:
- "Nunca tentei" — *Começo do começo, sem pressa*
- "Comecei e parei no caminho" — *A situação mais comum aqui*
- "Já li inteira" — *Quero um plano mais fundo*

*Por que eu pergunto: define se o plano recomeça em Gênesis ou vai para um plano temático.*

A tela abre com a pergunta que dá alívio: "parei no caminho" é a resposta majoritária, e o app diz isso na própria opção. A pessoa se reconhece na primeira tela.

### `15b` Pergunta 2 — a dor (a mais importante)

**"O que costuma te fazer parar?"**
Subtítulo: "Escolha quantas quiser. A próxima tela mostra exatamente o que o app faz com isso."

Cinco opções, seleção múltipla:
- Não entendo o que estou lendo
- Perco o ritmo depois de faltar um dia
- Nunca acho a hora no dia
- Esqueço o que li na semana passada
- Leio sozinho e desanimo

Botão: **"Ver o que o app faz →"**

**Roteamento — a resposta é usada imediatamente:**

| Marcou | Vem em seguida |
| --- | --- |
| "Não entendo o que estou lendo" | `14c` — perguntar sobre o texto |
| "Perco o ritmo depois de faltar um dia" | `14e` — constância sem culpa |
| "Leio sozinho e desanimo" | `14f` — comunidade |
| Qualquer outra combinação | `14b` — a tela de leitura |

Se marcou mais de uma, use a primeira da tabela que se aplicar. **Mostre só uma demonstração.**

### `14b` `14c` `14e` `14f` Demonstrações

Todas seguem o mesmo esqueleto: **um recorte real da interface no topo**, e embaixo um bloco com o rótulo "O que o app faz com isso", um título e um parágrafo. Nunca ilustração, nunca promessa abstrata. "Pular" no canto.

| Id | Recorte mostrado | Título | Parágrafo |
| --- | --- | --- | --- |
| `14b` | A tela de leitura com texto real, número de versículo e um trecho marcado | "O texto no centro, com áudio quando não der para ler" | Cinco versões da Bíblia, tipografia pensada para leitura longa e narração do capítulo inteiro — dá para ouvir no trânsito e marcar depois. |
| `14c` | Trecho selecionado + folha escura de resposta com citação | "Travou num versículo? Pergunte ali mesmo" | Selecione o trecho e pergunte. A resposta sempre cita o texto que a sustenta — e quando a pergunta é de doutrina, o app mostra os dois lados em vez de decidir por você. |
| `14e` | A Caminhada com o gráfico de semanas (**com barras baixas de propósito**) | "Sua meta é da semana, não do dia" | Você escolhe quantos dias quer se comprometer. Faltar um não zera nada — o placar conta as semanas em que você cumpriu, e ele só cresce. |
| `14f` | Comunidade com avatares e duas notas de membros | "Ninguém precisa ler sozinho" | Leia o mesmo capítulo com o grupo da sua igreja, veja quem já leu hoje e compartilhe o que te marcou — quando você quiser. |

Notas de intenção:
- `14c` é **a única tela do onboarding que fala de IA**, e já vem com o limite dito na própria frase. É assim que se anuncia IA num app de fé sem assustar.
- `14e` é a mais importante para retenção: promete, na entrada, que o app não vai punir quem falta um dia. **As barras baixas no gráfico estão ali de propósito.**
- `14f` é a única demonstração em que a voz é de outras pessoas, não do app.

### `15f` Pergunta 3 — tempo de cada passo

**"Quanto tempo você quer para cada passo?"**
Subtítulo: "Oração, leitura e reflexão têm tempos próprios. Ajuste cada um — dá para mudar depois em Meu Plano."

Três controles independentes, passo de 5 em 5 minutos:

| Passo | Apoio | Padrão |
| --- | --- | --- |
| Oração | "Método ACTS, dividido em quatro" | 10 min |
| **Leitura** (em bloco escuro — é o único que afeta o plano) | "Define o tamanho do trecho diário" | 15 min |
| Reflexão | "Três perguntas sobre o texto" | 5 min |

Abaixo: **"Total por dia — 30 min"**, recalculado ao vivo.
Atalho: "Só quero ler — sem oração e reflexão" (zera os outros dois).

**Zerar um passo equivale a desligá-lo.**

*Por que eu pergunto: o tempo de leitura define o trecho diário e a duração do plano; os outros dois são só seus.*

Três tempos, três decisões — a pessoa controla cada passo em vez de aceitar uma divisão automática.

### `15c` Pergunta 4 — a hora do dia

**"Quando dá pra você parar e ler?"**
Subtítulo: "Escolha a hora em que você costuma ter uns minutos livres. É nela que eu vou te chamar — uma vez por dia, e só isso."

- De manhã — *Antes do dia começar · 6:30*
- No meio do dia — *Almoço ou intervalo · 12:30*
- À noite — *Antes de dormir · 21:30*
- "Varia muito — não quero lembrete" (texto, secundário)

*Por que eu pergunto: só para acertar a hora do lembrete. Ninguém vê seu horário, e você desliga em Ajustes quando quiser.*

**Peça a permissão de notificação aqui**, no momento em que a pessoa acabou de escolher o horário — com o motivo na mão. Muito melhor que o alerta do sistema na primeira abertura.

### `15d` Pergunta 5 — o compromisso da semana

**"Quantos dias por semana você quer se comprometer?"**
Subtítulo: "Os outros dias são descanso, não falha. Escolher menos e cumprir vale mais que escolher sete e desistir."

Cinco opções em linha: 3 / 4 / 5 / 6 / 7 dias. **Padrão: 5.**

Abaixo, **bloco escuro que recalcula a cada toque**:
> **Com 5 dias por semana**
> Você termina a Bíblia em cerca de 2 anos e 4 meses
> Cerca de 5 capítulos por dia, no plano de 30 min. Dá para mudar quando quiser.

É a prova visível de que a resposta muda algo — e o argumento contra escolher sete dias por impulso.

*Por que eu pergunto: é a sua meta, e o placar do app passa a contar semanas cumpridas — não dias seguidos.*

### `15e` Resultado — o plano montado

Tela **inteiramente escura**. Título: **"Seu plano está pronto, Diego"**. Subtítulo: "Montado com o que você respondeu. Tudo isso muda em Ajustes, quando quiser."

Cinco linhas em que a pessoa reconhece as próprias respostas — os valores em laranja:
- Recomeço em **Gênesis 1**, do começo
- **5 dias por semana** · dois de descanso
- Lembrete às **6:30**, uma vez ao dia
- **Perguntar sobre o texto** ligado — *você disse que trava no sentido* ← cita explicitamente a dor marcada em `15b`
- Conclusão prevista: **janeiro de 2029**

Botão: **"Ler Gênesis 1 agora →"** · Nota: "Sem cadastro. A conta entra quando você quiser salvar."

Fecha no primeiro capítulo, **não** num cadastro.

**Se precisar cortar o onboarding, tire `15a`** — é a que menos muda o produto. As quatro a manter: `15b` (define o que mostrar em seguida), `15f` (dimensiona o plano), `15c` (lembrete com motivo), `15d` (meta semanal).

### `13b` Entrar

Título: "Bem-vindo de volta" · Subtítulo: "Sua leitura, suas marcações e seu ritmo estão te esperando."

Campos em bloco branco com fundo de campo `--field` (`#F2EEE9`) — mesma linguagem dos Ajustes, **nenhuma borda nova**. E-mail, senha com "mostrar", link "Esqueci minha senha".

Botão laranja "Entrar" — **o único elemento colorido da tela**. Divisor "ou". "Continuar com Google" e "Continuar com Apple" em branco: secundários por peso, não por tamanho. Rodapé: "Não tem conta? **Criar conta**".

### `13c` Criar conta

Só aparece **depois** de a pessoa já ter lido. É o que faz o argumento funcionar.

Título: "Guardar minha leitura" · Subtítulo: "Em qualquer aparelho, do ponto onde você parou."

**Bloco areia "O que vai para a conta"** — o argumento, com os dados reais da sessão:
- 4 capítulos lidos nesta semana
- Plano de 30 min montado pra você

Campos: Nome, E-mail, Senha (com "mostrar" e "Mínimo de 8 caracteres.").

**Consentimento com quadradinho laranja** (não rádio): "Tenho 13 anos ou mais e aceito os **termos** e a **privacidade**." — é aqui que idade e consentimento entram, não antes da leitura.

Botão "Criar conta". Abaixo, texto: "Continuar sem conta" — **nunca desaparece.**

### `13d` Recuperar senha

Dois estados na mesma tela.

**Pedido:** "Digite o e-mail da sua conta e eu envio um link para você criar uma senha nova." Campo + botão "Enviar link".

**Confirmação** (bloco escuro, substitui o cartão branco e o botão): "Link enviado para diego@email.com · Ele vale por 30 minutos. Se não chegar em alguns minutos, veja o spam." Com contador: "Enviar de novo em 0:42" — evita o toque repetido.

**Nota areia, que é uma promessa que o app precisa cumprir:** "Enquanto isso a leitura continua funcionando sem conta neste aparelho — nada do seu progresso é perdido durante a recuperação."

**Estados de erro a desenhar no mesmo padrão** (não estão nos protótipos): e-mail inválido, senha errada com aviso de tentativas, conta já existente com esse e-mail, e — o único que exige decisão de produto — **a fusão de dados quando alguém lê sem conta neste aparelho e depois entra numa conta que já tem progresso.** Ver [Decisões pendentes](#22-decisões-que-precisam-do-autor).

---

## 8. Hoje e Caminhada (`3c`, `12a`, `5b`)

### As duas versões de Hoje

Existem duas, e **qual aparece é uma regra, não uma preferência**:

| Tela | Quando | Ênfase |
| --- | --- | --- |
| `3c` | **Sempre nos primeiros 7 dias**, e sempre que o painel estiver zerado | A ação é o assunto; métrica é apoio |
| `12a` | Só **depois da primeira semana cumprida** | O painel vem primeiro; a ação é uma barra fixa no rodapé |

Essa regra evita o pior primeiro dia possível — um painel de zeros.

### `3c` Hoje — a versão de referência

Cabeçalho: **"Bom dia, Diego"** (21px/800) com a data abaixo (12.5px/500, `--t3`). À direita, **tile de iniciais 38px, raio 13px, fundo `--accent`, texto `#1A1714`** — é o botão que abre o Perfil (`19a`), e por isso merece a cor de ação.

Blocos, com gap 12px:

1. **Bloco de ação** — `--ink`, raio 28px, padding 24px. Rótulo "AGORA · PASSO 2 DE 3" em `rgba(255,255,255,.45)` com "12 min" à direita. Título **"Gênesis 41"** em 32px/800, tracking `-1.2px`. Botão laranja de 52px, raio 18px: **"Continuar leitura →"** com texto em `#1A1714`.
2. **Dois blocos brancos lado a lado** (raio 24px, padding 20px):
   - "SEQUÊNCIA" → **18** / "semanas na meta"
   - "BÍBLIA" → **3,3%** / "40 de 1.189 cap."
3. **Esta semana** — "2 completos de 5" e sete células S T Q Q S S D, no padrão de três estados.
4. **Versículo do dia** — bloco branco: texto em itálico + referência em laranja. **Fica no fim**, não no topo.

### `12a` Hoje com painel de métricas

Mesma saudação no cabeçalho (a aba é "Hoje"; "Sua caminhada" é o nome da tela de métricas).

1. **Bloco de constância** — `--ink`, raio 28px. "CONSTÂNCIA · últimas 9 semanas", número **18** "semanas na meta", e o **gráfico de 9 barras** ocupando a primeira dobra. Legenda: "A barra clara é esta semana, em curso."
2. **Três números que só sobem**, em blocos brancos: **243** capítulos lidos · **41h** de leitura acumulada · **2** livros concluídos.
3. **"Onde você está · Pentateuco"** — 18,8%, "Gênesis 40 de 50", e no pé em cinza: "3,3% da Bíblia inteira · 40 de 1.189 capítulos".
4. **Esta semana** — as sete células.
5. **Barra de ação fixa** — bloco escuro acima da navegação, **não rola com o painel**: "AGORA · PASSO 2 DE 3 / Gênesis 41 · 12 min" + botão "Continuar →".

**Duas regras herdadas da auditoria, sem as quais o painel volta a desanimar:**
- **O número em destaque nunca é o mais próximo de zero.** "3,3% da Bíblia" desce para rodapé de cartão, em cinza.
- **Nenhuma métrica pode zerar por um dia perdido.** Tudo que aparece grande cresce toda semana.

### `5b` Sua caminhada

Entra por "Sua caminhada" no Hoje, **não por aba própria**.

Título "Sua caminhada" · "Desde março · dois placares, não sete".

1. **Constância** — bloco escuro, número 18 "semanas na meta", gráfico de 9 semanas. Legenda: "Últimas 9 semanas. Uma semana abaixo da meta não apaga as anteriores."
2. **Onde você está na Bíblia** — "Gênesis 40 de 50", "Pentateuco · 1º de 8 blocos", e a lista dos 8 blocos: nome, trilha de progresso, percentual. Blocos não iniciados: nome em `--t5`, trilha vazia, "—". No pé: "3,3% da Bíblia inteira · 40 de 1.189 capítulos".
3. **Nível, discreto** — "2 · Aprendiz da Palavra · Nível 2 · faltam 260 XP", com chevron.

**A decisão de produto:** dos sete sistemas de recompensa do app antigo (níveis/XP, metas de constância, conquistas, sequência de dias, desafios de grupo, % da Bíblia, capítulos lidos), ficam **dois placares**: constância semanal e caminhada pela Bíblia. Níveis e XP viram consequência silenciosa, reveladas discretamente no fim desta tela. **Conquistas aparecem apenas no momento em que são ganhas** — nunca como grade permanente. Desafios de grupo vivem em Comunidade.

---

## 9. Leitura e Bíblia (`4a`, `5e`, `5f`, `18a`, `18b`)

### `4a` Leitura

A tela mais usada do app, e por isso a mais silenciosa. **O texto abre no topo.**

**Cabeçalho:** o **chip escuro "Gênesis 41 ˄"** — que abre a folha `18b`. Não é texto solto. Quando a tela é aberta pelo plano, o cabeçalho mostra também **"passo 2 de 3"** ao lado do chip.

**Texto:** bloco branco só dele, raio 24px, padding 24px. Rótulo "Capítulo 41" em laranja. Parágrafos em **17px/1.75**, `text-wrap: pretty`. Números de versículo inline: 10px/800, laranja, `vertical-align: super`. Trecho marcado: fundo `--highlight` (`#FFE3C9`), raio 3px.

**Rodapé em blocos** (não barra flutuante):
- **"Ouvir o capítulo"** com a duração (7:12) — um player só; os dois modos do app antigo viram uma opção no menu
- Dois botões: **"Ferramentas"** (branco, abre `5e`) e **"Concluir"** (laranja)

O que saiu em relação ao app atual: a fileira de quatro chips (Contexto, Mapa, Notas, Curiosidades — um deles cortado na borda), o player com dois modos, e os quatro níveis de cartão aninhado antes do primeiro versículo.

**Fileiras roláveis:** onde houver rolagem horizontal, use `mask-image: linear-gradient(to right, #000 88%, transparent)`. Chip cortado ao meio na borda parece defeito de layout.

### `5e` Ferramentas — folha sobre a leitura

Folha inferior sobre o texto. Cabeçalho: "Ferramentas · Gênesis 41 · tudo que era barra lateral".

Quatro itens em lista, cada um com ícone, título e uma linha de contexto:
- **Contexto** — "Quem, quando, onde"
- **Mapa** — "Egito no capítulo"
- **Minhas notas** — "2 neste capítulo"
- **Curiosidades** — "3 achados"

Mais um item destacado: **"Comparar versões"** — "NVT · ARA · NVI lado a lado".

### `5f` Bíblia — leitura livre

Título "Bíblia" · **"Leia à vontade — isto não mexe no seu plano."**

**Duas portas para o mesmo texto, e a distinção precisa ficar clara:** aqui a leitura é livre e **não conta no plano**; em `4b` é a sessão estruturada do dia.

- Busca no topo: "Livro, capítulo ou versículo"
- **Bloco areia "Última leitura livre"** — "Salmos 23 · sábado à noite" + "Abrir"
- Alternador Antigo Testamento / **Novo →**
- **Livros por nome completo, agrupados por seção** (Pentateuco, Históricos, Poéticos…), cada linha com o nome, o número de capítulos e uma **barra fina de progresso**: laranja em curso, preta concluído
- No rodapé, item destacado: **"Ler pela sessão de hoje — Gênesis 41 · conta no plano"**

### `18a` Página do livro — capítulos

Cabeçalho: "Bíblia" + chip da versão (NVT).

**Bloco escuro do livro:** "Pentateuco · 1º livro", **"Gênesis"**, "50 capítulos · 40 lidos", com **anel de progresso mostrando 80%** — o mesmo anel que aparece no rodapé de `5f`.

**Grade de capítulos:** **seis colunas** — cabem os 50 capítulos de Gênesis em uma tela sem rolar. Salmos (150) rola dentro do bloco. Cada célula é um bloco Bento pequeno, raio 12px, **sem sigla e sem borda**. Legenda acima: "lido" / "atual".

Código de cor: **preto = lido · laranja = onde você parou · cinza-claro = por ler.**

**Botão fixo no rodapé: "Continuar em Gênesis 41 →"** — evita caçar o laranja na grade.

### `18b` Seletor de capítulo dentro da leitura

Aberto pelo toque no chip do cabeçalho de `4a`. **Mesma folha escura da IA, mas sem losango** — porque aqui não é a máquina falando.

- Cabeçalho: "Gênesis" + "trocar livro"
- **"Cap. 40"** e **"Cap. 42"** no topo — anterior/próximo, o caso mais comum
- Grade de capítulos **aberta centrada no capítulo atual**, com nota: "Rola para cima para ver os capítulos 1–30."

---

## 10. Meu Plano e os três passos (`4b`, `5a`, `21a`, `21b`, `21c`)

### `4b` Meu Plano — só hoje

**A separação central: esta tela é execução; a configuração inteira mora em `5a`.**

Cabeçalho: "Meu plano" + **"10 + 15 + 5 min · 1 feito"**. À direita, dois botões: **"Criar"** (entrada de `22a`) e **"Ajustar"** (leva a `5a`).

**Três blocos de passo, no padrão de três estados:**

| Passo | Estado no exemplo | Conteúdo |
| --- | --- | --- |
| Oração | **Concluído** — bloco areia | "ACTS · 10 min · às 6:42" |
| Leitura | **Agora** — bloco escuro | "AGORA · PASSO 2 DE 3 · 12 min" / "Leitura" / "Gênesis 41 — onde você parou" / botão laranja "Ler agora →" |
| Reflexão | **Ainda não** — bloco translúcido | "8 min · depois da leitura" |

Depois: **"Modo mãos-livres"** — "Faça a rotina só ouvindo", com chevron.

No fim: **"Esta semana — 2 completos de 5"** com as sete células. Entra **como resumo, não como placar**.

**Destino de cada passo:** Oração → `21a` · Leitura → `4a` · Reflexão → `21b` · fim → `21c`.

O que saiu desta tela em relação ao app atual: o acordeão "Como funciona o método" (que passa a aparecer só nos primeiros dias e se recolhe sozinho), os quatro interruptores de "Adicionar ao meu plano", o seletor de duração, e a seção de Estudos — que vai para a Biblioteca.

### `5a` Ajustar meu plano

Título "Ajustar meu plano".

**"Tempo de cada passo — 30 min/dia"** · "Cada passo tem o seu. Zero desliga o passo."

| Passo | Apoio | Controle |
| --- | --- | --- |
| Oração | "ACTS · 2,5 min por etapa" | 10 min |
| Leitura | "Define o trecho diário · **obrigatória**" | 15 min |
| Reflexão | "Três perguntas sobre o texto" | 5 min |
| Estudo | "Notas e referências cruzadas" | interruptor, desligado por padrão |

**Leitura fica ligada e desabilitada.**

**"Ritmo da semana"** · "Quantos dias você quer se comprometer? Os outros são descanso, sem culpa." — 3/4/5/6/7, padrão 5.

Rodapé fixo: botão "Salvar plano".

### `21a` Oração — passo 1, método ACTS

Os três passos compartilham o mesmo esqueleto: **chip escuro do passo no cabeçalho** ("passo 1 de 3"), conteúdo em bloco, e botão laranja fixo que leva ao próximo passo. "Pular" no canto.

**ACTS mantido:** Adoração, Confissão, Gratidão (*Thanksgiving*), Súplica.

- Bloco escuro: "Método ACTS · 10 min" com **contador "4:12 restantes"**
- **O tempo escolhido em `15f` é dividido igualmente entre as quatro etapas** — 10 min dá 2,5 cada
- Barra das quatro etapas, no mesmo código de `4b`: **areia = feita, preto = agora, branco = depois**
  - A · Adoração — "2.5 min · feito"
  - C · Confissão — "agora · 2.5 min" com "1:48"
  - T · Gratidão — "depois · 2.5 min"
  - S · Súplica — "depois · 2.5 min"
- Bloco da etapa atual: **"Confissão · para hoje"** + o texto-guia: "O que você fez ou deixou de fazer ontem que precisa trazer aqui? Diga com as suas palavras — sem lista."
- "Pausar" e **"Próxima etapa"** (avança antes do tempo)
- Rodapé: **"Concluir e ir para a leitura →"**

### `21b` Reflexão — passo 3

Cabeçalho: "Reflexão · passo 3 de 3 · 8 min".

- **Bloco escuro com losango** (é a IA): "Pergunta 1 de 3 · Gênesis 41" + a pergunta gerada: *"José esperou dois anos sem sinal de resposta. O que você está esperando agora?"*
- **Garantia de privacidade, sempre visível:** "Ninguém lê o que você escreve aqui. É só seu."
- Campo de resposta, com **microfone** para responder falando
- Duas saídas: **"Não sei o que escrever"** e **"Outra pergunta"**
- Três barras embaixo mostram onde está; na terceira, o botão vira **"Concluir a rotina"** → `21c`

**O problema que isso resolve:** a reflexão hoje é um campo em branco, e campo em branco é a maior taxa de abandono do app. Aqui a IA faz a pergunta e o leitor só responde — três perguntas curtas em vez de um "o que Deus falou com você?".

### `21c` Rotina concluída

Tela **inteiramente escura** — como `15e` e `13a`. As três telas que fecham um ciclo.

- "Terça, 2 de setembro"
- **"Rotina feita. 31 minutos."**
- **"Terceiro dia da semana. Faltam dois para a meta — e você tem até domingo."** ← fala da meta semanal, **nunca** de "sequência"
- Resumo dos três passos: Oração "10 min · 2 pedidos" · Leitura "Gênesis 41 · 1 marcação" · Reflexão "3 respostas · salvo no diário"
- Dois botões: "Voltar para Hoje" e **"Ver o que o grupo comentou"** → leva à sala de `17a`, que acabou de destravar

**Um dia perdido não aparece aqui.**

---

## 11. IA na leitura (`10a`–`10f`)

**A regra que vale em todas as telas: a IA não é uma aba nova, ela mora dentro da leitura.** Nasce de um gesto que o leitor já faz — selecionar um trecho, tocar num versículo — e sempre devolve resposta ancorada em referência.

### `10a` Selecionou um trecho

O menu de seleção nativo ganha um item: **"Perguntar"** — o **único item colorido** do menu. Os outros: Marcar, Nota, Copiar.

Abaixo do menu, **três sugestões que mudam conforme o trecho**: "O que isso significa?" · "Por que sete?" · "Contexto histórico". Assim dúvida vira toque, não digitação.

### `10b` Resposta — folha de meia tela

**A folha cobre metade da tela: o versículo em questão fica visível em cima**, então o leitor não perde o lugar.

Bloco escuro com losango. Cabeçalho: "Resposta sobre Gênesis 41:2" + "fechar".

- A pergunta em destaque
- A resposta, com o dado-chave em laranja: *"O próprio José dá a chave: as sete vacas e as sete espigas são **sete anos**. O sonho se repete em duas imagens porque a mensagem é uma só — primeiro a fartura, depois a fome que devora o que veio antes."*
- **Toda resposta termina em duas citações:**
  - **"No texto · Gênesis 41:26"** — a que sustenta
  - **"Leia também · Gênesis 41:29-30"** — a que expande
- Duas ações: **"Salvar na nota"** (salva a resposta como nota do capítulo) e **"Reportar resposta"** — **texto, não ícone**. Ao reportar, a resposta sai do histórico e vai para revisão (aparece em `23a`).
- Campo: "Perguntar outra coisa…"

**"Reportar resposta" é obrigatório antes de a IA ir ao ar.**

### `10c` Contexto antes de ler

Opcional e **pulável — nunca uma parede antes do texto.** Resolve o abandono de quem chega em Gênesis 41 sem lembrar do 39.

Cabeçalho: "Gênesis 41 · antes de começar".

- **"Onde você está na história"** — um parágrafo: *"José está preso há dois anos, esquecido por quem prometeu falar dele. Agora o faraó tem dois sonhos que ninguém consegue explicar — e alguém finalmente lembra do rapaz na prisão."*
- Duas linhas: **"Quem aparece"** (José, o faraó, o chefe dos copeiros) e **"Fio do capítulo"** (Da prisão ao governo do Egito)
- **"Fique de olho em"** — "Três coisas que voltam mais na frente": o número sete repetido em dois sonhos · quem José diz que interpreta os sonhos · o conselho prático que vem junto da explicação
- "Começar a leitura" + "Pular contexto e ir direto ao texto"

"Fique de olho em" transforma o resumo em **instrução de leitura**, não em substituto dela.

### `10d` Depois de concluir — reflexão com pergunta gerada

É a base de `21b`, na entrada pela leitura (sem o chip de passo). Cabeçalho: "Gênesis 41 concluído · falta a reflexão · 8 min".

Igual a `21b`, mais uma nota: **"Depois das três, a IA junta suas respostas em um parágrafo para o seu diário — você aprova antes de salvar."** A aprovação é obrigatória.

### `10e` Quando a IA não deve responde

**A parte mais importante do projeto e a mais fácil de esquecer.** Num app de fé, uma IA que responde tudo com confiança é um risco de produto — a recusa bem escrita é o que gera confiança.

Três respostas que o app **precisa** saber dar:

**1. Pergunta de doutrina** — *"Batismo de criança é certo ou errado?"*
> "As igrejas não concordam entre si, e não é meu papel decidir por você. Posso mostrar os textos que cada lado usa."
Ações: "Ver os textos" · "Anotar pra perguntar"

**2. Fora do texto** — *"Meu casamento vai dar certo?"*
> "Isso eu não sei, e nenhum texto responde. Posso ler com você o que a Bíblia diz sobre aliança."

**3. Sinal de sofrimento** — bloco de alerta:
> Havendo risco, **a IA para de responder e mostra ajuda humana — CVV 188, 24h — antes de qualquer versículo.**
Ação: "Falar com alguém agora"

E o rodapé universal: **"escrito por IA, confira no texto"** — sem exceção.

### `10f` Ajustes de IA — o leitor no controle

Dentro de Preferências: "Assistente de leitura".

Quatro interruptores:
- **Perguntar sobre o texto** — "O item 'Perguntar' ao selecionar"
- **Contexto antes do capítulo** — "Resumo de onde a história está"
- **Perguntas na reflexão** — "Sem isso, o campo volta a ser livre"
- **Aviso do grupo** — "'Seu grupo terminou o capítulo de hoje'"

**"Como responder"** — "Muda o tamanho e o tom, não o conteúdo.": **Direto** (2 frases) · **Explicado** (com contexto) · **Estudo** (com referências). Os três tons resolvem a briga entre quem quer uma frase e quem quer estudo.

**Privacidade:** "Guardar minhas perguntas — Ficam no aparelho e voltam na Biblioteca" + **"Apagar todas as perguntas"**.

**Nota areia:** "Sem internet, a leitura, o áudio baixado e as notas funcionam igual — só o assistente fica indisponível, e o app diz isso na hora, não depois de esperar."

**Tudo desligável, e o app inteiro continua de pé sem a IA — nenhuma tela depende dela para funcionar.**

### Se for construir por partes

`10a` + `10b` é o fluxo completo, cabe num sprint e não mexe em nenhuma outra tela. `10d` é a de maior impacto em retenção. `10e` é obrigatória antes do lançamento.

---

## 12. Estudos gerados (`22a`–`22d`)

### `22a` Criar — o pedido

Cabeçalho: "Criar estudo" · "Meu Plano".

- **Bloco escuro com losango** (é a IA ouvindo) com campo de texto livre: *"Quero entender o que a Bíblia diz sobre ansiedade, em uma semana"*
- **"Ou comece por aqui"** — quatro sugestões para quem não sabe o que pedir: "7 dias sobre perdão" · "Filipenses, capítulo a capítulo" · "Os sonhos de José" · "Salmos para dias difíceis"
- **Formato** — quatro opções, **inferidas do pedido e só pré-selecionadas**; a pessoa corrige se a IA errou:
  - Plano temático — *um trecho por dia*
  - Livro — *capítulo a capítulo*
  - Tema — *com referências cruzadas*
  - Para o grupo — *só admin*
- **Aviso areia, que diz o custo antes de montar:** "Enquanto durar, substitui a leitura do dia. Gênesis fica pausado e volta sozinho no fim."
- Botão: "Montar estudo →"

### `22b` Proposta — revisar dia a dia antes de começar

**A IA propõe, a pessoa aprova.** Cabeçalho: "Proposta · revise antes de começar" + **"Refazer"** (pede outra proposta inteira).

- Bloco escuro: "Plano temático · 7 dias · 15 min" / **"Ansiedade: o que a Bíblia diz"** / "Sete trechos, do salmo ao sermão do monte. Cada dia termina com uma pergunta."
- **Lista dos dias, cada um com botão de trocar o trecho:**
  1. Salmo 94:17-19 — "Quando a ansiedade crescia, o consolo vinha"
  2. Filipenses 4:4-9 — "Não andem ansiosos — e o que fazer em vez disso"
  3. Mateus 6:25-34 — "Os lírios do campo e o dia de amanhã"
  4. 1 Pedro 5:6-11 — "Lancem sobre ele toda a ansiedade"
  - "dias 5–7" recolhidos
- **Bloco areia "Enquanto isso":** "Gênesis pausa em 41 e volta em **quarta, 10 de setembro**. Sua meta da semana continua contando."
- "Salvar p/ depois" e **"Começar amanhã"** — porque a leitura de hoje já está em andamento. Mostra "Começar hoje" se ainda não leu.

### `22c` Meu Plano com o estudo ativo

É `4b` com o estudo no lugar da leitura:

- O bloco escuro do passo atual **ganha o losango** e "Estudo · dia 2 de 7" + "Filipenses 4:4-9" + "Ansiedade: o que a Bíblia diz"
- A **Reflexão usa a pergunta do estudo** ("5 min · pergunta do estudo")
- **Bloco areia sempre visível:** "Gênesis pausado em 41 · volta quarta, 10 de setembro" + **"Retomar já"** — abandonar o estudo custa um toque, sem culpa

### `22d` Para o grupo — o admin cria, o líder recebe a pergunta

Cabeçalho: "Plano do grupo · Batista Central · proposta" + etiqueta "Admin".

- Bloco escuro: "Livro · 4 semanas · 12 pessoas" / **"Filipenses, capítulo a capítulo"** / "Um capítulo por semana, três leituras curtas cada. Começa segunda, 8 de setembro."
- **Semana 1 · Filipenses 1** — "ver as 4": Seg (Fp 1:1-11 · a oração de Paulo pela igreja) · Qua (Fp 1:12-26 · viver é Cristo) · Sex (Fp 1:27-30 · firmes num só espírito)
- **"Pergunta da semana · sugerida"** + "editar": *"Paulo escreve da prisão e fala em alegria doze vezes. De onde vem a sua, quando as coisas não vão bem?"*
- **"Quem publica a pergunta"** — "Pr. João revisa antes de ir para a sala"
- **"Substitui a leitura de cada membro"** — "Cada um recebe um aviso e pode recusar"
- Botão: "Enviar para o grupo →"

**Duas regras de produto aqui:**
1. **A IA sugere a pergunta da semana, mas ela só entra na sala de `17a` depois que o líder revisa** — a voz na Comunidade continua humana.
2. **Membros recebem o plano como convite e podem recusar.** Ninguém tem a leitura trocada sem saber.

**Regra técnica que vale para todos os estudos gerados: trecho gerado pela IA que não bater com o texto da versão escolhida é descartado antes de mostrar.**

---

## 13. Biblioteca (`4c`)

**Um endereço único para tudo que o usuário produziu.** No app atual, Notas vive na aba Bíblia e no Perfil; Estudos vive em Meu Plano e no Perfil — e o usuário não sabe onde procurar.

**A tela abre na lista**, não num formulário. No app atual, "Minhas anotações" abre com o formulário de sermão expandido ocupando a tela inteira, e a lista — o motivo de entrar ali — só aparece depois de rolar tudo.

- Título "Biblioteca"
- Busca: "Buscar nas suas anotações"
- **Filtros como blocos quadrados de raio 12** (não pílulas): Todas · Notas · Marcações · Estudos. Ativo em `--ink`.
- **Lista.** Cada item começa com uma linha de metadados: tipo + data.

| Tipo | Tratamento | Corpo |
| --- | --- | --- |
| **Reflexão** | Bloco branco | "Gênesis 40 · José interpreta os sonhos" + o texto |
| **Marcação** | **Bloco areia** — se distingue sem inventar cor nova | O trecho em itálico + a referência |
| **Sermão** | Bloco branco | "Pr. João Silva · Igreja Batista Central" + o resumo |
| **Estudo** | Bloco com chevron | "Estudo: Filipenses · Passo 2 de 6 · retomar" |

**Adições necessárias** (levantadas na rodada 22 e ainda não desenhadas): uma **seção "Meus estudos"** com os estudos salvos e concluídos, e as **perguntas guardadas** da IA (vindas de `10f`, quando "Guardar minhas perguntas" está ligado).

**Formulário de anotação:** botão flutuante que abre folha inferior. Não é conteúdo fixo da tela.

**Estado vazio:** um texto curto com dois exemplos concretos do que se pode guardar ali (uma reflexão sobre o capítulo do dia; a anotação do sermão de domingo) — **não** um formulário.

---

## 14. Comunidade (`5d`, `17a`, `17b`, `17c`)

### `5d` Comunidade — a tela base

Cabeçalho: "Comunidade" · "Grupo Semente · 6 pessoas" + "Convidar".

1. **Leitura do grupo** — "Gênesis 41", avatares empilhados (+3), **"4 de 6 já leram hoje"**, botão "Ler com o grupo"
2. **Pedido de oração** — "há 2 h": *"Peço oração pela cirurgia da minha mãe na quinta." — Marina* + botão **"Orei por isso"** e "5 pessoas oraram"
3. **Nota compartilhada** — "Thiago compartilhou uma nota · ontem": *"Deus não desperdiça a espera" — isso me pegou hoje em Gênesis 40.*
4. **"Escrever no grupo"** — "Nota, pedido ou versículo", com chevron

### `17a` Sala do capítulo — só abre para quem leu

**Uma sala por capítulo, trancada até a conclusão.** Resolve spoiler e tira a pressão de quem está atrasado.

Cabeçalho: "Gênesis 41 · sala" · "Grupo Batista Central · 12 pessoas".

- **Bloco areia com a regra dita na tela:** "Você já leu, então a sala está aberta. Quem ainda não leu vê só '7 de 12 concluíram' — sem spoiler."
- **"Pergunta da semana · Pr. João"** — *"José deu crédito a Deus na frente do faraó. Onde é mais difícil pra você fazer isso?"* — **a pergunta vem do líder do grupo, não da IA. Aqui a voz é humana de propósito.**
- "5 respostas", cada uma com avatar, nome, tempo, texto, e a possibilidade de citar um versículo dentro da resposta
- **Reação única: "Amém"** — em vez de curtidas
- Campo: "Responder à pergunta…"

### `17b` Retrospectiva do mês

**Aparece no primeiro dia do mês seguinte, uma vez, e vai para a Biblioteca.**

- **Bloco escuro que É a imagem de compartilhamento**, com a marca discreta no canto: "Setembro de 2026" / **"Você terminou Gênesis."**
- Quatro números: 22 capítulos lidos · 4h12 de leitura · 4/4 semanas na meta · 9 marcações
- **"O versículo que você mais voltou"** — *"O Senhor estava com José e lhe mostrou sua fiel bondade." Gênesis 39:21*
- "Próximo: Êxodo, a partir de quarta."
- "Guardar na Biblioteca" e "Compartilhar"

**Duas regras:**
- **Só mostra números que subiram.** Um mês ruim vira **"Você voltou"** em vez de tabela de zeros.
- É aquisição orgânica sem parecer propaganda — a marca fica discreta.

### `17c` Leitura com a camada do grupo

**A maior mudança de produto do pacote:** leitura social dentro do próprio texto.

Em `4a`, com um botão **"Grupo"** no cabeçalho (leva a `17a`):

- **Pontilhado laranja sob o versículo** que outras pessoas marcaram
- **Um chip discreto: "3 do grupo marcaram · 1 nota"** — nada mais, para não competir com o texto
- No rodapé: **"Ver marcações do grupo"** com a regra: **"Só quantidades. Nomes e notas, só de quem compartilhou."**
- **Desligável** no rodapé, e **só mostra contagens por padrão**

---

## 15. Perfil e ajustes (`19a`, `19b`, `19c`)

### `19a` Perfil — a folha que abre nas iniciais

**Não é aba.** Tocar nas iniciais no cabeçalho de Hoje sobe uma folha por cima. A barra continua com os cinco itens.

- **Bloco escuro = quem você é:** tile de iniciais, nome, e-mail, e **etiqueta "Admin" só para quem é**, mais o nome do grupo
- **Lista de ajustes:** Meus dados (Nome, e-mail, senha) · Lembrete (06:30 · seg–sex) · Idioma (Português BR) · Versão da Bíblia (NVT)
- **"Administração do grupo"** — "12 membros · 2 pedidos de entrada" — **só existe para admin**, leva a `19c`
- Assistente de leitura (Explicado) → `10f` · Aparência e texto (Claro · 18 pt)
- Rodapé: "Ajuda" · "Sair da conta"

**Para quem não tem conta:** a folha abre com o bloco escuro de `13c` em versão curta ("guarde sua leitura") e **sem as linhas Meus dados e Administração**. O resto (lembrete, idioma, versão) funciona igual.

### `19b` Idioma — do app e da Bíblia, separados

**São decisões diferentes e ficam em blocos separados** — muita gente lê em português com o app em inglês, ou vice-versa.

**"Idioma do app"** — Português (Brasil) · English · Español, cada um com a própria descrição no próprio idioma ("Menus, botões e o assistente" / "Menus, buttons and the assistant" / "Menús, botones y el asistente").

**"Versão da Bíblia · em português"** — NVT (*leitura fluida*) · NVI · ARA (*clássica*) · NTLH (*mais simples*).

**Nota areia:** "Trocar a versão não mexe no seu progresso — você continua em Gênesis 41, só o texto muda. O áudio baixado é por versão."

A escolha usa o **quadradinho laranja** de `13c`, não rádio. Botão "Aplicar".

### `19c` Administração do grupo — só para admin

Cabeçalho: "Batista Central" · "Administração · 12 membros".

- **Bloco escuro com o código de convite: "BC-4271"** + "Compartilhar" — está no bloco escuro porque é o que o admin mais faz: passar para alguém
- **"Pedidos de entrada · 2"** — **vêm antes da lista de membros**; aceitar/recusar em um toque
- **Membros** — cada linha com avatar, nome, papel ("admin · você", "admin · líder") ou progresso ("Gênesis 41 · em dia"). **Tocar num membro abre opções (tornar admin, remover) — nunca inline, para evitar toque errado.**
- "Pergunta da semana · Gn 41 · publicada" → a pergunta de `17a`
- "Nome e descrição do grupo"

**Adição necessária:** a linha **"Plano do grupo"** (entrada de `22d`), levantada na rodada 22 e ainda não desenhada.

---

## 16. Painel do administrador (`23a`–`23d`)

**Diferente da administração de grupo (`19c`, para líderes de igreja).** Este é o painel de quem opera o produto. **Roda na web, em 1280px.** As versões de celular (reduzidas a leitura e ações rápidas) não foram desenhadas.

**Modelo de negócio pressuposto:** assinatura mensal/anual com trial de 14 dias. Por isso a Visão geral abre em assinantes e MRR, o funil vai até "iniciou trial", e usuários, mensagens e códigos giram em torno de converter e reter trial.

**Layout:** sidebar de 232px à esquerda (logotipo + nove seções + cartão do usuário), conteúdo à direita. Mesma identidade do app: fundo `#EDE8E2`, blocos brancos, bloco escuro para o que exige atenção, laranja só na ação primária e no que subiu.

**Nove seções na navegação:** Visão geral · Usuários · Assinaturas · Onboarding · IA · Grupos e igrejas · Mensagens · Convites e códigos · Saúde técnica. **Quatro estão desenhadas** — as que o admin usa todo dia.

### `23a` Visão geral

- **Quatro números na primeira linha**, o de **assinantes em bloco escuro porque é o que paga a conta**: Assinantes ativos (2.418, +164 em 30 d) · Receita mensal MRR (R$ 38.240, churn 2,1%) · Ativos por dia DAU (6.930, 43% dos cadastrados) · Em trial agora (512, 31% convertem em 14 d)
- Gráfico "Novos assinantes por semana · últimas 12"
- **Funil de onboarding · 30 d** — Instalou 14.120 (100%) → Boas-vindas 11.860 (84%) → Respondeu perguntas 9.410 (67%) → Leu o 1º versículo 7.980 (57%) → Criou conta 5.230 (37%) → Iniciou trial 2.140 (15%)
- **IA · hoje** — 4.812 perguntas · R$ 61,20 de custo · **3 respostas reportadas → revisar**
- Saúde técnica — Uptime 99,96% · Crash-free 99,4% · Erros de pagamento 12 hoje
- Retenção por coorte — S0 100% → S7 44%
- **Grupos e igrejas** — 318 grupos ativos · 64% dos assinantes em grupo · **2,4× retenção vs. solo**
- **Bloco areia "Precisa de ação"** — a lista de tarefas do dia, cada linha levando direto à ação: 3 respostas da IA reportadas · 12 pagamentos falharam hoje · 41 trials vencem em 48 h

A correlação **"quem está em grupo retém 2,4×"** é o argumento de produto mais importante do painel e merece estar visível na mesma tela que o funil.

### `23b` Usuários

Cabeçalho: "16.030 cadastrados · 2.418 assinantes · 512 em trial" + "Exportar CSV" e "Enviar mensagem".

Busca ("Nome, e-mail, grupo ou código de convite"), filtros rápidos (Todos · Assinantes · Trial · Inativos 14 d) e "Filtros · 2".

Tabela: Usuário (avatar + nome + e-mail) · Plano (Anual / Mensal / Trial · 6 d / Igreja) · Último acesso · Grupo (com "· líder" quando aplicável).

### `23c` Mensagens

Push, e-mail e aviso dentro do app. Quatro etapas na mesma tela:

1. **Para quem** — **segmentos pré-montados a partir dos dados; o admin não escreve consulta**: "Trials que vencem em 48 h · 41 pessoas", "Inativos 14 d · 1.204", "Sem grupo · 5.810", "Concluíram Gênesis · 388", "Trial dia 1 · 96", "Igreja específica…"
2. **Canal** — Push · E-mail · No app · Push + no app
3. **Mensagem** — título e corpo, com **variáveis entre chaves** para personalizar sem código: `{nome}` `{livro}` `{capítulo}` `{dias_de_trial}` `{link_assinar}`
4. **Enviar** — Agora ou Agendar (amanhã · 08:00), com **"Testar em mim"** antes de enviar

**Prévia · push** — mostra a notificação como ela chega, e lembra a regra: **"Limite do app: 1 push por pessoa por dia, nunca antes das 8h nem depois das 21h no fuso local."** Essa é uma regra que o próprio app impõe.

"Enviadas recentemente" com taxa de abertura por mensagem.

### `23d` Convites e códigos

Três números: Resgates 30 d (1.912, +22%) · Convertidos em pagantes (604, 31,6%) · **Via indicação de membro (388, 1 em cada 5 novos)**.

**Três tipos de código, com regras diferentes:**

| Tipo | Regra | Teto |
| --- | --- | --- |
| **Promo** | Desconto ou trial extra | Com teto de usos |
| **Igreja** | Entra no grupo + meses grátis | Sem teto |
| **Indicação** | Gerado por membro, benefício dos dois lados | Teto baixo (10) |

Tabela: Código · Tipo · Regra · Usos (contra limite) · Estado (Ativo / Esgotado / Pausado).

Formulário de criação em quatro campos: Tipo, Código (com "gerar outro"), Entra no grupo, Benefício, Limite de usos, Validade. Nota: **"Quem usar entra direto no grupo, sem pedido de aprovação, e o líder recebe um aviso. O código aparece no cartão do líder em Administração do grupo (`19c`)."**

---

## 17. Site

Repositório `daniziller/jesus-corner-site`, arquivos `src/App.jsx` e `src/content.js`.

**A home em alta fidelidade está em `Site Jesus Corner Bento.dc.html`**, na mesma identidade Bento, com a copy escrita. Seções ancoradas: `top`, `como`, `recursos`, `planos`, `perguntas`, `contato`.

**Os problemas do site atual, que o redesign resolve:**

1. **O produto só aparece na quarta seção** — duas seções de manifesto vêm antes.
2. **A mesma chamada laranja repete cinco vezes**, com o mesmo texto de apoio. Repetida, deixa de ser convite e vira ruído.
3. **Dois dos três cartões de Download estão apagados** com "em breve" — o único caminho real fica cercado de portas fechadas.
4. **A captura do Hero mostra uma conta quase vazia** (3,3%, dois dias de sequência, NT em 0%) e comunica sem querer "pouca coisa acontece aqui".
5. **Nenhuma prova social.** Para um app de fé — território de confiança — isso pesa mais que a lista de recursos.

**Nova ordem:**

| # | Seção | Nota |
| --- | --- | --- |
| 1 | **Hero** | Usar a tela de **Leitura**, não a Home — é o que a pessoa vai fazer. **CTA em destaque.** |
| 2 | **Como funciona** | Os três passos — Oração, Leitura, Reflexão. É a ideia central do app e hoje está invisível no site. |
| 3 | **Telas** | Recapturar tudo a partir de uma **conta madura**: meses de constância, livros concluídos, marcações reais. |
| 4 | **Depoimentos** | Três depoimentos curtos com primeiro nome e cidade. |
| 5 | **Recursos** | Mantida. |
| 6 | **Preço** | **CTA em destaque** — o segundo e último. |
| 7 | **Instalar** | Um cartão só (app na web) + tutorial. Google Play e App Store viram **uma linha de lista de espera com campo de e-mail**. |
| 8 | **Por que fiz o app** | Propósito + origem do nome, fundidos. Um parágrafo em primeira pessoa. |
| 9 | **FAQ + contato** | Fundidos. |

**Chamadas: exatamente duas em destaque** (Hero e Preço) mais **uma barra fixa discreta** depois da primeira dobra. Se uma seção intermediária precisar de convite, que seja um **link em texto** com a frase daquela seção.

**Cabeçalho do site** (`16b`): símbolo com o bloco preto mantido sobre fundo claro, logotipo, e botão "Começar". **Nunca inverter o quadrado para branco.**

**Trabalho de asset que o site exige:** recapturar todas as telas a partir de uma conta madura. É o único trabalho de asset do pacote além do SVG do símbolo.

---

## 18. Regras de produto transversais

Estas regras valem em várias telas e são a espinha do redesign. Se uma delas for perdida na implementação, o redesign perde o sentido.

### Sobre culpa e constância

1. **A meta é semanal, nunca uma sequência de dias corridos.** Um dia perdido não zera nada.
2. **Nenhuma tela mostra "sequência perdida".** O retorno após ausência diz: *"Que bom te ver de volta — continue em Gênesis 41."*
3. **O dia conta como cumprido quando a Leitura é concluída.** Oração e Reflexão somam qualidade, não obrigação. ("Plano completo" deixa de exigir os três módulos no mesmo dia.)
4. **O número em destaque nunca é o mais próximo de zero.** "3,3% da Bíblia" nunca é o número grande de uma tela.
5. **Nenhuma métrica em destaque pode zerar por um dia perdido.**
6. **Nos primeiros 7 dias, a Home é `3c`** — nunca um painel de zeros.
7. **A retrospectiva do mês só mostra números que subiram.** Mês ruim vira "Você voltou".

### Sobre a IA

8. **A IA mora dentro da leitura.** Não é aba, não é assistente flutuante.
9. **Quem não cita, não responde.** Resposta sem referência verificável é descartada.
10. **Todo bloco de IA é escuro e tem o losango laranja.** O símbolo da marca nunca aparece em bloco de IA.
11. **Toda resposta traz "escrito por IA, confira no texto".**
12. **"Reportar resposta" é obrigatório** antes de a IA ir ao ar.
13. **A IA recusa três coisas:** doutrina divergente (mostra os dois lados), o que está fora do texto, e — havendo sinal de sofrimento — para de responder e mostra **CVV 188** antes de qualquer versículo.
14. **Tudo é desligável e o app funciona inteiro sem IA.**
15. **Reflexão gerada só vai para o diário depois da aprovação da pessoa.**
16. **Trecho gerado que não bater com o texto da versão escolhida é descartado antes de mostrar.**

### Sobre conta e privacidade

17. **Ninguém precisa de conta para ler.** "Continuar sem conta" nunca desaparece.
18. **Consentimento e idade mínima ficam no cadastro**, não antes da primeira leitura.
19. **O que a pessoa escreve na reflexão é privado.** A tela diz isso na hora: "Ninguém lê o que você escreve aqui."
20. **Recuperação de senha não bloqueia a leitura.**

### Sobre grupo e comunidade

21. **A sala do capítulo só abre para quem concluiu o capítulo.** Quem não leu vê só "7 de 12 concluíram".
22. **A pergunta da semana é humana.** A IA pode sugerir, mas o líder revisa antes de publicar.
23. **A camada do grupo na leitura mostra só contagens por padrão.** Nomes e notas, só de quem compartilhou.
24. **Plano de grupo chega como convite**, e o membro pode recusar.
25. **Reação única ("Amém")**, não curtidas.

### Sobre notificação

26. **Um push por pessoa por dia**, nunca antes das 8h nem depois das 21h no fuso local.
27. **A permissão é pedida em `15c`**, com o motivo na mão, não no primeiro abrir.

### Sobre offline

28. **Leitura, áudio baixado e notas funcionam sem internet.** Só o assistente fica indisponível, **e o app diz isso na hora, não depois de esperar.**

---

## 19. Mudanças de lógica e dados

O visual não exige migração de esquema, mas estas mudanças de lógica sim:

### 1. Constância semanal (a mais importante para retenção)

Substituir "dias seguidos" por:
- `weekly_goal_days` — preferência, 3 a 7, **padrão 5** (vem de `15d`)
- Dias cumpridos na semana corrente
- **`weeks_on_goal`** — contador histórico de semanas em que a meta foi cumprida. É o placar principal do app.

Um dia perdido não zera nada. Uma semana abaixo da meta não apaga as anteriores.

### 2. Conclusão do dia

O dia conta como cumprido quando a **Leitura** é concluída. Oração e Reflexão não são requisito.

### 3. Tempo por passo, separado

Hoje o app tem uma duração única. Passa a ter três: `prayer_minutes`, `reading_minutes`, `reflection_minutes` (de `15f`). **Zero desliga o passo.** Só `reading_minutes` afeta o dimensionamento do plano.

### 4. Progresso antes da conta

Progresso em `localStorage`, migrado para o servidor no cadastro. É o que viabiliza todo o onboarding.

### 5. Tempo de sessão

`12a` mostra "41h de leitura acumulada" — **o app hoje não registra tempo de sessão.** Ver [Decisões pendentes](#22-decisões-que-precisam-do-autor).

### 6. Estudos gerados

Um estudo ativo **substitui** a leitura do plano e **pausa** o plano principal, guardando o ponto de retomada e a data prevista de volta. Precisa de: estado do estudo (proposto / ativo / concluído / salvo), dia atual do estudo, e o ponto pausado do plano principal.

### 7. Salas de capítulo

Uma sala por (grupo, livro, capítulo), com estado de destravamento **por membro** — depende da conclusão individual daquele capítulo.

### 8. Registro de reportes de IA

Resposta reportada sai do histórico do usuário e entra numa fila de revisão que aparece em `23a`.

---

## 20. Monetização

**No app atual,** Meu Plano e Comunidade aparecem com cadeado na barra de navegação, e o toque leva direto ao upgrade. São justamente as duas coisas que fazem a pessoa voltar amanhã — **o cadeado está na porta de entrada do hábito.**

**Proposta — bloquear profundidade, não a porta:**

| Recurso | Gratuito | Premium |
| --- | --- | --- |
| Leitura, Bíblia, notas | Completo | — |
| **Meu Plano** | Funciona, no formato simples (um plano, duração fixa) | Múltiplos planos, planos temáticos, modo mãos-livres |
| **Comunidade** | **Participa** de um grupo | Criar grupos |
| **Estudos gerados** | — | Criar estudos |
| **Assistente de leitura** | Cota diária de perguntas | Sem cota, três tons |

**Momento da cobrança: depois da primeira semana completa na meta**, não na primeira sessão. O paywall aparece quando o valor já apareceu.

**Tirar os cadeados da barra de navegação.** Ícone de cadeado no ponto exato do recurso avançado, dentro da tela.

Trial de 14 dias, mensal/anual — é o que o painel do admin (`23a`) pressupõe.

---

## 21. Ordem de implementação

Cada etapa entrega valor por si. **Uma por vez, com revisão entre elas.**

### Etapa 0 — Fundação (pré-requisito de tudo)
Tokens da identidade Bento em `src/index.css`, carregamento da Manrope, remoção dos tokens antigos. A barra de abas com os cinco itens. Sem isso, cada tela nova entra num sistema visual diferente — que é exatamente o problema que este documento existe para resolver.

### Etapa 1 — O núcleo diário
`3c` Hoje · `4a` Leitura · `4b` Meu Plano · `5e` Ferramentas
São as três telas que a pessoa usa todo dia, mais a folha que limpa a Leitura.

### Etapa 2 — Os passos completos
`21a` Oração · `21b` Reflexão · `21c` Rotina concluída · `5a` Ajustar plano
Fecha o ciclo diário: os três passos passam a ter destino.

### Etapa 3 — Constância semanal
A mudança de lógica da seção 19.1 e 19.2, mais `5b` Sua caminhada. **É a mudança de maior efeito em retenção.** Roda em branch separada.

### Etapa 4 — Bíblia e navegação de texto
`5f` lista de livros · `18a` página do livro · `18b` seletor de capítulo

### Etapa 5 — Biblioteca
`4c`, com a seção "Meus estudos" e as perguntas guardadas.

### Etapa 6 — Perfil e ajustes
`19a` Perfil · `19b` Idioma · `19c` Administração do grupo

### Etapa 7 — Entrada e onboarding
`13a`–`13d` e `15`/`14` (10 telas). Exige o progresso pré-conta em `localStorage` (19.4). Branch separada.

### Etapa 8 — IA na leitura
`10a` + `10b` primeiro (fluxo completo, cabe num sprint, não mexe em outra tela). Depois `10f` (ajustes), `10c` (contexto), `10d` (reflexão). **`10e` — os limites — é obrigatória antes de a IA ir ao ar em produção.**

### Etapa 9 — Comunidade
`5d` primeiro. Depois `17a` sala do capítulo, `17c` camada do grupo na leitura, `17b` retrospectiva.

### Etapa 10 — Estudos gerados
`22a`–`22d`. Depende da IA (etapa 8) e do Plano (etapa 2).

### Etapa 11 — Painel do admin
`23a`–`23d`. Web, independente do app.

### Etapa 12 — Site
Independente de tudo; pode andar em paralelo desde o começo.

### Marca — em paralelo
Exportar o símbolo em SVG (72/44/28/16) + favicon. Aplicar em `13a` e no cabeçalho do site.

---

## 22. Decisões que precisam do autor

Não implemente nada que dependa destas sem perguntar.

1. **A barra de abas troca Progresso por Biblioteca?** Afeta rotas e analytics. (Recomendação: sim — Progresso vira `5b`, alcançada por Hoje.)

2. **A sequência de dias corridos vira meta semanal?** Afeta metas, conquistas e notificações já implementadas. (Recomendação: sim — é a mudança de retenção mais importante do pacote.)

3. **"41h de leitura acumulada" em `12a`** exige registrar tempo de sessão, que o app hoje não guarda. Alternativa sem esse trabalho: trocar por **"média de 4 capítulos por semana"**.

4. **`12a` empurra o versículo do dia para fora da Home.** Ele volta como bloco entre "Onde você está" e "Esta semana" se preferir — mas aí a barra de ação passa a rolar junto, em vez de ficar fixa.

5. **"Conclusão prevista: janeiro de 2029" em `15e`** é honesto, mas pode assustar. Alternativa: mostrar só "cerca de 5 capítulos por dia" e guardar a data para depois da primeira semana.

6. **Fusão de dados na entrada:** alguém lê sem conta neste aparelho, e depois entra numa conta que já tem progresso. Qual vence? Opções: manter o do servidor, manter o local, ou perguntar. **É o único caso de erro que exige decisão de produto, não só uma tela.**

---

## Trabalho de design ainda em aberto

Não desenhado, disponível se pedido:

- **Estados de erro das telas de conta** (`13`): e-mail inválido, senha errada com aviso de tentativas, conta já existente, e a tela de fusão de dados da decisão 6.
- **Estados da IA em detalhe:** carregando, erro, resposta longa, sem internet. E os textos de recusa de `10e` palavra por palavra.
- **Versões de celular do painel admin** (`23a`–`23d`), reduzidas a leitura e ações rápidas.
- **As cinco seções não desenhadas do painel admin:** Assinaturas, Onboarding, IA, Grupos e igrejas, Saúde técnica.
- **A seção "Meus estudos" da Biblioteca** e a linha "Plano do grupo" em `19c` — descritas neste documento, não desenhadas.
- **Estados de carregamento** em geral: esqueleto dos blocos, nunca spinner de tela cheia.
