-- Jesus' Corner — amigos, grupos de leitura e desafios em competição.
--
-- Diferente de 0001_user_data.sql (onde cada usuário só vê a própria
-- linha), essa migração introduz a primeira vez que dados de um usuário
-- precisam ficar visíveis pra OUTRO usuário — nome de amigos, membros de
-- grupo, placar de desafio, comentários do mural. Por isso a estrutura
-- aqui é: 1) todas as tabelas primeiro (várias policies abaixo referenciam
-- mais de uma tabela, então todas precisam existir antes de qualquer
-- policy ser criada), 2) funções auxiliares de RLS (is_group_member/
-- is_group_moderator — precisam existir ANTES das policies que as usam),
-- 3) RLS + policies, 4) funções (RPCs e triggers), 5) triggers,
-- 6) backfill.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do seu projeto
-- Supabase (dashboard.supabase.com → seu projeto → SQL Editor → New query)
-- e clique em "Run". Seguro rodar mais de uma vez (idempotente). Pressupõe
-- que 0001_user_data.sql já foi rodado antes.


-- ═══════════════════════════════════════════════════════════════
-- 1. TABELAS
-- ═══════════════════════════════════════════════════════════════

-- Nome de cada usuário, legível por amigos e colegas de grupo — hoje o
-- nome só existe no user_metadata do Supabase Auth, que só o próprio
-- dono consegue ler. Sem editor de nome por enquanto: é gravado uma vez
-- no cadastro (ver handle_new_user() mais abaixo) e não muda depois.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null
);

-- Amizades: uma linha por par pedido/aceite. 'pending' até o destinatário
-- aceitar; não existe estado "recusado" — recusar/cancelar simplesmente
-- apaga a linha (ver policy de DELETE abaixo). Referencia profiles(user_id)
-- em vez de auth.users(id) diretamente — profiles sempre tem exatamente
-- uma linha por usuário (criada no mesmo trigger que cria a conta), então
-- o cascade de delete continua funcionando igual, mas isso também é o que
-- permite o PostgREST fazer join automático pra trazer o nome de quem
-- pediu/recebeu amizade numa query só (`select('*, requester:profiles(name)')`).
-- O mesmo raciocínio se repete em toda FK "de quem é isso" daqui pra baixo.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Grupos de leitura.
create table if not exists public.reading_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Membros de um grupo. 'invited' até aceitar (vira 'joined'). role
-- 'moderator' pode apagar comentários de qualquer membro e promover
-- outros membros a moderador — quem cria o grupo já nasce moderador (ver
-- create_reading_group() abaixo). Não existe INSERT direto do client
-- nessa tabela: toda entrada de membro passa por uma das RPCs abaixo
-- (create_reading_group / invite_friend_to_group), nunca um insert solto.
create table if not exists public.reading_group_members (
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  role text not null default 'member' check (role in ('member', 'moderator')),
  invited_by uuid references public.profiles(user_id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Desafios de leitura dentro de um grupo (ex: "ler Marcos em 1 semana").
-- books guarda os nomes exatos usados em completed_keys (ver
-- src/data/bibleBlocks.js), pra poder comparar diretamente com as chaves
-- de progresso.
create table if not exists public.reading_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  books text[] not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Progresso de CADA participante DENTRO de um desafio específico —
-- isolado do progresso pessoal geral (user_data.completed_keys). Só é
-- gravado capítulo que vira concluído DEPOIS que a linha existe (ver
-- src/App.jsx, newlyDoneKeys), então "só conta o que foi lido depois de
-- entrar" sai de graça, sem comparar timestamps.
create table if not exists public.reading_challenge_progress (
  challenge_id uuid not null references public.reading_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  completed_keys text[] not null default '{}',
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- Mural de discussão do grupo (tipo fórum) — sem edição nesta primeira
-- versão, só postar/curtir/apagar.
create table if not exists public.group_comments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.group_comment_likes (
  comment_id uuid not null references public.group_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);


-- ═══════════════════════════════════════════════════════════════
-- 2. FUNÇÕES AUXILIARES DE RLS
-- ═══════════════════════════════════════════════════════════════

-- "Sou membro 'joined' desse grupo?" — existe como função (security
-- definer, então ignora RLS na sua própria consulta interna) em vez de um
-- subquery direto nas policies porque reading_group_members precisa
-- checar ISSO MESMO PRA SI MESMA (pra decidir se você vê a linha de outro
-- membro): um subquery direto ali causa "infinite recursion detected in
-- policy for relation reading_group_members", já que a subquery re-aciona
-- a política da própria tabela indefinidamente. A função quebra esse
-- ciclo. As demais tabelas (que só consultam reading_group_members de
-- FORA, nunca dela mesma) não teriam esse problema, mas usam a mesma
-- função por consistência.
create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'joined'
  );
$$;

-- "Sou moderador desse grupo?" — mesmo raciocínio.
create or replace function public.is_group_moderator(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id
      and role = 'moderator' and status = 'joined'
  );
$$;

-- "Tenho QUALQUER linha (convidado OU já dentro) desse grupo?" — usada só
-- pela policy de SELECT de reading_groups. Sem isso, alguém com um convite
-- pendente ('invited', ainda não aceitou) nunca conseguiria ver nem o
-- NOME do grupo pra decidir se quer entrar — só quem já é 'joined'
-- passaria em is_group_member(). As demais tabelas (membros, desafios,
-- placar, comentários) continuam exigindo 'joined' de verdade.
create or replace function public.is_group_member_or_invited(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id
  );
$$;


-- ═══════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.reading_groups enable row level security;
alter table public.reading_group_members enable row level security;
alter table public.reading_challenges enable row level security;
alter table public.reading_challenge_progress enable row level security;
alter table public.group_comments enable row level security;
alter table public.group_comment_likes enable row level security;

-- profiles: visível pro próprio dono, amigos aceitos, e colegas de algum
-- grupo em comum. Sem INSERT/UPDATE/DELETE direto do client — só o
-- trigger handle_new_user() escreve aqui.
drop policy if exists "profiles visiveis" on public.profiles;
create policy "profiles visiveis" on public.profiles
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = profiles.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = profiles.user_id))
    )
    or exists (
      select 1 from public.reading_group_members m2
      where m2.user_id = profiles.user_id and m2.status = 'joined'
        and public.is_group_member(m2.group_id)
    )
  );

