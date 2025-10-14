-- ==============================================
-- SISTEMA COMPLETO DE JOGO DE DADOS MULTIPLAYER
-- ==============================================
-- Este arquivo SQL contém toda a estrutura necessária para o sistema
-- Execute este script completo no seu Supabase SQL Editor
-- 
-- Funcionalidades incluídas:
-- - Sistema de perfis de usuários
-- - Salas de jogo com diferentes níveis
-- - Sessões de jogo e controle de turnos
-- - Sistema de apostas
-- - Histórico de jogadas
-- - Eventos em tempo real
-- - Políticas de segurança RLS
-- - Funções para todas as operações
-- ==============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. TABELA DE PERFIS DE USUÁRIOS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    username TEXT UNIQUE,
    balance NUMERIC(12,2) DEFAULT 1000.00,
    total_winnings NUMERIC(12,2) DEFAULT 0.00,
    total_losses NUMERIC(12,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. TABELA DE SALAS DE JOGO
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_type TEXT NOT NULL CHECK (room_type IN ('bronze', 'prata', 'ouro')),
    room_name TEXT NOT NULL,
    min_bet NUMERIC(8,2) NOT NULL,
    max_bet NUMERIC(8,2) NOT NULL,
    max_players INTEGER DEFAULT 8,
    current_players INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Garantir apenas uma sala por tipo
    UNIQUE(room_type)
);

-- ==============================================
-- 3. TABELA DE SESSÕES DE JOGO
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    current_shooter UUID REFERENCES public.profiles(id),
    current_turn INTEGER DEFAULT 0,
    phase TEXT DEFAULT 'come_out' CHECK (phase IN ('come_out', 'point')),
    point_value INTEGER CHECK (point_value IS NULL OR point_value IN (4,5,6,8,9,10)),
    dice_result JSON, -- Armazenar último resultado dos dados
    turn_started_at TIMESTAMP WITH TIME ZONE,
    turn_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 4. TABELA DE SESSÕES DE JOGADORES
-- ==============================================
CREATE TABLE IF NOT EXISTS public.player_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    player_order INTEGER, -- Ordem dos turnos na sala
    socket_id TEXT -- Para rastreamento em tempo real
);

-- ==============================================
-- 5. TABELA DE APOSTAS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    bet_type TEXT NOT NULL, -- 'pass_line', 'dont_pass', 'field', 'come', etc.
    bet_amount NUMERIC(8,2) NOT NULL CHECK (bet_amount > 0),
    odds_multiplier NUMERIC(4,2) DEFAULT 1.0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'pushed')),
    payout NUMERIC(8,2) DEFAULT 0,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- 6. TABELA DE JOGADAS DOS DADOS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.dice_rolls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    shooter_id UUID REFERENCES public.profiles(id),
    die1 INTEGER NOT NULL CHECK (die1 >= 1 AND die1 <= 6),
    die2 INTEGER NOT NULL CHECK (die2 >= 1 AND die2 <= 6),
    total INTEGER GENERATED ALWAYS AS (die1 + die2) STORED,
    roll_number INTEGER, -- Qual jogada na sequência
    phase TEXT NOT NULL CHECK (phase IN ('come_out', 'point')),
    result TEXT, -- 'win', 'lose', 'point_established', 'continue'
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. TABELA DE EVENTOS DO JOGO
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'player_joined', 'bet_placed', 'dice_rolled', etc.
    event_data JSON NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 8. TABELAS PARA SISTEMA DE TURNOS SIMPLIFICADO
