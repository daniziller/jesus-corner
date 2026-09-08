// Wrapper fino sobre o AI SDK (Vercel AI Gateway) — usado só por
// api/generate-theme-plan.js. Mesmo espírito de api/_lib/apple.js/
// googlePlay.js: config do provedor fica só aqui, nunca exposta ao client.
//
// Autenticação: em produção na Vercel funciona sozinho via OIDC (nenhuma
// env var precisa ser setada); localmente precisa de AI_GATEWAY_API_KEY no
// .env (ver .env.example).
import { generateText, Output } from 'ai'
import { z } from 'zod'

// Sempre o mais recente disponível no Gateway na hora em que isso foi
// escrito — nunca confiar num id de memória (ver skill vercel:ai-sdk),
// checar de novo em https://ai-gateway.vercel.sh/v1/models antes de trocar.
// Sonnet é suficiente aqui (escolher passagens, não gerar texto longo) —
// não precisa do modelo mais caro (Opus).
const MODEL = 'anthropic/claude-sonnet-5'

// Estimativa grosseira de palavras por capítulo (média da Bíblia toda) —
// só serve pra sugerir pra IA quantos capítulos por passagem pedir, dado o
// ritmo escolhido; não precisa ser exata (ver findThemePassages abaixo).
// O tamanho real de cada sessão é sempre recalculado depois com a
// contagem de palavras de verdade (ver src/utils/wordChunking.js) — isto
// aqui só evita a IA devolver passagens sempre minúsculas independente do
// ritmo pedido, que era o bug original.
const AVG_WORDS_PER_CHAPTER = 570

const PassageSchema = z.object({
  book: z.string().describe('Nome do livro EXATAMENTE como aparece na lista de livros válidos fornecida no prompt — nenhuma variação de grafia.'),
  chStart: z.number().int().min(1).describe('Primeiro capítulo da passagem.'),
  chEnd: z.number().int().min(1).describe('Último capítulo da passagem (igual a chStart se for 1 capítulo só).'),
  reason: z.string().describe('Uma frase curta (no mesmo idioma do tema) explicando por que essa passagem é relevante.'),
})

// turno 35, 35d/35e — a pessoa escolhe uma DURAÇÃO fixa (3/7/14/21/30
// dias) antes de gerar; o plano por tema, que antes só pedia "entre 5 e
// 15" (a pessoa escolhia quais ler depois), agora mira EXATAMENTE `days`
// passagens — uma por dia da proposta (ver 35e, "uma linha por dia, todas
// visíveis"). O piso fica um pouco abaixo de `days` (nunca abaixo de 3) só
// pra não estourar a geração inteira quando o tema é estreito demais pra
// render exatamente `days` sem repetir/forçar relação fraca — nesse caso a
// proposta sai com menos dias que o pedido (honesto: nunca inventa
// passagem só pra completar a contagem). A fusão de passagens adjacentes
// (mergeAdjacentPassages, api/generate-theme-plan.js) também pode reduzir
// o total depois — nunca aumenta.
function buildThemePassagesSchema(days) {
  const min = Math.max(3, days - 2)
  return z.object({
    title: z.string().describe('Título curto do plano (2 a 5 palavras, no mesmo idioma do assunto) — ex: "Ansiedade: o que a Bíblia diz". É o único título que a pessoa vê (ela não digita um, só descreve o assunto em texto livre); precisa identificar o plano sozinho, sem repetir a palavra "plano" ou "estudo".'),
    overview: z.string().describe('Um parágrafo curto (2 a 4 frases, no mesmo idioma do assunto) explicando o fio condutor do plano: por que essas passagens foram escolhidas e organizadas nessa ordem, e o que a pessoa vai entender/vivenciar ao ler todas em sequência. Escrito pra quem ainda não viu a lista de passagens — dá o contexto antes de começar a ler.'),
    passages: z.array(PassageSchema).min(min).max(days),
  })
}

function buildLangInstruction(lang) {
  return lang === 'en'
    ? 'Write the "title", "reason" and "overview" fields in English.'
    : 'Escreva os campos "title", "reason" e "overview" em português.'
}

// Mesma ideia, só que pro campo "reply" do chat (ver answerTextQuestion) —
// função à parte em vez de generalizar buildLangInstruction acima, que é
// específica dos campos do plano por tema.
function buildReplyLangInstruction(lang) {
  return buildFieldsLangInstruction(lang, 'reply')
}

// Genérica por trás de buildReplyLangInstruction acima — usada direto por
// funções com mais de um campo de texto (generateChapterContext,
// generateReflectionQuestionPair, generateReadingSummary), pra não fingir
// que "reply" é o nome do campo quando não é.
function buildFieldsLangInstruction(lang, fields) {
  return lang === 'en'
    ? `Write the ${fields} field(s) in English.`
    : `Escreva o(s) campo(s) ${fields} em português.`
}

// Mesma ideia, campos do StudySchema (ver generateStudy abaixo).
function buildStudyLangInstruction(lang) {
  return lang === 'en'
    ? 'Write all text fields (title, subtitle, historical, geographical, theological, reflectionQuestions) in English.'
    : 'Escreva todos os campos de texto (title, subtitle, historical, geographical, theological, reflectionQuestions) em português.'
}

// Sem isso, a IA tendia a sempre devolver passagens minúsculas (1 capítulo,
// às vezes menos) não importa o ritmo escolhido — cada uma virava sua
// própria sessão, bem mais curta que o tempo pedido.
function buildSizeInstruction(targetWords) {
  const roughChapters = targetWords > 0 ? Math.max(1, Math.round(targetWords / AVG_WORDS_PER_CHAPTER)) : null
  return roughChapters != null
    ? `Cada passagem deve ter, ao todo, o equivalente a aproximadamente ${roughChapters} capítulo${roughChapters === 1 ? '' : 's'} de leitura (pode variar, não precisa ser exato) — o suficiente pra preencher uma sessão de leitura sozinha. Só devolva uma passagem bem mais curta que isso se não houver mais conteúdo relevante ao assunto naquele trecho da Bíblia.`
    : `Não há meta de tamanho por passagem — cada trecho relevante, mesmo curto, serve.`
}

function formatPassageList(passages) {
  return passages
    .map((p, i) => `${i + 1}. ${p.book} ${p.chStart === p.chEnd ? p.chStart : `${p.chStart}–${p.chEnd}`} — ${p.reason}`)
    .join('\n')
}