-- friendships: os dois lados de uma amizade (pedida ou aceita) veem e
-- podem apagar (cancelar pedido, desfazer amizade, ou recusar — recusar é
-- só apagar a linha 'pending'). Só quem pediu pode criar; só quem recebeu
-- pode aceitar, e só de 'pending' pra 'accepted'.
drop policy if exists "friendships visiveis pros dois lados" on public.friendships;
create policy "friendships visiveis pros dois lados" on public.friendships
  for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "so posso pedir amizade em meu nome" on public.friendships;
create policy "so posso pedir amizade em meu nome" on public.friendships
  for insert
  with check (auth.uid() = requester_id);

drop policy if exists "so o destinatario aceita" on public.friendships;
create policy "so o destinatario aceita" on public.friendships
  for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status = 'accepted');

drop policy if exists "qualquer lado desfaz" on public.friendships;
create policy "qualquer lado desfaz" on public.friendships
  for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- reading_group_members: cada um sempre vê a própria linha (pra saber que
-- foi convidado); também vê as linhas de quem já é 'joined' num grupo do
-- qual ele mesmo também é 'joined'. Sair do grupo ou recusar/cancelar um
-- convite = apagar a própria linha.
drop policy if exists "membros veem a propria linha e colegas de grupo" on public.reading_group_members;
create policy "membros veem a propria linha e colegas de grupo" on public.reading_group_members
  for select
  using (
    auth.uid() = user_id
    or public.is_group_member(group_id)
  );

drop policy if exists "sair do grupo ou recusar convite" on public.reading_group_members;
create policy "sair do grupo ou recusar convite" on public.reading_group_members
  for delete
  using (auth.uid() = user_id);

-- reading_groups: visível pra quem tem QUALQUER linha em
-- reading_group_members pra esse grupo — inclusive 'invited' (ainda não
-- aceitou), senão a pessoa nunca veria o nome do grupo pra decidir se
-- aceita o convite (ver is_group_member_or_invited acima). Sem INSERT
-- direto — só via create_reading_group() (RPC abaixo), que cria o grupo e
-- a primeira linha de membro (moderador) na mesma transação.
drop policy if exists "grupos visiveis pra membros" on public.reading_groups;
create policy "grupos visiveis pra membros" on public.reading_groups
  for select
  using (public.is_group_member_or_invited(id));

-- reading_challenges: qualquer membro 'joined' do grupo vê e pode propor
-- um novo desafio.
drop policy if exists "desafios visiveis pra membros do grupo" on public.reading_challenges;
create policy "desafios visiveis pra membros do grupo" on public.reading_challenges
  for select
  using (public.is_group_member(group_id));

