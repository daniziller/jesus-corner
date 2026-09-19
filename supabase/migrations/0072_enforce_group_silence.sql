-- Jesus' Corner — "silenciar membro" (42i/42l, painel do grupo) passa a
-- de fato bloquear postagem (varredura geral, 2026-09-19).
--
-- `silenced_until` (reading_group_members) é gravado por
-- silence_group_member (0066) e pela decisão "muted_user" de denúncia
-- (0065) — mas nunca era LIDO em nenhuma policy de INSERT. O painel
-- mostrava "silenciado até {data}" (GroupMembersScreen.jsx) só como texto:
-- o membro continuava postando comentário/pedido de oração de grupo/
-- resposta na sala de capítulo normalmente. A ação de moderação inteira
-- era cosmética.
--
-- `is_group_silenced`: mesma semântica já usada no cliente pra decidir se
-- mostra "silenciado até" (silenced_until no futuro = silenciado; null ou
-- no passado = não).
--
-- Escopo desta migration (avisado, não escondido): cobre os 3 pontos de
-- postagem em grupo que a varredura encontrou sem checagem nenhuma —
-- group_comments (mural), group_prayer_requests (só quando scope='group'
-- — um pedido 'only_me'/'friends' não é assunto do grupo) e
-- group_chapter_posts (sala de capítulo). Não mexi em
-- group_prayer_comments (comentário em pedido de oração, migration 0070)
-- nesta leva — essa tabela não guarda group_id direto (só
-- prayer_request_id), precisaria de um subquery a mais; fica pra uma
-- leva futura se fizer sentido.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente. Pressupõe 0002, 0045, 0052, 0065 e 0066 já rodados.

create or replace function public.is_group_silenced(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id
      and silenced_until is not null and silenced_until > now()
  );
$$;

grant execute on function public.is_group_silenced(uuid, uuid) to authenticated;


-- group_comments (mural do grupo, 0002) — postar exige não estar
-- silenciado, além de já exigido (autor = quem posta, membro do grupo).
drop policy if exists "membro do grupo posta comentario" on public.group_comments;
create policy "membro do grupo posta comentario" on public.group_comments
  for insert
  with check (auth.uid() = user_id and public.is_group_member(group_id) and not public.is_group_silenced(group_id));


-- group_prayer_requests (0052) — só o ramo scope='group' checa silêncio
-- (um pedido 'only_me'/'friends' não é assunto do grupo, mesmo raciocínio
-- de por que essas duas variantes não exigem membership de grupo nenhuma).
drop policy if exists "postar pedido de oracao" on public.group_prayer_requests;
create policy "postar pedido de oracao" on public.group_prayer_requests
  for insert
  with check (
    auth.uid() = user_id
    and (
      (scope = 'group' and group_id is not null and public.is_group_member(group_id) and not public.is_group_silenced(group_id))
      or (scope in ('friends', 'only_me') and group_id is null)
    )
  );


-- group_chapter_posts (sala de capítulo, 0045) — postar exige não estar
-- silenciado, além do já exigido (membro do grupo, capítulo concluído).
drop policy if exists "quem leu responde" on public.group_chapter_posts;
create policy "quem leu responde" on public.group_chapter_posts
  for insert with check (
    auth.uid() = user_id
    and public.is_group_member(group_id)
    and public.has_completed_chapter(book, chapter)
    and not public.is_group_silenced(group_id)
  );
