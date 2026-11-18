-- Cache do áudio da voz natural no servidor (pedido dela, 2026-11-18): cada
-- trecho lido pela voz natural é gerado uma vez e guardado aqui, pra todos
-- os assinantes — ver api/_lib/ttsCache.js.
--
-- Bucket PRIVADO: nenhuma política pra `anon` ou `authenticated`. Só o
-- service role (api/tts.js) lê e grava; o app recebe um link assinado e
-- temporário pra cada arquivo. Só mp3, até 5 MB por arquivo (um trecho tem
-- no máximo 6.000 caracteres, bem menos que isso em áudio).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts-audio', 'tts-audio', false, 5242880, array['audio/mpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
