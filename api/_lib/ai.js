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
