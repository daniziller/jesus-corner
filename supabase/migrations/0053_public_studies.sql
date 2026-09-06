-- Jesus' Corner — banco de estudos compartilháveis (26e/26f/26g, Bloco 12).
--
-- Até aqui todo "estudo por tema" (theme_plans, ver themePlansStore.js) era
-- 100% pessoal — um array dentro de user_data, nunca visível a mais
-- ninguém. O design novo pede visibilidade real: 'invited' (amigos
-- escolhidos, ver `study_invitees`) e 'public' (banco de busca por tema,
-- 26g), com autor, contador de quantas pessoas fizeram (pessoas
-- DISTINTAS, não toda vez que alguém reabre) e denúncia com retirada
-- automática após 3.
--
-- A cópia PESSOAL da pessoa (theme_plans/active_study) continua existindo
-- do mesmo jeito de sempre — publicar não move nada pra cá, só ACRESCENTA
-- uma linha compartilhável. "Sair do banco" (Biblioteca, 4c) é só apagar
-- essa linha; a cópia pessoal de quem já criou nem de quem já usou não é
-- afetada (ver policy de DELETE abaixo).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002
-- (profiles/friendships) já rodado.


-- ═══════════════════════════════════════════════════════════════
-- 1. TABELAS
-- ═══════════════════════════════════════════════════════════════

-- `passages` guarda a MESMA forma já usada em theme_plans/StudyProposalScreen
-- (array de {book, chStart, chEnd, reason, words}) — conteúdo fixo, igual
-- pra todo mundo que usar; nunca regenerado por IA de novo por usuário.
-- `tags[0]` é o tema principal (mostrado destacado em 26f); os demais são
-- só filtro de busca (26g). `author_id` nulo = estudo do próprio app
-- ("Jesus' Corner", ver `system_author_name`) — os prontos "livro inteiro,
-- 1 capítulo por dia" de 26e entram assim, seedados no fim deste arquivo.
create table if not exists public.studies (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(user_id) on delete set null,
  system_author_name text,
  title text not null check (char_length(title) between 1 and 80),
  overview text,
  format text not null default 'thematic' check (format in ('thematic', 'book', 'crossref')),
  tags text[] not null default '{}',
  passages jsonb not null,
  visibility text not null check (visibility in ('invited', 'public')),
  hidden boolean not null default false,
  report_count integer not null default 0,
  uses_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (author_id is not null or system_author_name is not null)
);

-- "Fazer junto com" (26f) — amigos convidados quando visibility='invited'.
-- status vira 'accepted' quando o convidado usa (ver accept_study_invite).
create table if not exists public.study_invitees (
  study_id uuid not null references public.studies(id) on delete cascade,
  invitee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (study_id, invitee_id)
);