drop policy if exists "qualquer membro propoe desafio" on public.reading_challenges;
create policy "qualquer membro propoe desafio" on public.reading_challenges
  for insert
  with check (auth.uid() = created_by and public.is_group_member(group_id));

-- reading_challenge_progress: placar visível pra qualquer membro 'joined'
-- do grupo do desafio (é assim que a competição fica visível pros
-- outros) — mas cada um só escreve a PRÓPRIA linha, e só INSERT/UPDATE
-- (sem DELETE direto do client: a limpeza ao sair do grupo é feita pelo
-- trigger handle_group_member_left, que roda com privilégio próprio).
drop policy if exists "placar visivel pro grupo todo" on public.reading_challenge_progress;
create policy "placar visivel pro grupo todo" on public.reading_challenge_progress
  for select
  using (
    exists (
      select 1 from public.reading_challenges c
      where c.id = reading_challenge_progress.challenge_id
        and public.is_group_member(c.group_id)
    )
  );

drop policy if exists "cada um insere so a propria linha de progresso" on public.reading_challenge_progress;
create policy "cada um insere so a propria linha de progresso" on public.reading_challenge_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "cada um atualiza so a propria linha de progresso" on public.reading_challenge_progress;
create policy "cada um atualiza so a propria linha de progresso" on public.reading_challenge_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- group_comments: membros do grupo leem e postam; apagar é o autor OU
-- quem é moderador do grupo (pedido explícito: "moderador ou criador
-- consegue deletar comentários" — como o criador já nasce moderador, uma
-- única condição de role cobre os dois casos).
drop policy if exists "comentarios visiveis pro grupo" on public.group_comments;
create policy "comentarios visiveis pro grupo" on public.group_comments
  for select
  using (public.is_group_member(group_id));

drop policy if exists "membro do grupo posta comentario" on public.group_comments;
create policy "membro do grupo posta comentario" on public.group_comments
  for insert
  with check (auth.uid() = user_id and public.is_group_member(group_id));

drop policy if exists "autor ou moderador apaga comentario" on public.group_comments;
create policy "autor ou moderador apaga comentario" on public.group_comments
  for delete
  using (auth.uid() = user_id or public.is_group_moderator(group_id));

-- group_comment_likes: visível por quem é membro do grupo dono do
-- comentário; cada um só (des)curte por si.
drop policy if exists "curtidas visiveis pro grupo" on public.group_comment_likes;
create policy "curtidas visiveis pro grupo" on public.group_comment_likes
  for select
  using (
    exists (
      select 1 from public.group_comments c
      where c.id = group_comment_likes.comment_id
        and public.is_group_member(c.group_id)
    )
  );

drop policy if exists "curtir e so meu" on public.group_comment_likes;
create policy "curtir e so meu" on public.group_comment_likes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_comments c
      where c.id = group_comment_likes.comment_id
        and public.is_group_member(c.group_id)
    )
  );

drop policy if exists "descurtir e so meu" on public.group_comment_likes;
create policy "descurtir e so meu" on public.group_comment_likes
  for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- 4. FUNÇÕES (RPCs e funções de trigger)
-- ═══════════════════════════════════════════════════════════════

-- Acha um usuário pelo email exato, pra montar um pedido de amizade — só
-- devolve user_id + name, nunca lista ou faz busca parcial, pra não virar
-- uma ferramenta de enumeração de emails cadastrados.
create or replace function public.find_user_by_email(target_email text)
returns table (user_id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select u.id, p.name
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where lower(u.email) = lower(target_email)
  limit 1;
$$;

-- Cria um grupo e já insere quem criou como membro 'joined'/'moderator'
-- na mesma transação — evita um grupo "órfão" se o segundo insert
-- falhasse no meio do caminho, e evita precisar de uma policy de INSERT
-- direta (mais complexa de deixar segura) em reading_group_members.
create or replace function public.create_reading_group(group_name text)
returns public.reading_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.reading_groups;
begin
  insert into public.reading_groups (name, created_by)
  values (group_name, auth.uid())
  returning * into new_group;

  insert into public.reading_group_members (group_id, user_id, status, role, joined_at)
  values (new_group.id, auth.uid(), 'joined', 'moderator', now());

  return new_group;
end;
$$;

-- Convida um amigo pra um grupo — só funciona se quem chama já é membro
-- 'joined' do grupo E o convidado é uma amizade 'accepted' de quem chama.
create or replace function public.invite_friend_to_group(target_group_id uuid, friend_user_id uuid)
returns public.reading_group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  new_member public.reading_group_members;
begin
  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'Você não é membro desse grupo.';
  end if;

  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = friend_user_id)
        or (addressee_id = auth.uid() and requester_id = friend_user_id))
  ) then
    raise exception 'Só dá pra convidar quem já é seu amigo.';
  end if;

  insert into public.reading_group_members (group_id, user_id, status, invited_by)
  values (target_group_id, friend_user_id, 'invited', auth.uid())
  on conflict (group_id, user_id) do nothing
  returning * into new_member;

  return new_member;
