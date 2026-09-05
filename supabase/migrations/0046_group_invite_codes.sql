-- Jesus' Corner — código de convite e pedidos de entrada de grupo
-- (redesign Bento, quadro 19c "Administração do grupo").
--
-- Hoje só existe um jeito de entrar num grupo: um moderador convida um
-- amigo específico (invite_friend_to_group), que aceita/recusa
-- (respond_to_group_invite). O quadro 19c pressupõe um segundo caminho —
-- um código curto ("BC-4271") que qualquer pessoa pode digitar pra pedir
-- entrada, com o moderador aprovando/recusando depois — que não existia.
-- Esta migração adiciona esse segundo caminho, sem tocar no primeiro:
--
--   1. reading_groups ganha invite_code (gerado sozinho, único, formato
--      "AA-1111" — 2 letras + 4 dígitos, sem I/O pra não confundir com 1/0).
--   2. reading_group_members ganha o status 'requested' — alguém que
--      digitou o código, ainda sem decisão do moderador (diferente de
--      'invited', que é o moderador chamando primeiro).
--   3. redeem_group_invite_code(code): qualquer pessoa autenticada pode
--      chamar; cria a própria linha 'requested' se o código existir e ela
--      ainda não tiver nenhuma linha nesse grupo.
--   4. respond_to_group_join_request(group, user, accept): só um
--      moderador do grupo pode chamar; aceita (vira 'joined', mesmo
--      caminho de sempre) ou recusa (apaga a linha) um pedido.
--
-- Nenhuma policy de SELECT precisa mudar: quem já é 'joined' num grupo já
-- enxerga TODAS as linhas daquele grupo, de qualquer status (ver
-- is_group_member() usada em "membros veem a propria linha e colegas de
-- grupo", 0002_friends_groups_challenges.sql) — pedidos 'requested'
-- aparecem pros moderadores sem nenhuma policy nova.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

-- ── 1. Código de convite ────────────────────────────────────────────

alter table public.reading_groups add column if not exists invite_code text;

-- Gera um código não usado ainda — laço com limite pra nunca travar (na
-- prática, com poucos milhares de grupos, a primeira tentativa quase
-- sempre já serve: 24 letras × 24 letras × 10.000 números = ~5,7 milhões
-- de combinações possíveis). security definer é necessário aqui: sem
-- isso, o "not exists" abaixo rodaria sob a policy de SELECT de
-- reading_groups (só vê grupo onde já é membro/convidado) e poderia
-- gerar um código já usado por um grupo que quem chama não enxerga.
create or replace function public.generate_group_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- sem I/O
  candidate text;
  tries int := 0;
begin
  loop
    candidate := substr(letters, 1 + floor(random() * length(letters))::int, 1)
              || substr(letters, 1 + floor(random() * length(letters))::int, 1)
              || '-' || lpad(floor(random() * 10000)::text, 4, '0');
    exit when not exists (select 1 from public.reading_groups where invite_code = candidate);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'invite_code_generation_failed';
    end if;
  end loop;
  return candidate;
end;
$$;

-- Backfill: todo grupo que já existe (criado antes desta migração) ganha
-- um código agora, na mesma passada.
update public.reading_groups set invite_code = public.generate_group_invite_code() where invite_code is null;

alter table public.reading_groups alter column invite_code set not null;
alter table public.reading_groups drop constraint if exists reading_groups_invite_code_key;
alter table public.reading_groups add constraint reading_groups_invite_code_key unique (invite_code);

-- create_reading_group() passa a gerar o código já na criação — mesmo
-- corpo de 0002_friends_groups_challenges.sql, só com a coluna a mais.
create or replace function public.create_reading_group(group_name text)
returns public.reading_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.reading_groups;
begin
  insert into public.reading_groups (name, created_by, invite_code)
  values (group_name, auth.uid(), public.generate_group_invite_code())
  returning * into new_group;

  insert into public.reading_group_members (group_id, user_id, status, role, joined_at)
  values (new_group.id, auth.uid(), 'joined', 'moderator', now());

  return new_group;
end;
$$;

-- ── 2. Status 'requested' ───────────────────────────────────────────

alter table public.reading_group_members drop constraint if exists reading_group_members_status_check;
alter table public.reading_group_members add constraint reading_group_members_status_check
  check (status in ('invited', 'joined', 'requested'));

-- ── 3. Pedir entrada por código ──────────────────────────────────────

create or replace function public.redeem_group_invite_code(code text)
returns public.reading_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.reading_groups;
begin
  select * into target from public.reading_groups where invite_code = upper(trim(code));
  if target.id is null then
    raise exception 'invalid_code';
  end if;

  if exists (
    select 1 from public.reading_group_members
    where group_id = target.id and user_id = auth.uid()
  ) then
    raise exception 'already_in_group';
  end if;

  insert into public.reading_group_members (group_id, user_id, status)
  values (target.id, auth.uid(), 'requested');

  return target;
end;
$$;

-- ── 4. Moderador aprova/recusa um pedido ────────────────────────────

create or replace function public.respond_to_group_join_request(target_group_id uuid, target_user_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode responder pedidos de entrada.';
  end if;

  if accept then
    update public.reading_group_members
    set status = 'joined', joined_at = now()
    where group_id = target_group_id and user_id = target_user_id and status = 'requested';
  else
    delete from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'requested';
  end if;
end;
$$;

-- ── 5. Nome e descrição do grupo (quadro 19c) ───────────────────────
-- reading_groups nunca teve UPDATE do client (nem policy nem RPC) — só
-- created_by/created_at eram fixos desde a criação. description é novo.

alter table public.reading_groups add column if not exists description text;

create or replace function public.update_group_info(target_group_id uuid, new_name text, new_description text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode editar o grupo.';
  end if;
  if trim(new_name) = '' then
    raise exception 'group_name_required';
  end if;

  update public.reading_groups
  set name = trim(new_name), description = nullif(trim(coalesce(new_description, '')), '')
  where id = target_group_id;
end;
$$;
