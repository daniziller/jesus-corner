-- Jesus' Corner — resumo semanal por IA (31a/31b/31c, Bloco 13).
--
-- Guardado em user_data (mesmo padrão de monthly_snapshots/weekly_digests,
-- migrations 0041/0045) — array de resumos já computados, mais recente
-- primeiro, capado (ver KEEP_LAST_SUMMARIES em send-weekly-digest.js).
-- Só o cron escreve aqui (service role, RLS de user_data já cobre o
-- resto da tabela); o cliente só lê, pro seletor "Semanas ▾" de 31a.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists weekly_summaries jsonb not null default '[]'::jsonb;
