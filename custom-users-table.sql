-- ==============================================
-- TABELA DE USUÁRIOS CUSTOMIZADA (SEM AUTH)
-- ==============================================
-- Esta tabela substitui o sistema auth.users do Supabase
-- Execute este script no seu Supabase SQL Editor

-- Criar tabela de usuários customizada
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    balance NUMERIC(12,2) DEFAULT 1000.00,
    total_winnings NUMERIC(12,2) DEFAULT 0.00,
    total_losses NUMERIC(12,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler usuários (para rankings, etc)
DROP POLICY IF EXISTS "Todos podem ver usuários" ON public.users;
CREATE POLICY "Todos podem ver usuários" ON public.users FOR SELECT USING (true);

-- Política: Usuários podem atualizar apenas seus próprios dados
-- Nota: Como não usamos auth.uid(), precisamos gerenciar isso no backend
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.users;
CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.users FOR UPDATE USING (true);

-- Política: Permitir inserção de novos usuários (registro)
DROP POLICY IF EXISTS "Permitir registro de novos usuários" ON public.users;
CREATE POLICY "Permitir registro de novos usuários" ON public.users FOR INSERT WITH CHECK (true);

-- ==============================================
-- FUNÇÃO PARA REGISTRAR NOVO USUÁRIO
-- ==============================================
-- Nota: A senha deve ser hasheada no cliente antes de enviar
CREATE OR REPLACE FUNCTION register_user(
    p_email TEXT,
    p_username TEXT,
    p_password_hash TEXT,
    p_full_name TEXT DEFAULT NULL
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
    
    -- Criar novo usuário
    INSERT INTO public.users (email, username, password_hash, full_name, balance)
    VALUES (p_email, p_username, p_password_hash, p_full_name, 1000.00)
    RETURNING id, email, username, full_name, balance, created_at INTO new_user;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', new_user.id,
            'email', new_user.email,
            'username', new_user.username,
            'full_name', new_user.full_name,
            'balance', new_user.balance,
            'created_at', new_user.created_at
        )
    );
END;
$$;

-- ==============================================
-- FUNÇÃO PARA LOGIN DE USUÁRIO
-- ==============================================
CREATE OR REPLACE FUNCTION login_user(
    p_email TEXT,
    p_password_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar usuário por email e senha
    SELECT id, email, username, full_name, balance, total_winnings, total_losses, games_played, avatar_url
    INTO user_record
    FROM public.users
    WHERE email = p_email AND password_hash = p_password_hash AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Email ou senha incorretos');
    END IF;
    
    -- Atualizar último login
    UPDATE public.users 
    SET last_login = NOW(), updated_at = NOW()
    WHERE id = user_record.id;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'username', user_record.username,
            'full_name', user_record.full_name,
            'balance', user_record.balance,
            'total_winnings', user_record.total_winnings,
            'total_losses', user_record.total_losses,
            'games_played', user_record.games_played,
            'avatar_url', user_record.avatar_url
        )
    );
END;
$$;

-- ==============================================
-- FUNÇÃO PARA ATUALIZAR SALDO DO USUÁRIO
-- ==============================================
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id UUID,
    p_new_balance NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Atualizar saldo
    UPDATE public.users 
    SET balance = p_new_balance, updated_at = NOW()
    WHERE id = p_user_id AND is_active = true
    RETURNING id, balance INTO user_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_record.id,
        'balance', user_record.balance
    );
END;
$$;

-- ==============================================
-- FUNÇÃO PARA OBTER DADOS DO USUÁRIO
-- ==============================================
CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT id, email, username, full_name, balance, total_winnings, total_losses, games_played, avatar_url
    INTO user_record
    FROM public.users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'username', user_record.username,
            'full_name', user_record.full_name,
            'balance', user_record.balance,
            'total_winnings', user_record.total_winnings,
            'total_losses', user_record.total_losses,
            'games_played', user_record.games_played,
            'avatar_url', user_record.avatar_url
        )
    );
END;
$$;

-- ==============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ==============================================
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_timestamp ON public.users;
CREATE TRIGGER update_users_timestamp 
BEFORE UPDATE ON public.users 
FOR EACH ROW 
EXECUTE FUNCTION update_users_updated_at();

-- ==============================================
-- SETUP COMPLETO
-- ==============================================
-- Para verificar a instalação:
-- SELECT 'Tabela users criada com sucesso!' as status;
