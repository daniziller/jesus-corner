-- Jesus' Corner — fixar comentários do mural do grupo (até 3 por grupo).
--
-- Só o moderador pode fixar/desafixar. O limite de 3 é aplicado dentro da
-- função (não como um constraint de tabela) porque precisa contar as
-- linhas já fixadas daquele grupo especificamente — um security definer
-- function é o mesmo padrão já usado em 0002 pras outras RPCs privilegiadas
-- (invite_friend_to_group, set_member_role etc.), e evita expor uma policy
-- de UPDATE aberta em group_comments (que hoje não tem nenhuma).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que
-- 0002_friends_groups_challenges.sql já foi rodado antes.


-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNAS NOVAS
-- ═══════════════════════════════════════════════════════════════

alter table public.group_comments add column if not exists pinned boolean not null default false;
alter table public.group_comments add column if not exists pinned_at timestamptz;


-- ═══════════════════════════════════════════════════════════════
-- 2. RPC: fixar/desafixar (reusa is_group_moderator de 0002)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.set_comment_pinned(target_comment_id uuid, new_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  pinned_count int;
begin
  select group_id into target_group_id from public.group_comments where id = target_comment_id;
  if target_group_id is null then
    raise exception 'Comentário não encontrado.';
  end if;
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só o moderador do grupo pode fixar comentários.';
  end if;

  if new_pinned then
    select count(*) into pinned_count
    from public.group_comments
    where group_id = target_group_id and pinned = true;
    if pinned_count >= 3 then
      raise exception 'Esse grupo já tem 3 comentários fixados. Desafixe um antes de fixar outro.';
    end if;
    update public.group_comments set pinned = true, pinned_at = now() where id = target_comment_id;
  else
    update public.group_comments set pinned = false, pinned_at = null where id = target_comment_id;
  end if;
end;
$$;
