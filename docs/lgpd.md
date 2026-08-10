# LGPD — o que o Jesus' Corner precisa adotar

> **Estado em 10/08/2026.** As seções 3 e 4 foram implementadas — ver
> "Situação atual" no fim do documento para o que ficou pronto, o que exige
> ação manual e o que ainda falta.


Levantamento feito a partir do código: migrations em `supabase/`, endpoints em
`api/` e os stores em `src/`. Não é parecer jurídico — eu não sou advogado.
É um mapa técnico do que existe hoje, do que falta, e do que é mais urgente.
Antes de publicar política nova ou mudar base legal, vale revisão de um
advogado de proteção de dados.

---

## 1. O ponto que muda tudo: isto é dado sensível

O artigo 5º, II da LGPD lista **convicção religiosa** como dado pessoal
sensível, no mesmo grupo de origem racial, opinião política e dado de saúde.

Num app de leitura bíblica, **o simples fato de alguém ter conta já revela
convicção religiosa**. Não é o conteúdo de um campo específico — é a base
inteira. Isso não é um detalhe de formulário; muda o regime jurídico de tudo:

- **A base legal não pode ser legítimo interesse.** O art. 11 não oferece essa
  hipótese para dado sensível. Na prática sobra **consentimento específico e
  destacado, para finalidades específicas** (art. 11, I).
- **Consentimento genérico não vale.** O art. 8º, §4º diz que consentimento
  para finalidades genéricas é nulo.
- **Compartilhar dado sensível para obter vantagem econômica é vedado**
  (art. 11, §3º), fora as exceções do próprio artigo.
- O padrão de segurança exigido é mais alto, e um incidente com dado sensível
  tem peso maior na dosimetria de sanção.

Há uma segunda camada de dado sensível no app: os **pedidos de oração**
(`group_prayer_requests`, `user_data.prayer_requests`) são texto livre de até
2.000 caracteres onde as pessoas naturalmente escrevem sobre doença, morte na
família, vício, depressão, conflito conjugal. Isso é **dado de saúde e de vida
íntima**, também sensível, escrito espontaneamente pelo titular.

---

## 2. Inventário — o que o app trata hoje

### Dados identificáveis

| onde | o que |
|---|---|
| `auth.users` (Supabase) | email, senha (hash), metadados de sessão |
| `profiles` | nome, bio, `avatar_url`, `is_public` |
| cadastro (`AuthScreen.jsx:687`) | **data de nascimento** |
| `subscriptions` | IDs de cliente Stripe/Apple/Google, status e valor pago |
| `contact_messages` | nome, email, mensagem livre |
| `onboarding_events` | `session_id`, etapa, `user_id` |
| Vercel (edge) | IP de origem, país (`api/geo.js`, `invite-friend.js`) |

### Dados sensíveis

| onde | o que |
|---|---|
| a existência da conta | convicção religiosa |
| `user_data.notes` | reflexões pessoais em texto livre |
| `user_data.prayer_requests` | pedidos privados |
| `group_prayer_requests` · `group_prayer_comments` | pedidos e comentários compartilhados com o grupo — saúde, vida íntima |
| `user_data.completed_keys` · `studies_completed` | padrão de leitura, que revela intensidade da prática |
| `friend_activity` | atividade religiosa exposta a terceiros |

### Operadores e transferência internacional

Todos fora do Brasil:

| terceiro | o que recebe |
|---|---|
| Supabase | a base inteira, incluindo dado sensível |
| Vercel | requisições, IPs, logs, analytics |
| Stripe | email e dados de pagamento |
| Resend | nome e email nos disparos |
| Apple / Google | identificadores de compra |
| API.Bible | requisições de texto bíblico |
| Google Fonts (CDN) | **IP de todo visitante**, a cada carregamento |
| Anthropic (**futuro**) | trecho lido e conteúdo das conversas |

---

## 3. Lacunas encontradas

Ordenadas por gravidade.

### 🔴 Não existe exclusão de conta

Procurei por qualquer rota, função ou tela de exclusão em `src/`, `api/` e
`supabase/`. **Não há nenhuma.** O art. 18, VI garante ao titular a eliminação
dos dados tratados com base em consentimento — e, como visto no item 1, o
consentimento é justamente a base aplicável aqui.

É a lacuna mais direta e a mais fácil de alguém reclamar na ANPD. Também é
exigência das duas lojas: a App Store pede exclusão dentro do app desde 2022, e
o Google Play exige caminho de exclusão para apps com conta.

### 🔴 O consentimento atual provavelmente não sustenta dado sensível

Em `AuthScreen.jsx:737` há um checkbox único de "concordo com os termos". Para
dado sensível a LGPD pede consentimento **específico e destacado, por
finalidade**. Um aceite único que cobre termos de uso, privacidade e todo o
tratamento tende a não atender.

### 🟠 Avatares num bucket público

`profileStore.js:72` usa `getPublicUrl` no bucket `avatars`. A URL é pública e
permanente — quem tiver o link vê a foto, independente de `is_public` ou de
amizade. Para um app onde ter conta revela religião, uma foto acessível sem
autenticação é exposição desnecessária. URLs assinadas com validade resolvem.

