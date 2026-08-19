-- Jesus' Corner — "Estudo guiado" ativo no momento (novo 4º passo da
-- rotina, ver 0036_routine_modules).
--
-- Aponta pra QUAL estudo a pessoa está fazendo dia após dia — um item de
-- STUDIES (estático, src/data/studies.js) ou de ai_studies (0038, criados
-- por IA). A "sessão de hoje" desse estudo é derivada na hora (primeira
-- sessão ainda não concluída em studies_completed, ver
-- src/studies/studiesProgressStore.js) — não precisa guardar um ponteiro
-- de sessão aqui, só qual estudo está em destaque.
--
-- null (padrão) = nenhum estudo escolhido ainda.
-- Formato: { "studyId": "pentateuco" }
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists active_study jsonb;
