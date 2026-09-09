-- Jesus' Corner — área de Estudos unificada (turno 41, handoff-estudos-41/).
--
-- Decisão (perguntada e confirmada com a autora, 2026-09-09): todo "plano
-- por tema" do app — nasça em Estudos, na Bíblia ("virar estudo"), na
-- Jornada ou proposto pra um grupo — passa a ser um Estudo completo dentro
-- de public.studies (26e/26f/26g, ver 0053_public_studies.sql), sem um
-- segundo sistema parecido rodando em paralelo. Os estudos "profundos"
-- antigos (Pentateuco etc., src/data/studies.js) saem da navegação — nenhum
-- PNG do pacote 41 mostra esse formato — mas nada é apagado do banco.
--
-- Este arquivo só ACRESCENTA colunas/visibilidade a public.studies (já
-- existe desde 0053): nada de tabela nova pro conteúdo por dia — o `ensino`/
-- `versículo-âncora`/`pergunta` gerados por IA entram dentro do próprio
-- jsonb de `passages` (schema flexível, sem migração pra mudar o formato de
-- cada item), gerados uma vez e guardados ali (ver HANDOFF-41 §"Modelo de
-- dados mínimo" e regra 4). A cópia pessoal (resposta escrita, rascunho,
-- duração, agenda própria, cota) mora em user_data.theme_plans, mesmo
-- padrão de sempre (jsonb, sem coluna própria).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002 e 0053 já
-- rodados.


-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNAS NOVAS EM public.studies
-- ═══════════════════════════════════════════════════════════════

-- "N min por dia" (41a/41c/41h) — fixo por estudo, não por dia (todo dia
-- do mesmo estudo tem a mesma duração de sessão).
alter table public.studies add column if not exists minutes_per_day integer not null default 15;

-- "revisado" do modelo de dados mínimo do HANDOFF — aqui é derivado do
-- mesmo mecanismo de confiança que já existe (denúncia automática esconde
-- com 3 denúncias, ver 0053): todo estudo público nasce revisado=true (a
-- "revisão" é o próprio processo de denúncia + moderação do painel admin,
-- não uma fila de aprovação manual separada, que este pacote não descreve).
alter table public.studies add column if not exists reviewed boolean not null default true;

-- Estudo "para o grupo" (41b, formato "Para o grupo / só admin") — visível
-- só pros membros ('joined') do grupo, não pro banco público geral.
alter table public.studies add column if not exists group_id uuid references public.reading_groups(id) on delete cascade;

alter table public.studies drop constraint if exists studies_visibility_check;
alter table public.studies add constraint studies_visibility_check check (visibility in ('invited', 'public', 'group'));

alter table public.studies drop constraint if exists studies_group_visibility_check;
alter table public.studies add constraint studies_group_visibility_check check (
  (visibility = 'group' and group_id is not null) or (visibility <> 'group' and group_id is null)
);

create index if not exists studies_group_idx on public.studies (group_id) where group_id is not null;


-- ═══════════════════════════════════════════════════════════════
-- 2. RLS — visibilidade 'group'
-- ═══════════════════════════════════════════════════════════════

-- Substitui a policy de SELECT de 0053 só pra acrescentar o caso 'group'
-- (membro 'joined' do grupo vê; quem não é membro, não).
drop policy if exists "estudos visiveis pelo escopo" on public.studies;
create policy "estudos visiveis pelo escopo" on public.studies
  for select
  to authenticated
  using (
    auth.uid() = author_id
    or (visibility = 'public' and not hidden)
    or (visibility = 'invited' and public.is_study_invitee(id))
    or (visibility = 'group' and not hidden and exists (
      select 1 from public.reading_group_members m
      where m.group_id = studies.group_id and m.user_id = auth.uid() and m.status = 'joined'
    ))
  );

-- "Para o grupo / só admin" (41b) — só moderador do grupo pode publicar
-- ali (mesmo espírito de "moderador monta o plano do grupo",
-- groupPlansStore.js), e só com group_id preenchido.
drop policy if exists "autor publica estudo" on public.studies;
create policy "autor publica estudo" on public.studies
  for insert
  with check (
    auth.uid() = author_id
    and (
      visibility <> 'group'
      or exists (
        select 1 from public.reading_group_members m
        where m.group_id = studies.group_id and m.user_id = auth.uid() and m.status = 'joined' and m.role = 'moderator'
      )
    )
  );

-- "Usar" (study_uses) — acrescenta o caso 'group' ao mesmo check de 0053.
drop policy if exists "marcar uso e so meu" on public.study_uses;
create policy "marcar uso e so meu" on public.study_uses
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.studies s
      where s.id = study_uses.study_id
        and (
          s.visibility = 'public' and not s.hidden
          or (s.visibility = 'invited' and public.is_study_invitee(s.id))
          or (s.visibility = 'group' and not s.hidden and exists (
            select 1 from public.reading_group_members m
            where m.group_id = s.group_id and m.user_id = auth.uid() and m.status = 'joined'
          ))
          or s.author_id = auth.uid()
        )
    )
  );
