-- Jesus' Corner — quais passos entram na rotina diária da pessoa, agora
-- independente de qual plano de leitura está ativo.
--
-- Até aqui, quais dos 3 passos (Oração/Leitura/Reflexão) apareciam na aba
-- Rotina vinha fixo do plano de leitura ativo (todo PLANS[i].modules
-- sempre foi ["reading","prayer","reflection"] — nunca variou de verdade).
-- Agora a pessoa liga/desliga cada passo livremente (ver "Meu Plano"),
-- incluindo um 4º passo novo: "study" (Estudo guiado).
--
-- Formato: array de strings, ex: ["prayer","reading","reflection"] ou
-- ["prayer","reading","study","reflection"]. Default preserva o
-- comportamento de quem já usa o app hoje (3 passos de sempre ligados,
-- "study" desligado até a pessoa ligar).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists routine_modules jsonb not null default '["prayer","reading","reflection"]'::jsonb;
