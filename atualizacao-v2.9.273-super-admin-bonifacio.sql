-- SPAP v2.9.273 — Super admin bonifacioadelino1@gmail.com com entrada directa
-- Correr UMA vez no Supabase (SQL Editor). Pode correr-se de novo sem problema.
--
-- O que faz: garante que existe a conta deste super admin, JÁ CONFIRMADA, com a
-- palavra-passe 844219. Depois disto, no login escreve-se o email + 844219 e entra.
-- Se a conta já existir, só confirma e repõe a palavra-passe para 844219.
-- (A palavra-passe fica guardada cifrada pelo próprio Supabase, nunca em texto.)

create extension if not exists pgcrypto;

do $$
declare
  v_email text := 'bonifacioadelino1@gmail.com';
  v_senha text := '844219';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = v_email;

  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      v_email, crypt(v_senha, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );

    -- ligação de identidade (o esquema mudou entre versões do Supabase: tenta com «id», senão sem)
    begin
      insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
      values (gen_random_uuid(), v_email, uid,
              jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true),
              'email', now(), now(), now());
    exception when undefined_column then
      begin
        insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
        values (v_email, uid,
                jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true),
                'email', now(), now(), now());
      exception when undefined_column then
        -- versões antigas: «id» é o id do fornecedor (texto)
        insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
        values (uid::text, uid,
                jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true),
                'email', now(), now(), now());
      end;
    end;
  else
    -- já existe: confirma e repõe a palavra-passe para 844219
    update auth.users
      set encrypted_password = crypt(v_senha, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = uid;
  end if;
end $$;
