-- "Quem está lendo" do moderador só olha a leitura do PLANO DO GRUPO
-- (revisão de LGPD, 2026-11-18, segunda entrega — art. 6º III,
-- necessidade). Antes, get_group_reading_activity (0066) usava TODA a
-- leitura pessoal de cada membro (qualquer livro, qualquer dia) para os
-- dias da semana, "dias sem ler" e dias no plano — o moderador via o
-- hábito pessoal de leitura de todo mundo, e a política diz que o grupo
-- nunca vê o progresso pessoal completo.
--
-- Agora só contam capítulos do livro do plano atual do grupo, lidos desde
-- que o plano começou (ou desde que a pessoa entrou, o que for depois).
-- Sem plano no grupo, não há nada a mostrar além de quem participa.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create or replace function public.get_group_reading_activity(target_group_id uuid)
returns table (
  member_user_id uuid, member_name text, member_role text, is_me boolean,
  days_active_last_7 boolean[], days_since_last_read integer, plan_day_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_start timestamptz;
  plan_book text;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode ver quem está lendo.';
  end if;

  select starts_at, book into plan_start, plan_book
    from public.group_reading_plans
    where group_id = target_group_id
    order by created_at desc
    limit 1;

  return query
  with leitura as (
    -- Só capítulos do livro do plano, depois do início do plano e da
    -- entrada da pessoa no grupo.
    select cr.user_id, cr.created_at
    from public.chapters_read cr
    join public.reading_group_members m2 on m2.user_id = cr.user_id and m2.group_id = target_group_id and m2.status = 'joined'
    where plan_book is not null
      and cr.livro = plan_book
      and cr.created_at >= greatest(coalesce(plan_start, m2.joined_at, m2.created_at), coalesce(m2.joined_at, m2.created_at, plan_start))
  )
  select
    m.user_id,
    p.name,
    m.role,
    (m.user_id = auth.uid()),
    (
      select array_agg(
        exists(select 1 from leitura l where l.user_id = m.user_id and l.created_at::date = d::date)
        order by d
      )
      from generate_series((current_date - 6)::timestamp, current_date::timestamp, interval '1 day') d
    ),
    (select (current_date - max(l.created_at::date))::integer from leitura l where l.user_id = m.user_id),
    (select count(distinct l.created_at::date)::integer from leitura l where l.user_id = m.user_id)
  from public.reading_group_members m
  join public.profiles p on p.user_id = m.user_id
  where m.group_id = target_group_id and m.status = 'joined'
  order by p.name;
end;
$$;
