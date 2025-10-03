-- Simplified Supabase Setup for Dice Game Realtime
-- Execute this in your Supabase SQL Editor

-- 1. Create the tables
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

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_game_moves_room_id ON public.game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON public.game_moves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_turn_room_id ON public.current_turn(room_id);
CREATE INDEX IF NOT EXISTS idx_current_turn_player_id ON public.current_turn(current_player_id);

-- 3. Enable RLS
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;

-- 4. Create simplified policies (without room_sessions dependency)
CREATE POLICY "Users can view all moves" ON public.game_moves
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own moves" ON public.game_moves
    FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own moves" ON public.game_moves
    FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Users can view all turn states" ON public.current_turn
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage turn state" ON public.current_turn
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. Create simplified functions
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
    WHERE room_id = p_room_id AND current_player_id = v_player_id;
    
    IF NOT FOUND THEN
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

-- 6. Create join room function
CREATE OR REPLACE FUNCTION public.join_room_simple(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_id UUID;
    v_current_turn RECORD;
BEGIN
    v_player_id := auth.uid();
    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if turn cycle exists for this room
    SELECT * INTO v_current_turn FROM public.current_turn WHERE room_id = p_room_id;

    IF NOT FOUND THEN
        -- Create new turn cycle
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
        
        v_current_turn.current_player_id := v_player_id;
        v_current_turn.player_index := 1;
        v_current_turn.total_players := 1;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'current_player_id', v_current_turn.current_player_id,
        'player_index', v_current_turn.player_index,
        'total_players', v_current_turn.total_players,
        'is_my_turn', v_current_turn.current_player_id = v_player_id
    );
END;
$$;

-- 7. Create animation completion function
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

-- 8. Create update trigger
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

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;

-- 10. Enable realtime (do this last)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;