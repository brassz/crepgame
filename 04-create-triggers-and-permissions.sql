-- Step 4: Create triggers and grant permissions
-- Execute this after the functions are created

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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.game_moves TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.current_turn TO authenticated;
GRANT USAGE ON SEQUENCE public.game_moves_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_turn_cycle TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dice_animation TO authenticated;