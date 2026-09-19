-- Jesus' Corner — restrição de 18+ da Comunidade, agora também no banco
-- (varredura geral, 2026-09-19; achada de forma independente por 2 agentes
-- na mesma checagem).
--
-- O app é destinado a maiores de 18 anos (src/privacy/minAge.js, MIN_AGE).
-- A restrição de "Comunidade exige 18+" (grupos, amigos, sala de capítulo,
-- pedidos de oração de grupo, mural, desafios) sempre existiu — mas só no
-- CLIENTE: `meetsMinAge` (App.jsx) desabilita a aba 'groups' e mostra
-- MinAgeRestricted. Nenhuma RLS/RPC no banco checava idade nenhuma. Uma
-- conta cuja data de nascimento (guardada em auth.users.raw_user_meta_data,
-- editável em Perfil sem nenhum piso de idade — decisão deliberada, ver
-- src/utils/age.js) indicasse menos de 18 anos podia continuar acessando
-- grupos/comentários/pedidos de grupo via chamada direta ao Supabase
-- (devtools, ou qualquer cliente que não seja o app), passando por cima do
-- gate do cliente por completo.
--
-- Correção: `is_group_member`/`is_group_moderator` (0002) são os DOIS
-- blocos de construção usados por praticamente toda RLS relacionada a
-- grupo no banco (18 arquivos de migration referenciam um dos dois) — sem
-- tocar em nenhuma política individual, basta essas duas passarem a exigir
-- TAMBÉM `meets_min_age` pra que toda a superfície de Comunidade (grupos,
-- comentários, pedidos de oração de grupo, sala de capítulo, desafios,
-- mensagens) negue automaticamente pra quem não bate a idade mínima.
--
-- `meets_min_age`: mesma semântica do cliente (isAtLeast/isUnderMinAge) —
-- SEM data de nascimento informada (conta legada, ou nunca preenchida) NÃO
-- restringe (retorna true); só nega quando há uma data informada e ela
-- indica menos de 18 anos. Escrita em plpgsql (não SQL puro) só pra poder
-- tolerar uma data malformada sem derrubar a checagem inteira (mesma
-- tolerância de "erro de formato não deveria travar a pessoa" do cliente).
--
-- Decisão de escopo (avisada, não escondida): não mexi nas policies de
-- INSERT em reading_group_members (entrar num grupo em si) — o efeito
-- prático já é o mesmo: quem não bate a idade mínima fica travado em
-- QUALQUER interação real de Comunidade (ler, comentar, orar, publicar)
-- mesmo que a linha de membership chegue a existir. Deixar essa segunda
-- camada de fora foi uma escolha de risco/retorno: tocar nos vários
-- caminhos de entrada num grupo (RPCs de convite/código/aceite) é mais
-- superfície pra quebrar sem fechar nenhuma lacuna real a mais.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente (create or replace). Pressupõe 0002 já rodado.

create or replace function public.meets_min_age(target_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  raw_birthdate text;
  parsed_birthdate date;
begin
  select au.raw_user_meta_data->>'birthdate' into raw_birthdate
  from auth.users au
  where au.id = target_user_id;

  if raw_birthdate is null then
    return true; -- sem data informada (conta legada) = não restringe
  end if;

  begin
    parsed_birthdate := raw_birthdate::date;
  exception when others then
    return true; -- data malformada = não trava (mesma tolerância do cliente)
  end;

  return parsed_birthdate <= (current_date - interval '18 years');
end;
$$;

grant execute on function public.meets_min_age(uuid) to authenticated;

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'joined'
  ) and public.meets_min_age(target_user_id);
$$;

create or replace function public.is_group_moderator(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'joined' and role = 'moderator'
  ) and public.meets_min_age(target_user_id);
$$;
