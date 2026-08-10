# Agente de IA no reader — plano de implementação

Assistente que conversa com o usuário sobre o trecho da Bíblia que ele está
lendo. Escopo restrito ao texto, sem doutrina. Botão flutuante acessível de
qualquer tela. Vendido dentro de um **plano superior**, não como add-on.

---

## Resumo executivo

Três planos: **Grátis**, **Premium (R$ 19,90)** e **Premium + IA (R$ 29,90)**,
este último com teto de 10 mensagens por dia.

O agente é a parte fácil: uma serverless function na Vercel que chama a API da
Anthropic com o capítulo aberto como contexto. Dá para ter rodando em poucos
dias.

A cobrança ficou **muito mais simples do que a primeira versão deste plano
previa**, porque a IA virou um tier em vez de um add-on. Continua uma
assinatura por usuário — só muda o valor do campo `plan`. Some a tabela
`entitlements`, some a segunda assinatura simultânea no Stripe, somem os
webhooks com dois produtos.

O que sobrou de trabalho pesado é o **nível grátis**: hoje o app tem um único
ponto de bloqueio (`App.jsx:666`, "o app inteiro exige assinatura ativa") e
nenhuma trava por funcionalidade. Criar o grátis é construir esse controle do
zero, em todas as telas.

Daí a ordem em três fases:

1. **Fase 1** — o agente funcionando, liberado por lista de emails. Valida
   qualidade e mede o custo real antes de qualquer decisão de preço.
2. **Fase 2** — o tier Premium + IA. Mudança pequena, receita nova imediata.
3. **Fase 3** — o nível grátis. A maior das três, isolada de propósito.

---

## Arquitetura

```
Cliente (React)                 Vercel (api/)              Externos
────────────────                ─────────────              ────────
BibleChatButton  ──── POST ───▶ api/bible-chat.js  ──────▶ API Anthropic
(flutuante,                     · valida JWT               (Haiku 4.5,
 ciente do que                  · checa entitlement         streaming)
 está sendo lido)               · monta contexto
                                · faz streaming (SSE)
       ▲                              │
       │                              ▼
       └──────── SSE stream ───  Supabase (service role)
                                 · ai_conversations
                                 · ai_messages
                                 · ai_usage_daily (rate limit)
                                 · entitlements (acesso ao add-on)
```

Pontos de decisão que já estão resolvidos pelo desenho:

- **A chave da API nunca vai para o cliente.** Fica em `ANTHROPIC_API_KEY`
  nas env vars da Vercel, como já é feito com `STRIPE_SECRET_KEY`.
- **O cliente manda a referência, não o texto.** Envia
  `{ versionId, bookKey, chapter }`; o servidor carrega o mesmo JSON de
  `public/bible-text/`. Isso impede que alguém injete um texto arbitrário de
  200 mil tokens e estoure a conta.
- **Streaming via SSE**, para a resposta aparecer palavra a palavra em vez de
  travar 5 segundos. A Vercel suporta isso com `export const config = { runtime: 'edge' }`,
  padrão que `api/invite-friend.js` já usa.

---

## Fase 1 — o agente (sem cobrança)

### 1.1 Backend: `api/bible-chat.js`

Autenticação seguindo o padrão canônico do repositório (cliente anon com o JWT
do chamador para identificar, service role para escrever):

```js
export const config = { runtime: 'edge' }

// valida JWT → carrega capítulo → monta prompt → stream da Anthropic
// → persiste a troca no Supabase → devolve SSE
```

Entrada:

```json
{
  "conversationId": "uuid | null",
  "message": "Por que Moisés hesita aqui?",
  "context": { "versionId": "pt-nvt", "bookKey": "Êxodo", "chapter": 3 }
}
```

Guardas no servidor, antes de qualquer chamada paga:

| guarda | valor | motivo |
|---|---|---|
| tamanho da mensagem | 1.000 caracteres | evita abuso trivial |
| histórico enviado | últimas 10 trocas | limita crescimento do custo |
| `max_tokens` da resposta | 600 | resposta de chat, não ensaio |
| rate limit | 40 msg/dia/usuário | teto mesmo para assinante |
| capítulo | precisa existir no JSON | evita referência inventada |

### 1.2 System prompt

O escopo escolhido — **só o trecho em leitura, foco no texto, sem doutrina** —
precisa estar codificado de forma explícita. Esboço:

