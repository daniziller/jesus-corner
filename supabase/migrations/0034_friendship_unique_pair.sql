-- A constraint `unique (requester_id, addressee_id)` de 0002 só bloqueia
-- pedido duplicado no MESMO sentido (A→B). Nada impedia B de também mandar
-- um pedido pra A enquanto o de A→B ainda estava pendente — cada sentido é
-- uma chave primária diferente. Resultado real em produção: duas linhas
-- `pending` cruzadas, e se as duas fossem aceitas (ou uma aceita e a outra
-- ficasse "esquecida" pendente pra sempre), `friendships` acumulava DUAS
-- linhas 'accepted' pro mesmo par — amigo duplicado na grade, contagem "N
-- amigos" inflada (getFriends/getFriendsCount em friendsStore.js usam
-- `.or(requester.eq/addressee.eq)`, então contam as duas linhas).
--
-- Um relacionamento de amizade é sempre um só, independente de quem pediu
-- primeiro — normaliza o par com least/greatest pra impedir as duas linhas
-- cruzadas de existirem ao mesmo tempo, em qualquer estado (pending ou
-- accepted). O client já trata erro 23505 como "já existe pedido/amizade"
-- (ver sendFriendRequest/sendFriendRequestByUserId em
-- src/friends/friendsStore.js), então nenhuma mudança de client é
-- necessária além da que já existe.
-- Antes de criar o índice único, limpa pares cruzados que já possam existir
-- em produção (a única forma de esse bug ter passado despercebido) — sem
-- isso o CREATE UNIQUE INDEX abaixo falharia. Mantém 1 linha por par:
-- prioriza uma já 'accepted' (é a amizade de verdade); sem nenhuma
-- accepted, mantém a mais antiga 'pending' (o pedido original).
with ranked as (
  select id,
    row_number() over (
      partition by least(requester_id, addressee_id), greatest(requester_id, addressee_id)
      order by (status = 'accepted') desc, created_at asc
    ) as rn
  from public.friendships
)
delete from public.friendships
where id in (select id from ranked where rn > 1);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
