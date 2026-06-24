-- ==============================================
-- FIX DATABASE ISSUES FOR DICE GAME
-- ==============================================
-- Execute this in your Supabase SQL Editor to fix the current errors

-- 1. Create missing room_sessions table (referenced by join_room_simple)
CREATE TABLE IF NOT EXISTS public.room_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate active sessions
    UNIQUE(room_id, user_id)
);

-- 2. Enable RLS on room_sessions
ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for room_sessions
DROP POLICY IF EXISTS "Users can view their own room sessions" ON public.room_sessions;
CREATE POLICY "Users can view their own room sessions" ON public.room_sessions 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own room sessions" ON public.room_sessions;
CREATE POLICY "Users can insert their own room sessions" ON public.room_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own room sessions" ON public.room_sessions;
CREATE POLICY "Users can update their own room sessions" ON public.room_sessions 
FOR UPDATE USING (auth.uid() = user_id);

-- 4. Fix profiles table RLS policies to be more permissive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Create the missing simple setup tables and functions
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

-- 6. Enable RLS on new tables
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for new tables
DROP POLICY IF EXISTS "Users can view all moves" ON public.game_moves;
CREATE POLICY "Users can view all moves" ON public.game_moves
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own moves" ON public.game_moves;
CREATE POLICY "Users can insert their own moves" ON public.game_moves
    FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can update their own moves" ON public.game_moves;
CREATE POLICY "Users can update their own moves" ON public.game_moves
    FOR UPDATE USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can view all turn states" ON public.current_turn;
CREATE POLICY "Users can view all turn states" ON public.current_turn
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage turn state" ON public.current_turn;
CREATE POLICY "Users can manage turn state" ON public.current_turn
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Create the missing functions

-- Function: handle_dice_roll_simple
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
BEGIN
    -- Get current user
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if it's the player's turn (simplified check)
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid room - no active game session';
    END IF;
    
    -- Check if it's actually the player's turn
    IF v_current_turn.current_player_id != v_player_id THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Insert the dice move
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, true)
    RETURNING id INTO v_move_id;

    -- Simple turn advancement (just increment player_index)
    UPDATE public.current_turn 
    SET 
        player_index = CASE 
            WHEN player_index >= total_players THEN 1 
            ELSE player_index + 1 
        END,
        turn_starts_at = NOW(),
        turn_ends_at = NOW() + INTERVAL '25 seconds',
        last_roll_id = v_move_id,
        updated_at = NOW()
    WHERE room_id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'move_id', v_move_id,
        'dice_1', p_dice_1,
        'dice_2', p_dice_2,
        'total', p_dice_1 + p_dice_2
    );
END;
$$;

-- Function: join_room_simple
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

    -- Ensure room session exists for this player
    SELECT EXISTS(
        SELECT 1 FROM public.room_sessions 
        WHERE room_id = p_room_id AND user_id = v_player_id AND is_active = true
    ) INTO v_session_exists;
    
    IF NOT v_session_exists THEN
        -- Create room session if it doesn't exist
        INSERT INTO public.room_sessions (room_id, user_id, is_active, joined_at)
        VALUES (p_room_id, v_player_id, true, NOW())
        ON CONFLICT (room_id, user_id) 
        DO UPDATE SET is_active = true, joined_at = NOW();
    END IF;

    -- Check if turn cycle exists for this room
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    IF NOT FOUND THEN
        -- Create new turn cycle with this player as first
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
        
        -- Get the inserted record
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

-- Function: complete_dice_animation
CREATE OR REPLACE FUNCTION public.complete_dice_animation(p_move_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.game_moves 
    SET animation_completed = true, updated_at = NOW()
    WHERE id = p_move_id AND player_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'move_id', p_move_id);
END;
$$;

-- 9. Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers
DROP TRIGGER IF EXISTS update_game_moves_updated_at ON public.game_moves;
CREATE TRIGGER update_game_moves_updated_at BEFORE UPDATE ON public.game_moves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_current_turn_updated_at ON public.current_turn;
CREATE TRIGGER update_current_turn_updated_at BEFORE UPDATE ON public.current_turn
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_sessions_updated_at ON public.room_sessions;
CREATE TRIGGER update_room_sessions_updated_at BEFORE UPDATE ON public.room_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_sessions TO authenticated;
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;

-- 12. Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_sessions;

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_moves_room_id ON public.game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON public.game_moves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_turn_room_id ON public.current_turn(room_id);
CREATE INDEX IF NOT EXISTS idx_current_turn_player_id ON public.current_turn(current_player_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_room_user ON public.room_sessions(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_active ON public.room_sessions(is_active);

-- ==============================================
-- SETUP COMPLETE
-- ==============================================
-- This should fix the following errors:
-- - 404 errors for missing functions (join_room, handle_dice_roll_simple)
-- - 403/406 errors for profile access
-- - Missing table errors for room_sessions
-- ==============================================