> Você é um assistente de leitura bíblica dentro do app Jesus' Corner. O
> usuário está lendo {livro} {capítulo} na versão {versão}. O texto do capítulo
> está abaixo.
>
> Responda **apenas** sobre esse trecho: contexto histórico e cultural,
> significado de palavras e expressões no original, quem são os personagens,
> como a passagem se encaixa no livro e na narrativa maior.
>
> Quando as tradições cristãs divergem na interpretação de um versículo, diga
> que há leituras diferentes e apresente as principais em uma frase cada, sem
> endossar nenhuma. Não faça pregação, não prescreva o que a pessoa deve fazer
> da vida dela, não emita juízo sobre escolhas pessoais.
>
> Se perguntarem algo fora do trecho, diga com simpatia que você só comenta a
> passagem aberta e sugira abrir o capítulo relevante.
>
> Responda em {idioma}, em no máximo 3 parágrafos curtos.

Duas regras adicionais que **não são opcionais** num app devocional:

1. **Crise.** Se a pessoa mencionar suicídio, automutilação, violência
   doméstica ou abuso, o agente não deve tratar como dúvida exegética. Deve
   reconhecer com cuidado, não fazer perguntas de triagem, e oferecer recursos
   locais — no Brasil, CVV 188. Isso vale a pena ser um bloco fixo no prompt e
   também um filtro no cliente que mostra um card de ajuda.
2. **Não substitui aconselhamento.** Uma linha discreta no rodapé do chat.

### 1.3 Banco: `supabase/migrations/0025_ai_chat.sql`

```sql
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id text not null,
  book_key text not null,
  chapter integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

-- Contador para o rate limit diário, separado das mensagens para a checagem
-- ser um único SELECT indexado em vez de um count sobre o histórico inteiro.
create table public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  message_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);
```

RLS no mesmo padrão de `subscriptions`: SELECT para o dono, escrita só pelo
service role.

### 1.4 Frontend

- `src/ai/aiChatStore.js` — fetch com streaming, histórico, estado.
- `src/components/BibleChatButton.jsx` — botão flutuante (FAB).
- `src/components/BibleChatPanel.jsx` — o painel de conversa.

O botão é flutuante e global, mas o agente só responde sobre o trecho aberto.
Isso cria uma dependência: **o app precisa saber o que está sendo lido a
partir de qualquer tela.** Hoje esse estado vive dentro de `ReadingBlockView`.
Solução: subir a referência atual (`{versionId, bookKey, chapter}`) para um
contexto React em `App.jsx`, atualizado pelo reader. Em telas onde não há nada
aberto, o botão abre com a última leitura, ou convida a abrir um capítulo.

Sugestão de posicionamento: acima da `BottomNav` no mobile (`bottom: calc(var(--nav-height) + 16px)`),
canto inferior direito no desktop. Círculo de 56px em `var(--grad-vivid)`,
coerente com os CTAs em destaque do design system.

### 1.5 Flag de acesso durante a Fase 1

Antes da monetização existir, liberar por lista de emails — o mesmo mecanismo
de `ADMIN_EMAILS` em `api/_lib/adminAuth.js`, com uma env var
`AI_BETA_EMAILS`. Permite testar com um grupo real sem construir cobrança.

---

## Fase 2 — Premium + IA como plano, não como add-on

### 2.0 A estrutura escolhida

| plano | preço | conteúdo |
|---|---|---|
| Grátis | — | leitura bíblica e progresso básico (**Fase 3**) |
| Premium | R$ 19,90/mês | tudo menos a IA |
| Premium + IA | R$ 29,90/mês | tudo + o agente, com teto de 10 mensagens/dia |

Vender a IA como **plano superior** em vez de add-on foi a decisão que mais
simplificou este documento. A versão anterior previa uma tabela `entitlements`
nova, uma segunda assinatura simultânea no Stripe e webhooks cientes de dois
produtos — porque `subscriptions.user_id` é chave primária e não comporta dois
produtos por pessoa.

Nada disso é necessário num modelo de tier: continua **uma assinatura por
usuário**, só que com um valor a mais no campo `plan`. E o
`api/create-checkout-session.js` já cancela a assinatura anterior antes de
criar a nova (linha 135) — comportamento que era um estorvo para add-on e é
exatamente o correto para upgrade de plano.

### 2.1 Mudanças necessárias

