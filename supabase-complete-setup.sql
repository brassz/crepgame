-- ==============================================
-- SUPABASE COMPLETE SETUP - CRAPS GAME
-- ==============================================
-- Execute este arquivo completo no SQL Editor do Supabase
-- Contém todas as tabelas, funções, políticas e configurações necessárias

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. PROFILES TABLE (Enhanced for game data)
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
-- 2. GAME ROOMS TABLE (Single room per type)
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
    -- Ensure only one room per type exists
    UNIQUE(room_type)
);

-- ==============================================
-- 3. GAME SESSIONS TABLE (Track active games)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    current_shooter UUID REFERENCES public.profiles(id),
    current_turn INTEGER DEFAULT 0,
    phase TEXT DEFAULT 'come_out' CHECK (phase IN ('come_out', 'point')),
    point_value INTEGER CHECK (point_value IS NULL OR point_value IN (4,5,6,8,9,10)),
    dice_result JSON, -- Store last dice roll {die1: 3, die2: 4, timestamp: "..."}
    turn_started_at TIMESTAMP WITH TIME ZONE,
    turn_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 4. PLAYER SESSIONS TABLE (Players in rooms)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.player_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    player_order INTEGER, -- Turn order in the room
    socket_id TEXT -- For real-time tracking
);

-- ==============================================
-- 5. GAME BETS TABLE (All bets placed)
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
-- 6. DICE ROLLS TABLE (Game history)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.dice_rolls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    shooter_id UUID REFERENCES public.profiles(id),
    die1 INTEGER NOT NULL CHECK (die1 >= 1 AND die1 <= 6),
    die2 INTEGER NOT NULL CHECK (die2 >= 1 AND die2 <= 6),
    total INTEGER GENERATED ALWAYS AS (die1 + die2) STORED,
    roll_number INTEGER, -- Which roll in the sequence (1st, 2nd, etc.)
    phase TEXT NOT NULL CHECK (phase IN ('come_out', 'point')),
    result TEXT, -- 'win', 'lose', 'point_established', 'continue'
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. GAME EVENTS TABLE (For real-time updates)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'player_joined', 'bet_placed', 'dice_rolled', 'turn_changed', etc.
    event_data JSON NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 8. REALTIME TABLES (For dice game mechanics)
-- ==============================================
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

CREATE TABLE IF NOT EXISTS public.room_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    socket_id TEXT,
    UNIQUE(room_id, user_id)
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
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
CREATE INDEX IF NOT EXISTS idx_room_sessions_active ON public.room_sessions(is_active, joined_at);

