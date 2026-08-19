-- Jesus' Corner — estudos temáticos criados por IA (aba Estudos).
--
-- Mesmo espírito de theme_plans (0030), só que gerando o conteúdo denso de
-- um Estudo (contexto histórico/geográfico/teológico + perguntas de
-- reflexão por sessão, pt/en) em vez de só uma lista de passagens pra ler —
-- ver api/generate-study.js. Aparecem junto dos estudos estáticos
-- (src/data/studies.js) na listagem da aba Estudos, com o mesmo formato de
-- item (mesmo StudyDetail/SessionView, sem visualizador próprio).
--
-- Formato: array de estudos —
-- [{ id, title, titleEn, subtitle, subtitleEn, lang, createdAt,
--    sessions: [{ id, title, titleEn, passage, passageEn,
--                  sections: [{ key, body, bodyEn }],
--                  reflectionQuestions: [...], reflectionQuestionsEn: [...] }] }]
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists ai_studies jsonb not null default '[]'::jsonb;