| arquivo | mudança |
|---|---|
| migration nova | ampliar o check de `plan` para aceitar `monthly_ai` e `annual_ai` |
| `api/create-checkout-session.js` | `FIXED_PRICES_CENTS` ganha as faixas com IA; o `interval` recebido passa a carregar o tier |
| `api/stripe-webhook.js` | gravar o `plan` com IA quando o preço bater com a faixa nova |
| `src/billing/storeTiers.js` | dois SKUs novos (`monthly_ai`, `annual_ai`) com os Product IDs das lojas |
| `api/verify-apple-purchase.js` · `verify-google-play-purchase.js` | reconhecer os SKUs novos (a busca já é por `STORE_TIERS`) |
| `src/billing/subscriptionStore.js` | `hasAI(subscription)` — checa se `plan` termina em `_ai` |
| `src/App.jsx` | passar `hasAI` para o botão flutuante do agente |
| `src/screens/UpgradeScreen.jsx` | comparativo dos dois planos pagos |
| `api/admin/metrics.js` | separar o MRR por tier |

Os webhooks de loja (`apple-server-notifications.js`, `google-play-rtdn.js`)
**não mudam**: eles localizam a linha por `purchase_token` /
`original_transaction_id` e só atualizam status e validade, que é o mesmo
comportamento para qualquer tier.

### 2.2 O reajuste da base sai de graça

Subir a base de R$ 16,90 para R$ 19,90 **não afeta quem já assina pelo
Stripe**. O `create-checkout-session.js` monta o preço com `price_data`
dinâmico em vez de usar um Price ID fixo, então cada assinatura carrega o valor
com que foi criada. Mudar `FIXED_PRICES_CENTS` só vale para checkouts novos —
o grandfathering acontece sozinho, sem código.

Nas lojas é diferente: alterar o preço de um produto existente atinge a base
inteira, e a Apple exige consentimento explícito do assinante para aumentos.
O caminho seguro é **criar SKUs novos** com o preço novo e deixar os antigos
ativos para quem já comprou.

### 2.3 Lojas

Apple e Google exigem IAP para bens digitais consumidos dentro do app — não dá
para mandar o usuário do iOS pagar no Stripe. Para cada loja: criar os produtos
no console, configurar preço por região, passar por revisão.

Com quatro SKUs novos (mensal e anual, com e sem IA) mais os dois legados, o
`STORE_TIERS` passa a ter seis entradas. Vale nomear com clareza desde já.

Na App Store, um recurso de IA costuma atrair perguntas extras na revisão sobre
moderação de conteúdo — vale já responder no formulário que o escopo é restrito
ao texto bíblico e que há filtro de crise.

### 2.5 Custos — cálculo detalhado

Números de agosto de 2026, com dólar a R$ 5,08. Os tamanhos de capítulo foram
medidos nos 1.189 capítulos de `public/bible-text/pt-nvt/`, não estimados.

#### De onde vêm os tokens

| parcela | tokens | observação |
|---|---:|---|
| system prompt | 450 | regras de escopo, postura e filtro de crise |
| capítulo (mediano) | 901 | 3.153 caracteres ÷ 3,5 |
| capítulo (p90) | 1.563 | Salmo 119 é o extremo: 3.727 |
| histórico reenviado | 260 | média ao longo de uma conversa de 6 trocas |
| resposta | 350 | três parágrafos curtos, `max_tokens` 600 |

O system prompt e o capítulo são **idênticos em toda mensagem da mesma
conversa**, o que os torna candidatos perfeitos a prompt caching: a gravação
custa 1,25× o preço de entrada, e cada releitura custa 0,1×. Na prática, a
partir da segunda mensagem o custo de entrada cai 90%.

#### Custo por mensagem

| modelo | 1ª mensagem | seguintes | conversa de 6 |
|---|---:|---:|---:|
| **Haiku 4.5** | US$ 0,0034 | US$ 0,0022 | **US$ 0,014** |
| Sonnet 5 (intro, até 31/ago/2026) | US$ 0,0069 | US$ 0,0043 | US$ 0,028 |
| Sonnet 5 (padrão, a partir de 01/set) | US$ 0,0103 | US$ 0,0064 | US$ 0,043 |

Uma conversa inteira em Haiku custa **menos de dois centavos de real**.

#### Custo mensal por usuário — Haiku 4.5

| uso | custo |
|---|---|
| 10 mensagens | US$ 0,024 · R$ 0,12 |
| 30 mensagens | US$ 0,071 · R$ 0,36 |
| 60 mensagens | US$ 0,142 · R$ 0,72 |
| 120 mensagens | US$ 0,283 · R$ 1,44 |
| 200 mensagens (teto do rate limit) | US$ 0,472 · R$ 2,40 |

#### Margem do tier com IA

O que precisa se pagar não é o preço cheio de R$ 29,90 — é o **incremento de
R$ 10,00** sobre o Premium. Com teto de 300 mensagens/mês (10/dia) e o mix
55% leves (20 msg) · 30% médios (70) · 15% pesados (220), o custo médio de IA
por assinante fica em **R$ 0,78**, e o teto absoluto em R$ 3,60.