end;
$$;

-- Aceita (ou recusa) um convite de grupo pendente.
create or replace function public.respond_to_group_invite(target_group_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if accept then
    update public.reading_group_members
    set status = 'joined', joined_at = now()
    where group_id = target_group_id and user_id = auth.uid() and status = 'invited';
  else
    delete from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid() and status = 'invited';
  end if;
end;
$$;

-- Promove ou rebaixa outro membro — só quem já é moderador do grupo pode
-- chamar.
create or replace function public.set_group_member_role(target_group_id uuid, target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_role not in ('member', 'moderator') then
    raise exception 'role inválida: %', new_role;
  end if;

  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid()
      and role = 'moderator' and status = 'joined'
  ) then
    raise exception 'Só um moderador pode mudar o papel de outro membro.';
  end if;

  update public.reading_group_members
  set role = new_role
  where group_id = target_group_id and user_id = target_user_id and status = 'joined';
end;
$$;

-- Cria automaticamente a linha de progresso pessoal (user_data, já
-- existia em 0001) e agora também o perfil (nome público) assim que uma
-- conta é criada — um único trigger cuidando das duas tabelas.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_data (user_id) values (new.id);
  insert into public.profiles (user_id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

-- Ao criar um desafio nasce automaticamente a linha de progresso (zerada)
-- de cada membro 'joined' atual do grupo.
create or replace function public.handle_new_challenge()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.reading_challenge_progress (challenge_id, user_id)
  select new.id, m.user_id
  from public.reading_group_members m
  where m.group_id = new.group_id and m.status = 'joined';
  return new;
end;
$$;

-- Ao um convite de grupo virar 'joined', o novo membro entra também no
-- progresso de qualquer desafio daquele grupo que ainda esteja ativo —
-- começando do zero, nunca herdando progresso de antes de entrar.
create or replace function public.handle_group_member_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'joined' and (old.status is distinct from 'joined') then
    insert into public.reading_challenge_progress (challenge_id, user_id)
    select c.id, new.user_id
    from public.reading_challenges c
    where c.group_id = new.group_id and c.ends_at > now()
    on conflict (challenge_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Ao sair de um grupo (ou ter o convite/membresia removidos), some também
-- do placar de qualquer desafio daquele grupo — sem isso, um "fantasma"
-- continuaria aparecendo no placar de gente que já não está mais no grupo.
create or replace function public.handle_group_member_left()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.reading_challenge_progress p
  using public.reading_challenges c
  where p.challenge_id = c.id
    and c.group_id = old.group_id
    and p.user_id = old.user_id;
  return old;
end;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 5. TRIGGERS
-- ═══════════════════════════════════════════════════════════════

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_challenge_created on public.reading_challenges;
create trigger on_challenge_created
  after insert on public.reading_challenges
  for each row execute function public.handle_new_challenge();

drop trigger if exists on_group_member_joined on public.reading_group_members;
create trigger on_group_member_joined
  after update on public.reading_group_members
  for each row execute function public.handle_group_member_joined();

drop trigger if exists on_group_member_left on public.reading_group_members;
create trigger on_group_member_left
  after delete on public.reading_group_members
  for each row execute function public.handle_group_member_left();


-- ═══════════════════════════════════════════════════════════════
-- 6. BACKFILL (só roda uma vez, é seguro rodar de novo)
-- ═══════════════════════════════════════════════════════════════

-- O trigger on_auth_user_created só passa a preencher profiles a partir de
-- agora — contas criadas ANTES dessa migração (ex: suas contas de teste)
-- não têm linha em profiles ainda. Sem isso, o nome delas não apareceria
-- pra amigos/colegas de grupo em lugar nenhum.
insert into public.profiles (user_id, name)
select u.id, coalesce(u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (user_id) do nothing;
