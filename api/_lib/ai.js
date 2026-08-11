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

const ThemePassagesSchema = z.object({
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
export async function findThemePassages(theme, canonicalBooks, lang) {
  const langInstruction = lang === 'en'
    ? 'Write the "reason" field in English.'
    : 'Escreva o campo "reason" em português.'

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ThemePassagesSchema }),
    prompt: `Você é um estudioso bíblico ajudando a montar um plano de leitura devocional sobre um tema específico.

Tema: "${theme}"

Liste entre 5 e 15 passagens da Bíblia (Antigo e Novo Testamento) diretamente relevantes a esse tema. Regras:
- Use SOMENTE nomes de livro desta lista, exatamente como escritos: ${canonicalBooks.join(', ')}.
- Prefira passagens curtas e coerentes (poucos capítulos cada, nunca um livro inteiro) — cada uma precisa fazer sentido lida sozinha, sem depender do resto do livro.
- Não repita o mesmo livro/capítulo em duas passagens diferentes.
- Só inclua passagens que você tem certeza que existem de verdade e que realmente tratam do tema — não force uma relação fraca só pra preencher a lista.
- Ordene da passagem mais fundamental/conhecida pra mais específica.
${langInstruction}`,
  })
  return output.passages
}
