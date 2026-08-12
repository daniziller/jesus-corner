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

// canonicalBooks — os 66 nomes canônicos válidos (ver BIBLE_BLOCKS em
// src/data/bibleBlocks.js), pra restringir a IA a só citar livros que
// existem de verdade. Isso reduz alucinação de NOME de livro, mas não
// garante nada sobre os CAPÍTULOS citados — quem chama esta função ainda
// precisa validar chStart/chEnd contra o texto real antes de confiar
// (ver api/generate-theme-plan.js).
export async function findThemePassages(scope, canonicalBooks, lang, targetWords = 0) {
  const langInstruction = lang === 'en'
    ? 'Write the "reason" field in English.'
    : 'Escreva o campo "reason" em português.'

  // Sem isso, a IA tendia a sempre devolver passagens minúsculas (1
  // capítulo, às vezes menos) não importa o ritmo escolhido — cada uma
  // virava sua própria sessão, bem mais curta que o tempo pedido.
  const roughChapters = targetWords > 0 ? Math.max(1, Math.round(targetWords / AVG_WORDS_PER_CHAPTER)) : null
  const sizeInstruction = roughChapters != null
    ? `Cada passagem deve ter, ao todo, o equivalente a aproximadamente ${roughChapters} capítulo${roughChapters === 1 ? '' : 's'} de leitura (pode variar, não precisa ser exato) — o suficiente pra preencher uma sessão de leitura sozinha. Só devolva uma passagem bem mais curta que isso se não houver mais conteúdo relevante ao assunto naquele trecho da Bíblia.`
    : `Não há meta de tamanho por passagem — cada trecho relevante, mesmo curto, serve.`

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ThemePassagesSchema }),
    prompt: `Você é um estudioso bíblico ajudando a montar um plano de leitura devocional sobre um assunto específico.

Assunto: "${scope}"

Liste entre 5 e 15 passagens da Bíblia (Antigo e Novo Testamento) diretamente relevantes a esse tema. Regras:
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- ${sizeInstruction}
- Prefira passagens coerentes (nunca um livro inteiro) — cada uma precisa fazer sentido lida sozinha, sem depender do resto do livro.
- Não repita o mesmo livro/capítulo em duas passagens diferentes.
- Só inclua passagens que você tem certeza que existem de verdade e que realmente tratam do tema — não force uma relação fraca só pra preencher a lista.
- Ordene da passagem mais fundamental/conhecida pra mais específica.
- Escreva também um "overview": um parágrafo curto explicando o fio condutor do plano como um todo (não repita as razões individuais de cada passagem, dê a visão geral).
${langInstruction}`,
  })
  return output
}