async function generateDraftPassages(scope, canonicalBooks, lang, targetWords, days) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: buildThemePassagesSchema(days) }),
    prompt: `Você é um estudioso bíblico ajudando a montar um plano de leitura devocional sobre um assunto específico.

Assunto: "${scope}"

Liste EXATAMENTE ${days} passagens da Bíblia (Antigo e Novo Testamento) diretamente relevantes a esse tema — o plano tem ${days} dias, uma passagem por dia, nessa ordem. Regras:
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- ${buildSizeInstruction(targetWords)}
- Prefira passagens coerentes (nunca um livro inteiro) — cada uma precisa fazer sentido lida sozinha, sem depender do resto do livro.
- Cada sessão de leitura só pode conter capítulos de UM livro só (nunca combina livros diferentes numa sessão) — por isso, prefira APROFUNDAR em menos livros (mais capítulos seguidos de cada um) a espalhar por muitos livros diferentes com só 1 capítulo cada, sempre que o tema permitir. Muitas passagens de 1 capítulo cada, cada uma de um livro diferente, geram sessões bem mais curtas que o ritmo pedido.
- Não repita o mesmo livro/capítulo em duas passagens diferentes.
- Só inclua passagens que você tem certeza que existem de verdade e que realmente tratam do tema — não force uma relação fraca só pra preencher a lista.
- Ordene da passagem mais fundamental/conhecida pra mais específica.
- Escreva também um "overview": um parágrafo curto explicando o fio condutor do plano como um todo (não repita as razões individuais de cada passagem, dê a visão geral).
${buildLangInstruction(lang)}`,
  })
  return output
}

// Segunda chamada, agora num papel de revisor crítico em vez de gerador —
// recebe o rascunho da primeira chamada e devolve a versão final. Existe
// pra pegar erros que a primeira chamada comete sozinha com frequência:
// passagens com relação fraca/forçada com o tema, referências que existem
// mas não são as mais relevantes, ou passagens importantes que ficaram de
// fora. Custa uma segunda chamada de IA (dobra o tempo/custo da geração),
// mas o ganho de qualidade compensa — ver decisão com o usuário.
async function reviewThemePassages(scope, draft, canonicalBooks, lang, targetWords, days) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: buildThemePassagesSchema(days) }),
    prompt: `Você é um revisor teológico criterioso. Outra pessoa (ou IA) montou um rascunho de plano de leitura devocional sobre um assunto — sua tarefa é revisar esse rascunho com espírito crítico e devolver a versão FINAL, corrigida.

Assunto: "${scope}"

Rascunho do título: "${draft.title}"

Rascunho da visão geral: "${draft.overview}"

Rascunho das passagens:
${formatPassageList(draft.passages)}

Revise com atenção a:
- O título: curto (2 a 5 palavras), identifica o plano sozinho. Reescreva se estiver genérico demais ou repetir "plano"/"estudo".
- Remova qualquer passagem cuja relação com o assunto seja fraca, forçada, ou genérica demais.
- Corrija ou remova referências que pareçam erradas (livro/capítulo que não fazem sentido).
- Se faltar alguma passagem claramente importante pro assunto, adicione.
- Elimine duplicações ou sobreposições desnecessárias entre passagens.
- Cada sessão de leitura só pode conter capítulos de UM livro só (nunca combina livros diferentes numa sessão) — se o rascunho tem muitas passagens de 1 capítulo cada, cada uma de um livro diferente, isso vira muitas sessões bem mais curtas que o ritmo pedido. Prefira trocar 2-3 dessas passagens avulsas (livros diferentes, fraca sobreposição com o tema) por 1 passagem mais longa (vários capítulos seguidos) de um dos livros mais centrais ao assunto, sempre que possível sem perder relevância.
- Garanta que a ordem final faça sentido (da passagem mais fundamental/conhecida pra mais específica).
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- ${buildSizeInstruction(targetWords)}
- Reescreva o "overview" se necessário, pra refletir com precisão a lista final revisada (não a original).
- Devolva SEMPRE a lista completa revisada, com EXATAMENTE ${days} passagens (o plano tem ${days} dias, uma por dia), nunca só as mudanças.
${buildLangInstruction(lang)}`,
  })
  return output
}

// canonicalBooks — os 66 nomes canônicos válidos (ver BIBLE_BLOCKS em
// src/data/bibleBlocks.js), pra restringir a IA a só citar livros que
// existem de verdade. Isso reduz alucinação de NOME de livro, mas não
// garante nada sobre os CAPÍTULOS citados — quem chama esta função ainda
// precisa validar chStart/chEnd contra o texto real antes de confiar
// (ver api/generate-theme-plan.js).
//
// Duas chamadas sequenciais (gerar rascunho → revisar criticamente) em vez
// de uma só — o ganho de qualidade da revisão compensa o dobro de tempo/
// custo (ambas usam o mesmo modelo, ver MODEL acima).
export async function findThemePassages(scope, canonicalBooks, lang, targetWords = 0, days = 7) {
  const draft = await generateDraftPassages(scope, canonicalBooks, lang, targetWords, days)
  return reviewThemePassages(scope, draft, canonicalBooks, lang, targetWords, days)
}

// "Trocar" um dia da proposta (35e) — pede só 1 passagem nova pro mesmo
// tema, evitando repetir as que já estão na proposta (inclusive a que vai
// ser substituída, pra não devolver a mesma de novo). Uma chamada só (sem
// segunda passada de revisão — é uma troca pontual, não o plano inteiro).
const SinglePassageSchema = z.object({ passage: PassageSchema })

export async function regenerateThemePassage(scope, otherPassages, lang, targetWords, canonicalBooks) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: SinglePassageSchema }),
    prompt: `Você é um estudioso bíblico ajudando a montar um plano de leitura devocional sobre um assunto específico.

Assunto: "${scope}"

O plano já tem estas passagens (não repita nenhuma delas, nem o mesmo livro+capítulos):
${formatPassageList(otherPassages)}

Proponha MAIS UMA passagem da Bíblia (Antigo ou Novo Testamento), diferente de todas as de cima, igualmente relevante ao assunto. Regras:
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- ${buildSizeInstruction(targetWords)}
- Precisa fazer sentido lida sozinha, sem depender do resto do livro.
- Só proponha se tiver certeza que a passagem existe de verdade e trata do tema — não force uma relação fraca.
${buildLangInstruction(lang)}`,
  })
  return output.passage
}

