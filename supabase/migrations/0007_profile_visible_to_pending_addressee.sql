-- Jesus' Corner — quem RECEBE um pedido de amizade precisa ver o nome e a
-- foto de quem está pedindo, mesmo antes de aceitar (senão a tela de
-- "solicitações de amizade" só mostra um "?" genérico). A policy de
-- profiles em 0002 só libera visibilidade pra amizade JÁ aceita — falta
-- o caso "pendente, e eu sou quem recebeu o pedido".
--
-- De propósito só nessa direção (addressee vê requester, não o contrário):
-- quem manda o pedido já sabe pra quem está mandando (buscou por email),
-- então não precisa enxergar o perfil do outro lado antes da resposta.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 já rodou.

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
      select 1 from public.friendships f
      where f.status = 'pending'
        and f.requester_id = profiles.user_id
        and f.addressee_id = auth.uid()
    )
    or exists (
      select 1 from public.reading_group_members m2
      where m2.user_id = profiles.user_id and m2.status = 'joined'
        and public.is_group_member(m2.group_id)
    )
  );
