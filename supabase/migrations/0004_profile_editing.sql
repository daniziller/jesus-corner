-- Jesus' Corner — perfil editável (nome, data de nascimento, foto, mensagem)
-- e compartilhamento opcional de progresso/estudos/grupos com amigos.
--
-- Nome e data de nascimento continuam no user_metadata do Supabase Auth
-- (editáveis via supabase.auth.updateUser, que já atualiza a sessão local na
-- hora — ver src/profile/profileStore.js). profiles.name já era um espelho
-- write-once desse metadata (só no cadastro); como agora o nome pode mudar
-- depois, adicionamos um trigger de UPDATE em auth.users pra manter esse
-- espelho em dia sempre que o nome mudar — sem isso profiles.name ficaria
-- desatualizado pros amigos depois da primeira edição.
--
-- bio, avatar_url e is_public são novos e moram direto em profiles (não em
-- user_metadata) porque já nascem como dado pensado pra ser visível a
-- outros usuários — não tem "versão privada" desses campos.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 e 0003 já
-- foram rodados antes.


-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNAS NOVAS EM profiles
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_public boolean not null default false;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (char_length(bio) <= 280);


-- ═══════════════════════════════════════════════════════════════
-- 2. RLS: dono pode editar a própria linha
-- ═══════════════════════════════════════════════════════════════
-- A policy de SELECT (amigos/colegas de grupo veem) já existe desde 0002 e
-- não muda — como RLS é por linha, não por coluna, ela automaticamente
-- também libera a leitura de bio/avatar_url/is_public pra quem já podia ver
-- o nome. É exatamente o que queremos: "amigos veem o perfil".

drop policy if exists "dono edita o proprio perfil" on public.profiles;
create policy "dono edita o proprio perfil" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- 3. Sincroniza profiles.name quando o nome mudar no user_metadata
-- ═══════════════════════════════════════════════════════════════

create or replace function public.sync_profile_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'name' is distinct from old.raw_user_meta_data->>'name' then
    update public.profiles set name = coalesce(new.raw_user_meta_data->>'name', '') where user_id = new.id;
  end if;
  return new;
end;
$$;

-- "when" evita disparar a função em updates não relacionados (ex: login
-- atualiza last_sign_in_at o tempo todo) — só roda quando o nome muda mesmo.
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.raw_user_meta_data->>'name' is distinct from new.raw_user_meta_data->>'name')
  execute function public.sync_profile_name();


-- ═══════════════════════════════════════════════════════════════
-- 4. handle_new_user: já grava is_public escolhido no cadastro
-- ═══════════════════════════════════════════════════════════════
-- Reescreve a função de 0002 (mesmo nome/trigger, só adiciona is_public) —
-- a pessoa decide no cadastro (ver AuthScreen.jsx) se quer o perfil público
-- desde o início; pode mudar depois em Perfil.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_data (user_id) values (new.id);
  insert into public.profiles (user_id, name, is_public)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', ''),
      coalesce((new.raw_user_meta_data->>'is_public')::boolean, false)
    );
  return new;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 5. Storage: bucket de avatares (público, com limite de tamanho/tipo)
-- ═══════════════════════════════════════════════════════════════
-- Bucket público: a URL da foto funciona pra qualquer um com o link direto
-- (o link inclui o user_id, não é adivinhável) — mesma decisão de produto
-- já usada pros ícones do próprio app. Upload restrito à própria pasta
-- (avatars/<user_id>/...) via as policies de storage.objects abaixo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatares publicamente legiveis" on storage.objects;
create policy "avatares publicamente legiveis" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "usuario envia proprio avatar" on storage.objects;
create policy "usuario envia proprio avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "usuario atualiza proprio avatar" on storage.objects;
create policy "usuario atualiza proprio avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "usuario apaga proprio avatar" on storage.objects;
create policy "usuario apaga proprio avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════
-- 6. RPC: resumo de progresso de um amigo (só se is_public = true)
-- ═══════════════════════════════════════════════════════════════
-- profiles (nome/bio/foto) já é visível direto via SELECT normal (seção 2).
-- Progresso/estudos/grupos moram em tabelas com RLS "só o dono" (user_data)
-- ou "só colegas daquele grupo" (reading_group_members) — em vez de afrouxar
-- essas policies pra qualquer amigo (mudaria o significado delas em outros
-- lugares do app), uma RPC security definer própria confere amizade +
-- is_public e só então devolve um resumo computado, sem expor as tabelas
-- inteiras.
create or replace function public.get_friend_progress_summary(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  are_friends boolean;
  target_is_public boolean;
  target_plan text;
  target_completed text[];
  target_studies text[];
  target_groups jsonb;
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
    return jsonb_build_object('isPublic', false);
  end if;

  select plan_id, completed_keys, studies_completed
    into target_plan, target_completed, target_studies
    from public.user_data
    where user_id = target_user_id;

  select coalesce(jsonb_agg(jsonb_build_object('groupId', g.id, 'name', g.name)), '[]'::jsonb)
    into target_groups
    from public.reading_group_members m
    join public.reading_groups g on g.id = m.group_id
    where m.user_id = target_user_id and m.status = 'joined';

  return jsonb_build_object(
    'isPublic', true,
    'planId', coalesce(target_plan, 'standard'),
    'completedKeys', coalesce(target_completed, '{}'),
    'studiesCompletedCount', coalesce(array_length(target_studies, 1), 0),
    'groups', target_groups
  );
end;
$$;