-- ==============================================
CREATE TABLE IF NOT EXISTS public.room_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.game_moves (
    id BIGSERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dice_1 INTEGER NOT NULL CHECK (dice_1 >= 1 AND dice_1 <= 6),
    dice_2 INTEGER NOT NULL CHECK (dice_2 >= 1 AND dice_2 <= 6),
    total INTEGER GENERATED ALWAYS AS (dice_1 + dice_2) STORED,
    phase TEXT NOT NULL DEFAULT 'come_out',
    result TEXT,
    animation_started BOOLEAN DEFAULT FALSE,
    animation_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.current_turn (
    room_id TEXT PRIMARY KEY,
    current_player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    player_index INTEGER DEFAULT 1,
    total_players INTEGER DEFAULT 1,
    turn_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    turn_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '25 seconds'),
    is_active BOOLEAN DEFAULT TRUE,
    last_roll_id BIGINT REFERENCES public.game_moves(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_game_rooms_type_active ON public.game_rooms(room_type, is_active);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON public.player_sessions(room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status, room_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_active ON public.game_bets(game_session_id, status);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_session ON public.dice_rolls(game_session_id, rolled_at);
CREATE INDEX IF NOT EXISTS idx_game_events_room ON public.game_events(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_moves_room_id ON public.game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON public.game_moves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_turn_room_id ON public.current_turn(room_id);
CREATE INDEX IF NOT EXISTS idx_current_turn_player_id ON public.current_turn(current_player_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_room_user ON public.room_sessions(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_active ON public.room_sessions(room_id, is_active);

-- Prevenir sessões duplicadas ativas
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_sessions_unique_active 
ON public.player_sessions(player_id, room_id) 
WHERE is_active = true;

-- ==============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- POLÍTICAS DE SEGURANÇA RLS
-- ==============================================

-- Perfis: Usuários podem ver todos os perfis mas só atualizar o próprio
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Salas de jogo: Todos podem ver, sem atualizações diretas
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;
CREATE POLICY "Anyone can view game rooms" ON public.game_rooms FOR SELECT USING (true);

-- Sessões de jogo: Jogadores podem ver sessões das salas em que estão
DROP POLICY IF EXISTS "Players can view relevant game sessions" ON public.game_sessions;
CREATE POLICY "Players can view relevant game sessions" ON public.game_sessions FOR SELECT USING (
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Sessões de jogadores: Jogadores podem ver suas próprias e de outros na mesma sala
DROP POLICY IF EXISTS "Players can view sessions" ON public.player_sessions;
CREATE POLICY "Players can view sessions" ON public.player_sessions FOR SELECT USING (
    player_id = auth.uid() OR
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Apostas: Jogadores podem ver apostas em seus jogos e gerenciar as próprias
DROP POLICY IF EXISTS "Players can view game bets" ON public.game_bets;
CREATE POLICY "Players can view game bets" ON public.game_bets FOR SELECT USING (
    game_session_id IN (
        SELECT gs.id FROM public.game_sessions gs
        JOIN public.player_sessions ps ON ps.room_id = gs.room_id
        WHERE ps.player_id = auth.uid() AND ps.is_active = true
    )
);

DROP POLICY IF EXISTS "Players can place their own bets" ON public.game_bets;
CREATE POLICY "Players can place their own bets" ON public.game_bets FOR INSERT WITH CHECK (player_id = auth.uid());

-- Jogadas dos dados: Jogadores podem ver jogadas em seus jogos
DROP POLICY IF EXISTS "Players can view dice rolls" ON public.dice_rolls;
CREATE POLICY "Players can view dice rolls" ON public.dice_rolls FOR SELECT USING (
    game_session_id IN (
        SELECT gs.id FROM public.game_sessions gs
        JOIN public.player_sessions ps ON ps.room_id = gs.room_id
        WHERE ps.player_id = auth.uid() AND ps.is_active = true
    )
);

-- Eventos do jogo: Jogadores podem ver eventos em suas salas
DROP POLICY IF EXISTS "Players can view game events" ON public.game_events;
CREATE POLICY "Players can view game events" ON public.game_events FOR SELECT USING (
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Políticas para sistema de turnos simplificado
DROP POLICY IF EXISTS "Users can manage their room sessions" ON public.room_sessions;
CREATE POLICY "Users can manage their room sessions" ON public.room_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view room sessions in their rooms" ON public.room_sessions;
CREATE POLICY "Users can view room sessions in their rooms" ON public.room_sessions
    FOR SELECT USING (
        room_id IN (
            SELECT room_id FROM public.room_sessions 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can view moves in their room" ON public.game_moves;
CREATE POLICY "Users can view moves in their room" ON public.game_moves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = game_moves.room_id 
            AND rs.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their own moves" ON public.game_moves;
CREATE POLICY "Users can insert their own moves" ON public.game_moves
    FOR INSERT WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = game_moves.room_id 
            AND rs.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can update their own moves" ON public.game_moves;
CREATE POLICY "Users can update their own moves" ON public.game_moves
    FOR UPDATE USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can view turn state in their room" ON public.current_turn;
CREATE POLICY "Users can view turn state in their room" ON public.current_turn
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = current_turn.room_id 
            AND rs.is_active = true
        )
    );

DROP POLICY IF EXISTS "System can manage turn state" ON public.current_turn;
CREATE POLICY "System can manage turn state" ON public.current_turn
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.uid() = current_player_id
    );

-- ==============================================
-- FUNÇÕES PARA LÓGICA DO JOGO
-- ==============================================

-- Função para criar instâncias das salas (apenas uma sala por tipo)
CREATE OR REPLACE FUNCTION create_room_instances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_configs RECORD;
    v_room_name TEXT;
BEGIN
    -- Configurações das salas - Criar apenas UMA sala por tipo
    FOR room_configs IN 
        SELECT 'bronze' as room_type, 50.00 as min_bet, 1000.00 as max_bet
        UNION ALL
        SELECT 'prata' as room_type, 100.00 as min_bet, 3000.00 as max_bet
        UNION ALL
        SELECT 'ouro' as room_type, 200.00 as min_bet, 5000.00 as max_bet
    LOOP
        -- Nome da sala = tipo em maiúsculo
        v_room_name := UPPER(room_configs.room_type);
        
        INSERT INTO public.game_rooms (room_type, room_name, min_bet, max_bet, max_players)
        VALUES (room_configs.room_type, v_room_name, room_configs.min_bet, room_configs.max_bet, 8)
        ON CONFLICT (room_type) DO NOTHING;
    END LOOP;
END;
$$;

-- Função para entrar em uma sala
CREATE OR REPLACE FUNCTION join_room(p_room_type TEXT, p_socket_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_profile RECORD;
    available_room RECORD;
    existing_session RECORD;
    new_session RECORD;
    game_session RECORD;
    result JSON;
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Obter perfil do jogador
    SELECT * INTO player_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Verificar se o jogador já está em uma sala
    SELECT * INTO existing_session 
    FROM public.player_sessions ps
    JOIN public.game_rooms gr ON gr.id = ps.room_id
    WHERE ps.player_id = auth.uid() AND ps.is_active = true;

    IF FOUND THEN
        -- Sair da sala atual primeiro
        PERFORM leave_room();
    END IF;

    -- Encontrar uma sala disponível do tipo solicitado
    SELECT * INTO available_room
    FROM public.game_rooms
    WHERE room_type = p_room_type 
    AND is_active = true 
    AND current_players < max_players
    ORDER BY current_players ASC, created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No available rooms of type ' || p_room_type);
    END IF;

    -- Obter ou criar sessão de jogo para esta sala
    SELECT * INTO game_session
    FROM public.game_sessions
    WHERE room_id = available_room.id AND status IN ('waiting', 'active')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.game_sessions (room_id, status)
        VALUES (available_room.id, 'waiting')
        RETURNING * INTO game_session;
    END IF;

    -- Entrar na sala com nova sessão
    INSERT INTO public.player_sessions (
        player_id, 
        room_id, 
        game_session_id, 
        socket_id,
        player_order
    )
    VALUES (
        auth.uid(), 
        available_room.id, 
        game_session.id, 
        p_socket_id,
        available_room.current_players + 1
    )
    RETURNING * INTO new_session;

    -- Atualizar contagem de jogadores na sala
    UPDATE public.game_rooms 
    SET current_players = current_players + 1,
        updated_at = NOW()
    WHERE id = available_room.id;

    -- Registrar evento de entrada
    INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
    VALUES (
        available_room.id,
        game_session.id,
        'player_joined',
        json_build_object(
            'player_id', auth.uid(),
            'username', player_profile.username,
            'player_count', (SELECT current_players FROM public.game_rooms WHERE id = available_room.id)
        ),
        auth.uid()
    );

    -- Obter informações atualizadas da sala para retorno
    SELECT * INTO available_room FROM public.game_rooms WHERE id = available_room.id;

    -- Retornar sucesso com informações da sala
    RETURN json_build_object(
        'success', true,
        'room', json_build_object(
            'id', available_room.id,
            'room_type', available_room.room_type,
            'room_name', available_room.room_name,
            'min_bet', available_room.min_bet,
            'max_bet', available_room.max_bet,
            'current_players', available_room.current_players,
            'max_players', available_room.max_players
        ),
        'game_session_id', game_session.id,
        'player_session_id', new_session.id
    );
END;
$$;

-- Função para sair de uma sala
CREATE OR REPLACE FUNCTION leave_room()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_session RECORD;
    room_info RECORD;
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Encontrar sessão ativa
    SELECT ps.*, gr.id as room_id, gr.current_players, gs.id as game_session_id
    INTO player_session
    FROM public.player_sessions ps
    JOIN public.game_rooms gr ON gr.id = ps.room_id
    JOIN public.game_sessions gs ON gs.id = ps.game_session_id
    WHERE ps.player_id = auth.uid() AND ps.is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Not in any room');
    END IF;

    -- Marcar sessão como inativa
    UPDATE public.player_sessions 
    SET is_active = false, left_at = NOW()
    WHERE id = player_session.id;

    -- Atualizar contagem de jogadores na sala
    UPDATE public.game_rooms 
    SET current_players = current_players - 1,
        updated_at = NOW()
    WHERE id = player_session.room_id;

    -- Registrar evento de saída
    INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
    VALUES (
        player_session.room_id,
        player_session.game_session_id,
        'player_left',
        json_build_object(
            'player_id', auth.uid(),
            'player_count', player_session.current_players - 1
        ),
        auth.uid()
    );

    RETURN json_build_object('success', true);
END;
$$;

-- Função para registrar jogada dos dados
CREATE OR REPLACE FUNCTION record_dice_roll(
    p_game_session_id UUID,
    p_die1 INTEGER,
    p_die2 INTEGER,
    p_phase TEXT,
    p_result TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    game_session RECORD;
    roll_record RECORD;
    roll_number INTEGER;
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Validar se o jogador está nesta sessão de jogo
    SELECT gs.*, gr.id as room_id INTO game_session
    FROM public.game_sessions gs
    JOIN public.game_rooms gr ON gr.id = gs.room_id
    JOIN public.player_sessions ps ON ps.room_id = gr.id
    WHERE gs.id = p_game_session_id 
    AND ps.player_id = auth.uid() 
    AND ps.is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized for this game session');
    END IF;

    -- Obter próximo número da jogada
    SELECT COALESCE(MAX(roll_number), 0) + 1 INTO roll_number
    FROM public.dice_rolls
    WHERE game_session_id = p_game_session_id;

    -- Registrar a jogada
    INSERT INTO public.dice_rolls (
        game_session_id,
        shooter_id,
        die1,
        die2,
        roll_number,
        phase,
        result
    )
    VALUES (
        p_game_session_id,
        auth.uid(),
        p_die1,
        p_die2,
        roll_number,
        p_phase,
        p_result
    )
    RETURNING * INTO roll_record;

    -- Atualizar sessão de jogo com última jogada
    UPDATE public.game_sessions
    SET dice_result = json_build_object(
            'die1', p_die1,
            'die2', p_die2,
            'total', p_die1 + p_die2,
            'timestamp', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_game_session_id;

    -- Registrar evento da jogada
    INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
    VALUES (
        game_session.room_id,
        p_game_session_id,
        'dice_rolled',
        json_build_object(
            'die1', p_die1,
            'die2', p_die2,
            'total', p_die1 + p_die2,
            'roll_number', roll_number,
            'phase', p_phase,
            'result', p_result,
            'shooter_id', auth.uid()
        ),
        auth.uid()
    );

    RETURN json_build_object(
        'success', true,
        'roll', json_build_object(
            'id', roll_record.id,
            'die1', p_die1,
            'die2', p_die2,
            'total', p_die1 + p_die2,
            'roll_number', roll_number
        )
    );
END;
$$;

-- Função para fazer uma aposta
CREATE OR REPLACE FUNCTION place_bet(
    p_game_session_id UUID,
    p_bet_type TEXT,
    p_bet_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_profile RECORD;
    game_session RECORD;
    new_bet RECORD;
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Obter perfil do jogador
    SELECT * INTO player_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Verificar saldo
    IF player_profile.balance < p_bet_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Validar acesso à sessão de jogo
    SELECT gs.*, gr.id as room_id, gr.min_bet, gr.max_bet INTO game_session
    FROM public.game_sessions gs
    JOIN public.game_rooms gr ON gr.id = gs.room_id
    JOIN public.player_sessions ps ON ps.room_id = gr.id
    WHERE gs.id = p_game_session_id 
    AND ps.player_id = auth.uid() 
    AND ps.is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized for this game session');
    END IF;

    -- Validar valor da aposta
    IF p_bet_amount < game_session.min_bet OR p_bet_amount > game_session.max_bet THEN
        RETURN json_build_object('success', false, 'error', 'Bet amount outside room limits');
    END IF;

    -- Fazer a aposta
    INSERT INTO public.game_bets (
        player_id,
        game_session_id,
        bet_type,
        bet_amount,
        status
    )
    VALUES (
        auth.uid(),
        p_game_session_id,
        p_bet_type,
        p_bet_amount,
        'active'
    )
    RETURNING * INTO new_bet;

    -- Deduzir do saldo
    UPDATE public.profiles 
    SET balance = balance - p_bet_amount,
        updated_at = NOW()
    WHERE id = auth.uid();

    -- Registrar evento da aposta
    INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
    VALUES (
        game_session.room_id,
        p_game_session_id,
        'bet_placed',
        json_build_object(
            'bet_id', new_bet.id,
            'player_id', auth.uid(),
            'bet_type', p_bet_type,
            'bet_amount', p_bet_amount
        ),
        auth.uid()
    );

    RETURN json_build_object(
        'success', true,
        'bet', json_build_object(
            'id', new_bet.id,
            'bet_type', p_bet_type,
            'bet_amount', p_bet_amount
        ),
        'new_balance', player_profile.balance - p_bet_amount
    );
END;
$$;

-- Função para gerenciar jogada dos dados e turnos
CREATE OR REPLACE FUNCTION public.handle_dice_roll(
    p_room_id TEXT,
    p_dice_1 INTEGER,
    p_dice_2 INTEGER,
    p_phase TEXT DEFAULT 'come_out',
    p_result TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_move_id BIGINT;
    v_current_turn RECORD;
    v_next_player_id UUID;
    v_player_count INTEGER;
    v_next_index INTEGER;
BEGIN
    -- Obter usuário atual
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verificar se é o turno do jogador
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id AND current_player_id = v_player_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Verificar se o turno não expirou
    IF NOW() > v_current_turn.turn_ends_at THEN
        RAISE EXCEPTION 'Turn has expired';
    END IF;

    -- Inserir a jogada dos dados
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, phase, result, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, p_phase, p_result, true)
    RETURNING id INTO v_move_id;

    -- Obter total de jogadores na sala
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    -- Calcular próximo jogador
    v_next_index := (v_current_turn.player_index % v_player_count) + 1;
    
    -- Obter ID do próximo jogador
    SELECT user_id INTO v_next_player_id
    FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) as rn
        FROM public.room_sessions 
        WHERE room_id = p_room_id AND is_active = true
    ) ranked_players
    WHERE rn = v_next_index;

    -- Atualizar turno atual para o próximo jogador
    UPDATE public.current_turn 
    SET 
        current_player_id = v_next_player_id,
        player_index = v_next_index,
        total_players = v_player_count,
        turn_starts_at = NOW(),
        turn_ends_at = NOW() + INTERVAL '25 seconds',
        last_roll_id = v_move_id,
        updated_at = NOW()
    WHERE room_id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'move_id', v_move_id,
        'next_player_id', v_next_player_id,
        'next_player_index', v_next_index,
        'total_players', v_player_count,
        'dice_1', p_dice_1,
        'dice_2', p_dice_2,
        'total', p_dice_1 + p_dice_2
    );
END;
$$;

-- Função para inicializar ou entrar no ciclo de turnos de uma sala
CREATE OR REPLACE FUNCTION public.join_room_turn_cycle(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_current_turn RECORD;
    v_player_count INTEGER;
    v_first_player_id UUID;
BEGIN
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verificar se existe ciclo de turnos para esta sala
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    -- Obter contagem atual de jogadores
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    IF NOT FOUND THEN
        -- Não existe ciclo de turnos, criar um com o primeiro jogador
        SELECT user_id INTO v_first_player_id
        FROM public.room_sessions 
        WHERE room_id = p_room_id AND is_active = true
        ORDER BY joined_at
        LIMIT 1;

        INSERT INTO public.current_turn (
            room_id, 
            current_player_id, 
            player_index, 
            total_players,
            turn_starts_at,
            turn_ends_at
        ) VALUES (
            p_room_id, 
            v_first_player_id, 
            1, 
            v_player_count,
            NOW(),
            NOW() + INTERVAL '25 seconds'
        );
    ELSE
        -- Atualizar contagem de jogadores no ciclo de turnos existente
        UPDATE public.current_turn 
        SET 
            total_players = v_player_count,
            updated_at = NOW()
        WHERE room_id = p_room_id;
    END IF;

    -- Retornar estado atual do turno
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'current_player_id', v_current_turn.current_player_id,
        'player_index', v_current_turn.player_index,
        'total_players', v_current_turn.total_players,
        'turn_ends_at', v_current_turn.turn_ends_at,
        'is_my_turn', v_current_turn.current_player_id = v_player_id
    );
END;
$$;

-- Função para completar animação dos dados
CREATE OR REPLACE FUNCTION public.complete_dice_animation(p_move_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
BEGIN
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    UPDATE public.game_moves 
    SET 
        animation_completed = true,
        updated_at = NOW()
    WHERE id = p_move_id AND player_id = v_player_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Move not found or not authorized';
    END IF;

    RETURN jsonb_build_object('success', true, 'move_id', p_move_id);
END;
$$;

-- Função para entrar em uma sala (versão simplificada)
CREATE OR REPLACE FUNCTION public.join_room_simple(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_current_turn RECORD;
    v_session_exists BOOLEAN;
BEGIN
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Garantir que existe sessão de sala para este jogador
    INSERT INTO public.room_sessions (room_id, user_id, is_active, joined_at)
    VALUES (p_room_id, v_player_id, true, NOW())
    ON CONFLICT (room_id, user_id) 
    DO UPDATE SET is_active = true, joined_at = NOW();

    -- Verificar se existe ciclo de turnos para esta sala
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    IF NOT FOUND THEN
        -- Criar novo ciclo de turnos com este jogador como primeiro
        INSERT INTO public.current_turn (
            room_id, 
            current_player_id, 
            player_index, 
            total_players,
            turn_starts_at,
            turn_ends_at
        ) VALUES (
            p_room_id, 
            v_player_id, 
            1, 
            1,
            NOW(),
            NOW() + INTERVAL '25 seconds'
        );
        
        -- Obter o registro inserido
        SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'current_player_id', v_current_turn.current_player_id,
        'player_index', v_current_turn.player_index,
        'total_players', v_current_turn.total_players,
        'turn_ends_at', v_current_turn.turn_ends_at,
        'is_my_turn', v_current_turn.current_player_id = v_player_id
    );
END;
$$;

-- Função simplificada para lançamento de dados (usada pelo supabase-realtime-dice.js)
CREATE OR REPLACE FUNCTION public.handle_dice_roll_simple(
    p_room_id TEXT,
    p_dice_1 INTEGER,
    p_dice_2 INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_move_id BIGINT;
    v_current_turn RECORD;
    v_next_player_id UUID;
    v_player_count INTEGER;
    v_next_index INTEGER;
BEGIN
    -- Obter usuário atual
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verificar se é o turno do jogador
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id AND current_player_id = v_player_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Verificar se o turno não expirou
    IF NOW() > v_current_turn.turn_ends_at THEN
        RAISE EXCEPTION 'Turn has expired';
    END IF;

    -- Inserir a jogada dos dados (versão simplificada)
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, phase, result, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, 'come_out', NULL, true)
    RETURNING id INTO v_move_id;

    -- Obter total de jogadores na sala
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    -- Calcular próximo jogador
    v_next_index := (v_current_turn.player_index % v_player_count) + 1;
    
    -- Obter ID do próximo jogador
    SELECT user_id INTO v_next_player_id
    FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) as rn
        FROM public.room_sessions 
        WHERE room_id = p_room_id AND is_active = true
    ) ranked_players
    WHERE rn = v_next_index;

    -- Atualizar turno atual para o próximo jogador
    UPDATE public.current_turn 
    SET 
        current_player_id = v_next_player_id,
        player_index = v_next_index,
        total_players = v_player_count,
        turn_starts_at = NOW(),
        turn_ends_at = NOW() + INTERVAL '25 seconds',
        last_roll_id = v_move_id,
        updated_at = NOW()
    WHERE room_id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'move_id', v_move_id,
        'next_player_id', v_next_player_id,
        'next_player_index', v_next_index,
        'total_players', v_player_count,
        'dice_1', p_dice_1,
        'dice_2', p_dice_2,
        'total', p_dice_1 + p_dice_2
    );
END;
$$;

-- ==============================================
-- TRIGGERS E FUNÇÕES AUXILIARES
-- ==============================================

-- Função para atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, balance)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        1000.00
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Aplicar triggers às tabelas relevantes
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON public.game_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON public.game_sessions;
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_moves_updated_at ON public.game_moves;
CREATE TRIGGER update_game_moves_updated_at BEFORE UPDATE ON public.game_moves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_current_turn_updated_at ON public.current_turn;
CREATE TRIGGER update_current_turn_updated_at BEFORE UPDATE ON public.current_turn FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_sessions_updated_at ON public.room_sessions;
CREATE TRIGGER update_room_sessions_updated_at BEFORE UPDATE ON public.room_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfis automaticamente para novos usuários
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================
-- FUNÇÕES DE LIMPEZA E CONFIGURAÇÃO
-- ==============================================

-- Função para limpar salas duplicadas existentes
CREATE OR REPLACE FUNCTION cleanup_duplicate_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remover todas as salas existentes primeiro (para começar limpo)
    DELETE FROM public.game_rooms;
    
    -- Resetar dados de sessão relacionados se necessário
    DELETE FROM public.player_sessions;
    DELETE FROM public.game_sessions;
    DELETE FROM public.game_bets;
    DELETE FROM public.dice_rolls;
    DELETE FROM public.game_events;
    
    RAISE NOTICE 'All existing rooms and related data cleaned up';
END;
$$;

-- ==============================================
-- PERMISSÕES
-- ==============================================

-- Conceder permissões necessárias
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.game_rooms TO authenticated;
GRANT SELECT ON public.game_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_sessions TO authenticated;
GRANT SELECT, INSERT ON public.game_bets TO authenticated;
GRANT SELECT, INSERT ON public.dice_rolls TO authenticated;
GRANT SELECT, INSERT ON public.game_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;

-- Conceder uso de sequências
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;

-- Conceder execução de funções
GRANT EXECUTE ON FUNCTION create_room_instances TO authenticated;
GRANT EXECUTE ON FUNCTION join_room TO authenticated;
GRANT EXECUTE ON FUNCTION leave_room TO authenticated;
GRANT EXECUTE ON FUNCTION record_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_turn_cycle TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_rooms TO authenticated;

-- ==============================================
-- CONFIGURAÇÃO INICIAL DE DADOS
-- ==============================================

-- Limpar salas existentes e criar salas únicas frescas
SELECT cleanup_duplicate_rooms();
SELECT create_room_instances();

-- ==============================================
-- CONFIGURAÇÃO DE TEMPO REAL
-- ==============================================

-- Habilitar tempo real nas tabelas relevantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_rolls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;

-- ==============================================
-- CONFIGURAÇÃO COMPLETA
-- ==============================================

-- Para verificar a configuração, execute:
-- SELECT 'Setup complete!' as status, count(*) as rooms_created FROM public.game_rooms;

-- ==============================================
-- RESUMO DAS FUNCIONALIDADES INCLUÍDAS:
-- ==============================================
-- ✅ Sistema completo de perfis de usuários
-- ✅ Salas de jogo com diferentes níveis (bronze, prata, ouro)
-- ✅ Sistema de sessões de jogo e controle de turnos
-- ✅ Sistema completo de apostas
-- ✅ Histórico detalhado de jogadas dos dados
-- ✅ Sistema de eventos em tempo real
-- ✅ Políticas de segurança RLS completas
-- ✅ Funções para todas as operações do jogo
-- ✅ Triggers para atualizações automáticas
-- ✅ Índices para performance otimizada
-- ✅ Configuração de tempo real para todas as tabelas
-- ✅ Sistema de limpeza e configuração inicial
-- ✅ Permissões adequadas para todos os recursos
-- ==============================================