-- Quem já ADOTOU o estudo como seu (criou a própria cópia em theme_plans a
-- partir dele) — uma linha por pessoa, nunca duplicada, é o que sustenta
-- "quantas pessoas fizeram" contando gente, não toques.
create table if not exists public.study_uses (
  study_id uuid not null references public.studies(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (study_id, user_id)
);

-- Denúncia — uma por pessoa por estudo (unique). 3 denúncias distintas
-- escondem o estudo automaticamente (ver trigger abaixo); revisão manual
-- de verdade (reverter/banir autor) é trabalho do painel admin (Bloco 14).
create table if not exists public.study_reports (
  study_id uuid not null references public.studies(id) on delete cascade,
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (study_id, reporter_id)
);

alter table public.studies enable row level security;
alter table public.study_invitees enable row level security;
alter table public.study_uses enable row level security;
alter table public.study_reports enable row level security;

create index if not exists studies_visibility_idx on public.studies (visibility, hidden, created_at desc);
create index if not exists studies_tags_idx on public.studies using gin (tags);
create index if not exists study_invitees_invitee_idx on public.study_invitees (invitee_id);


-- ═══════════════════════════════════════════════════════════════
-- 2. FUNÇÃO AUXILIAR
-- ═══════════════════════════════════════════════════════════════

create or replace function public.is_study_invitee(target_study_id uuid, viewer_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.study_invitees
    where study_id = target_study_id and invitee_id = viewer_id
  );
$$;

grant execute on function public.is_study_invitee(uuid, uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 3. POLICIES — studies
-- ═══════════════════════════════════════════════════════════════

-- Público (não escondido) pra qualquer autenticado (26g, busca); convidado
-- vê o próprio; autor sempre vê o que criou (mesmo escondido, pra saber o
-- motivo em 4c).
drop policy if exists "estudos visiveis pelo escopo" on public.studies;
create policy "estudos visiveis pelo escopo" on public.studies
  for select
  to authenticated
  using (
    auth.uid() = author_id
    or (visibility = 'public' and not hidden)
    or (visibility = 'invited' and public.is_study_invitee(id))
  );

drop policy if exists "autor publica estudo" on public.studies;
create policy "autor publica estudo" on public.studies
  for insert
  with check (auth.uid() = author_id);

-- "Sair do banco" (4c) — só apaga a linha compartilhada; a cópia pessoal
-- de quem criou ou já usou mora em theme_plans (user_data), intocada.
drop policy if exists "autor tira estudo do banco" on public.studies;
create policy "autor tira estudo do banco" on public.studies
  for delete
  using (auth.uid() = author_id);


-- ═══════════════════════════════════════════════════════════════
-- 4. POLICIES — study_invitees
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "convite visivel a autor e convidado" on public.study_invitees;
create policy "convite visivel a autor e convidado" on public.study_invitees
  for select
  using (
    auth.uid() = invitee_id
    or exists (select 1 from public.studies s where s.id = study_invitees.study_id and s.author_id = auth.uid())
  );

drop policy if exists "autor convida amigo" on public.study_invitees;
create policy "autor convida amigo" on public.study_invitees
  for insert
  with check (
    exists (select 1 from public.studies s where s.id = study_invitees.study_id and s.author_id = auth.uid())
  );

drop policy if exists "autor remove convite" on public.study_invitees;
create policy "autor remove convite" on public.study_invitees
  for delete
  using (
    exists (select 1 from public.studies s where s.id = study_invitees.study_id and s.author_id = auth.uid())
  );

-- Aceitar convite (status -> 'accepted') passa pela RPC abaixo, não por
-- UPDATE direto.


-- ═══════════════════════════════════════════════════════════════
-- 5. POLICIES — study_uses / study_reports
-- ═══════════════════════════════════════════════════════════════

-- Cada um só vê a própria linha de uso — o contador público vem de
-- studies.uses_count (mantido pelo trigger abaixo), nunca de listar quem
-- usou.
drop policy if exists "so vejo meu proprio uso" on public.study_uses;
create policy "so vejo meu proprio uso" on public.study_uses
  for select using (auth.uid() = user_id);

drop policy if exists "marcar uso e so meu" on public.study_uses;
create policy "marcar uso e so meu" on public.study_uses
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.studies s
      where s.id = study_uses.study_id
        and (
          s.visibility = 'public' and not s.hidden
          or (s.visibility = 'invited' and public.is_study_invitee(s.id))
          or s.author_id = auth.uid()
        )
    )
  );

drop policy if exists "so vejo minha propria denuncia" on public.study_reports;
create policy "so vejo minha propria denuncia" on public.study_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "denunciar e so meu" on public.study_reports;
create policy "denunciar e so meu" on public.study_reports
  for insert
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.studies s
      where s.id = study_reports.study_id and s.visibility = 'public' and not s.hidden
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 6. TRIGGERS — contadores derivados (uses_count/report_count/hidden)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.bump_study_uses_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.studies set uses_count = uses_count + 1 where id = new.study_id;
  return new;
end;
$$;

drop trigger if exists study_uses_bump on public.study_uses;
create trigger study_uses_bump
  after insert on public.study_uses
  for each row execute function public.bump_study_uses_count();

