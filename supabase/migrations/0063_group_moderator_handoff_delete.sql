-- Jesus' Corner — "Sair do grupo" quando quem sai é a ÚNICA moderadora
-- (pedido dela, 2026-09-09, em cima de 0062_leave_group_anonymize.sql):
-- em vez de simplesmente sair e deixar o grupo sem moderador nenhum,
-- oferece escolher outra pessoa do grupo pra virar moderadora, ou apagar
-- o grupo de vez.
--
-- Nota: nada no schema impede vários moderadores ao mesmo tempo
-- (set_group_member_role, 0002, deixa qualquer moderador promover
-- qualquer outro membro) — então "é a única moderadora" só é um
-- problema de verdade quando NINGUÉM MAIS no grupo tem role='moderator'.
-- Isso é decidido no client (GroupsScreen.jsx) antes de chamar qualquer
-- uma destas duas RPCs; elas mesmas não tentam adivinhar a intenção,
-- só validam o que recebem.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

-- Promove `new_moderator_id` a moderador e SÓ DEPOIS sai — tudo numa
-- transação (security definer), pra nunca existir um instante em que o
-- grupo ficou sem moderador nenhum. Mesma anonimização de mensagens que
-- leave_group_and_anonymize (0062) já fazia.
create or replace function public.leave_group_with_new_moderator(target_group_id uuid, new_moderator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not_a_member';
  end if;

  if new_moderator_id = auth.uid() then
    raise exception 'new_moderator_must_be_someone_else';
  end if;

  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = new_moderator_id and status = 'joined'
  ) then
    raise exception 'new_moderator_not_a_member';
  end if;

  update public.reading_group_members
    set role = 'moderator'
    where group_id = target_group_id and user_id = new_moderator_id;

  update public.group_chapter_posts
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid();

  update public.group_comments
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid();

  update public.group_prayer_requests
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid() and scope = 'group';

  delete from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_group_with_new_moderator(uuid, uuid) to authenticated;

-- Apaga o grupo de vez — só quem é moderador(a) pode chamar. Todo o
-- resto (reading_group_members, group_comments + group_comment_likes,
-- group_chapter_posts, group_prayer_requests, reading_challenges +
-- reading_challenge_progress, message_reads, códigos de convite...) já
-- referencia reading_groups(id) com `on delete cascade` desde as
-- migrations originais de cada tabela — um DELETE só na linha do grupo
-- basta, o Postgres cuida do resto.
create or replace function public.delete_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid()
      and role = 'moderator' and status = 'joined'
  ) then
    raise exception 'not_a_moderator';
  end if;

  delete from public.reading_groups where id = target_group_id;
end;
$$;

grant execute on function public.delete_group(uuid) to authenticated;
