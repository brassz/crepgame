-- Step 5: Enable realtime for the tables
-- Execute this last, after all tables and functions are created

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_turn;