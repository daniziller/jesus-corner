-- Jesus' Corner — plano ativo "alternativo" (por tema ou cronológico).
--
-- Até aqui, o plano ativo (o que Home/Rotina mostram como "sessão de hoje")
-- era sempre um dos 4 planos fixos (Leve/Padrão/Intensivo/Livre, coluna
-- plan_id). Agora a pessoa também pode deixar em destaque um plano por
-- tema salvo (theme_plans) ou o plano cronológico — sem precisar trocar o
-- plan_id de fundo, que continua controlando a aba Bíblia/Progresso.
--
-- null (padrão) = plano ativo é o fixo de sempre (plan_id). Só passa a ter
-- valor quando a pessoa escolhe um plano por tema ou o cronológico:
--   { type: 'theme', planId }
--   { type: 'chrono', paceId }
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists active_alt_plan jsonb;