// Estudo temático gerado por IA (aba Estudos) — mesmo espírito de
// densidade dos estudos estáticos em src/data/studies.js (contexto
// histórico/geográfico/teológico + perguntas de reflexão por sessão), só
// que sobre um tema escolhido pela pessoa em vez de pré-escrito à mão. Ao
// contrário do plano por tema (que só pede livro+capítulos e busca o texto
// real depois), aqui a IA já escreve o CONTEÚDO — não tem "texto real" pra
// validar contra, só o nome do livro/faixa de capítulos da passagem (essa
// parte é validada do mesmo jeito, ver api/generate-study.js). Só uma
// chamada (não duas como findThemePassages) — o schema já é bem maior por
// sessão, uma segunda passada de revisão dobraria o custo/tempo de uma
// geração que já é grande.
const StudySchema = z.object({
  title: z.string().describe('Título curto do estudo (2-5 palavras), no mesmo idioma do tema.'),
  subtitle: z.string().describe('1-2 frases descrevendo o que o estudo cobre e por que vale a pena, terminando por mencionar quantas sessões tem.'),
  sessions: z.array(z.object({
    title: z.string().describe('Título curto da sessão (ex: "As Origens do Mundo").'),
    book: z.string().describe('Nome do livro EXATAMENTE como aparece na lista de livros válidos fornecida no prompt — nenhuma variação de grafia.'),
    chStart: z.number().int().min(1).describe('Primeiro capítulo da passagem desta sessão.'),
    chEnd: z.number().int().min(1).describe('Último capítulo da passagem desta sessão (igual a chStart se for 1 capítulo só).'),
    historical: z.string().describe('Contexto histórico/autoria/data/pano de fundo cultural da passagem — 3 a 5 frases densas.'),
    geographical: z.string().describe('Contexto geográfico: lugares, rotas, geografia física relevante à passagem — 2 a 4 frases.'),
    theological: z.string().describe('Temas teológicos/literários centrais da passagem, como ela se conecta com o resto da Bíblia — 3 a 5 frases.'),
    reflectionQuestions: z.array(z.string()).min(3).max(5).describe('Perguntas de reflexão pessoal ligadas ao conteúdo da sessão, pra aplicar à própria vida.'),
  })).min(3).max(8),
})

async function generateStudyDraft(theme, canonicalBooks, lang) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: StudySchema }),
    prompt: `Você é um estudioso bíblico montando um estudo devocional aprofundado sobre um tema específico, no mesmo formato de um curso bíblico: cada sessão cobre uma passagem da Bíblia com contexto histórico, geográfico e teológico, além de perguntas de reflexão pessoal.

Tema: "${theme}"

Monte entre 3 e 8 sessões, cada uma sobre uma passagem bíblica relevante ao tema. Regras:
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- Cada sessão cobre capítulos de UM livro só (nunca combina livros diferentes numa sessão).
- Não repita o mesmo livro/capítulo em duas sessões diferentes.
- Ordene as sessões numa progressão que faça sentido (cronológica, temática, ou do mais fundamental ao mais específico).
- Escreva contexto histórico/geográfico/teológico dignos de um comentário bíblico sério — específico daquela passagem, nunca genérico.
- As perguntas de reflexão devem convidar a pessoa a aplicar o texto à própria vida, não só testar conhecimento.
- Só inclua passagens que você tem certeza que existem de verdade e que realmente tratam do tema.
${buildStudyLangInstruction(lang)}`,
  })
  return output
}

export async function generateStudy(theme, canonicalBooks, lang) {
  return generateStudyDraft(theme, canonicalBooks, lang)
}

// Chat com IA sobre o texto bíblico em leitura (aba "Perguntar à IA" em
// ReadingBlockView.jsx) — usado por api/chat-about-text.js. Escopo: contexto
// histórico/geográfico/cultural da passagem, o que o texto bíblico em si diz,
// e — a partir do pedido de ampliar o chat pra usar a Bíblia como fonte —
// correlações com OUTRAS passagens da Escritura sobre o mesmo tema/pessoa/
// evento e os ensinamentos que o próprio texto bíblico transmite. A régua
// que separa "permitido" de "proibido" nunca foi história-vs-teologia; é
// "ancorado numa passagem bíblica específica" vs. "opinião/doutrina/
// aconselhamento que não vem do texto" — doutrina de denominação, filosofia
// e aconselhamento pessoal continuam fora. `inScope`/`sensitiveTopic` saem
// estruturados (Zod) pra que o app SEMPRE aplique a resposta certa a cada
// categoria (e sempre garanta a linha de apoio em caso de autolesão/
// suicídio — ver CVV_LINE_* em chat-about-text.js), em vez de confiar
// cegamente no texto livre gerado.
const AnswerSchema = z.object({
  inScope: z.boolean().describe('true se a pergunta pede contexto histórico/geográfico/cultural/arqueológico da passagem, esclarecimento do que o texto bíblico EM SI diz/narra, correlações com OUTRAS passagens da Bíblia sobre o mesmo tema/pessoa/evento, ou os ensinamentos que o texto bíblico transmite (sempre ancorados em passagens específicas da Escritura, nunca em opinião teológica solta). false para doutrina de denominação/tradição específica, filosofia, aconselhamento pessoal/psicológico/espiritual sobre a vida de quem pergunta, ou qualquer assunto fora da Bíblia.'),
  sensitiveTopic: z.enum(['none', 'self_harm', 'other_sensitive']).describe("'self_harm' se a pergunta expressar, em primeira pessoa, ideação suicida/autolesão da PRÓPRIA pessoa perguntando — NÃO uma pergunta histórica sobre uma figura bíblica que morre ou deseja morrer (ex: Saul em 1 Samuel 31, Elias em 1 Reis 19:4, Jó), essas continuam inScope=true e sensitiveTopic='none'. 'other_sensitive' pra abuso infantil, violência explícita como instrução, ou qualquer pedido de conteúdo prejudicial/ilegal disfarçado de pergunta bíblica."),
  reply: z.string().describe('A resposta, no mesmo idioma da pergunta. Ao citar uma passagem correlata, sempre nomeie livro e capítulo (e versículo, se souber) — nunca cite de memória sem ter certeza da referência. Se inScope=false ou sensitiveTopic != "none", uma recusa BREVE e gentil (1-2 frases), sem repetir a pergunta, redirecionando pro escopo do chat (o texto e o que a Bíblia diz sobre ele) — se sensitiveTopic="self_harm", também acolha brevemente antes de recusar, sem dar conselho nem continuar o assunto (a linha de apoio é adicionada à parte, não invente uma).'),
})

