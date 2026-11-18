-- Exclusão de conta completa (LGPD art. 18, VI e art. 16) — revisão de
-- LGPD de 2026-11-18. A exclusão antiga (api/delete-account.js) deixava
-- para trás, ligado ao perfil anonimizado:
--   - os pedidos de oração PRIVADOS ("só eu" e "amigos"), que ficam em
--     group_prayer_requests — a tabela aponta pra profiles, e profiles não
--     é apagado (0025), então nada cascateava;
--   - o username (gerado do nome real, resolvível no link público /d/);
--   - comentários, posts e perguntas em grupo, com o nome ainda ligado;
--   - curtidas, améns, leituras de mensagem, participação em planos,
--     desafios e estudos.
--
-- erase_user_content faz tudo isso numa transação só. Roda antes de apagar
-- o usuário do auth (que leva e-mail, senha e o que cascateia de
-- auth.users). Chamada por api/_lib/eraseAccount.js — tanto pela exclusão
-- no app quanto pela exclusão que a equipe faz a pedido, por e-mail.
--
-- Regra do que acontece com cada coisa:
--   APAGADO   — o que é só da pessoa: pedidos privados, curtidas, améns,
--               leituras, participações, convites e usos de estudo,
--               denúncias que ela fez de estudo, comentários em pedidos de
--               oração, perguntas da sala do capítulo, estudos só para
--               convidados, amizades, atividade, notas (user_data),
--               mensagens de contato e convites mandados pro e-mail dela.
--   ANÔNIMO   — o que faz parte da conversa dos outros: pedidos feitos no
--               grupo, posts da sala do capítulo e recados do grupo passam
--               a aparecer sem nome (anonymous = true, o mesmo de quem sai
--               do grupo — 0062). Estudos públicos ficam sem autor.
--   PERFIL    — vira "Conta removida": sem nome, bio, foto, username;
--               privado. A linha fica porque grupos, planos e desafios
--               criados pela pessoa apontam pra ela.
--   GRUPOS    — os que ela criou passam para outro moderador; sem
--               moderador, para o membro mais antigo (que vira moderador);
--               sem mais ninguém, o grupo é apagado.
--   DENÚNCIAS — o texto copiado de uma mensagem dela numa denúncia
--               (message_snapshot) é apagado; a denúncia em si fica, como
--               registro da moderação.
--
-- Só o service role executa. Como rodar: cole este arquivo inteiro no SQL
-- Editor do Supabase e rode. Idempotente.

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
