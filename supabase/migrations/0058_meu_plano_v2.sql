-- Jesus' Corner — "Meu Plano" v2 (turno 35, Bloco 1: 35c/35i/35j).
-- Ver handoff-meu-plano-35/HANDOFF-35-meu-plano.md ("Regras de dados/backend").
--
-- O que este bloco precisa que ainda não existia:
--   1) Estudo ganha minutos próprios (até aqui era só liga/desliga, ver
--      comentário antigo em AdjustPlanScreen.jsx) — mesma faixa/semântica
--      de prayer/reading/reflection_minutes (0049): null = sem preferência,
--      0 = passo desligado.
--   2) Dias da semana por PASSO, não mais um só (weekly_days, 0049) pra
--      rotina inteira — Oração/Leitura/Estudo/Reflexão podem cair em dias
--      diferentes (HANDOFF, "Dias por trilha — regra geral"). step_days nulo
--      (conta que ainda não configurou nada) ou faltando uma chave cai no
--      weekly_days de sempre — ver src/routine/stepDaysStore.js. weekly_days
--      continua existindo (não é lido por esta leva, mas outras telas ainda
--      dependem dele — não migrar sozinho sem pedido).
--   3) Ordem da leitura contínua da Bíblia (canônica/cronológica/minha
--      ordem) SEM resetar progresso — troca só a fila, o completedSet de
--      sempre continua sendo a fonte de "o que já foi lido" (mesmo princípio
--      que deriveChronoProgress já usa hoje pro cronológico como plano
--      alternativo). custom_book_order guarda a fila de "Minha ordem"
--      (lista de nomes de livro em pt); null usa a ordem canônica como
--      ponto de partida pra pessoa reordenar.
--   4) Ritmo aprendido (mediana móvel de palavras/minuto) — o toggle
--      "Montar os blocos pelo meu ritmo" (use_learned_pace) e o log de
--      amostras por sessão (reading_pace_sessions, capado em ~12 pelo
--      cliente — ver src/reading/readingPaceStore.js). A gravação de
--      verdade (palavras/versículos/segundos por sessão) só começa no
--      Bloco 3 (35f); aqui a tela 35i só precisa ter onde ler/gravar.
--   5) Preferências do cronômetro de leitura (35c, bloco "Cronômetro") —
--      mostrar contagem/avisar ao zerar/perguntar se quer continuar.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists study_minutes integer
    check (study_minutes is null or study_minutes between 0 and 60);

alter table public.user_data
  add column if not exists step_days jsonb;

alter table public.user_data
  add column if not exists bible_order_mode text not null default 'canonical'
    check (bible_order_mode in ('canonical', 'chronological', 'custom'));

alter table public.user_data
  add column if not exists custom_book_order jsonb;

alter table public.user_data
  add column if not exists use_learned_pace boolean not null default false;

alter table public.user_data
  add column if not exists reading_pace_sessions jsonb not null default '[]';

alter table public.user_data
  add column if not exists reading_clock_prefs jsonb not null default
    '{"showOnReading":true,"warnAtZero":true,"askToContinue":true}';

-- 6) "Quando terminar" (35j) — o que fazer quando o estudo ativo acabar.
-- Só a PREFERÊNCIA fica salva neste bloco; o gatilho que as consome (estudo
-- chegou ao fim → começa o próximo salvo e/ou devolve os dias à Bíblia)
-- entra numa leva futura, junto do resto do fluxo de estudo ativo (Bloco 2/4
-- do turno 35) — não existe ainda onde "terminar um estudo" é detectado.
alter table public.user_data
  add column if not exists study_auto_next boolean not null default false;

alter table public.user_data
  add column if not exists study_return_days boolean not null default true;