function formatContextSections(sections, chStart, chEnd) {
  return sections
    .filter(s => chStart != null && chEnd != null && s.chStart <= chEnd && s.chEnd >= chStart)
    .map(s => `- Cap. ${s.chStart}${s.chStart !== s.chEnd ? `–${s.chEnd}` : ''} (${s.title}): ${s.text}`)
    .join('\n')
}

function formatHistory(history) {
  if (!history?.length) return '(nenhuma mensagem anterior)'
  return history.map(m => `${m.role === 'user' ? 'Pessoa' : 'Você'}: ${m.content}`).join('\n')
}

// bookInfo — a entrada de src/data/bookInfo.js (ou .en.js) do livro em
// questão (contextOverview/contextSections), a MESMA fonte que a aba
// "Contexto" já mostra — passada como fonte primária de verdade, pra
// ancorar a resposta no que o app já exibe, não em conhecimento solto do
// modelo. history — últimas ~10 mensagens da mesma passagem (já ordenadas,
// mais antiga primeiro), pra manter contexto sem deixar o prompt crescer
// sem limite.
export async function answerTextQuestion({ book, chStart, chEnd, bookInfo, message, history, lang }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const sections = formatContextSections(bookInfo?.contextSections ?? [], chStart, chEnd)
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: AnswerSchema }),
    prompt: `Você é um estudioso bíblico conversando com uma pessoa que está lendo ${book} ${range} agora, dentro de um app de leitura devocional. Sua função é ajudar a entender esse texto em profundidade, usando a PRÓPRIA BÍBLIA como fonte — contexto, o que o texto diz, como ele se conecta com o resto da Escritura, e o que ensina.

Contexto histórico/geográfico já conhecido dessa passagem (fonte primária — baseie sua resposta nisso sempre que relevante, complementando com conhecimento histórico geral só quando necessário):
Visão geral do livro: ${overview}
${sections || '(sem seções específicas cadastradas para esses capítulos)'}

Permitido: história, geografia, cultura da época, arqueologia, autoria tradicional, gênero literário, esclarecer o que o texto narra ou diz literalmente, apontar correlações com OUTRAS passagens da Bíblia sobre o mesmo tema/pessoa/evento/tipologia (sempre citando livro e capítulo, e versículo quando souber com certeza), e explicar os ensinamentos que o PRÓPRIO texto bíblico transmite — sempre ancorado em passagens reais da Escritura, nunca na sua opinião teológica pessoal. É legítimo sair da passagem atual pra citar outra, contanto que a ligação com o texto em foco fique clara.
Proibido: doutrina de denominação/tradição específica ("o que a minha igreja ensina sobre isso"), filosofia, aconselhamento pessoal/psicológico/espiritual sobre a vida de quem pergunta ("o que isso significa pra mim", "o que eu devo fazer") — nesses casos, recuse com gentileza e sugira que é uma ótima pergunta para levar a um pastor/líder da sua igreja, não a este chat. Se a pergunta for sobre um assunto sem nenhuma relação com a Bíblia, recuse e sugira focar no texto atual.

Conversa até agora:
${formatHistory(history)}

Nova pergunta da pessoa: "${message}"

${buildReplyLangInstruction(lang)}`,
  })
  return output
}

// Pergunta sobre um TRECHO SELECIONADO (tela 10a/10b do redesign Bento —
// ver ADENDO-identidade-e-IA.md) — usado por api/ask-about-passage.js.
// Diferente de answerTextQuestion (chat livre sobre a sessão inteira,
// histórico salvo no servidor): aqui a pergunta nasce de selecionar um
// trecho específico, sem histórico de conversa, e a resposta SEMPRE sai
// estruturada em UM dos 4 formatos abaixo (`outcome`) — nunca texto livre
// solto. `outcome='answer'` exige as duas citações (support + expansion);
// se o modelo não citar as duas, api/ask-about-passage.js descarta a
// resposta inteira (ver verifyCitation lá) — a regra "quem não cita, não
// responde" do prompt do handoff.
const PassageAnswerSchema = z.object({
  outcome: z.enum(['answer', 'doctrine_divergent', 'out_of_scope', 'risk']).describe(
    "'answer': a pergunta pede contexto histórico/geográfico/cultural, esclarecimento do que o texto EM SI diz, ou correlação com outras passagens — sempre ancorável em Escritura real, sem opinião de denominação. " +
    "'doctrine_divergent': a pergunta pede a posição 'certa' sobre um tema em que denominações/tradições cristãs divergem de boa-fé (ex: batismo infantil, dons espirituais hoje, predestinação) — você não decide qual lado está certo. " +
    "'out_of_scope': a pergunta não tem relação com a Bíblia, ou pede aconselhamento pessoal/psicológico/espiritual sobre a vida de quem pergunta ('o que isso significa pra mim', 'devo terminar meu casamento') — você não inventa conselho. " +
    "'risk': a pergunta expressa, em primeira pessoa, ideação suicida/autolesão da PRÓPRIA pessoa (não uma figura bíblica histórica — Saul, Elias 1Rs 19:4 e Jó continuam 'answer')."
  ),
  reply: z.string().describe(
    "outcome='answer': a resposta em si, no máximo 2 parágrafos curtos, no mesmo idioma da pergunta. " +
    "outcome='doctrine_divergent': 1-2 frases reconhecendo que cristãos sérios divergem nisso, sem tomar partido, sugerindo conversar com um pastor/líder da igreja da pessoa. " +
    "outcome='out_of_scope': 1-2 frases dizendo que não sabe / não é o escopo deste assistente, sem tentar improvisar conselho. " +
    "outcome='risk': 1-2 frases de acolhimento breve, SEM conselho e SEM qualquer versículo — a linha de apoio (CVV) é adicionada à parte pelo servidor, nunca pelo modelo."
  ),
  nearTopic: z.string().nullable().describe(
    "Só quando outcome='out_of_scope': o tema bíblico mais próximo da pergunta, em 1 a 3 palavras minúsculas no idioma da pergunta (ex: 'aliança', 'perdão', 'provisão'), pra o app oferecer 'ler o que a Bíblia diz sobre <tema>'. null nos outros casos."
  ),
  supportCitation: z.object({
    reference: z.string().describe('Referência exata no formato "Livro capítulo:versículo" (ex: "Gênesis 41:26") — o versículo que sustenta a resposta diretamente.'),
    quote: z.string().describe('O texto desse versículo, citado com fidelidade (não parafraseado) — será conferido contra o texto bíblico real antes de sair.'),
  }).nullable().describe('Obrigatório quando outcome="answer" (a resposta não sai sem isso); null em todos os outros casos.'),
  expansionCitation: z.object({
    reference: z.string().describe('Referência de uma passagem RELACIONADA, fora do capítulo atual, que expande o tema.'),
    note: z.string().describe('Uma frase curta de por que essa passagem se conecta.'),
  }).nullable().describe('Obrigatório quando outcome="answer"; null em todos os outros casos.'),
  doctrineSideA: z.object({ label: z.string(), reference: z.string(), quote: z.string() })
    .nullable().describe('Obrigatório quando outcome="doctrine_divergent": um dos dois lados, com o texto que o sustenta. null nos demais casos.'),
  doctrineSideB: z.object({ label: z.string(), reference: z.string(), quote: z.string() })
    .nullable().describe('Obrigatório quando outcome="doctrine_divergent": o outro lado. null nos demais casos.'),
})

