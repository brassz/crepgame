-- ==============================================
-- SUPABASE MULTIPLAYER CRAPS GAME DATABASE SETUP
-- ==============================================
-- This script creates all tables needed for the multiplayer craps game
-- Execute this in your Supabase SQL Editor

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
-- 2. GAME ROOMS TABLE (With unique IDs per room type)
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
    -- Generate unique room names like "BRONZE-001", "PRATA-015", etc
    UNIQUE(room_type, room_name)
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
-- INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_game_rooms_type_active ON public.game_rooms(room_type, is_active);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON public.player_sessions(room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status, room_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_active ON public.game_bets(game_session_id, status);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_session ON public.dice_rolls(game_session_id, rolled_at);
CREATE INDEX IF NOT EXISTS idx_game_events_room ON public.game_events(room_id, created_at);

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

-- ==============================================
-- FUNCTIONS FOR GAME LOGIC
-- ==============================================

-- Function to create room instances
-- Function to create room instances
CREATE OR REPLACE FUNCTION create_room_instances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_configs RECORD;
    room_counter INTEGER;
    v_room_name TEXT; -- renomeada para evitar conflito
BEGIN
    -- Room configurations
    FOR room_configs IN 
        SELECT 'bronze' as room_type, 50.00 as min_bet, 1000.00 as max_bet
        UNION ALL
        SELECT 'prata' as room_type, 100.00 as min_bet, 3000.00 as max_bet
        UNION ALL
        SELECT 'ouro' as room_type, 200.00 as min_bet, 5000.00 as max_bet
    LOOP
        -- Create 5 instances of each room type
        FOR room_counter IN 1..5 LOOP
            v_room_name := UPPER(room_configs.room_type) || '-' || LPAD(room_counter::TEXT, 3, '0');
            
            INSERT INTO public.game_rooms (room_type, room_name, min_bet, max_bet, max_players)
            VALUES (room_configs.room_type, v_room_name, room_configs.min_bet, room_configs.max_bet, 8)
            ON CONFLICT (room_type, room_name) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;


-- Function to join a room
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

    -- Join the room
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

    -- Log join event
    INSERT INTO public.game_events (room_id, game_session_id, event_type, event_data, created_by)
    VALUES (
        available_room.id,
        game_session.id,
        'player_joined',
        json_build_object(
            'player_id', auth.uid(),
            'username', player_profile.username,
            'player_count', available_room.current_players + 1
        ),
        auth.uid()
    );

    -- Return success with room info
    RETURN json_build_object(
        'success', true,
        'room', json_build_object(
            'id', available_room.id,
            'room_type', available_room.room_type,
            'room_name', available_room.room_name,
            'min_bet', available_room.min_bet,
            'max_bet', available_room.max_bet,
            'current_players', available_room.current_players + 1,
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

-- ==============================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ==============================================

-- Trigger to update profile timestamp
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

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON public.game_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON public.game_sessions;
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================
-- INITIAL DATA SETUP
-- ==============================================

-- Create initial room instances
SELECT create_room_instances();

-- Insert a test profile (optional - for testing purposes)
-- This will be replaced by actual user signups
-- NOTE: Commented out to avoid foreign key constraint violations
-- The profile will be created automatically when a real user signs up
-- INSERT INTO public.profiles (id, email, username, balance) 
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', 
--     'test@example.com', 
--     'TestPlayer', 
--     5000.00
-- ) ON CONFLICT (id) DO NOTHING;

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

-- ==============================================
-- SETUP COMPLETE
-- ==============================================

-- To verify setup, run:
-- SELECT 'Setup complete!' as status, count(*) as rooms_created FROM public.game_rooms;
