-- Jesus' Corner — nome e descrição opcionais pra um desafio de grupo, além
-- da lista de livros que já existia. Desafios criados antes desta migração
-- ficam com name/description nulos — a UI cai de volta pra mostrar a lista
-- de livros como título nesse caso (ver ChallengeCard em GroupsScreen.jsx).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.reading_challenges
  add column if not exists name text,
  add column if not exists description text;

alter table public.reading_challenges
  drop constraint if exists reading_challenges_name_length,
  drop constraint if exists reading_challenges_description_length;

alter table public.reading_challenges
  add constraint reading_challenges_name_length check (name is null or char_length(name) <= 100),
  add constraint reading_challenges_description_length check (description is null or char_length(description) <= 500);