// Tom de resposta (10f, reskin Bento) — só afeta tamanho/tom de `reply`
// quando outcome="answer"; os outros 3 outcomes já têm formato fixo
// (1-2 frases) e não mudam com o tom. 'explained' é o comportamento
// ORIGINAL (até 2 parágrafos, com contexto) — ver getResponseTone em
// src/aiChat/aiPreferencesStore.js pro porquê desse ser o padrão, não
// 'direct' (que é o valor ilustrado no mockup).
function buildToneInstruction(tone) {
  if (tone === 'direct') return 'Tom "Direto": responda em NO MÁXIMO 2 frases curtas, direto ao ponto, sem rodeios nem contexto extra.'
  if (tone === 'study') return 'Tom "Estudo": pode usar até 3 parágrafos curtos, incluindo referências cruzadas adicionais dentro do próprio texto de "reply" (além das citações estruturadas support/expansion) quando relevante.'
  return 'Tom "Explicado": até 2 parágrafos curtos, com contexto suficiente pra entender o "porquê", sem se alongar.'
}

// bookInfo/lang — mesmo padrão de answerTextQuestion. book/chapter/
// verseStart/verseEnd — o trecho selecionado de verdade (não a sessão
// inteira); passageText — o texto real desses versículos, na versão que a
// pessoa está lendo, dado como contexto primário pra ancorar a resposta
// (e permitir checar a citação depois, ver verifyCitation em
// api/ask-about-passage.js). tone — ver buildToneInstruction acima.
export async function answerAboutPassage({ book, chapter, verseStart, verseEnd, passageText, bookInfo, question, lang, tone }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const sections = formatContextSections(bookInfo?.contextSections ?? [], chapter, chapter)
  const verseRange = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: PassageAnswerSchema }),
    prompt: `Você é um estudioso bíblico ajudando uma pessoa que acabou de SELECIONAR este trecho enquanto lia ${book} ${chapter}:${verseRange}, dentro de um app de leitura devocional, e tocou em "Perguntar":

"${passageText}"

Contexto histórico/geográfico já conhecido desse capítulo (fonte primária):
Visão geral do livro: ${overview}
${sections || '(sem seções específicas cadastradas para este capítulo)'}

Pergunta da pessoa sobre ESSE TRECHO: "${question}"

Regra inegociável: se outcome="answer", supportCitation.quote precisa ser um versículo de verdade, citado com fidelidade — nunca invente ou aproxime uma referência. Prefira citar dentro do próprio capítulo ${chapter} quando possível; expansionCitation deve ser de FORA do capítulo atual.

Se outcome="answer": ${buildToneInstruction(tone)} O tom nunca muda o CONTEÚDO/veredito da resposta, só tamanho e nível de detalhe.

${buildReplyLangInstruction(lang)}`,
  })
  return output
}

// Contexto antes do capítulo (tela 10c do redesign Bento — ver
// ADENDO-identidade-e-IA.md) — usado por api/generate-chapter-context.js.
// Diferente de answerAboutPassage/answerTextQuestion: isto é IGUAL pra
// todos os usuários que abrem o mesmo capítulo (cacheado por
// book+chapter+lang no servidor, ver implicação técnica 6 do adendo), não
// uma pergunta de uma pessoa específica — por isso não tem `outcome`/
// citação verificável, é sempre gerado com sucesso ou a chamada falha
// inteira (ver api/generate-chapter-context.js).
const ChapterContextSchema = z.object({
  recap: z.string().describe('3 a 4 frases (no idioma pedido) resumindo onde a história está ANTES deste capítulo começar — só o que já aconteceu nos capítulos ANTERIORES que a pessoa precisa lembrar pra entender o que vai ler agora. Nunca conte nada que acontece DENTRO deste capítulo — isso é o resumo de "até aqui", não do capítulo em si.'),
  whoAppears: z.string().describe('Uma linha curta (nomes separados por vírgula) com os personagens principais que aparecem NESTE capítulo especificamente.'),
  chapterThread: z.string().describe('Uma frase bem curta (4-8 palavras, no idioma pedido) resumindo o arco/tema deste capítulo, ex: "Da prisão ao governo do Egito" — não revele o desfecho, só o tipo de movimento da história.'),
  watchFor: z.array(z.string()).length(3).describe('Exatamente 3 pontos curtos (uma frase cada, no idioma pedido) de coisas para prestar atenção DURANTE a leitura deste capítulo — detalhes, palavras ou padrões que voltam a importar mais adiante na história. Instrução de leitura, não resumo do que vai acontecer — nunca revele o final do capítulo.'),
})

