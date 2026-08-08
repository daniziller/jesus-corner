-- Jesus' Corner — infraestrutura pro painel admin: contagens agregadas de
-- auth.users (schema não exposto via REST, nem pro service role — só dá pra
-- ler via função, mesmo padrão de find_user_by_email() em
-- 0002_friends_groups_challenges.sql) e rastreio de resposta do "Fale
-- Conosco". Revogado de anon/authenticated de propósito — só o service role
-- (api/admin/*.js, nunca exposto ao client) pode chamar; a checagem real de
-- "é admin?" continua sendo o allowlist ADMIN_EMAILS no servidor, isso aqui
-- é defesa em profundidade.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create or replace function public.admin_total_users()
returns bigint
language sql security definer stable set search_path = public
as $$ select count(*) from auth.users; $$;

create or replace function public.admin_new_users_by_day(days_back integer default 30)
returns table(day date, count bigint)
language sql security definer stable set search_path = public
as $$
  select date_trunc('day', created_at)::date as day, count(*)
  from auth.users
  where created_at >= now() - (days_back || ' days')::interval
  group by 1 order by 1;
$$;

revoke execute on function public.admin_total_users() from public, anon, authenticated;
revoke execute on function public.admin_new_users_by_day(integer) from public, anon, authenticated;
grant execute on function public.admin_total_users() to service_role;
grant execute on function public.admin_new_users_by_day(integer) to service_role;

alter table public.contact_messages
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null,
  add column if not exists admin_reply text;

create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
