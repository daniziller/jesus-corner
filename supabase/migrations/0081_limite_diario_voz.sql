-- Limite diário de trechos NOVOS da voz natural por pessoa (pedido dela,
-- 2026-11-18). A voz fica fora do limite mensal de IA (0079) e é guardada
-- pra todos (0080): o que já está guardado toca sem limite. Este teto só
-- conta trechos que precisam ser GERADOS — é uma rede de segurança contra
-- quem mande textos inventados direto pra API, não um limite pra quem
-- ouve pelo app. Ver api/_lib/ttsLimit.js.
--
-- Uma linha por pessoa por dia (aaaa-mm-dd, no fuso de Brasília). Só o
-- service role mexe, pelas duas RPCs:
--   claim_tts_generation   — soma 1 se ainda está abaixo do teto e devolve
--                            o total; no teto, devolve null (nada muda).
--   release_tts_generation — devolve 1 quando a geração falhou.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create table if not exists public.tts_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  generated integer not null default 0 check (generated >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.tts_daily_usage enable row level security;
-- Sem política: ninguém do app lê nem escreve; só o service role.

create or replace function public.claim_tts_generation(p_user_id uuid, p_day text, p_max integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  insert into public.tts_daily_usage (user_id, day, generated, updated_at)
  values (p_user_id, p_day, 1, now())
  on conflict (user_id, day) do update
    set generated = public.tts_daily_usage.generated + 1, updated_at = now()
    where public.tts_daily_usage.generated < p_max
  returning generated into v_total;
  -- Primeira do dia com teto zero, ou já no teto: nada foi somado.
  if v_total is null or v_total > p_max then
    if v_total is not null then
      update public.tts_daily_usage set generated = generated - 1 where user_id = p_user_id and day = p_day;
    end if;
    return null;
  end if;
  return v_total;
end;
$$;

create or replace function public.release_tts_generation(p_user_id uuid, p_day text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tts_daily_usage
    set generated = greatest(generated - 1, 0), updated_at = now()
    where user_id = p_user_id and day = p_day;
$$;

revoke all on function public.claim_tts_generation(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.release_tts_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_tts_generation(uuid, text, integer) to service_role;
grant execute on function public.release_tts_generation(uuid, text) to service_role;
