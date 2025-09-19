-- ============================================================================
-- SUPABASE SQL SCHEMA FOR CRAPS GAME
-- ============================================================================
-- Este arquivo contém todas as tabelas e configurações necessárias para o
-- sistema de jogo de Craps com suporte a salas, apostas e jogadores
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELA DE USUÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(10,2) DEFAULT 1000.00,
    total_winnings DECIMAL(10,2) DEFAULT 0.00,
    total_losses DECIMAL(10,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA DE SALAS/MESAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_bet DECIMAL(10,2) DEFAULT 50.00,
    max_bet DECIMAL(10,2), -- NULL = sem limite
    max_players INTEGER DEFAULT 8,
    current_players INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA DE JOGOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    shooter_id UUID REFERENCES users(id),
    game_state VARCHAR(20) DEFAULT 'waiting', -- waiting, come_out, point, ended
    point_number INTEGER, -- 4, 5, 6, 8, 9, 10
    roll_count INTEGER DEFAULT 0,
    total_pot DECIMAL(10,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA DE ROLLS (JOGADAS DOS DADOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dice_rolls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    dice1 INTEGER NOT NULL CHECK (dice1 >= 1 AND dice1 <= 6),
    dice2 INTEGER NOT NULL CHECK (dice2 >= 1 AND dice2 <= 6),
    total INTEGER GENERATED ALWAYS AS (dice1 + dice2) STORED,
    roll_type VARCHAR(20), -- come_out, point, natural, craps
    is_winner BOOLEAN,
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA DE APOSTAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bet_type VARCHAR(50) NOT NULL, -- pass_line, dont_pass, field, etc.
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    odds_amount DECIMAL(10,2) DEFAULT 0.00,
    payout DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active', -- active, won, lost, pushed
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TABELA DE PARTICIPANTES DA SALA
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- ============================================================================
-- TABELA DE HISTÓRICO DE TRANSAÇÕES
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    bet_id UUID REFERENCES bets(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL, -- bet, win, loss, deposit, withdrawal
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA DE ESTATÍSTICAS DO USUÁRIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    biggest_win DECIMAL(10,2) DEFAULT 0.00,
    biggest_loss DECIMAL(10,2) DEFAULT 0.00,
    favorite_bet_type VARCHAR(50),
    average_bet DECIMAL(10,2) DEFAULT 0.00,
    total_time_played INTERVAL DEFAULT '0 minutes',
    last_played TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INSERÇÃO DE DADOS INICIAIS
-- ============================================================================

-- Inserir sala principal
INSERT INTO rooms (room_code, name, description, min_bet, max_bet, max_players) 
VALUES ('principal', 'Mesa Principal', 'Mesa principal do jogo com aposta mínima de 50 reais e sem limite máximo', 50.00, NULL, 8)
ON CONFLICT (room_code) DO NOTHING;

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Índices para rooms
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- Índices para games
CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_state ON games(game_state);
CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);

-- Índices para bets
CREATE INDEX IF NOT EXISTS idx_bets_game ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_type ON bets(bet_type);

-- Índices para room_participants
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_active ON room_participants(is_active);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- ============================================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contador de jogadores na sala
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        UPDATE rooms SET current_players = current_players + 1 WHERE id = NEW.room_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = true AND NEW.is_active = false THEN
            UPDATE rooms SET current_players = current_players - 1 WHERE id = NEW.room_id;
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            UPDATE rooms SET current_players = current_players + 1 WHERE id = NEW.room_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
        UPDATE rooms SET current_players = current_players - 1 WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para contador de jogadores
CREATE TRIGGER trigger_update_room_player_count
    AFTER INSERT OR UPDATE OR DELETE ON room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View para estatísticas da sala
CREATE OR REPLACE VIEW room_stats AS
SELECT 
    r.id,
    r.room_code,
    r.name,
    r.min_bet,
    r.max_bet,
    r.max_players,
    r.current_players,
    COUNT(DISTINCT g.id) as total_games,
    COUNT(DISTINCT rp.user_id) as total_unique_players,
    COALESCE(SUM(b.amount), 0) as total_bets_amount
FROM rooms r
LEFT JOIN games g ON r.id = g.room_id
LEFT JOIN room_participants rp ON r.id = rp.room_id
LEFT JOIN bets b ON g.id = b.game_id
WHERE r.is_active = true
GROUP BY r.id, r.room_code, r.name, r.min_bet, r.max_bet, r.max_players, r.current_players;

-- View para estatísticas do usuário
CREATE OR REPLACE VIEW user_game_stats AS
SELECT 
    u.id,
    u.username,
    u.balance,
    COUNT(DISTINCT b.game_id) as games_played,
    COUNT(CASE WHEN b.status = 'won' THEN 1 END) as games_won,
    COUNT(CASE WHEN b.status = 'lost' THEN 1 END) as games_lost,
    COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.payout ELSE 0 END), 0) as total_winnings,
    COALESCE(SUM(CASE WHEN b.status = 'lost' THEN b.amount ELSE 0 END), 0) as total_losses,
    COALESCE(AVG(b.amount), 0) as average_bet
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.balance;

-- ============================================================================
-- FUNÇÕES ÚTEIS
-- ============================================================================

-- Função para obter configuração da sala
CREATE OR REPLACE FUNCTION get_room_config(room_code_param VARCHAR(20))
RETURNS JSON AS $$
DECLARE
    room_data RECORD;
BEGIN
    SELECT * INTO room_data FROM rooms WHERE room_code = room_code_param AND is_active = true;
    
    IF room_data IS NULL THEN
        RETURN json_build_object('error', 'Room not found');
    END IF;
    
    RETURN json_build_object(
        'room_code', room_data.room_code,
        'name', room_data.name,
        'description', room_data.description,
        'min_bet', room_data.min_bet,
        'max_bet', room_data.max_bet,
        'max_players', room_data.max_players,
        'current_players', room_data.current_players
    );
END;
$$ LANGUAGE plpgsql;

-- Função para processar aposta
CREATE OR REPLACE FUNCTION place_bet(
    p_user_id UUID,
    p_game_id UUID,
    p_bet_type VARCHAR(50),
    p_amount DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
    user_balance DECIMAL(10,2);
    room_config RECORD;
    bet_id UUID;
BEGIN
    -- Verificar saldo do usuário
    SELECT balance INTO user_balance FROM users WHERE id = p_user_id;
    
    IF user_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
    
    -- Verificar limites da sala
    SELECT r.min_bet, r.max_bet INTO room_config
    FROM games g
    JOIN rooms r ON g.room_id = r.id
    WHERE g.id = p_game_id;
    
    IF p_amount < room_config.min_bet THEN
        RETURN json_build_object('success', false, 'error', 'Aposta abaixo do mínimo');
    END IF;
    
    IF room_config.max_bet IS NOT NULL AND p_amount > room_config.max_bet THEN
        RETURN json_build_object('success', false, 'error', 'Aposta acima do máximo');
    END IF;
    
    -- Inserir aposta
    INSERT INTO bets (game_id, user_id, bet_type, amount)
    VALUES (p_game_id, p_user_id, p_bet_type, p_amount)
    RETURNING id INTO bet_id;
    
    -- Atualizar saldo do usuário
    UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;
    
    -- Registrar transação
    INSERT INTO transactions (user_id, game_id, bet_id, transaction_type, amount, balance_before, balance_after)
    VALUES (p_user_id, p_game_id, bet_id, 'bet', -p_amount, user_balance, user_balance - p_amount);
    
    RETURN json_build_object('success', true, 'bet_id', bet_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - OPCIONAL
-- ============================================================================
-- Descomente as linhas abaixo se quiser usar RLS

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================
-- Este schema fornece uma base sólida para um sistema de jogo de Craps com:
-- - Gerenciamento de usuários e autenticação
-- - Sistema de salas/mesas configuráveis
-- - Controle de apostas e limites
-- - Histórico completo de jogos e transações
-- - Estatísticas detalhadas
-- - Performance otimizada com índices
-- - Integridade referencial
-- - Triggers para automação
-- 
-- Para usar com Supabase:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Configure as políticas RLS conforme necessário
-- 3. Ajuste as permissões de acordo com sua aplicação
-- ============================================================================