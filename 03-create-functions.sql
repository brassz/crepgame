-- Step 3: Create the functions
-- Execute this after RLS is enabled

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