-- Jesus' Corner — "o que o grupo lê" (quadro 24b, uma das três decisões da
-- criação de grupo): cada um no seu plano (padrão, como já era) ou um
-- plano só pra todos.
--
-- Limitação real, documentada: esta coluna guarda a ESCOLHA, mas ainda não
-- existe nenhum mecanismo que sincronize de fato a leitura de todo mundo
-- num grupo 'shared' — GroupHomeView.jsx (5d) continua mostrando "a sessão
-- de hoje da PRÓPRIA pessoa" (não um capítulo combinado do grupo), porque
-- esse capítulo combinado não existe como conceito no banco. Construir
-- isso de verdade (o moderador escolhe um livro/ritmo pro grupo inteiro, e
-- os membros passam a seguir ESSE plano em vez do próprio) é trabalho
-- futuro — está fora do escopo desta migração, que só guarda a intenção
-- pra não perder a resposta que a pessoa deu na criação.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.reading_groups add column if not exists reading_mode text not null default 'individual';

alter table public.reading_groups drop constraint if exists reading_groups_reading_mode_check;
alter table public.reading_groups add constraint reading_groups_reading_mode_check
  check (reading_mode in ('individual', 'shared'));

-- create_reading_group() ganha um 2º parâmetro (com default, pra não
-- quebrar nenhuma chamada antiga com só o nome) — precisa trocar a
-- assinatura da função, por isso o drop antes do create explícito.
drop function if exists public.create_reading_group(text);

create or replace function public.create_reading_group(group_name text, p_reading_mode text default 'individual')
returns public.reading_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.reading_groups;
  clean_mode text := case when p_reading_mode = 'shared' then 'shared' else 'individual' end;
begin
  insert into public.reading_groups (name, created_by, invite_code, reading_mode)
  values (group_name, auth.uid(), public.generate_group_invite_code(), clean_mode)
  returning * into new_group;

  insert into public.reading_group_members (group_id, user_id, status, role, joined_at)
  values (new_group.id, auth.uid(), 'joined', 'moderator', now());

  return new_group;
end;
$$;
