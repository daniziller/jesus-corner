-- Jesus' Corner — histórico de avisos enviados (23c "Enviadas
-- recentemente", Bloco 14). Sem taxa de abertura (nenhuma das duas vias —
-- push ou email — tem rastreio de abertura neste app); só o que dá pra
-- saber de verdade: segmento, quantas pessoas, quais canais, quando.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.admin_broadcast_log (
  id uuid primary key default gen_random_uuid(),
  segment_label text,
  recipient_count integer not null default 0,
  channels text[] not null default '{}',
  title text,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_broadcast_log enable row level security;

create index if not exists admin_broadcast_log_created_at_idx
  on public.admin_broadcast_log (created_at desc);

-- Só o service role escreve/lê (endpoints /api/admin/*, sempre atrás de
-- requireAdmin) — sem policy nenhuma pra authenticated/anon, mesmo padrão
-- de admin_invites.
