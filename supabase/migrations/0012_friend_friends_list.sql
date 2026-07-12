-- Jesus' Corner — lista de amigos de um amigo (só quando o perfil dele é
-- público), pra mostrar dentro do painel de perfil expandido na Comunidade,
-- com a contagem de amigos e um botão de adicionar amigo em comum.
--
-- Mesmo padrão de get_friend_progress_summary (0004_profile_editing.sql):
-- RPC security definer que confere amizade + is_public antes de devolver
-- qualquer coisa, em vez de afrouxar a RLS de friendships/profiles (que
-- continua "só quem é uma das duas pontas vê a linha").
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 e 0004 já
-- foram rodados antes.

create or replace function public.get_friend_friends_list(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  are_friends boolean;
  target_is_public boolean;
  friends_list jsonb;
begin
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = target_user_id)
        or (addressee_id = auth.uid() and requester_id = target_user_id)
      )
  ) into are_friends;

  if not are_friends then
    raise exception 'Vocês precisam ser amigos pra ver esse conteúdo.';
  end if;

  select is_public into target_is_public from public.profiles where user_id = target_user_id;
  if not coalesce(target_is_public, false) then
    return jsonb_build_object('isPublic', false, 'friends', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('userId', other.user_id, 'name', other.name, 'avatarUrl', other.avatar_url) order by other.name),
    '[]'::jsonb
  )
    into friends_list
    from public.friendships f
    join public.profiles other
      on other.user_id = case when f.requester_id = target_user_id then f.addressee_id else f.requester_id end
    where f.status = 'accepted' and (f.requester_id = target_user_id or f.addressee_id = target_user_id);

  return jsonb_build_object('isPublic', true, 'friends', friends_list);
end;
$$;
