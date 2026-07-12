-- Jesus' Corner — feed de atividades dos amigos (livro concluído, subiu de
-- nível, entrou num grupo). Diferente de completed_keys/user_data (um "blob"
-- que só guarda o estado atual, sem histórico), essa é a primeira tabela do
-- app que registra EVENTOS com data/hora — cada marco vira uma linha própria,
-- nunca é atualizada depois, só inserida.
--
-- Detecção dos marcos é toda no client (App.jsx e groupsStore.js), não em
-- trigger — nível é calculado a partir de XP puramente no client
-- (src/utils/levels.js) e duplicar essa fórmula em SQL seria manter duas
-- implementações da mesma regra. O client já sabe exatamente quando cada
-- marco acontece (é o mesmo lugar que já atualiza a UI), então só insere.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 (friendships,
-- profiles) já foi rodado antes.

create table if not exists public.friend_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type text not null check (type in ('book_completed', 'level_up', 'joined_group')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.friend_activity enable row level security;

create index if not exists friend_activity_user_id_created_at_idx
  on public.friend_activity (user_id, created_at desc);

-- Só aparece pra amigos aceitos CUJO perfil está público — mesma regra já
-- usada em get_friend_progress_summary (0004): atividade é progresso, então
-- segue a mesma decisão de privacidade, não o "amigos sempre veem" que vale
-- só pra nome/foto/mensagem.
drop policy if exists "atividade visivel a amigos com perfil publico" on public.friend_activity;
create policy "atividade visivel a amigos com perfil publico" on public.friend_activity
  for select
  using (
    auth.uid() = user_id
    or (
      exists (select 1 from public.profiles p where p.user_id = friend_activity.user_id and p.is_public = true)
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id = friend_activity.user_id)
            or (f.addressee_id = auth.uid() and f.requester_id = friend_activity.user_id)
          )
      )
    )
  );

drop policy if exists "usuario registra a propria atividade" on public.friend_activity;
create policy "usuario registra a propria atividade" on public.friend_activity
  for insert
  with check (auth.uid() = user_id);
