alter table public.user_data add column if not exists inductive_studies jsonb not null default '[]'::jsonb;
