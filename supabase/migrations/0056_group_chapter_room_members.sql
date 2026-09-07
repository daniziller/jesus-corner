-- Jesus' Corner — quem já leu o capítulo de hoje, por nome (quadro 24a:
-- fileira de avatares "DZ MR TL +3" no card "Sala aberta agora").
--
-- group_chapter_room_stats (migration 0045) foi escrita de propósito pra
-- devolver só números, nunca nomes ("Contagem de membros do grupo que já
-- concluíram o capítulo... devolve só números, nunca quem"). O quadro 24a
-- do pacote novo (rodadas 24-32) pede o oposto — avatar + nome de quem já
-- leu — decisão confirmada com a autora em 2026-09-07 (revisando 24a de
-- novo, ela pediu a fileira de avatares de verdade). Isso não é uma
-- reversão arriscada de privacidade: getGroupDetail() já expõe nome de
-- TODOS os membros do grupo pra qualquer colega de grupo, sem checar
-- profiles.is_public — ser do mesmo grupo já implica visibilidade mútua
-- do nome; esta função só acrescenta "e leu o capítulo de hoje" a um nome
-- que o colega de grupo já enxergava de qualquer forma.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create or replace function public.group_chapter_room_members(target_group_id uuid, target_book text, target_chapter integer)
returns table (user_id uuid, name text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select m.user_id, pr.name, pr.avatar_url
  from public.reading_group_members m
  join public.user_data d on d.user_id = m.user_id
  join public.profiles pr on pr.user_id = m.user_id
  where m.group_id = target_group_id and m.status = 'joined'
    and d.completed_keys @> array[target_book || ':' || target_chapter::text]
    and public.is_group_member(target_group_id)
  order by pr.name asc;
$$;
