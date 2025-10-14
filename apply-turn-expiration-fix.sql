-- Apply Turn Expiration Fix
-- This script fixes the "Turn has expired" error by implementing:
-- 1. Extended turn duration (45 seconds instead of 25)
-- 2. Grace period handling (10 seconds after expiration)
-- 3. Automatic turn extension when within grace period

BEGIN;

-- Function to extend/refresh a player's turn
CREATE OR REPLACE FUNCTION public.extend_player_turn(
    p_room_id TEXT,
    p_additional_seconds INTEGER DEFAULT 30
) RETURNS JSONB
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

    -- Get current turn for this room
    SELECT * INTO v_current_turn 
    FROM public.current_turn 
    WHERE room_id = p_room_id AND current_player_id = v_player_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not your turn or invalid room';
    END IF;

    -- Extend the turn by additional seconds
    UPDATE public.current_turn 
    SET 
        turn_ends_at = NOW() + INTERVAL '1 second' * p_additional_seconds,
        updated_at = NOW()
    WHERE room_id = p_room_id AND current_player_id = v_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_turn_ends_at', NOW() + INTERVAL '1 second' * p_additional_seconds,
        'extended_by_seconds', p_additional_seconds
    );
END;
$$;

-- Modified handle_dice_roll_simple with grace period and extended turns
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
    v_turn_expired BOOLEAN := false;
    v_grace_period_seconds INTEGER := 10; -- 10 second grace period
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

    -- Check if turn has expired
    IF NOW() > v_current_turn.turn_ends_at THEN
        v_turn_expired := true;
        
        -- Check if we're within grace period (10 seconds after expiration)
        IF NOW() > (v_current_turn.turn_ends_at + INTERVAL '1 second' * v_grace_period_seconds) THEN
            RAISE EXCEPTION 'Turn has expired';
        END IF;
        
        -- Within grace period - extend the turn automatically
        UPDATE public.current_turn 
        SET 
            turn_ends_at = NOW() + INTERVAL '45 seconds', -- Give full 45 seconds
            updated_at = NOW()
        WHERE room_id = p_room_id AND current_player_id = v_player_id;
        
        -- Log that we extended the turn
        RAISE NOTICE 'Turn was expired but extended within grace period for player %', v_player_id;
    END IF;

    -- Insert the dice move (simplified version)
    INSERT INTO public.game_moves (room_id, player_id, dice_1, dice_2, phase, result, animation_started)
    VALUES (p_room_id, v_player_id, p_dice_1, p_dice_2, 'come_out', NULL, true)
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

    -- Update current turn to next player with 45 seconds (instead of 25)
    UPDATE public.current_turn 
    SET 
        current_player_id = v_next_player_id,
        player_index = v_next_index,
        total_players = v_player_count,
        turn_starts_at = NOW(),
        turn_ends_at = NOW() + INTERVAL '45 seconds', -- Extended from 25 to 45 seconds
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
        'total', p_dice_1 + p_dice_2,
        'turn_was_expired', v_turn_expired,
        'grace_period_used', v_turn_expired
    );
END;
$$;

-- Update join_room_simple to use 45 seconds instead of 25
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
        -- Create new turn cycle with this player as first, using 45 seconds
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
            NOW() + INTERVAL '45 seconds' -- Extended from 25 to 45 seconds
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.extend_player_turn TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_dice_roll_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_simple TO authenticated;

-- Update any existing active turns to use the new 45-second duration
-- This will extend any currently active turns that are about to expire
UPDATE public.current_turn 
SET 
    turn_ends_at = CASE 
        WHEN turn_ends_at < NOW() + INTERVAL '45 seconds' THEN NOW() + INTERVAL '45 seconds'
        ELSE turn_ends_at
    END,
    updated_at = NOW()
WHERE is_active = true;

COMMIT;

-- Verification queries
SELECT 'Functions created successfully' as status;

SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_dice_roll_simple', 'join_room_simple', 'extend_player_turn')
ORDER BY routine_name;

-- Show current active turns with their expiration times
SELECT 
    room_id,
    current_player_id,
    player_index,
    total_players,
    turn_starts_at,
    turn_ends_at,
    EXTRACT(EPOCH FROM (turn_ends_at - NOW())) as seconds_remaining,
    is_active
FROM public.current_turn 
WHERE is_active = true
ORDER BY room_id;