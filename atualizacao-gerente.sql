-- ============================================================
-- MONITOR EXTRA (GERENTE) — acesso restrito ao monitor
-- ------------------------------------------------------------
-- O gerente ve: Produtos, Cadastrar produto, Inventario, Despacho
-- e a Visao Geral SEM valores em dinheiro. Nao pode mudar quantidades.
--
-- COMO ADICIONAR UM GERENTE A UMA LOJA:
-- 1) O gerente entra UMA vez em login.html com o email dele (cria a conta).
-- 2) Descobre o id da loja (na tabela 'lojas', copia o 'id' da loja certa).
-- 3) Corre o comando abaixo, trocando o EMAIL do gerente e o ID-DA-LOJA:

insert into membros_loja (user_id, loja_id, papel, nome_exibicao)
select u.id, 'ID-DA-LOJA-AQUI', 'gerente', 'Gerente'
from auth.users u
where u.email = 'email-do-gerente@gmail.com'
on conflict do nothing;

-- Para REMOVER o acesso do gerente mais tarde:
-- delete from membros_loja
-- where loja_id = 'ID-DA-LOJA-AQUI' and papel = 'gerente'
--   and user_id = (select id from auth.users where email = 'email-do-gerente@gmail.com');
