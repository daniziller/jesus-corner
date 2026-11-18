-- Limite de uso dos recursos com IA por pessoa (pedido dela, 2026-11-18):
-- cada conta Premium pode gastar até US$1,50 por mês, somando o texto
-- gerado e a voz natural; acabou, os recursos que geram texto param até o
-- mês seguinte e a voz natural dá lugar à voz do aparelho. A conta grátis não
-- usa IA nenhuma (isso é conferido antes, em api/_lib/entitlement.js).
--
-- Uma linha por pessoa por mês (aaaa-mm, no fuso de Brasília — ver
-- api/_lib/aiBudget.js), com o custo somado em micro-dólares (1 dólar =
-- 1.000.000) e os tokens, pra o painel poder mostrar quem gasta quanto.
--
-- Só o service role escreve, pela RPC add_ai_usage (soma atômica: duas
-- chamadas ao mesmo tempo nunca perdem uma à outra). A pessoa pode LER a
-- própria linha — é assim que o app mostra quanto ainda resta.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  calls integer not null default 0 check (calls >= 0),
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.ai_usage_monthly enable row level security;

drop policy if exists "cada um le o proprio uso de ia" on public.ai_usage_monthly;
create policy "cada um le o proprio uso de ia" on public.ai_usage_monthly
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.add_ai_usage(
  p_user_id uuid,
  p_month text,
  p_cost_micros bigint,
  p_input_tokens bigint,
  p_output_tokens bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  insert into public.ai_usage_monthly (user_id, month, cost_micros, calls, input_tokens, output_tokens, updated_at)
  values (p_user_id, p_month, greatest(p_cost_micros, 0), 1, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), now())
  on conflict (user_id, month) do update set
    cost_micros = public.ai_usage_monthly.cost_micros + greatest(excluded.cost_micros, 0),
    calls = public.ai_usage_monthly.calls + 1,
    input_tokens = public.ai_usage_monthly.input_tokens + greatest(excluded.input_tokens, 0),
    output_tokens = public.ai_usage_monthly.output_tokens + greatest(excluded.output_tokens, 0),
    updated_at = now()
  returning cost_micros into v_total;
  return v_total;
end;
$$;

-- Ninguém do lado do app soma uso a si mesmo (nem a outra pessoa): só o
-- service role, dos endpoints.
revoke all on function public.add_ai_usage(uuid, text, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.add_ai_usage(uuid, text, bigint, bigint, bigint) to service_role;