### 🟠 Transferência internacional sem instrumento formal

A Resolução CD/ANPD nº 19/2024 regulamentou os arts. 33 a 36 e aprovou as
cláusulas-padrão contratuais. **O prazo para incorporar essas cláusulas aos
contratos existentes venceu em 23 de agosto de 2025.**

Na prática: verificar se os DPAs de Supabase, Vercel, Stripe e Resend
contemplam as cláusulas-padrão brasileiras (a maioria oferece adendo próprio) e
guardar essa documentação.

### 🟠 Data de nascimento coletada, mas sem porta para menores

O cadastro pede data de nascimento e nada é feito com ela do ponto de vista de
proteção. O art. 14 exige, para **crianças (menores de 12)**, consentimento
específico e em destaque de pelo menos um dos pais. Para adolescentes, o
critério é o melhor interesse.

O dado já está lá — falta decidir a política: ou bloquear menores de 12, ou
construir o fluxo de consentimento parental. Um app devocional atrai
adolescentes; ignorar isso é apostar.

### 🟡 Sem política de retenção

Nenhuma tabela tem prazo de descarte. `contact_messages` e `onboarding_events`
acumulam indefinidamente. O art. 15 manda eliminar quando a finalidade se
esgota.

### 🟡 Google Fonts carregado do CDN

`index.css` e `index.html` importam de `fonts.googleapis.com`, o que envia o IP
de todo visitante ao Google antes de qualquer consentimento. Auto-hospedar as
duas famílias é trivial e elimina um operador do inventário.

### 🟡 Vercel Analytics sem menção

`@vercel/analytics` roda em `App.jsx:635`. Precisa aparecer na política.

### 🟡 Sem canal formal de titular

Existe `ContactScreen`, mas não identificado como canal de exercício de
direitos. Ver item 5.

---

## 4. O que fazer — por prioridade

### Prioridade 1 — exclusão de conta

Uma tela em `ProfileScreen` e um endpoint `api/delete-account.js` com service
role. O `on delete cascade` já está em quase todas as FKs para
`auth.users(id)`, então a maior parte cai sozinha ao remover o usuário. Cuidar
à parte de:

- objetos no bucket `avatars` (Storage não segue cascade do Postgres);
- `contact_messages`, que referencia por email e não por `user_id`;
- assinatura ativa — cancelar no Stripe antes de apagar, ou o cliente continua
  sendo cobrado;
- conteúdo em grupo (`group_comments`, `group_prayer_requests`): decidir entre
  apagar ou anonimizar. Anonimizar preserva a conversa dos outros e é
  defensável, desde que a desvinculação seja real.

Confirmar por email antes de executar, e oferecer também **exportação dos
dados** (art. 18, V) — no seu caso é um JSON de `user_data` + `profiles` +
participações, algo direto de montar.

### Prioridade 2 — consentimento em camadas

No cadastro, separar:

1. Termos de uso e política de privacidade (aceite obrigatório);
2. **Tratamento de dados relacionados à convicção religiosa** para operar o
   app — destacado, com explicação em linguagem simples de por que é
   necessário;
3. Comunicações por email que não sejam transacionais — opcional, desmarcado;
4. Perfil público e atividade visível a amigos — opcional, desmarcado.

Registrar data, hora, versão do texto e IP de cada consentimento. Sem esse
registro, não há como demonstrar conformidade (art. 6º, X).

### Prioridade 3 — política de privacidade específica

A política em `jesuscorner.app/privacidade` precisa cobrir, no mínimo:

- que dados sensíveis são tratados e por quê;
- a lista de operadores da seção 2, nominalmente;
- que há transferência internacional e com qual instrumento;
- prazos de retenção;
- como exercer cada direito do art. 18 e em quanto tempo há resposta;
- o canal do titular.

### Prioridade 4 — retenção

Proposta inicial: `onboarding_events` 12 meses, `contact_messages` 24 meses
após resolução, `friend_activity` 12 meses, conta inativa 24 meses com aviso
prévio por email. Um cron na Vercel resolve — já existe um em `vercel.json`.

### Prioridade 5 — endurecer o que já existe

- URLs assinadas para avatares;
- auto-hospedar Plus Jakarta Sans e Be Vietnam Pro;
- decidir a política de menores e aplicar sobre a data de nascimento;
- montar o ROPA (art. 37) no modelo simplificado da ANPD.

---

## 5. Regime de pequeno porte

A Resolução CD/ANPD nº 2/2022 cria regime diferenciado para microempresas,
empresas de pequeno porte e startups. Se o Jesus' Corner se enquadra:

- **dispensa de nomear encarregado** (DPO), desde que exista **canal de
  comunicação** divulgado para o titular;
- ROPA em modelo simplificado, fornecido pela ANPD;
- **prazos em dobro** para responder ao titular e comunicar incidentes;
- procedimento simplificado de notificação de incidente.