// book/chapter — o capítulo que a pessoa está prestes a abrir. chapterText
// — o texto real desse capítulo (fonte primária pro "quem aparece"/"fio do
// capítulo"/"fique de olho em"). bookInfo/priorSections — a mesma fonte
// curada que a aba "Contexto" já usa (ver answerTextQuestion acima),
// filtrada só pelos capítulos ANTERIORES a este, pra ancorar o "recap" no
// que já é conhecido do livro até aqui, sem misturar com o capítulo atual.
export async function generateChapterContext({ book, chapter, chapterText, bookInfo, priorSectionsText, lang }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ChapterContextSchema }),
    prompt: `Você é um estudioso bíblico preparando uma pessoa pra ler ${book} ${chapter} num app de leitura devocional — uma tela opcional de "contexto em 30 segundos" antes do texto, não uma explicação depois.

Visão geral do livro: ${overview}

O que já é conhecido dos capítulos ANTERIORES deste livro:
${priorSectionsText || '(sem notas específicas cadastradas — use a visão geral do livro acima)'}

Texto completo do capítulo que a pessoa está prestes a ler (${book} ${chapter}):
"${chapterText}"

Gere o contexto de preparação. Regra inegociável: "recap" NUNCA pode contar nada que acontece dentro do capítulo ${chapter} em si — só o que vem antes dele. "watchFor" nunca revela o desfecho do capítulo.

${buildFieldsLangInstruction(lang, 'recap, whoAppears, chapterThread, watchFor')}`,
  })
  return output
}

// Perguntas 1 e 2 da Reflexão (37a, pacote 36-37) — usado por
// api/generate-reflection-question-pair.js. Diferente da versão antiga
// (3 perguntas, cacheadas por capítulo, iguais pra todo mundo): o quadro
// pede "Trocar perguntas" devolvendo um par NOVO a cada toque, então isto
// é POR USUÁRIO e não cacheado, ao contrário de generateChapterContext/
// generateReadingSummary — a pergunta 3 (fixa, "o que você vai fazer com
// isso amanhã") nunca
// passa por aqui, mora só no client (ReflectionScreen.jsx).
const ReflectionQuestionPairSchema = z.object({
  questions: z.array(z.string()).length(2).describe('Exatamente 2 perguntas curtas (uma frase cada, no idioma pedido), ancoradas no capítulo lido e citando um evento/detalhe específico do texto (nunca genéricas a ponto de servir pra qualquer capítulo), cada uma respondível em 1-2 frases — perguntas de diário, não um ensaio.'),
})

export async function generateReflectionQuestionPair({ book, chStart, chEnd, chapterText, bookInfo, lang, avoidQuestions }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const avoidNote = avoidQuestions?.length
    ? `\nJá foram mostradas estas perguntas — gere duas DIFERENTES delas:\n${avoidQuestions.map(q => `- ${q}`).join('\n')}\n`
    : ''
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ReflectionQuestionPairSchema }),
    prompt: `Você é um guia de reflexão devocional. Uma pessoa acabou de ler ${book} ${range} num app de leitura bíblica e vai refletir sobre o que leu.

Visão geral do livro: ${overview}

Texto que a pessoa acabou de ler:
"${chapterText}"
${avoidNote}
Gere as 2 perguntas de reflexão.

${buildFieldsLangInstruction(lang, 'questions')}`,
  })
  return output
}

// Fecho da leitura (37e, pacote 36-37) — usado por
// api/generate-reading-summary.js. Mesmo espírito de cache compartilhado
// de generateChapterContext acima: o conteúdo é igual pra quem lê o mesmo
// trecho, cacheado por book+chStart+chEnd+lang.
// Cada "momento" vem com chapter/verseStart/verseEnd EXPLÍCITOS (não uma
// faixa em texto livre) de propósito — é o que permite
// api/generate-reading-summary.js conferir contra o texto real da versão
// do usuário antes de mostrar (mesmo espírito de verifyCitation em
// api/ask-about-passage.js): se a faixa não existir de verdade no
// capítulo, a resposta inteira é descartada, nunca sai meio-verificada.
const ReadingSummarySchema = z.object({
  thesis: z.string().describe('Uma frase (no idioma pedido) resumindo a tese central do trecho lido — o que MUDA ou se resolve nele, não uma descrição genérica do conteúdo.'),
  moments: z.array(z.object({
    label: z.string().describe('Nome curto do momento (2-4 palavras, no idioma pedido), ex: "Os sonhos".'),
    chapter: z.number().int().describe('O número do capítulo (dentro da faixa lida) onde este momento acontece.'),
    verseStart: z.number().int().min(1).describe('Primeiro versículo deste momento, dentro do capítulo acima.'),
    verseEnd: z.number().int().min(1).describe('Último versículo deste momento (igual a verseStart se for um só).'),
    text: z.string().describe('Uma frase (no idioma pedido) descrevendo o que acontece nesse momento especificamente.'),
  })).length(3).describe('Exatamente 3 momentos, em ordem cronológica dentro do trecho, cobrindo do início ao fim do que foi lido (sem sobrepor faixas de versículo).'),
  threadOfStory: z.string().describe('Uma frase (no idioma pedido) ligando este trecho ao que veio ANTES e ao que vem DEPOIS na história bíblica mais ampla — o que faz a Bíblia parecer uma coisa só, não capítulos soltos. Pode citar o capítulo anterior/seguinte por nome.'),
  aboutGod: z.string().describe('Uma frase (no idioma pedido) sobre o que este trecho revela especificamente sobre o caráter/ação de Deus — ancorada no texto, não genérica.'),
  characterName: z.string().describe('O nome (no idioma pedido) do personagem humano central deste trecho — quem protagoniza a ação.'),
  aboutCharacter: z.string().describe('Uma frase (no idioma pedido) sobre o que este trecho revela sobre esse personagem — seu caráter, escolha ou transformação neste momento específico da história dele.'),
  prayer: z.string().describe('Uma oração curta (3-4 frases, no idioma pedido, segunda pessoa — falando COM Deus, não sobre o trecho), nascida do que foi lido (cite o tema/situação do trecho), preparando a pessoa pra refletir em seguida. Nunca genérica a ponto de servir pra qualquer capítulo.'),
})

export async function generateReadingSummary({ book, chStart, chEnd, chapterText, bookInfo, lang }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ReadingSummarySchema }),
    prompt: `Você é um guia devocional. Uma pessoa acabou de terminar de ler ${book} ${range} num app de leitura bíblica e vai ver um fecho antes de refletir — um resumo pra fixar o que leu, não uma nova explicação.

Visão geral do livro: ${overview}

Texto completo que a pessoa acabou de ler (capítulo(s) ${range} de ${book}):
"${chapterText}"

Gere o fecho da leitura. Regra inegociável: cada "momento" precisa apontar pra versículos DE VERDADE dentro do texto acima (chapter/verseStart/verseEnd corretos) — nunca invente uma faixa.

${buildFieldsLangInstruction(lang, 'thesis, moments, threadOfStory, aboutGod, characterName, aboutCharacter, prayer')}`,
  })
  return output
}

