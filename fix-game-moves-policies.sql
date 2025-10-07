-- Fix Game Moves RLS Policies
-- This ensures that all authenticated users can see dice moves in real-time
-- regardless of room session complexity

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view moves in their room" ON public.game_moves;
DROP POLICY IF EXISTS "Users can view all moves" ON public.game_moves;
DROP POLICY IF EXISTS "Users can insert their own moves" ON public.game_moves;
DROP POLICY IF EXISTS "Users can update their own moves" ON public.game_moves;

-- Create simplified policies that work for real-time multiplayer
CREATE POLICY "Allow authenticated users to view all game moves" ON public.game_moves
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to insert their own moves" ON public.game_moves
    FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Allow users to update their own moves" ON public.game_moves
    FOR UPDATE USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- Ensure the table is enabled for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;