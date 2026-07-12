-- Jesus' Corner — tutorial interativo (spotlight) de primeiro acesso.
--
-- has_seen_tour nasce com default true de propósito: toda conta que já
-- existe na hora que essa migração roda simplesmente ganha a coluna com o
-- valor "já viu" — o tutorial nunca aparece retroativamente pra quem já usa
-- o app. O único lugar que grava false é o próprio handle_new_user(), então
-- só quem se cadastra depois dessa migração é que vê o tour, na primeira
-- vez que abre o app.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe que 0002 e 0004 já
-- foram rodados antes.


-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNA NOVA EM profiles
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists has_seen_tour boolean not null default true;


-- ═══════════════════════════════════════════════════════════════
-- 2. handle_new_user: contas novas nascem com has_seen_tour = false
-- ═══════════════════════════════════════════════════════════════
-- Reescreve a função de 0004 (mesmo nome/trigger, só acrescenta
-- has_seen_tour = false no insert) — é essa única linha que diferencia
-- "conta nova" de "conta que já existia".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_data (user_id) values (new.id);
  insert into public.profiles (user_id, name, is_public, has_seen_tour)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', ''),
      coalesce((new.raw_user_meta_data->>'is_public')::boolean, false),
      false
    );
  return new;
end;
$$;