// Sugestões de pergunta sobre o trecho selecionado (menu "Perguntar", tela
// 10a do redesign Bento — ver ADENDO: "até três sugestões de pergunta
// geradas para aquele trecho... as sugestões mudam com o trecho"). Mesmo
// espírito de cache compartilhado de generateChapterContext: o trecho é o
// mesmo pra todo mundo, então o resultado é cacheado por
// book+chapter+verseStart+verseEnd+lang na borda (ver
// api/suggest-passage-questions.js). São só os rótulos dos chips — a
// resposta em si continua vindo de answerAboutPassage, por usuário.
const PassageSuggestionsSchema = z.object({
  questions: z.array(z.string()).length(3).describe('Exatamente 3 perguntas curtíssimas (2 a 4 palavras cada, no idioma pedido, com "?" quando for pergunta) que uma pessoa faria sobre ESTE trecho específico — ex: "O que isso significa?", "Por que sete?", "Contexto histórico". A primeira é sempre a de significado; as outras duas nascem de um detalhe concreto do trecho (um número, um nome, um lugar, um gesto). Nunca perguntas de aconselhamento pessoal nem de doutrina de denominação.'),
})

export async function suggestPassageQuestions({ book, chapter, verseRange, passageText, lang }) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: PassageSuggestionsSchema }),
    prompt: `Uma pessoa selecionou este trecho enquanto lia ${book} ${chapter}:${verseRange} num app de leitura devocional e vai ver três sugestões de pergunta prontas pra tocar (em vez de digitar):

"${passageText}"

Gere as 3 sugestões. Curtas o bastante pra caber num chip de 12px.

${buildFieldsLangInstruction(lang, 'questions')}`,
  })
  return output
}

// "Escrever com ajuda" (tela 25b) — transforma um desabafo longo num
// pedido de oração de até 240 caracteres, em primeira pessoa. Só gera o
// rascunho — a pessoa aprova (ou edita) antes de publicar; nunca
// automático, nunca salva sozinho.
const ComposePrayerRequestSchema = z.object({
  request: z.string().max(240).describe('O pedido de oração reescrito como UMA frase curta (até 240 caracteres), em primeira pessoa, no idioma pedido — preserva o assunto e o sentimento real do desabafo original, sem inventar detalhes nem adicionar uma conclusão piedosa que a pessoa não escreveu.'),
})

export async function composePrayerRequest({ text, lang }) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ComposePrayerRequestSchema }),
    prompt: `Uma pessoa escreveu um desabafo longo que quer transformar num pedido de oração curto pra compartilhar com seu grupo ou amigos:

"${text}"

Reescreva como um pedido de oração de até 240 caracteres, em primeira pessoa, mantendo o assunto e o sentimento reais do desabafo.

${buildFieldsLangInstruction(lang, 'request')}`,
  })
  return output
}

// Boletim semanal (aba Notificações + email, ver api/send-weekly-digest.js)
// — resume a semana de quem usa o app. Métricas (nível, XP, semanas na
// meta, % da Bíblia) e frases de aplicação NÃO vêm da IA — são dado real,
// montados por quem chama esta função. Só "summary"/"themes"/"encouragement" pedem
// geração: o texto livre das anotações da semana (reflexões, notas de
// leitura) não tem estrutura pra virar métrica, mas dá pra resumir e
// extrair tema. `notesText` já vem formatado (uma linha por anotação) por
// quem chama.
function buildDigestLangInstruction(lang) {
  return lang === 'en'
    ? 'Write all text fields (summary, themes, encouragement) in English.'
    : 'Escreva todos os campos de texto (summary, themes, encouragement) em português.'
}

const WeeklyDigestSchema = z.object({
  summary: z.string().describe('Um resumo caloroso e específico (2-4 frases) do que essa pessoa leu e refletiu essa semana, baseado nas anotações fornecidas — mencione livros/passagens reais quando souber. Se as anotações forem poucas ou genéricas, foque na constância (dias de oração/leitura/reflexão) em vez de inventar detalhes de conteúdo que não estão nas anotações.'),
  themes: z.array(z.string()).max(5).describe('De 1 a 5 temas espirituais recorrentes que aparecem nas anotações da semana (ex: "Confiança em meio à incerteza", "Perdão"), cada um como uma frase curta (2-5 palavras). Só inclua um tema se ele realmente aparecer em mais de uma anotação ou for central a alguma delas — não force temas genéricos pra preencher a lista. Lista vazia se não der pra identificar nenhum tema real com as anotações fornecidas.'),
  encouragement: z.string().describe('Uma frase curta de encorajamento (1-2 frases) pra motivar a pessoa na próxima semana, coerente com o que ela viveu essa semana (constância, temas, ou retomada caso a semana tenha sido fraca) — tom pastoral, caloroso, nunca genérico ou robótico.'),
})

// notesText — já formatado por quem chama (uma linha por anotação relevante
// da semana, com livro/data quando aplicável). activityLine — resumo em
// texto dos dias de oração/leitura/reflexão/estudo da semana, pra IA usar
// como contexto mesmo quando não há anotação nenhuma (só constância).
export async function generateWeeklyDigest({ lang, notesText, activityLine }) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: WeeklyDigestSchema }),
    prompt: `Você está escrevendo o boletim semanal de um app de leitura devocional da Bíblia, resumindo a semana de uma pessoa específica pra ela mesma. O tom é pastoral e pessoal, nunca corporativo ou genérico — como um mentor espiritual que acompanhou a semana dela de perto.

Constância da semana: ${activityLine}

Anotações que essa pessoa escreveu essa semana (leitura, reflexões diárias, aplicação pessoal):
${notesText || '(nenhuma anotação escrita essa semana)'}

Com base SÓ no que está acima (não invente conteúdo bíblico específico que não esteja nas anotações), escreva o resumo, os temas recorrentes e a frase de encorajamento.
${buildDigestLangInstruction(lang)}`,
  })
  return output
}

