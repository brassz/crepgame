-- Step 2: Enable RLS and create policies
-- Execute this after the tables are created

-- Enable RLS
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_turn ENABLE ROW LEVEL SECURITY;

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