O que **não** muda: base legal, consentimento, direitos do titular, segurança,
comunicação de incidente. A flexibilização é de forma e prazo, não de dever.

Ação concreta: identificar o `ContactScreen` como canal do titular e publicar
esse contato na política.

---

## 6. O agente de IA muda o quadro

Quando a Fase 2 do `plano-agente-ia.md` entrar, a Anthropic vira operadora e
passa a receber **o conteúdo das conversas sobre passagens bíblicas** — que é
dado sensível por definição, e pode conter desabafo pessoal.

Antes de ligar para usuário real:

1. Incluir a Anthropic no inventário e na política, com transferência
   internacional declarada;
2. Consentimento próprio ao ativar o recurso, não herdado do cadastro;
3. Verificar a política de retenção e de uso para treinamento da API — e
   deixar isso explícito para o usuário;
4. Definir retenção de `ai_conversations` e `ai_messages` e permitir que o
   usuário apague o histórico;
5. Enviar o mínimo: referência do capítulo e a pergunta, sem anexar perfil,
   nome ou histórico de leitura.

O filtro de crise previsto no plano também tem leitura de proteção de dados:
se alguém escrever sobre ideação suicida, isso é dado de saúde, e o app não
deve armazenar mais do que o estritamente necessário.

---

## 7. Resumo executivo

O app tem um problema de enquadramento antes de ter problema de detalhe:
**tudo aqui é dado sensível**, e o consentimento genérico de hoje
provavelmente não sustenta esse regime.

A lacuna mais urgente é objetiva e não depende de interpretação: **não existe
como excluir a conta.** É direito do titular, é exigência das duas lojas, e é
o tipo de coisa que gera reclamação fácil.

Ordem que eu seguiria: exclusão e exportação de conta → consentimento em
camadas com registro → política de privacidade reescrita → retenção → o resto.
E o agente de IA não sobe para usuário real antes dos três primeiros.

---

## 8. Situação atual

### Implementado

| item | onde |
|---|---|
| Exclusão de conta, com anonimização do conteúdo em grupo | `api/delete-account.js`, `ProfileScreen` |
| Exportação de dados em JSON | `api/export-my-data.js` |
| Consentimento em camadas, por finalidade | `AuthScreen`, `src/privacy/consent.js` |
| Registro de consentimento com versão, IP e user-agent | `api/record-consent.js`, tabela `consents` |
| Bloqueio de menores de 12, no cliente e no servidor | `src/privacy/minAge.js`, `authStore.signup` |
| Retenção automática (cron diário às 4h) | `api/retention.js`, `vercel.json` |
| Avatares privados, com URL assinada de 1 hora | migration 0025, `profileStore.resolveAvatarUrl` |
| Canal do titular identificado | `ContactScreen` |
| Fontes não usadas removidas | `index.html` |

Duas armadilhas encontradas no caminho, que motivaram decisões de projeto:

**`profiles` precisou ser solto de `auth.users`.** A cadeia era
`auth.users → profiles → reading_groups.created_by`, toda em cascade. Apagar
um usuário apagaria os grupos criados por ele e, com eles, membros,
comentários e pedidos de oração de terceiros. Um titular exercendo o direito
dele destruiria dado de outras pessoas. Agora a linha de `profiles` sobrevive
como lápide anonimizada, e o cron remove as lápides quando nada mais as
referencia.

**A assinatura precisa ser cancelada antes da exclusão.** Sem isso o Stripe
continuaria cobrando um cliente que já não existe no banco. Compras via
App Store e Google Play só o próprio usuário cancela — a tela avisa isso
antes de confirmar.

### Exige ação manual

1. **Aplicar a migration 0025** no Supabase. Ela torna o bucket `avatars`
   privado: enquanto não rodar, as URLs assinadas do código novo não
   funcionam.
2. **Auto-hospedar as fontes** — `node scripts/fetch-fonts.mjs` (precisa de
   internet), depois trocar o `@import` no topo de `src/index.css`. O script
   imprime a linha exata.
3. **Confirmar `CRON_SECRET`** nas variáveis da Vercel, senão o endpoint de
   retenção fica aberto.
4. **Testar a exclusão numa conta descartável** antes de liberar. É
   irreversível e toca em oito tabelas, no Storage e no Stripe.

### Ainda falta

- **Reescrever a política de privacidade** em `jesuscorner.app/privacidade`.
  Mora em outro repositório (`jesus-corner-site`), fora deste. É a peça que
  falta para o consentimento novo fazer sentido: hoje o app coleta
  consentimento específico para dado sensível, mas a política ainda não
  explica esse tratamento.
- **Cláusulas-padrão de transferência internacional** com Supabase, Vercel,
  Stripe e Resend. Verificar os DPAs de cada um e guardar a documentação.
- **ROPA** no modelo simplificado da ANPD.
- **Reapresentar o consentimento a quem já tem conta.** `needsConsentRefresh()`
  já existe em `src/privacy/consent.js`, mas nada chama ainda — a base atual
  aceitou só o checkbox antigo. Falta um modal no login quando faltar
  consentimento obrigatório ou quando a versão da política mudar.
