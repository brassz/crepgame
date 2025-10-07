-- ==============================================
-- COMPLETE SUPABASE DATABASE SETUP FOR CRAPS GAME (FIXED)
-- ==============================================
-- This file fixes the missing room_sessions dependency
-- Execute this entire file in your Supabase SQL Editor

-- ==============================================
-- STEP 1: CREATE TABLES
-- ==============================================

-- Table for storing dice moves and animations
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

-- Table for managing current turn state
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

-- Table for managing room sessions (MISSING DEPENDENCY - NOW ADDED)
CREATE TABLE IF NOT EXISTS public.room_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_moves_room_id ON public.game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON public.game_moves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_turn_room_id ON public.current_turn(room_id);
CREATE INDEX IF NOT EXISTS idx_current_turn_player_id ON public.current_turn(current_player_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_room_id ON public.room_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_user_id ON public.room_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_active ON public.room_sessions(room_id, is_active);

-- ==============================================
-- STEP 2: ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for room_sessions: users can manage their own sessions
CREATE POLICY "Users can view room sessions" ON public.room_sessions
    FOR SELECT USING (
        user_id = auth.uid() OR 
        room_id IN (
            SELECT room_id FROM public.room_sessions 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert their own room sessions" ON public.room_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own room sessions" ON public.room_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Policy for game_moves: users can read all moves in their room, but only insert their own
CREATE POLICY "Users can view moves in their room" ON public.game_moves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = game_moves.room_id 
            AND rs.is_active = true
        )
    );

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

CREATE POLICY "Users can update their own moves" ON public.game_moves
    FOR UPDATE USING (
        auth.uid() = player_id
    ) WITH CHECK (
        auth.uid() = player_id
    );

-- Policy for current_turn: users can read turn state for their room
CREATE POLICY "Users can view turn state in their room" ON public.current_turn
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_sessions rs 
            WHERE rs.user_id = auth.uid() 
            AND rs.room_id = current_turn.room_id 
            AND rs.is_active = true
        )
    );

-- Only system/server can update turn state (we'll handle this via functions)
CREATE POLICY "System can manage turn state" ON public.current_turn
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        auth.uid() = current_player_id
    );

-- ==============================================
-- STEP 3: CREATE FUNCTIONS
-- ==============================================

-- Function to join a room (creates room session)
CREATE OR REPLACE FUNCTION public.join_room(p_room_id TEXT)
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

    -- Insert or update room session
    INSERT INTO public.room_sessions (room_id, user_id, is_active, joined_at)
    VALUES (p_room_id, v_player_id, true, NOW())
    ON CONFLICT (room_id, user_id) 
    DO UPDATE SET 
        is_active = true, 
        joined_at = NOW(),
        left_at = NULL,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$;

-- Function to handle dice roll and turn management
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

-- Function to initialize or join a room turn cycle
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

    -- Ensure player is in room session first
    PERFORM public.join_room(p_room_id);

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

-- Function to handle animation completion
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

-- Function to leave a room
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id TEXT)
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

    -- Mark room session as inactive
    UPDATE public.room_sessions 
    SET 
        is_active = false, 
        left_at = NOW(),
        updated_at = NOW()
    WHERE room_id = p_room_id AND user_id = v_player_id;

    RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$;

-- ==============================================
-- STEP 4: CREATE TRIGGERS AND GRANT PERMISSIONS
-- ==============================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_moves_updated_at BEFORE UPDATE ON public.game_moves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_current_turn_updated_at BEFORE UPDATE ON public.current_turn
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_sessions_updated_at BEFORE UPDATE ON public.room_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_sessions TO authenticated;
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_turn_cycle TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_room TO authenticated;

-- ==============================================
-- STEP 5: ENABLE REALTIME
-- ==============================================

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;

-- ==============================================
-- SETUP COMPLETE
-- ==============================================
-- The database is now ready for the multiplayer craps game
-- All tables, functions, policies, and realtime subscriptions are configured
-- The missing room_sessions table has been added with proper structure