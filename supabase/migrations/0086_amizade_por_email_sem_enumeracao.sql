-- Pedido de amizade por e-mail sem revelar quem tem conta (revisão de LGPD,
-- 2026-11-18, segunda entrega — art. 6º VII e art. 46).
--
-- Antes: o app chamava find_user_by_email, que devolvia id e nome de
-- qualquer e-mail cadastrado, sem limite. Num app bíblico, saber que um
-- e-mail tem conta já revela convicção religiosa (dado sensível) — e dava
-- pra testar uma lista inteira de e-mails.
--
-- Agora: o app chama api/invite-friend.js, que chama esta função com o
-- service role. Ela procura o e-mail e, se achar, já grava o pedido de
-- amizade; se não achar, o endpoint manda o convite por e-mail. Para quem
-- pediu a resposta é a mesma nos dois casos ("pedido enviado") — não dá
-- pra saber se a pessoa tem conta. E há um teto de 20 tentativas por dia
-- por pessoa (friend_email_requests, guardada só 2 dias — api/retention.js).
--
-- find_user_by_email deixa de valer para o app (só o service role).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create table if not exists public.friend_email_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists friend_email_requests_user_created_idx on public.friend_email_requests (user_id, created_at);
alter table public.friend_email_requests enable row level security;
-- Sem política: só o service role.

create or replace function public.request_friend_by_email(p_caller uuid, p_email text, p_max integer default 20)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  if p_caller is null or coalesce(trim(p_email), '') = '' then
    return 'invalid';
  end if;
  if (select count(*) from public.friend_email_requests
        where user_id = p_caller and created_at > now() - interval '1 day') >= p_max then
    return 'rate_limited';
  end if;
  insert into public.friend_email_requests (user_id) values (p_caller);

  select u.id into v_target
    from auth.users u
    join public.profiles p on p.user_id = u.id
    where lower(u.email) = lower(trim(p_email)) and p.deleted_at is null
    limit 1;

  if v_target is null then
    return 'not_found';
  end if;
  if v_target = p_caller then
    return 'self';
  end if;
  -- Já são amigos, ou já há pedido em qualquer direção: nada a fazer.
  if exists (select 1 from public.friendships
               where (requester_id = p_caller and addressee_id = v_target)
                  or (requester_id = v_target and addressee_id = p_caller)) then
    return 'exists';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (p_caller, v_target);
  return 'sent';
end;
$$;

revoke all on function public.request_friend_by_email(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.request_friend_by_email(uuid, text, integer) to service_role;

revoke all on function public.find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_by_email(text) to service_role;
