-- Prova de consentimento depois da exclusão (revisão de LGPD, 2026-11-18,
-- segunda entrega). A exclusão de conta apagava também o registro dos
-- consentimentos (consents cascateia com auth.users), e aí não sobrava como
-- demonstrar que um consentimento foi dado (art. 8º §2º: o ônus da prova é
-- do controlador) se a pessoa reclamar depois.
--
-- consent_archive guarda o mínimo: o hash SHA-256 do e-mail (não o e-mail,
-- nem id, IP ou navegador), a finalidade, se foi dado ou retirado, a versão
-- da política e quando. Só dá para ligar a uma pessoa se ela mesma (ou uma
-- autoridade) trouxer o e-mail. Fica 5 anos — o prazo de prescrição de
-- reclamação de consumidor (CDC art. 27) — e é apagado pelo api/retention.js.
-- Base: art. 16, II e art. 7º, VI (exercício de direitos em processo).
--
-- Também troca erase_user_content (0082) para arquivar antes de apagar.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create table if not exists public.consent_archive (
  id bigint generated always as identity primary key,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  purpose text not null,
  granted boolean not null,
  policy_version text not null,
  consented_at timestamptz not null,
  archived_at timestamptz not null default now()
);
create index if not exists consent_archive_email_hash_idx on public.consent_archive (email_hash);
create index if not exists consent_archive_archived_at_idx on public.consent_archive (archived_at);

alter table public.consent_archive enable row level security;
-- Sem política: ninguém do app lê nem escreve; só o service role.

create or replace function public.erase_user_content(p_user_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_group record;
  v_heir uuid;
  v_groups_moved integer := 0;
  v_groups_deleted integer := 0;
begin
  if p_user_id is null then
    raise exception 'missing_user_id';
  end if;

  -- Grupos criados pela pessoa: passa adiante antes de qualquer outra coisa.
  for v_group in select id from public.reading_groups where created_by = p_user_id loop
    select user_id into v_heir from public.reading_group_members
      where group_id = v_group.id and status = 'joined' and user_id <> p_user_id
      order by (role = 'moderator') desc, joined_at nulls last, created_at
      limit 1;
    if v_heir is null then
      delete from public.reading_groups where id = v_group.id;
      v_groups_deleted := v_groups_deleted + 1;
    else
      update public.reading_group_members set role = 'moderator'
        where group_id = v_group.id and user_id = v_heir;
      update public.reading_groups set created_by = v_heir where id = v_group.id;
      v_groups_moved := v_groups_moved + 1;
    end if;
  end loop;

  -- Pedidos de oração: os privados somem; os do grupo ficam sem nome.
  delete from public.group_prayer_requests where user_id = p_user_id and scope <> 'group';
  update public.group_prayer_requests set anonymous = true where user_id = p_user_id and scope = 'group';

  -- Conversa do grupo: fica, sem nome.
  update public.group_chapter_posts set anonymous = true where user_id = p_user_id;
  update public.group_comments set anonymous = true where user_id = p_user_id;

  -- Sem coluna de anônimo: apagados (são respostas curtas, não o fio).
  delete from public.group_prayer_comments where user_id = p_user_id;
  delete from public.group_chapter_questions where author_id = p_user_id;

  -- Vínculos só da pessoa.
  delete from public.group_comment_likes where user_id = p_user_id;
  delete from public.group_post_amens where user_id = p_user_id;
  delete from public.group_prayer_intentions where user_id = p_user_id;
  delete from public.message_reads where user_id = p_user_id;
  delete from public.group_reading_plan_members where user_id = p_user_id;
  delete from public.group_challenge_members where user_id = p_user_id;
  delete from public.reading_challenge_progress where user_id = p_user_id;
  delete from public.study_uses where user_id = p_user_id;
  delete from public.study_invitees where invitee_id = p_user_id;
  delete from public.study_reports where reporter_id = p_user_id;
  delete from public.friend_activity where user_id = p_user_id;
  delete from public.friendships where requester_id = p_user_id or addressee_id = p_user_id;
  update public.reading_group_members set invited_by = null where invited_by = p_user_id;
  delete from public.reading_group_members where user_id = p_user_id;
  delete from public.access_grants where user_id = p_user_id;

  -- Estudos: os só para convidados somem; os públicos ficam sem autor.
  delete from public.studies where author_id = p_user_id and visibility <> 'public';
  update public.studies set author_id = null, system_author_name = 'Conta removida'
    where author_id = p_user_id;

  -- Denúncias: o registro fica, a cópia do texto dela não.
  update public.group_message_reports set message_snapshot = null where reported_user_id = p_user_id;

  -- Prova dos consentimentos (0084): uma cópia sem IP, navegador nem id,
  -- só com o hash do e-mail, antes de a tabela consents cascatear junto
  -- com o usuário do auth.
  if v_email <> '' then
    insert into public.consent_archive (email_hash, purpose, granted, policy_version, consented_at)
      select encode(sha256(convert_to(v_email, 'UTF8')), 'hex'), purpose, granted, policy_version, created_at
      from public.consents where user_id = p_user_id;
  end if;

  -- Notas, pedidos antigos e tudo que mora em user_data.
  delete from public.user_data where user_id = p_user_id;

  -- Achados pelo e-mail (sem vínculo de id).
  if v_email <> '' then
    delete from public.contact_messages where lower(trim(email)) = v_email;
    delete from public.admin_invites where lower(trim(email)) = v_email;
  end if;
  update public.admin_invites set claimed_by = null where claimed_by = p_user_id;

  -- O perfil vira lápide.
  update public.profiles
    set name = 'Conta removida', bio = '', avatar_url = null, username = null,
        is_public = false, deleted_at = coalesce(deleted_at, now())
    where user_id = p_user_id;

  return jsonb_build_object('groups_moved', v_groups_moved, 'groups_deleted', v_groups_deleted);
end;
$$;

revoke all on function public.erase_user_content(uuid, text) from public, anon, authenticated;
grant execute on function public.erase_user_content(uuid, text) to service_role;
