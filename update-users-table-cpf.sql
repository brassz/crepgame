-- ============================================
-- ADICIONAR CAMPO CPF NA TABELA DE USUÁRIOS
-- ============================================

-- Adicionar coluna CPF se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'cpf'
    ) THEN
        ALTER TABLE public.users ADD COLUMN cpf TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf);
    END IF;
END $$;

-- Atualizar função register_user para aceitar CPF
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
    -- Verificar se email já existe
    SELECT * INTO existing_user FROM public.users WHERE email = p_email;
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
    END IF;
    
    -- Verificar se username já existe
    SELECT * INTO existing_user FROM public.users WHERE username = p_username;
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Nome de usuário já existe');
    END IF;
    
    -- Verificar se CPF já existe (se fornecido)
    IF p_cpf IS NOT NULL AND p_cpf != '' THEN
        SELECT * INTO existing_user FROM public.users WHERE cpf = p_cpf;
        IF FOUND THEN
            RETURN json_build_object('success', false, 'error', 'CPF já cadastrado');
        END IF;
    END IF;
    
    -- Criar novo usuário
    INSERT INTO public.users (email, username, password_hash, full_name, cpf, balance)
    VALUES (p_email, p_username, p_password_hash, p_full_name, p_cpf, 1000.00)
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

