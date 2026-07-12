-- Jesus' Corner — pedidos de oração dentro de um grupo, com comentários e
-- duas reações distintas: "orando por isso" (mãos unidas, no pedido) e
-- curtida (coração, nos comentários) — mesma arquitetura do mural de
-- discussão (group_comments/group_comment_likes, ver 0002), só que numa
-- estrutura de dois níveis (pedido → comentários daquele pedido), não um
-- mural plano.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 (tabelas
-- de grupo, is_group_member/is_group_moderator) já foi rodado antes.

create table if not exists public.group_prayer_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- "Orando por isso" — uma linha por pessoa que marcou que está orando por
-- aquele pedido específico. Igual a uma curtida, mas semântica própria
-- (mãos unidas, não coração) e vive no PEDIDO, não nos comentários.
create table if not exists public.group_prayer_intentions (
  prayer_request_id uuid not null references public.group_prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_request_id, user_id)
);

create table if not exists public.group_prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.group_prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.group_prayer_comment_likes (
  comment_id uuid not null references public.group_prayer_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.group_prayer_requests enable row level security;
alter table public.group_prayer_intentions enable row level security;
alter table public.group_prayer_comments enable row level security;
alter table public.group_prayer_comment_likes enable row level security;

create index if not exists group_prayer_requests_group_id_idx
  on public.group_prayer_requests (group_id, created_at desc);
create index if not exists group_prayer_comments_request_id_idx
  on public.group_prayer_comments (prayer_request_id, created_at asc);

-- group_prayer_requests: visível/postável por membro 'joined' do grupo;
-- apaga o próprio autor ou um moderador (mesma regra de group_comments).
drop policy if exists "pedidos visiveis a membros do grupo" on public.group_prayer_requests;
create policy "pedidos visiveis a membros do grupo" on public.group_prayer_requests
  for select using (public.is_group_member(group_id));

drop policy if exists "membro posta pedido de oracao" on public.group_prayer_requests;
create policy "membro posta pedido de oracao" on public.group_prayer_requests
  for insert with check (auth.uid() = user_id and public.is_group_member(group_id));

drop policy if exists "autor ou moderador apaga pedido" on public.group_prayer_requests;
create policy "autor ou moderador apaga pedido" on public.group_prayer_requests
  for delete using (auth.uid() = user_id or public.is_group_moderator(group_id));

-- group_prayer_intentions: visível pra quem é membro do grupo dono do
-- pedido; cada um só marca/desmarca a própria intenção.
drop policy if exists "intencoes visiveis pro grupo" on public.group_prayer_intentions;
create policy "intencoes visiveis pro grupo" on public.group_prayer_intentions
  for select
  using (
    exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_intentions.prayer_request_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "marcar e so meu" on public.group_prayer_intentions;
create policy "marcar e so meu" on public.group_prayer_intentions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_intentions.prayer_request_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "desmarcar e so meu" on public.group_prayer_intentions;
create policy "desmarcar e so meu" on public.group_prayer_intentions
  for delete using (auth.uid() = user_id);

-- group_prayer_comments: mesma regra de group_comments — membro do grupo
-- (via o pedido) lê/posta, autor ou moderador apaga.
drop policy if exists "comentarios visiveis pro grupo" on public.group_prayer_comments;
create policy "comentarios visiveis pro grupo" on public.group_prayer_comments
  for select
  using (
    exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_comments.prayer_request_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "membro comenta no pedido" on public.group_prayer_comments;
create policy "membro comenta no pedido" on public.group_prayer_comments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_comments.prayer_request_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "autor ou moderador apaga comentario de oracao" on public.group_prayer_comments;
create policy "autor ou moderador apaga comentario de oracao" on public.group_prayer_comments
  for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_comments.prayer_request_id
        and public.is_group_moderator(r.group_id)
    )
  );

-- group_prayer_comment_likes: mesma regra de group_comment_likes.
drop policy if exists "curtidas visiveis pro grupo" on public.group_prayer_comment_likes;
create policy "curtidas visiveis pro grupo" on public.group_prayer_comment_likes
  for select
  using (
    exists (
      select 1 from public.group_prayer_comments c
      join public.group_prayer_requests r on r.id = c.prayer_request_id
      where c.id = group_prayer_comment_likes.comment_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "curtir e so meu" on public.group_prayer_comment_likes;
create policy "curtir e so meu" on public.group_prayer_comment_likes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_prayer_comments c
      join public.group_prayer_requests r on r.id = c.prayer_request_id
      where c.id = group_prayer_comment_likes.comment_id
        and public.is_group_member(r.group_id)
    )
  );

drop policy if exists "descurtir e so meu" on public.group_prayer_comment_likes;
create policy "descurtir e so meu" on public.group_prayer_comment_likes
  for delete using (auth.uid() = user_id);