| canal | líquido do incremento | caso médio | pior caso (300 msg) |
|---|---:|---:|---:|
| Stripe (3,99% + R$ 0,39) | R$ 9,21 | **R$ 8,43** (84%) | R$ 5,61 (56%) |
| Apple/Google — 15% | R$ 8,50 | **R$ 7,72** (77%) | R$ 4,90 (49%) |
| Apple/Google — 30% | R$ 7,00 | **R$ 6,22** (62%) | R$ 3,40 (34%) |

O prejuízo só começaria a 583 mensagens/mês — 19 por dia, quase o dobro do
teto. **Não existe usuário que dê prejuízo**, e isso é consequência direta do
rate limit, não do preço.

#### Projeção — base de 1.000 assinantes

Hoje: 1.000 × R$ 16,90 = R$ 16.900/mês bruto. Assumindo 30% das assinaturas
via Stripe e 70% pelas lojas a 15%:

| cenário | migram para IA | bruto | custo de IA | líquido | vs. hoje |
|---|---:|---:|---:|---:|---:|
| conservador | 10% | R$ 20.900 | R$ 78 | R$ 18.377 | +24% |
| provável | 20% | R$ 21.900 | R$ 156 | R$ 19.182 | +30% |
| otimista | 35% | R$ 23.400 | R$ 273 | R$ 20.390 | +38% |

Vale separar os dois efeitos: **o reajuste da base de R$ 16,90 para R$ 19,90
já responde por +18%** sozinho, mesmo se ninguém migrar. A IA acrescenta de 6 a
20 pontos por cima disso, dependendo da conversão.

Como o reajuste só vale para assinaturas novas (ver 2.2), esse ganho aparece
gradualmente, conforme a base se renova — não de um mês para o outro.

#### O agente nunca entra no grátis

Se a IA fosse liberada sem cobrança, o custo passaria a acompanhar o número de
usuários em vez da receita:

| usuários ativos | 20 msg/mês cada | custo mensal |
|---:|---|---:|
| 500 | | R$ 120 |
| 2.000 | | R$ 481 |
| 5.000 | | R$ 1.201 |

Modesto em valor absoluto, mas é despesa pura e cresce com o sucesso do nível
grátis — exatamente a combinação errada. O agente fica no tier pago, e ponto.

É também por isso que a Fase 1 fica atrás de uma lista de emails: você mede o
uso real antes de decidir preço e teto.

#### Os três controles que definem a conta

1. **Modelo.** Sonnet custa 2× (3× depois de 31/ago). Para explicar contexto
   histórico de uma passagem, Haiku dá conta. Vale medir na Fase 1 antes de
   pagar por um modelo maior.
2. **Prompt caching.** Sem ele, cada mensagem reenvia 1.350 tokens a preço
   cheio. Com ele, 90% disso some. Não é otimização opcional.
3. **Janela de histórico.** Reenviar a conversa inteira faz o custo crescer
   quadraticamente. Dez trocas é o teto.

#### Custos fora da API

Desprezíveis, mas para constar: as funções da Vercel ficam abertas de 5 a 10
segundos durante o streaming, e as linhas no Supabase são de texto. Nos
volumes acima nada disso sai do plano que você já paga.

---

## Fase 3 — o nível grátis

### 3.1 Por que é a maior das três

`src/App.jsx:661` traz o comentário que define o problema:

> "O app inteiro agora exige assinatura ativa — não existe mais versão grátis.
> (...) nenhuma outra rota é montada, então não precisa de gate individual em
> cada tela/recurso."

Existe **um** ponto de bloqueio: ou a pessoa vê tudo, ou vê o `PaywallGate`.
Nenhuma tela tem trava por funcionalidade. O nível grátis é construir esse
controle do zero.

### 3.2 O recorte

| grátis | Premium |
|---|---|
| leitura bíblica (todos os livros e versões) | rotina diária e ofensiva |
| progresso básico — capítulos lidos | oração estruturada (ACTS) |
| perfil e conta | estudos |
| participar de grupo para o qual foi convidado | reflexão |
| | notas |
| | criar grupos e propor desafios |
| | progresso detalhado e conquistas |

O critério: o grátis entrega **o hábito**, o Premium entrega **o sistema**.
Alguém consegue ler a Bíblia inteira de graça — e é bom que consiga, porque é
o que traz gente e o que faz a pessoa voltar. O que se paga é tudo que
transforma leitura em rotina acompanhada.

### 3.3 O que isso conserta