// Resumo semanal em texto (31b, Bloco 13) — diferente de generateWeeklyDigest
// acima (que resume pra um EMAIL/notificação, tom mais de boletim): este é
// o texto que a própria tela 31b mostra, mais pessoal e mais específico —
// abre pelo TEMA que se repetiu (a única "interpretação" que a IA faz, e só
// com palavras que a pessoa escreveu/marcou), fecha ligando com o que ela
// cumpriu ou não da aplicação da semana. Mesma regra dura de sempre: nunca
// inventa versículo nem interpreta a vida da pessoa além do que ela mesma
// escreveu. Só chamada quando a semana NÃO é em branco (ver isBlankWeek em
// weeklySummaryMath.js) — semana em branco não gera texto nenhum.
const WeeklySummarySchema = z.object({
  openingParagraph: z.string().describe('2-3 frases (no idioma pedido) abrindo pelo TEMA que mais se repetiu nas anotações da semana — cite o(s) livro(s)/capítulo(s) lidos e, se houver, uma frase entre aspas de uma nota real da pessoa. Nunca invente um versículo ou detalhe que não esteja no material fornecido.'),
  closingParagraph: z.string().describe('1-2 frases (no idioma pedido) ligando o tema com a aplicação pessoal da semana (se houver uma frase de aplicação fornecida) — mencione se ela foi cumprida ou não, usando as palavras da própria pessoa. Se não houver frase de aplicação nenhuma, feche com uma frase breve e concreta sobre a constância da semana (dias cumpridos), sem virar conselho genérico.'),
  nextWeekQuestion: z.string().describe('Uma pergunta curta (1 frase, no idioma pedido) pra pensar/conversar na semana que vem, nascida do TEMA desta semana (não de um versículo novo) — pessoal, concreta, sem resposta "certa". Ex: se o tema foi espera, algo como "O que muda quando a resposta chegar?"'),
})

export async function generateWeeklySummaryText({ lang, notesText, applicationLine }) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: WeeklySummarySchema }),
    prompt: `Você está escrevendo o resumo semanal de um app de leitura devocional da Bíblia, pra tela que a própria pessoa vê no domingo à noite. Tom pastoral e pessoal, olhando de perto pro que ELA viveu — nunca genérico ou motivacional vazio.

Anotações que essa pessoa escreveu essa semana (leitura, reflexões, notas):
${notesText || '(nenhuma anotação escrita essa semana)'}

Aplicação pessoal da semana (frase escrita pela própria pessoa, e se ela marcou como cumprida):
${applicationLine || '(nenhuma frase de aplicação essa semana)'}

Com base SÓ no que está acima, escreva o parágrafo de abertura (pelo tema), o parágrafo de fechamento (ligando com a aplicação) e a pergunta pra semana que vem.
${buildFieldsLangInstruction(lang, 'openingParagraph, closingParagraph e nextWeekQuestion')}`,
  })
  return output
}

// Sugestão de "pergunta da semana" pro Plano do grupo (quadro 22d) — a IA
// propõe, mas quem publica de verdade é o líder, que sempre revisa e pode
// editar antes de enviar (ver README, regra "a voz na Comunidade continua
// humana"); esta função só escreve o RASCUNHO. Uma chamada só (não duas
// como findThemePassages) — é um rascunho de 1 frase que um humano sempre
// reescreve ou aprova antes de valer, o ganho de uma segunda passada de
// revisão não compensa o custo aqui.
const WeeklyQuestionSchema = z.object({
  question: z.string().describe('Uma pergunta curta (1 frase, no idioma pedido) pra abrir a discussão de um grupo de leitura sobre este capítulo — ancorada num detalhe concreto do texto (um número, um nome, um gesto, uma tensão da narrativa), que convida reflexão pessoal, nunca testa conhecimento nem tem resposta "certa". Ex: "Paulo escreve da prisão e fala em alegria doze vezes. De onde vem a sua, quando as coisas não vão bem?"'),
})

export async function suggestWeeklyQuestion({ book, chStart, chEnd, chapterText, bookInfo, lang }) {
  const overview = bookInfo?.contextOverview ?? bookInfo?.context ?? ''
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: WeeklyQuestionSchema }),
    prompt: `Você está sugerindo a "pergunta da semana" pra sala de discussão de um grupo de leitura bíblica, sobre ${book} ${range}, dentro de um app de leitura devocional. Um líder humano vai revisar e pode editar antes de publicar — a voz final é dele, não a sua; escreva um rascunho forte o bastante pra já servir quase pronto.

Visão geral do livro: ${overview}

Texto do capítulo:
"${chapterText}"

Gere a pergunta. Uma frase só, ancorada num detalhe concreto do texto, sem resposta certa/errada.

${buildFieldsLangInstruction(lang, 'question')}`,
  })
  return output.question
}

// Busca por tema nas anotações pessoais (aba Notas — ver
// api/search-notes.js/src/notes/notesSearchStore.js) — complementa a busca
// por palavra (client-side, instantânea, sem custo) pra quando a pessoa
// lembra do ASSUNTO mas não da palavra exata que usou (ex: tema "medo"
// deve achar uma anotação sobre ansiedade, mesmo sem a palavra "medo" no
// texto). Só devolve as chaves (não gera texto novo nenhum) — o app
// já sabe renderizar cada anotação a partir da própria chave.
const NotesSearchSchema = z.object({
  matches: z.array(z.string()).describe('As "key" (entre colchetes) das anotações fornecidas que REALMENTE se relacionam com o tema buscado, da mais pra menos relevante. Vazio se nenhuma se relacionar de verdade — não force uma relação fraca só pra devolver algo.'),
})

export async function searchNotesByTheme(query, notes) {
  const list = notes.map(n => `- [${n.key}] ${n.text}`).join('\n')
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: NotesSearchSchema }),
    prompt: `Você recebe uma lista de anotações pessoais que alguém escreveu lendo a Bíblia e refletindo, num app de leitura devocional — cada uma com uma chave curta entre colchetes — e um TEMA que essa pessoa está buscando entre elas agora. Devolva só as chaves das anotações que realmente se relacionam com esse tema, mesmo que a palavra exata não apareça no texto (ex: tema "medo" deve encontrar anotações sobre ansiedade, coragem, ou confiança em meio a uma dificuldade).

Anotações:
${list}

Tema buscado: "${query}"`,
  })
  return output.matches
}
