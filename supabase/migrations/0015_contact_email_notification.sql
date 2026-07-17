-- Jesus' Corner — notificação por e-mail (via Resend) toda vez que uma
-- mensagem nova cai em contact_messages (app ou site). Usa pg_net (chamada
-- HTTP assíncrona direto do Postgres) + Vault (segredo criptografado no
-- banco) — não precisa de Edge Function separada.
--
-- A API key do Resend NÃO fica neste arquivo (nem em nenhum arquivo do
-- repositório). Depois de rodar esta migração, rode À PARTE — só uma vez,
-- direto no SQL Editor, sem salvar/commitar — o comando abaixo trocando
-- SUA_API_KEY_AQUI pela chave de verdade:
--
--   select vault.create_secret('SUA_API_KEY_AQUI', 'resend_api_key');
--
-- Se digitar a chave errada e quiser trocar depois:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'resend_api_key'),
--     'NOVA_API_KEY_AQUI'
--   );
--
-- Como rodar esta migração: cole este arquivo inteiro no SQL Editor do
-- Supabase e rode. Seguro rodar mais de uma vez (idempotente). Depois,
-- não esqueça de rodar o comando do vault acima (separadamente).

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

create or replace function public.notify_contact_message()
returns trigger
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  resend_key text;
begin
  select decrypted_secret into resend_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  -- Sem a chave configurada no Vault ainda, só loga um aviso e segue —
  -- a mensagem já foi salva em contact_messages de qualquer forma, o
  -- e-mail é só um bônus de notificação em cima disso.
  if resend_key is null then
    raise warning 'resend_api_key não configurada no Vault — pulando notificação por e-mail';
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', E'Jesus\' Corner — Fale Conosco <info@jesuscorner.app>',
      'to', jsonb_build_array('info@jesuscorner.app'),
      'reply_to', new.email,
      'subject', 'Nova mensagem via Fale Conosco (' || new.source || ')',
      'text',
        'Nome: ' || new.name || E'\n' ||
        'E-mail: ' || new.email || E'\n' ||
        'Origem: ' || new.source || E'\n\n' ||
        'Mensagem:' || E'\n' || new.message
    )
  );

  return new;
end;
$$;

drop trigger if exists on_contact_message_created on public.contact_messages;
create trigger on_contact_message_created
  after insert on public.contact_messages
  for each row execute function public.notify_contact_message();