Hoje quem é convidado por um amigo (`api/invite-friend.js`, grupos, desafios)
bate no paywall antes de ver qualquer coisa. **O paywall total está bloqueando
o próprio mecanismo de crescimento do app.** Um convidado que entra, lê e
participa do grupo do amigo é um candidato a assinante; um convidado que vê
uma tela de preço vai embora.

### 3.4 Como implementar sem espalhar `if` pelo app

Em vez de checar plano em cada componente, três peças:

1. **`src/billing/entitlements.js`** — um mapa `feature → tier mínimo` e uma
   função `can(subscription, 'prayer')`. Fonte única da verdade.
2. **`<Gated feature="prayer">`** — componente que envolve a tela e mostra um
   convite de upgrade no lugar dela quando não há acesso. As telas em si não
   sabem que planos existem.
3. **Navegação ciente** — `BottomNav` e `Sidebar` marcam as abas bloqueadas
   com um selo, em vez de escondê-las. Ver o que existe do outro lado converte
   melhor do que não saber que existe.

Regra: **nada de checagem de plano dentro de tela**. Se um `if (isPremium)`
aparecer dentro de `PrayerScreen`, o controle já vazou.

### 3.5 O risco

Hoje 100% de quem fica, paga. Todo freemium canibaliza parte disso: gente que
teria assinado vai se acomodar no grátis. A aposta é que o volume novo — vindo
principalmente dos convites, que hoje morrem no paywall — mais que compense.

É uma aposta razoável para um app com comunidade embutida, mas é uma aposta.
Vale medir a taxa de conversão do grátis nos primeiros 90 dias e ter combinado
de antemão o que fazer se ela vier abaixo do esperado — apertar o recorte é
muito mais fácil do que afrouxá-lo depois.

---

## Riscos que precisam de decisão sua

### Licença do texto bíblico — verificar antes de lançar

NVT e NLT são licenciadas da Tyndale House via API.Bible. Mandar esse texto
para a API da Anthropic é uma transmissão a terceiro, e nada garante que a
licença atual cubra isso. Há também o risco de o modelo reproduzir trechos
longos da tradução nas respostas.

Não sou advogado e isso não é orientação jurídica — mas é o tipo de coisa que
vale um email para a Tyndale/API.Bible antes do lançamento. Duas mitigações
técnicas, independente da resposta:

1. Instruir o modelo a citar no máximo um versículo por resposta, entre aspas.
2. Se a licença não permitir, usar uma tradução de domínio público (Almeida
   Corrigida Fiel, ACF) só como contexto do agente, mantendo a NVT na leitura.

### Segurança pastoral

Já coberto no prompt acima, mas vale repetir: um app devocional atrai pessoas
em momentos difíceis. O filtro de crise não é um detalhe de polimento — deve
entrar na Fase 1, antes de qualquer teste com usuário real.

### Alucinação

O modelo pode inventar um detalhe histórico com confiança. Mitigações: escopo
restrito ao texto, temperatura baixa, e uma linha no rodapé lembrando que o
assistente pode errar e que vale conferir.

---

## Ordem sugerida

**Fase 1 — o agente funcionando** (liberado por `AI_BETA_EMAILS`)

1. Migration `0025_ai_chat.sql` — conversas, mensagens, uso diário
2. `api/bible-chat.js` com streaming, guardas e filtro de crise
3. Contexto de leitura global em `App.jsx`
4. `BibleChatButton` + `BibleChatPanel`
5. Teste com 5–10 pessoas reais; medir custo por mensagem e qualidade

**Fase 2 — o tier Premium + IA**

6. Migration ampliando o check de `plan` (`monthly_ai`, `annual_ai`)
7. `FIXED_PRICES_CENTS` e `STORE_TIERS` com as faixas novas
8. Stripe: checkout e webhook reconhecendo o tier
9. Produtos novos na App Store e no Google Play
10. `hasAI()` no store de billing + `UpgradeScreen` comparando os planos

**Fase 3 — o nível grátis**

11. `src/billing/entitlements.js` — mapa de funcionalidade para tier
12. Componente `<Gated>` e substituição do `PaywallGate` total
13. Navegação com selo nas abas bloqueadas
14. Migrar os assinantes atuais para o tier correto
15. Ajustar `api/admin/metrics.js` para segmentar por tier

Cada fase é independente e entrega valor sozinha. A Fase 1 produz o dado de
custo real que justifica o preço da Fase 2; a Fase 2 cria a receita nova antes
de a Fase 3 abrir a porta para o grátis.

Se em algum momento for preciso escolher, **a ordem certa de sacrifício é a
inversa**: adiar a Fase 3 custa crescimento, adiar a Fase 2 custa receita,
adiar a Fase 1 custa o produto inteiro.
