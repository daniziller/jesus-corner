-- Jesus' Corner — moderador pode marcar um desafio como concluído antes do
-- prazo (não precisa esperar ends_at passar). Um desafio manualmente
-- concluído conta como "não ativo" (mesma lógica de active/pastChallenges
-- que já existia pra desafios vencidos pela data), mas guarda a marca
-- separada de ends_at pra UI poder mostrar "Concluído" em vez de
-- "Encerrado" nesse caso.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.reading_challenges
  add column if not exists completed_at timestamptz;

-- Só o moderador do grupo pode concluir manualmente — e só pode mexer em
-- completed_at (a UI só manda esse campo; RLS não restringe coluna por
-- coluna, mas segue o mesmo padrão "UI esconde, RLS decide quem" já usado
-- em group_comments/friendships).
drop policy if exists "moderador conclui desafio manualmente" on public.reading_challenges;
create policy "moderador conclui desafio manualmente" on public.reading_challenges
  for update
  using (public.is_group_moderator(group_id))
  with check (public.is_group_moderator(group_id));
