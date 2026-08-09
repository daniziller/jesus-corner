-- Ordem de leitura escolhida (Antigo Testamento primeiro, como sempre foi,
-- ou Novo Testamento primeiro — sugestão pra quem está lendo a Bíblia pela
-- primeira vez, ver onboarding em src/screens/AuthScreen.jsx). Só muda a
-- ORDEM em que os 8 blocos temáticos são percorridos (src/utils/progress.js)
-- — não afeta completed_keys nem exige renumerar nada, já que a numeração
-- "Sessão X de Y" é por bloco, não um índice global pela Bíblia inteira.
alter table public.user_data add column reading_order text not null default 'ot_first';
