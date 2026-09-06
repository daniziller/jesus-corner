-- Jesus' Corner — nome de usuário público, pro link pessoal de convite de
-- amigo (quadro 24c: "jesuscorner.app/d/diego"). Antes disso não existia
-- nenhum identificador público de conta — só nome (livre, repetível) e
-- e-mail (privado). O username é opcional e só é gerado na hora em que a
-- pessoa abre o cartão "Compartilhar meu convite" pela primeira vez (ver
-- src/friends/inviteLinkStore.js) — ninguém escolhe um username antes
-- disso, não é um passo novo no cadastro.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- Case-insensitive por construção: o formato acima já força minúsculas, e
-- getOrCreateMyUsername() sempre normaliza antes de gravar — o índice único
-- é só a garantia de banco, não depende de confiar no cliente.
create unique index if not exists profiles_username_unique on public.profiles (username) where username is not null;

-- RPC pública (SECURITY DEFINER, bypassa RLS de propósito): resolve
-- "quem é @username" pra montar um pedido de amizade a partir do link
-- pessoal — precisa funcionar pra QUALQUER um que tenha o link, amigo ou
-- não, autenticado ou não (a página que trata /d/:username no app roda
-- antes do login quando quem visita ainda não tem conta). Só devolve nome e
-- foto — nunca bio, nunca is_public, nunca progresso: quem compartilhou o
-- link já consentiu em ser encontrado por ele, mas isso não abre o resto do
-- perfil (isso continua exigindo amizade aceita, ver get_friend_progress_summary).
create or replace function public.resolve_username(target_username text)
returns table(user_id uuid, name text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select user_id, name, avatar_url
  from public.profiles
  where username = lower(target_username)
  limit 1;
$$;

grant execute on function public.resolve_username(text) to anon, authenticated;
