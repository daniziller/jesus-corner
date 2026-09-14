-- Jesus' Corner — Alertas do Master (handoff-admin-42, Bloco 5: 42b).
--
-- Regra 6.4: "só os quatro tipos, cada um com seu gatilho: denúncia
-- escalada, falha técnica recorrente com contagem de sessões, entradas
-- muito acima da média do grupo, cancelamentos acima de N× a média em
-- 24h. Cada alerta tem estado aberto/arquivado/resolvido."
--
-- Precisa de uma tabela de VERDADE (não só computar na hora) porque
-- "arquivado/resolvido" é estado que precisa sobreviver entre visitas —
-- um alerta computado toda vez do zero esqueceria que já foi arquivado.
-- O DETECTOR (api/detect-master-alerts.js, cron) que cria as linhas lê
-- fontes que já existem: group_message_reports escaladas (denúncia) e o
-- mesmo cálculo de grupo sinalizado por pico de entradas de
-- api/admin/groups.js (crescimento). "Técnico" e "cancelamentos" ficam
-- com o TIPO pronto no schema mas sem detector — disclosed: não existe
-- infraestrutura de rastreio de erro técnico neste app (precisaria de
-- crash/sync reporting, fora do escopo desta leva), e cancelamento não
-- guarda TIMESTAMP de quando virou 'canceled' (subscriptions.updated_at
-- é a melhor aproximação hoje, mas não é atribuível com certeza só a
-- cancelamento — sem detector automático por ora, fica pronto pra
-- quando o rastreio de cobrança tiver esse dado).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0065 já rodada.

create table if not exists public.master_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('denuncia', 'tecnico', 'crescimento', 'cancelamentos')),
  source text,
  source_id uuid,
  title text not null,
  detail text not null,
  primary_action text,
  status text not null default 'open' check (status in ('open', 'archived', 'resolved')),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists master_alerts_source_unique on public.master_alerts(kind, source, source_id) where source_id is not null;
create index if not exists master_alerts_status_idx on public.master_alerts(status, created_at desc);

alter table public.master_alerts enable row level security;
-- Sem policy nenhuma pra usuário comum — só o painel do Master (service
-- role) lê/escreve, mesmo padrão de blocked_accounts/access_grants (0068).
