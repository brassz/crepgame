// Supabase Multiplayer Game Client
// Handles room management, real-time updates, and game state synchronization

window.SupabaseMultiplayer = (function(){
    let supabase = null;
    let currentRoomId = null;
    let currentGameSessionId = null;
    let playerSessionId = null;
    let realtimeSubscription = null;

    // Initialize Supabase client
    function init() {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            console.error('Supabase credentials not found. Please check auth-config.js');
            return false;
        }

        supabase = window.supabase.createClient(
            window.SUPABASE_URL, 
            window.SUPABASE_ANON_KEY
        );

        console.log('Supabase Multiplayer initialized');
        return true;
    }

    // Get user profile
    async function getUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return profile;
    }

    // Get available rooms by type
    async function getAvailableRooms(roomType = null) {
        let query = supabase
            .from('game_rooms')
            .select('*')
            .eq('is_active', true)
            .order('current_players', { ascending: true })
            .order('created_at', { ascending: true });

        if (roomType) {
            query = query.eq('room_type', roomType);
        }

        const { data: rooms, error } = await query;

        if (error) {
            console.error('Error fetching rooms:', error);
            return [];
        }

        return rooms;
    }

    // Join a room (automatically finds best available room of the type)
    async function joinRoom(roomType, socketId = null) {
        try {
            const { data, error } = await supabase.rpc('join_room', {
                p_room_type: roomType,
                p_socket_id: socketId
            });

            if (error) {
                console.error('Error joining room:', error);
                
                // Handle specific error cases
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                    console.warn('Duplicate session detected, attempting to resolve...');
                    // Try to leave current room and rejoin
                    try {
                        await leaveRoom();
                        // Wait a moment for cleanup
                        await new Promise(resolve => setTimeout(resolve, 500));
                        // Retry the join
                        return await joinRoom(roomType, socketId);
                    } catch (retryError) {
                        console.error('Failed to resolve duplicate session:', retryError);
                        throw new Error('Unable to join room due to session conflict. Please refresh the page.');
                    }
                }
                
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to join room');
            }

            // Store room information
            currentRoomId = data.room.id;
            currentGameSessionId = data.game_session_id;
            playerSessionId = data.player_session_id;

            // Set up real-time subscription
            await setupRealtimeSubscription();

            console.log('Joined room:', data.room);
            return data;

        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    // Leave current room
    async function leaveRoom() {
        try {
            // Clean up subscription first
            if (realtimeSubscription) {
                await supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            const { data, error } = await supabase.rpc('leave_room');

            if (error) {
                console.error('Error leaving room:', error);
                throw error;
            }

            // Clear room info
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;

            return data;

        } catch (error) {
            console.error('Leave room error:', error);
            throw error;
        }
    }

    // Place a bet
    async function placeBet(betType, betAmount) {
        if (!currentGameSessionId) {
            throw new Error('Not in a game session');
        }

        try {
            const { data, error } = await supabase.rpc('place_bet', {
                p_game_session_id: currentGameSessionId,
                p_bet_type: betType,
                p_bet_amount: betAmount
            });

            if (error) {
                console.error('Error placing bet:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to place bet');
            }

            // Update local balance if integrated with game
            if (window.s_oGame && window.s_oGame.setMoney && data.new_balance) {
                window.s_oGame.setMoney(data.new_balance);
            }

            return data;

        } catch (error) {
            console.error('Place bet error:', error);
            throw error;
        }
    }

    // Request dice roll (starts animation for all players)
    async function requestDiceRoll() {
        if (!currentGameSessionId) {
            throw new Error('Not in a game session');
        }

        try {
            // First, start the dice roll animation for all players
            const { data: startData, error: startError } = await supabase.rpc('start_dice_roll', {
                p_game_session_id: currentGameSessionId
            });

            if (startError) {
                console.error('Error starting dice roll:', startError);
                throw startError;
            }

            if (!startData.success) {
                throw new Error(startData.error || 'Failed to start dice roll');
            }

            // Generate dice result after a delay to allow animation to start
            setTimeout(async () => {
                try {
                    const die1 = Math.floor(Math.random() * 6) + 1;
                    const die2 = Math.floor(Math.random() * 6) + 1;
                    
                    // Record the dice roll result
                    const { data, error } = await supabase.rpc('record_dice_roll', {
                        p_game_session_id: currentGameSessionId,
                        p_die1: die1,
                        p_die2: die2,
                        p_phase: 'come_out',
                        p_result: null
                    });

                    if (error) {
                        console.error('Error recording dice roll result:', error);
                    }
                } catch (error) {
                    console.error('Error in delayed dice roll:', error);
                }
            }, 1000); // 1 second delay to allow animation to start

            return startData;

        } catch (error) {
            console.error('Request dice roll error:', error);
            throw error;
        }
    }

    // Record dice roll
    async function recordDiceRoll(die1, die2, phase = 'come_out', result = null) {
        if (!currentGameSessionId) {
            throw new Error('Not in a game session');
        }

        try {
            const { data, error } = await supabase.rpc('record_dice_roll', {
                p_game_session_id: currentGameSessionId,
                p_die1: die1,
                p_die2: die2,
                p_phase: phase,
                p_result: result
            });

            if (error) {
                console.error('Error recording dice roll:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to record dice roll');
            }

            return data;

        } catch (error) {
            console.error('Record dice roll error:', error);
            throw error;
        }
    }

    // Set up real-time subscriptions
    async function setupRealtimeSubscription() {
        if (!currentRoomId) {
            console.warn('No room ID for real-time subscription');
            return;
        }

        // Clean up existing subscription
        if (realtimeSubscription) {
            await supabase.removeChannel(realtimeSubscription);
        }

        // Create new subscription for room events
        realtimeSubscription = supabase.channel(`room_${currentRoomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'game_events',
                filter: `room_id=eq.${currentRoomId}`
            }, handleGameEvent)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_sessions',
                filter: `room_id=eq.${currentRoomId}`
            }, handleGameSessionUpdate)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'player_sessions',
                filter: `room_id=eq.${currentRoomId}`
            }, handlePlayerSessionChange)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'dice_rolls',
                filter: `game_session_id=eq.${currentGameSessionId}`
            }, handleDiceRoll)
            .subscribe();

        console.log('Real-time subscription set up for room:', currentRoomId);
    }

    // Handle real-time game events
    function handleGameEvent(payload) {
        console.log('Game event received:', payload);
        
        const event = payload.new;
        const eventData = event.event_data;

        switch (event.event_type) {
            case 'player_joined':
                if (window.s_oInterface && window.s_oInterface.onPlayerJoined) {
                    window.s_oInterface.onPlayerJoined(eventData);
                }
                break;

            case 'player_left':
                if (window.s_oInterface && window.s_oInterface.onPlayerLeft) {
                    window.s_oInterface.onPlayerLeft(eventData);
                }
                break;

            case 'bet_placed':
                if (window.s_oGame && window.s_oGame.onBetPlaced) {
                    window.s_oGame.onBetPlaced(eventData);
                }
                break;

            case 'dice_roll_start':
                if (window.s_oGame && window.s_oGame.onDiceRollStart) {
                    window.s_oGame.onDiceRollStart(eventData);
                }
                break;

            case 'dice_rolled':
                if (window.s_oGame && window.s_oGame.onServerRoll) {
                    // Convert event data to the format expected by onServerRoll
                    const rollData = {
                        d1: eventData.die1,
                        d2: eventData.die2,
                        total: eventData.total,
                        ts: Date.parse(eventData.timestamp || new Date())
                    };
                    window.s_oGame.onServerRoll(rollData);
                }
                break;

            case 'turn_changed':
                if (window.s_oGame && window.s_oGame.onTurnChanged) {
                    window.s_oGame.onTurnChanged(eventData);
                }
                break;

            default:
                console.log('Unhandled event type:', event.event_type);
        }
    }

    // Handle game session updates
    function handleGameSessionUpdate(payload) {
        console.log('Game session updated:', payload);
        
        const session = payload.new;
        
        // Update game state if handlers exist
        if (window.s_oGame && window.s_oGame.onGameSessionUpdate) {
            window.s_oGame.onGameSessionUpdate(session);
        }

        // Handle dice results
        if (session.dice_result && window.s_oGame && window.s_oGame.onServerRoll) {
            window.s_oGame.onServerRoll(session.dice_result);
        }
    }

    // Handle player session changes
    function handlePlayerSessionChange(payload) {
        console.log('Player session changed:', payload);
        
        // Update player count display
        if (window.s_oInterface && window.s_oInterface.updatePlayerCount) {
            getCurrentRoomInfo().then(room => {
                if (room) {
                    window.s_oInterface.updatePlayerCount(room.current_players);
                }
            });
        }
    }

    // Handle dice roll events
    function handleDiceRoll(payload) {
        console.log('Dice roll event:', payload);
        
        const roll = payload.new;
        const rollData = {
            d1: roll.die1,
            d2: roll.die2,
            total: roll.total,
            ts: Date.parse(roll.rolled_at)
        };

        if (window.s_oGame && window.s_oGame.onServerRoll) {
            window.s_oGame.onServerRoll(rollData);
        }
    }

    // Get current room information
    async function getCurrentRoomInfo() {
        if (!currentRoomId) return null;

        const { data: room, error } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', currentRoomId)
            .single();

        if (error) {
            console.error('Error fetching current room:', error);
            return null;
        }

        return room;
    }

    // Get current game session
    async function getCurrentGameSession() {
        if (!currentGameSessionId) return null;

        const { data: session, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', currentGameSessionId)
            .single();

        if (error) {
            console.error('Error fetching game session:', error);
            return null;
        }

        return session;
    }

    // Get active bets for current game
    async function getActiveBets() {
        if (!currentGameSessionId) return [];

        const { data: bets, error } = await supabase
            .from('game_bets')
            .select(`
                *,
                profiles!player_id(username)
            `)
            .eq('game_session_id', currentGameSessionId)
            .eq('status', 'active')
            .order('placed_at', { ascending: true });

        if (error) {
            console.error('Error fetching bets:', error);
            return [];
        }

        return bets;
    }

    // Get recent dice rolls
    async function getRecentDiceRolls(limit = 10) {
        if (!currentGameSessionId) return [];

        const { data: rolls, error } = await supabase
            .from('dice_rolls')
            .select(`
                *,
                profiles!shooter_id(username)
            `)
            .eq('game_session_id', currentGameSessionId)
            .order('rolled_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching dice rolls:', error);
            return [];
        }

        return rolls.reverse(); // Return in chronological order
    }

    // Update player balance (when game ends or periodically)
    async function updatePlayerBalance(newBalance) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('profiles')
            .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating balance:', error);
            return false;
        }

        return true;
    }

    // Clean up when leaving
    async function cleanup() {
        if (realtimeSubscription) {
            await supabase.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }

        currentRoomId = null;
        currentGameSessionId = null;
        playerSessionId = null;
    }

    // Get room statistics
    async function getRoomStats(roomType = null) {
        let query = supabase
            .from('game_rooms')
            .select('room_type, current_players, max_players')
            .eq('is_active', true);

        if (roomType) {
            query = query.eq('room_type', roomType);
        }

        const { data: rooms, error } = await query;

        if (error) {
            console.error('Error fetching room stats:', error);
            return {};
        }

        // Group by room type
        const stats = {};
        rooms.forEach(room => {
            if (!stats[room.room_type]) {
                stats[room.room_type] = {
                    total_rooms: 0,
                    total_players: 0,
                    available_spots: 0
                };
            }
            stats[room.room_type].total_rooms++;
            stats[room.room_type].total_players += room.current_players;
            stats[room.room_type].available_spots += (room.max_players - room.current_players);
        });

        return stats;
    }

    // Public API
    return {
        init,
        getUserProfile,
        getAvailableRooms,
        joinRoom,
        leaveRoom,
        placeBet,
        requestDiceRoll,
        recordDiceRoll,
        getCurrentRoomInfo,
        getCurrentGameSession,
        getActiveBets,
        getRecentDiceRolls,
        updatePlayerBalance,
        getRoomStats,
        cleanup,
        
        // Getters
        get currentRoomId() { return currentRoomId; },
        get currentGameSessionId() { return currentGameSessionId; },
        get playerSessionId() { return playerSessionId; },
        get isConnected() { return supabase && currentRoomId; }
    };
})();