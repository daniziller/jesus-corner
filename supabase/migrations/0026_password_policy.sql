-- Endurece a política de senha: de 6 dígitos numéricos (PIN) para pelo menos
-- 8 caracteres com maiúscula, minúscula, número e caractere especial.
--
-- Não há como validar retroativamente a senha de quem já tem conta — o
-- Supabase guarda só o hash, nunca o texto, por desenho. A saída é marcar
-- toda conta existente pra trocar a senha no próximo login; quem se
-- cadastrar depois desta migration já entra com senha no padrão novo, então
-- a coluna nasce com default false.
alter table public.profiles
  add column if not exists password_needs_update boolean not null default false;

comment on column public.profiles.password_needs_update is
  'true força a troca de senha no próximo login (ver ForceChangePasswordStep '
  'em AuthScreen.jsx). Setado em massa nesta migration pra quem já tinha '
  'conta antes da política de senha mudar de PIN de 6 dígitos pra senha '
  'forte; o próprio usuário zera ao trocar a senha.';

-- Contas já excluídas (lápide anonimizada) nunca mais logam — não faz
-- sentido marcar.
update public.profiles
set password_needs_update = true
where deleted_at is null;
