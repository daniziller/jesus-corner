-- Jesus' Corner — remover um membro do grupo (redesign Bento, quadro 19c
-- "Administração do grupo").
--
-- O quadro pede duas ações ao tocar num membro comum (não-moderador):
-- "tornar admin" (já existe — set_group_member_role, 0002) e "remover".
-- Remover ainda não existia: a única linha de DELETE em
-- reading_group_members é "sair do grupo ou recusar convite" (0002),
-- restrita a auth.uid() = user_id — cobre só a própria pessoa saindo,
-- nunca um moderador removendo outra pessoa. Esta migração adiciona essa
-- segunda ação, como RPC (não como policy nova de DELETE — mesma razão
-- de sempre: a regra "só moderador, e nunca a própria linha de
-- moderador" é mais fácil de garantir dentro de uma função do que numa
-- policy de RLS).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create or replace function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode remover um membro.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Use "sair do grupo" pra remover a si mesmo.';
  end if;

  -- Sempre pelo botão "tornar admin" antes, nunca remover um moderador
  -- direto por aqui (a UI do quadro 19c só mostra a opção "remover" pra
  -- membros comuns — linhas de moderador não têm esse toque).
  delete from public.reading_group_members
  where group_id = target_group_id and user_id = target_user_id and role = 'member';
end;
$$;
