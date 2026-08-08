-- Jesus' Corner — convites de admin (desconto ou acesso grátis vitalício)
-- pra e-mails específicos. `code` é o mesmo texto usado como Stripe
-- Promotion Code quando kind='discount' (ver api/admin/create-invite.js) —
-- um único código, resgatável tanto no checkout nativo do Stripe quanto no
-- campo "tenho um código" do próprio app (api/redeem-invite-code.js).
--
-- Sem policy de RLS nenhuma de propósito — só o service role (endpoints em
-- api/admin/*.js, api/redeem-invite-code.js, api/apply-pending-invite.js,
-- api/create-checkout-session.js) lê/escreve, nunca client direto (mesmo
-- padrão de contact_messages/subscriptions).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  email text not null,
  kind text not null check (kind in ('discount', 'free')),
  discount_percent integer check (discount_percent between 1 and 100),
  discount_duration text check (discount_duration in ('once', 'forever')),
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'revoked')),
  created_by uuid references auth.users(id) on delete set null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_invites enable row level security;

create index if not exists admin_invites_email_idx on public.admin_invites (lower(email));
create unique index if not exists admin_invites_code_idx on public.admin_invites (code);
