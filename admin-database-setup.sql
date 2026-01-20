-- ============================================
-- PAINEL ADMINISTRATIVO - SETUP DO BANCO
-- ============================================

-- Tabela de administradores
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tabela de configurações de dados programados
CREATE TABLE IF NOT EXISTS public.dice_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.game_rooms(id),
    room_type TEXT,
    dice1 INTEGER NOT NULL CHECK (dice1 >= 1 AND dice1 <= 6),
    dice2 INTEGER NOT NULL CHECK (dice2 >= 1 AND dice2 <= 6),
    total INTEGER NOT NULL CHECK (total >= 2 AND total <= 12),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Tabela de depósitos
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_id UUID REFERENCES public.admin_users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relatórios (logs de ações)
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_users(id),
    action_type TEXT NOT NULL,
    description TEXT,
    target_user_id UUID REFERENCES public.users(id),
    target_room_id UUID REFERENCES public.game_rooms(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_cpf ON public.admin_users(cpf);
CREATE INDEX IF NOT EXISTS idx_dice_results_active ON public.dice_results(is_active);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);

-- Função para hash de senha (SHA-256)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para registrar admin
CREATE OR REPLACE FUNCTION register_admin(
    p_full_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_cpf TEXT,
    p_is_super_admin BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
BEGIN
    -- Hash da senha
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Inserir admin
    INSERT INTO public.admin_users (full_name, email, password_hash, cpf, is_super_admin)
    VALUES (p_full_name, p_email, v_password_hash, p_cpf, p_is_super_admin)
    RETURNING id INTO v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email ou CPF já cadastrado'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Função para login admin
CREATE OR REPLACE FUNCTION login_admin(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_password_hash TEXT;
BEGIN
    -- Hash da senha
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Buscar admin
    SELECT * INTO v_user
    FROM public.admin_users
    WHERE email = p_email
    AND is_active = true;
    
    -- Verificar se encontrou
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email ou senha incorretos'
        );
    END IF;
    
    -- Verificar senha
    IF v_user.password_hash != v_password_hash THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email ou senha incorretos'
        );
    END IF;
    
    -- Atualizar último login
    UPDATE public.admin_users
    SET last_login = NOW()
    WHERE id = v_user.id;
    
    -- Retornar dados do admin (sem senha)
    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'full_name', v_user.full_name,
            'email', v_user.email,
            'cpf', v_user.cpf,
            'is_super_admin', v_user.is_super_admin,
            'created_at', v_user.created_at
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas gerais
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM public.users WHERE is_active = true),
        'total_rooms', (SELECT COUNT(*) FROM public.game_rooms WHERE is_active = true),
        'total_bets', (SELECT COALESCE(SUM(amount), 0) FROM public.bets WHERE status = 'active'),
        'total_deposits_pending', (SELECT COUNT(*) FROM public.deposits WHERE status = 'pending'),
        'total_deposits_amount', (SELECT COALESCE(SUM(amount), 0) FROM public.deposits WHERE status = 'approved'),
        'online_players', (SELECT COUNT(DISTINCT user_id) FROM public.game_sessions WHERE is_active = true)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir tudo para anon por enquanto - ajustar conforme necessário)
CREATE POLICY "Allow all for admin_users" ON public.admin_users FOR ALL USING (true);
CREATE POLICY "Allow all for dice_results" ON public.dice_results FOR ALL USING (true);
CREATE POLICY "Allow all for deposits" ON public.deposits FOR ALL USING (true);
CREATE POLICY "Allow all for admin_logs" ON public.admin_logs FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Criar primeiro admin (senha: admin123)
-- IMPORTANTE: Alterar a senha após primeiro login!
INSERT INTO public.admin_users (full_name, email, password_hash, cpf, is_super_admin)
VALUES (
    'Administrador',
    'admin@dadosdasorte.com',
    encode(digest('admin123', 'sha256'), 'hex'),
    '00000000000',
    true
)
ON CONFLICT (email) DO NOTHING;

