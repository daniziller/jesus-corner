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

const ThemePassagesSchema = z.object({
  overview: z.string().describe('Um parágrafo curto (2 a 4 frases, no mesmo idioma do assunto) explicando o fio condutor do plano: por que essas passagens foram escolhidas e organizadas nessa ordem, e o que a pessoa vai entender/vivenciar ao ler todas em sequência. Escrito pra quem ainda não viu a lista de passagens — dá o contexto antes de começar a ler.'),
  passages: z.array(z.object({
    book: z.string().describe('Nome do livro EXATAMENTE como aparece na lista de livros válidos fornecida no prompt — nenhuma variação de grafia.'),
    chStart: z.number().int().min(1).describe('Primeiro capítulo da passagem.'),
    chEnd: z.number().int().min(1).describe('Último capítulo da passagem (igual a chStart se for 1 capítulo só).'),
    reason: z.string().describe('Uma frase curta (no mesmo idioma do tema) explicando por que essa passagem é relevante.'),
  })).min(3).max(20),
})

function buildLangInstruction(lang) {
  return lang === 'en'
    ? 'Write the "reason" and "overview" fields in English.'
    : 'Escreva os campos "reason" e "overview" em português.'
}

// Mesma ideia, só que pro campo "reply" do chat (ver answerTextQuestion) —
// função à parte em vez de generalizar buildLangInstruction acima, que é
// específica dos campos do plano por tema.
function buildReplyLangInstruction(lang) {
  return lang === 'en'
    ? 'Write the "reply" field in English.'
    : 'Escreva o campo "reply" em português.'
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

async function generateDraftPassages(scope, canonicalBooks, lang, targetWords) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ThemePassagesSchema }),
    prompt: `Você é um estudioso bíblico ajudando a montar um plano de leitura devocional sobre um assunto específico.

Assunto: "${scope}"

Liste entre 5 e 15 passagens da Bíblia (Antigo e Novo Testamento) diretamente relevantes a esse tema. Regras:
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
async function reviewThemePassages(scope, draft, canonicalBooks, lang, targetWords) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ThemePassagesSchema }),
    prompt: `Você é um revisor teológico criterioso. Outra pessoa (ou IA) montou um rascunho de plano de leitura devocional sobre um assunto — sua tarefa é revisar esse rascunho com espírito crítico e devolver a versão FINAL, corrigida.

Assunto: "${scope}"

Rascunho da visão geral: "${draft.overview}"

Rascunho das passagens:
${formatPassageList(draft.passages)}

Revise com atenção a:
- Remova qualquer passagem cuja relação com o assunto seja fraca, forçada, ou genérica demais.
- Corrija ou remova referências que pareçam erradas (livro/capítulo que não fazem sentido).
- Se faltar alguma passagem claramente importante pro assunto, adicione.
- Elimine duplicações ou sobreposições desnecessárias entre passagens.
- Cada sessão de leitura só pode conter capítulos de UM livro só (nunca combina livros diferentes numa sessão) — se o rascunho tem muitas passagens de 1 capítulo cada, cada uma de um livro diferente, isso vira muitas sessões bem mais curtas que o ritmo pedido. Prefira trocar 2-3 dessas passagens avulsas (livros diferentes, fraca sobreposição com o tema) por 1 passagem mais longa (vários capítulos seguidos) de um dos livros mais centrais ao assunto, sempre que possível sem perder relevância.
- Garanta que a ordem final faça sentido (da passagem mais fundamental/conhecida pra mais específica).
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- ${buildSizeInstruction(targetWords)}
- Reescreva o "overview" se necessário, pra refletir com precisão a lista final revisada (não a original).
- Devolva SEMPRE a lista completa revisada (entre 5 e 15 passagens), nunca só as mudanças.
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
export async function findThemePassages(scope, canonicalBooks, lang, targetWords = 0) {
  const draft = await generateDraftPassages(scope, canonicalBooks, lang, targetWords)
  return reviewThemePassages(scope, draft, canonicalBooks, lang, targetWords)
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

// bookInfo/lang — mesmo padrão de answerTextQuestion. book/chapter/
// verseStart/verseEnd — o trecho selecionado de verdade (não a sessão
// inteira); passageText — o texto real desses versículos, na versão que a
// pessoa está lendo, dado como contexto primário pra ancorar a resposta
// (e permitir checar a citação depois, ver verifyCitation em
// api/ask-about-passage.js).
export async function answerAboutPassage({ book, chapter, verseStart, verseEnd, passageText, bookInfo, question, lang }) {
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

${buildReplyLangInstruction(lang)}`,
  })
  return output
}

// Boletim semanal (aba Notificações + email, ver api/send-weekly-digest.js)
// — resume a semana de quem usa o app. Métricas (nível, XP, streak, % da
// Bíblia) e frases de aplicação NÃO vêm da IA — são dado real, montados por
// quem chama esta função. Só "summary"/"themes"/"encouragement" pedem
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