-- 3 denúncias distintas (a PK do report já impede a mesma pessoa denunciar
-- duas vezes) escondem o estudo — some do banco/busca, mas o autor
-- continua vendo (ver policy de SELECT acima), pra saber que foi
-- escondido. Reverter é trabalho do painel admin (Bloco 14).
create or replace function public.bump_study_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.studies
  set report_count = report_count + 1,
      hidden = (report_count + 1) >= 3
  where id = new.study_id;
  return new;
end;
$$;

drop trigger if exists study_reports_bump on public.study_reports;
create trigger study_reports_bump
  after insert on public.study_reports
  for each row execute function public.bump_study_report_count();


-- ═══════════════════════════════════════════════════════════════
-- 7. RPCs — trocar visibilidade, aceitar convite
-- ═══════════════════════════════════════════════════════════════

-- 26f permite só 'invited'/'public' na criação; "sair do banco" (4c) é um
-- DELETE de verdade (policy acima), não uma terceira visibilidade —
-- documentado assim pra não ter dois jeitos de "esconder" fazendo a mesma
-- coisa.
create or replace function public.set_study_visibility(target_study_id uuid, new_visibility text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_visibility not in ('invited', 'public') then
    raise exception 'invalid_visibility';
  end if;
  update public.studies
  set visibility = new_visibility
  where id = target_study_id and author_id = auth.uid();
  if not found then
    raise exception 'not_found_or_not_owner';
  end if;
end;
$$;

grant execute on function public.set_study_visibility(uuid, text) to authenticated;

create or replace function public.accept_study_invite(target_study_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.study_invitees
  set status = 'accepted'
  where study_id = target_study_id and invitee_id = auth.uid();
  if not found then
    raise exception 'not_invited';
  end if;
end;
$$;

grant execute on function public.accept_study_invite(uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 8. SEED — "estudos prontos" de 26e, 100% reais (livro inteiro, 1
--    capítulo por dia, contagem real de capítulos — zero curadoria
--    inventada; combinado com a autora em vez de inventar temas como
--    "Ansiedade e confiança" sem uma lista real pra basear).
-- ═══════════════════════════════════════════════════════════════

insert into public.studies (id, author_id, system_author_name, title, overview, format, tags, passages, visibility)
select * from (values
  (
    '00000000-0000-0000-0000-0000000000e1'::uuid, null::uuid, 'Jesus'' Corner',
    'Provérbios em 31 dias', 'Um capítulo de Provérbios por dia — sabedoria prática em doses pequenas, o mês inteiro.',
    'book', array['sabedoria']::text[],
    (select jsonb_agg(jsonb_build_object('book', 'Provérbios', 'chStart', n, 'chEnd', n, 'reason', null) order by n)
       from generate_series(1, 31) as n),
    'public'
  ),
  (
    '00000000-0000-0000-0000-0000000000e2'::uuid, null::uuid, 'Jesus'' Corner',
    'Tiago em 5 dias', 'A carta inteira de Tiago, um capítulo por dia — fé que se mostra em atitude prática.',
    'book', array['fe']::text[],
    (select jsonb_agg(jsonb_build_object('book', 'Tiago', 'chStart', n, 'chEnd', n, 'reason', null) order by n)
       from generate_series(1, 5) as n),
    'public'
  ),
  (
    '00000000-0000-0000-0000-0000000000e3'::uuid, null::uuid, 'Jesus'' Corner',
    'Filipenses em 4 dias', 'A carta da alegria, um capítulo por dia — Paulo escrevendo da prisão sobre contentamento.',
    'book', array['proposito']::text[],
    (select jsonb_agg(jsonb_build_object('book', 'Filipenses', 'chStart', n, 'chEnd', n, 'reason', null) order by n)
       from generate_series(1, 4) as n),
    'public'
  )
) as seed(id, author_id, system_author_name, title, overview, format, tags, passages, visibility)
where not exists (select 1 from public.studies where id = seed.id);
