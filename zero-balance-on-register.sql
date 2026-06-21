-- Novos cadastros começam com saldo zero; crédito só via painel admin.
-- Execute no Supabase SQL Editor.

ALTER TABLE public.users
    ALTER COLUMN balance SET DEFAULT 0.00;

CREATE OR REPLACE FUNCTION register_user(
    p_email TEXT,
    p_username TEXT,
    p_password_hash TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_cpf TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user RECORD;
    existing_user RECORD;
BEGIN
    SELECT * INTO existing_user FROM public.users WHERE email = p_email;
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
    END IF;

    SELECT * INTO existing_user FROM public.users WHERE username = p_username;
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Nome de usuário já existe');
    END IF;

    IF p_cpf IS NOT NULL AND p_cpf != '' THEN
        SELECT * INTO existing_user FROM public.users WHERE cpf = p_cpf;
        IF FOUND THEN
            RETURN json_build_object('success', false, 'error', 'CPF já cadastrado');
        END IF;
    END IF;

    INSERT INTO public.users (email, username, password_hash, full_name, cpf, balance)
    VALUES (p_email, p_username, p_password_hash, p_full_name, p_cpf, 0.00)
    RETURNING id, email, username, full_name, cpf, balance, created_at INTO new_user;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', new_user.id,
            'email', new_user.email,
            'username', new_user.username,
            'full_name', new_user.full_name,
            'cpf', new_user.cpf,
            'balance', new_user.balance,
            'created_at', new_user.created_at
        )
    );
END;
$$;
