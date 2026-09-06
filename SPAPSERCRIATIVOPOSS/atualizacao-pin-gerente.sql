-- Codigo de acesso do Monitor Extra (gerente). Default 0000.
alter table lojas add column if not exists pin_gerente text default '0000';
update lojas set pin_gerente = '0000' where pin_gerente is null;
