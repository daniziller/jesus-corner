-- Jesus' Corner — planos de leitura por tema (IA).
--
-- A pessoa digita um tema (ex: "perdão"), escolhe minutos por sessão, e o
-- app usa IA (ver api/generate-theme-plan.js) pra achar as passagens
-- relevantes na Bíblia inteira e dividir em sessões desse tamanho — mesmo
-- formato de sessão já usado em SESSIONS_BY_PLAN (src/data/bibleBlocks.js),
-- só que fora do modelo de 8 blocos canônicos (ver ThemePlanScreen.jsx).
--
-- Formato de theme_plans: um array de planos —
-- [{ id, theme, themeEn, minutesPerSession, lang, createdAt,
--    sessions: [{ id, book, bookEn, chStart, chEnd, title, titleEn,
--                  passage, passageEn, status }] }]
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists theme_plans jsonb not null default '[]'::jsonb;