-- Prevent duplicate active sessions (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_sessions_unique_active 
ON public.player_sessions(player_id, room_id) 
WHERE is_active = true;

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Game rooms: Everyone can read, no direct updates (managed by functions)
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;
CREATE POLICY "Anyone can view game rooms" ON public.game_rooms FOR SELECT USING (true);

-- Game sessions: Players can view sessions of rooms they're in
DROP POLICY IF EXISTS "Players can view relevant game sessions" ON public.game_sessions;
CREATE POLICY "Players can view relevant game sessions" ON public.game_sessions FOR SELECT USING (
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Player sessions: Players can view their own and others in same room
DROP POLICY IF EXISTS "Players can view sessions" ON public.player_sessions;
CREATE POLICY "Players can view sessions" ON public.player_sessions FOR SELECT USING (
    player_id = auth.uid() OR
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Game bets: Players can view bets in their games and manage their own
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

-- Dice rolls: Players can view rolls in their games
DROP POLICY IF EXISTS "Players can view dice rolls" ON public.dice_rolls;
CREATE POLICY "Players can view dice rolls" ON public.dice_rolls FOR SELECT USING (
    game_session_id IN (
        SELECT gs.id FROM public.game_sessions gs
        JOIN public.player_sessions ps ON ps.room_id = gs.room_id
        WHERE ps.player_id = auth.uid() AND ps.is_active = true
    )
);

-- Game events: Players can view events in their rooms
DROP POLICY IF EXISTS "Players can view game events" ON public.game_events;
CREATE POLICY "Players can view game events" ON public.game_events FOR SELECT USING (
    room_id IN (
        SELECT room_id FROM public.player_sessions 
        WHERE player_id = auth.uid() AND is_active = true
    )
);

-- Game moves: Users can view all moves and insert/update their own
DROP POLICY IF EXISTS "Users can view all moves" ON public.game_moves;
CREATE POLICY "Users can view all moves" ON public.game_moves FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own moves" ON public.game_moves;
CREATE POLICY "Users can insert their own moves" ON public.game_moves FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can update their own moves" ON public.game_moves;
CREATE POLICY "Users can update their own moves" ON public.game_moves FOR UPDATE USING (auth.uid() = player_id);

-- Current turn: Users can view all turn states and system can manage
DROP POLICY IF EXISTS "Users can view all turn states" ON public.current_turn;
CREATE POLICY "Users can view all turn states" ON public.current_turn FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage turn state" ON public.current_turn;
CREATE POLICY "Users can manage turn state" ON public.current_turn FOR ALL USING (auth.uid() IS NOT NULL);

-- Room sessions: Users can view and manage their own sessions
DROP POLICY IF EXISTS "Users can view room sessions" ON public.room_sessions;
CREATE POLICY "Users can view room sessions" ON public.room_sessions FOR SELECT USING (
    user_id = auth.uid() OR 
    room_id IN (SELECT room_id FROM public.room_sessions WHERE user_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.room_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.room_sessions FOR ALL USING (user_id = auth.uid());

-- ==============================================
-- UTILITY FUNCTIONS
-- ==============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically create profile when user signs up
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

-- ==============================================
-- MAIN GAME FUNCTIONS
-- ==============================================

-- Function to create room instances (only one room per type)
CREATE OR REPLACE FUNCTION create_room_instances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_configs RECORD;
    v_room_name TEXT;
BEGIN
    -- Room configurations - Create only ONE room per type
    FOR room_configs IN 
        SELECT 'bronze' as room_type, 50.00 as min_bet, 1000.00 as max_bet
        UNION ALL
        SELECT 'prata' as room_type, 100.00 as min_bet, 3000.00 as max_bet
        UNION ALL
        SELECT 'ouro' as room_type, 200.00 as min_bet, 5000.00 as max_bet
    LOOP
        -- Room name = tipo em maiúsculo
        v_room_name := UPPER(room_configs.room_type);
        
        INSERT INTO public.game_rooms (room_type, room_name, min_bet, max_bet, max_players)
        VALUES (room_configs.room_type, v_room_name, room_configs.min_bet, room_configs.max_bet, 8)
        ON CONFLICT (room_type) DO NOTHING;
    END LOOP;
END;
$$;

-- Function to join a room (MAIN FUNCTION USED BY CLIENT)
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
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Get player profile
    SELECT * INTO player_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Check if player is already in a room
    SELECT * INTO existing_session 
    FROM public.player_sessions ps
    JOIN public.game_rooms gr ON gr.id = ps.room_id
    WHERE ps.player_id = auth.uid() AND ps.is_active = true;

    IF FOUND THEN
        -- Leave current room first
        PERFORM leave_room();
    END IF;

    -- Find an available room of the requested type
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

    -- Get or create game session for this room
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

    -- Check if player already has an active session in this specific room
    SELECT * INTO new_session 
    FROM public.player_sessions 
    WHERE player_id = auth.uid() 
    AND room_id = available_room.id 
    AND is_active = true;

    IF FOUND THEN
        -- Player is already in this room, return existing session
        -- Update the socket_id if provided
        IF p_socket_id IS NOT NULL THEN
            UPDATE public.player_sessions 
            SET socket_id = p_socket_id, updated_at = NOW()
            WHERE id = new_session.id;
        END IF;
    ELSE
        -- Join the room with new session
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

        -- Update room player count
        UPDATE public.game_rooms 
        SET current_players = current_players + 1,
            updated_at = NOW()
        WHERE id = available_room.id;
    END IF;

    -- Create room session for realtime functionality
    INSERT INTO public.room_sessions (room_id, user_id, is_active, joined_at, socket_id)
    VALUES (available_room.id::TEXT, auth.uid(), true, NOW(), p_socket_id)
    ON CONFLICT (room_id, user_id) 
    DO UPDATE SET is_active = true, joined_at = NOW(), socket_id = p_socket_id;

    -- Initialize turn cycle if needed
    PERFORM join_room_turn_cycle(available_room.id::TEXT);

    -- Log join event
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

    -- Get updated room info for return
    SELECT * INTO available_room FROM public.game_rooms WHERE id = available_room.id;

    -- Return success with room info
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

-- Function to leave a room
CREATE OR REPLACE FUNCTION leave_room()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_session RECORD;
    room_info RECORD;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Find active session
    SELECT ps.*, gr.id as room_id, gr.current_players, gs.id as game_session_id
    INTO player_session
    FROM public.player_sessions ps
    JOIN public.game_rooms gr ON gr.id = ps.room_id
    JOIN public.game_sessions gs ON gs.id = ps.game_session_id
    WHERE ps.player_id = auth.uid() AND ps.is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Not in any room');
    END IF;

    -- Mark session as inactive
    UPDATE public.player_sessions 
    SET is_active = false, left_at = NOW()
    WHERE id = player_session.id;

    -- Update room player count
    UPDATE public.game_rooms 
    SET current_players = current_players - 1,
        updated_at = NOW()
    WHERE id = player_session.room_id;

    -- Mark room session as inactive
    UPDATE public.room_sessions 
    SET is_active = false, left_at = NOW()
    WHERE room_id = player_session.room_id::TEXT AND user_id = auth.uid();

    -- Log leave event
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

-- Function to initialize or join a room turn cycle
CREATE OR REPLACE FUNCTION join_room_turn_cycle(p_room_id TEXT)
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

    -- Check if turn cycle exists for this room
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    -- Get current player count
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    IF NOT FOUND THEN
        -- No turn cycle exists, create one with first player
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
        -- Update player count in existing turn cycle
        UPDATE public.current_turn 
        SET 
            total_players = v_player_count,
            updated_at = NOW()
        WHERE room_id = p_room_id;
    END IF;

    -- Return current turn state
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

-- Function to handle dice roll and turn management
CREATE OR REPLACE FUNCTION handle_dice_roll(
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
    -- Get current user
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if it's the player's turn
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id AND current_player_id = v_player_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Check if turn hasn't expired
    IF NOW() > v_current_turn.turn_ends_at THEN
        RAISE EXCEPTION 'Turn has expired';
    END IF;

    -- Insert the dice move
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, phase, result, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, p_phase, p_result, true)
    RETURNING id INTO v_move_id;

    -- Get total players in room
    SELECT COUNT(DISTINCT user_id) INTO v_player_count
    FROM public.room_sessions 
    WHERE room_id = p_room_id AND is_active = true;

    -- Calculate next player
    v_next_index := (v_current_turn.player_index % v_player_count) + 1;
    
    -- Get next player ID
    SELECT user_id INTO v_next_player_id
    FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) as rn
        FROM public.room_sessions 
        WHERE room_id = p_room_id AND is_active = true
    ) ranked_players
    WHERE rn = v_next_index;

    -- Update current turn to next player
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

-- Function to handle animation completion
CREATE OR REPLACE FUNCTION complete_dice_animation(p_move_id BIGINT)
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

-- Function to record dice roll
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
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Validate player is in this game session
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

    -- Get next roll number
    SELECT COALESCE(MAX(roll_number), 0) + 1 INTO roll_number
    FROM public.dice_rolls
    WHERE game_session_id = p_game_session_id;

    -- Record the roll
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

    -- Update game session with latest roll
    UPDATE public.game_sessions
    SET dice_result = json_build_object(
            'die1', p_die1,
            'die2', p_die2,
            'total', p_die1 + p_die2,
            'timestamp', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_game_session_id;

    -- Log roll event
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

-- Function to place a bet
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
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Get player profile
    SELECT * INTO player_profile FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Check balance
    IF player_profile.balance < p_bet_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Validate game session access
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

    -- Validate bet amount
    IF p_bet_amount < game_session.min_bet OR p_bet_amount > game_session.max_bet THEN
        RETURN json_build_object('success', false, 'error', 'Bet amount outside room limits');
    END IF;

    -- Place the bet
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

    -- Deduct from balance
    UPDATE public.profiles 
    SET balance = balance - p_bet_amount,
        updated_at = NOW()
    WHERE id = auth.uid();

    -- Log bet event
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

-- Function to clean up existing duplicate rooms
CREATE OR REPLACE FUNCTION cleanup_duplicate_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove all existing rooms first (to start fresh)
    DELETE FROM public.game_rooms;
    
    -- Reset any related session data if needed
    DELETE FROM public.player_sessions;
    DELETE FROM public.game_sessions;
    DELETE FROM public.game_bets;
    DELETE FROM public.dice_rolls;
    DELETE FROM public.game_events;
    DELETE FROM public.room_sessions;
    DELETE FROM public.game_moves;
    DELETE FROM public.current_turn;
    
    RAISE NOTICE 'All existing rooms and related data cleaned up';
END;
$$;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Apply the trigger to relevant tables
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

-- Trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.game_rooms TO authenticated;
GRANT SELECT ON public.game_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_sessions TO authenticated;
GRANT SELECT, INSERT ON public.game_bets TO authenticated;
GRANT SELECT, INSERT ON public.dice_rolls TO authenticated;
GRANT SELECT, INSERT ON public.game_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_sessions TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.join_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_turn_cycle TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bet TO authenticated;

-- ==============================================
-- INITIAL DATA SETUP
-- ==============================================

-- Clean existing rooms and create fresh unique rooms
SELECT cleanup_duplicate_rooms();
SELECT create_room_instances();

-- ==============================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- ==============================================

-- Enable real-time on relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_rolls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;

-- ==============================================
-- SETUP COMPLETE
-- ==============================================

-- Verify setup
SELECT 'Setup complete!' as status, count(*) as rooms_created FROM public.game_rooms;