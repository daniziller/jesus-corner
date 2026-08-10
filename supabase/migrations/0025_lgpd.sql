-- LGPD: exclusão de conta, registro de consentimento e retenção.
--
-- Contexto: num app de leitura bíblica, a simples existência da conta revela
-- convicção religiosa, que o art. 5º, II da LGPD classifica como dado pessoal
-- sensível. Isso exige consentimento específico e destacado (art. 11, I) e
-- torna obrigatório o direito de eliminação (art. 18, VI), que hoje não
-- existe em lugar nenhum do app.


-- ── 1. profiles vira lápide -------------------------------------------------
--
-- Hoje profiles.user_id referencia auth.users(id) ON DELETE CASCADE, e
-- reading_groups.created_by referencia profiles(user_id) também em cascade.
-- Encadeando os dois: apagar um usuário apaga os GRUPOS que ele criou, e com
-- eles os membros, comentários e pedidos de oração de TODA MAIS GENTE. Um
-- titular exercendo o direito dele destruiria dado de terceiros.
--
-- Solução: soltar profiles de auth.users. Ao excluir a conta, o registro em
-- auth.users (que guarda o email) é apagado de verdade, e a linha de profiles
-- sobrevive já anonimizada — sem nome, bio nem foto. Ela deixa de ser dado
-- pessoal e passa a existir só para manter a integridade das conversas em
-- grupo, que pertencem aos outros participantes.
alter table public.profiles drop constraint if exists profiles_user_id_fkey;

alter table public.profiles add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Quando preenchido, a conta foi excluída pelo titular e esta linha é apenas '
  'uma lápide anonimizada. Nunca deve conter dado pessoal.';

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at) where deleted_at is not null;


-- ── 2. Registro de consentimento --------------------------------------------
--
-- O art. 6º, X exige poder DEMONSTRAR conformidade. Consentimento sem registro
-- de quando, em que versão do texto e a partir de onde não é demonstrável.
--
-- Uma linha por finalidade, e não um booleano só: o art. 8º, §4º anula o
-- consentimento dado para finalidades genéricas.
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in (
    'terms',            -- termos de uso e política de privacidade
    'sensitive_data',   -- tratamento de dados que revelam convicção religiosa
    'marketing_email',  -- comunicações que não são transacionais
    'public_profile'    -- perfil e atividade visíveis a outros usuários
  )),
  granted boolean not null,
  policy_version text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.consents is
  'Histórico imutável de consentimento — uma linha por evento, nunca UPDATE. '
  'Revogar grava uma linha nova com granted=false.';

create index if not exists consents_user_purpose_idx
  on public.consents (user_id, purpose, created_at desc);

alter table public.consents enable row level security;

-- O titular lê o próprio histórico (art. 18, II). Escrita só pelo service
-- role: se o cliente pudesse inserir, o registro não provaria nada.
drop policy if exists "users read own consents" on public.consents;
create policy "users read own consents" on public.consents
  for select using (auth.uid() = user_id);


-- ── 3. Avatares deixam de ser públicos --------------------------------------
--
-- profileStore.js usava getPublicUrl: a foto ficava acessível a qualquer um
-- com o link, para sempre, sem autenticação e independente de is_public ou de
-- amizade. Num app onde ter conta já revela convicção religiosa, uma foto
-- aberta é exposição desnecessária.
--
-- Passa a valer a MESMA regra de visibilidade da tabela profiles: o dono, os
-- amigos aceitos e os colegas de grupo. O cliente gera URL assinada com
-- validade curta (ver resolveAvatarUrl em src/profile/profileStore.js).
update storage.buckets set public = false where id = 'avatars';

-- Extraída da policy "profiles visiveis" (migration 0002) para poder ser
-- reaproveitada aqui sem duplicar a regra. security definer porque
-- storage.objects é avaliada em outro contexto.
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = target)
          or (f.addressee_id = auth.uid() and f.requester_id = target))
    )
    or exists (
      select 1 from public.reading_group_members m
      where m.user_id = target and m.status = 'joined'
        and public.is_group_member(m.group_id)
    );
$$;

-- O caminho do arquivo é '<user_id>/avatar.<ext>', então a primeira pasta
-- identifica o dono.
drop policy if exists "avatares visiveis pra quem ve o perfil" on storage.objects;
create policy "avatares visiveis pra quem ve o perfil" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.can_view_profile(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "dono gerencia o proprio avatar" on storage.objects;
create policy "dono gerencia o proprio avatar" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 4. Índices para o descarte automático -----------------------------------
--
-- O art. 15 manda eliminar quando a finalidade se esgota. O cron diário em
-- api/retention.js varre estas tabelas por created_at.
create index if not exists onboarding_events_created_at_idx
  on public.onboarding_events (created_at);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at);

create index if not exists friend_activity_created_at_idx
  on public.friend_activity (created_at);
