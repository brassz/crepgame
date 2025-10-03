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
            // Clean up any existing connections first
            if (realtimeSubscription) {
                console.log('Cleaning up existing subscription before joining new room');
                await supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            // Reset room state
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;

            console.log('Attempting to join room of type:', roomType);

            const { data, error } = await supabase.rpc('join_room', {
                p_room_type: roomType,
                p_socket_id: socketId
            });

            if (error) {
                console.error('Error joining room:', error);
                
                // Handle specific error cases
                if (error.code === '23505') {
                    // Duplicate key error - player already in a room
                    console.log('Player already in a room, attempting to leave first...');
                    await leaveRoom();
                    // Retry joining after leaving
                    return joinRoom(roomType, socketId);
                }
                
                throw error;
            }

            if (!data || !data.success) {
                throw new Error(data?.error || 'Failed to join room - no data returned');
            }

            // Store room information
            currentRoomId = data.room.id;
            currentGameSessionId = data.game_session_id;
            playerSessionId = data.player_session_id;

            console.log('Successfully joined room:', {
                roomId: currentRoomId,
                gameSessionId: currentGameSessionId,
                playerSessionId: playerSessionId,
                roomName: data.room.room_name
            });

            // Set up real-time subscription with retry logic
            await setupRealtimeSubscription();

            return data;

        } catch (error) {
            console.error('Join room error:', error);
            
            // Reset state on error
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            throw error;
        }
    }

    // Leave current room
    async function leaveRoom() {
        try {
            console.log('🚪 Leaving current room...');
            
            // Clean up subscription first
            if (realtimeSubscription) {
                console.log('🔌 Removing real-time subscription...');
                await supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            // Only call leave_room RPC if we have a current room
            if (currentRoomId || currentGameSessionId || playerSessionId) {
                console.log('📤 Calling leave_room RPC...');
                const { data, error } = await supabase.rpc('leave_room');

                if (error) {
                    console.error('Error leaving room via RPC:', error);
                    // Don't throw error here - we still want to clean up local state
                }
                
                console.log('✅ Leave room RPC response:', data);
            } else {
                console.log('ℹ️ No active room to leave');
            }

            // Clear room info regardless of RPC success
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            console.log('🧹 Local room state cleared');

            return { success: true };

        } catch (error) {
            console.error('Leave room error:', error);
            
            // Still clear local state even if there's an error
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            // Don't throw - we want to allow cleanup even if RPC fails
            return { success: false, error: error.message };
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

    // Record synchronized dice roll for animation
    async function recordSynchronizedRoll(die1, die2) {
        try {
            const { data, error } = await supabase.rpc('record_synchronized_roll', {
                p_die1: die1,
                p_die2: die2
            });

            if (error) {
                console.error('Error recording synchronized roll:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to record synchronized roll');
            }

            console.log('Synchronized roll recorded - all players will see animation:', die1, die2);
            return data;

        } catch (error) {
            console.error('Record synchronized roll error:', error);
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
            console.log('Removing existing subscription...');
            await supabase.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }

        console.log('Setting up real-time subscription for room:', currentRoomId, 'game session:', currentGameSessionId);

        try {
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
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_rolls',
                    filter: `room_id=eq.${currentRoomId}`
                }, handleGameRoll)
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Successfully subscribed to real-time events for room:', currentRoomId);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Channel subscription error:', err);
                    } else if (status === 'TIMED_OUT') {
                        console.error('❌ Channel subscription timed out');
                    } else {
                        console.log('📡 Subscription status:', status, err);
                    }
                });

            console.log('Real-time subscription initiated for room:', currentRoomId);
        } catch (error) {
            console.error('Failed to set up real-time subscription:', error);
            throw error;
        }
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

            case 'dice_rolled':
                if (window.s_oGame && window.s_oGame.onDiceRolled) {
                    window.s_oGame.onDiceRolled(eventData);
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

    // Handle synchronized game roll events (for animation)
    function handleGameRoll(payload) {
        console.log('🎬 Synchronized game roll event received:', payload);
        
        if (!payload || !payload.new) {
            console.error('❌ Invalid game roll payload received:', payload);
            return;
        }
        
        const roll = payload.new;
        
        // Validate roll data
        if (!roll || roll.die1 === undefined || roll.die2 === undefined) {
            console.error('❌ Invalid roll data in payload:', roll);
            return;
        }
        
        console.log(`🎲 Roll data: ${roll.die1} + ${roll.die2} = ${roll.total} by player ${roll.player_id}`);
        
        // Process roll immediately to avoid delays
        processRollAnimation(roll);
    }
    
    // Separate function to process roll animation
    async function processRollAnimation(roll) {
        try {
            // Get current user first
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.warn('Could not get current user:', userError);
            }
            
            const currentUserId = user?.id;
            
            // Try to get player profile
            let playerName = 'Jogador';
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', roll.player_id)
                    .single();
                    
                if (profile && profile.username) {
                    playerName = profile.username;
                }
            } catch (profileError) {
                console.warn('Could not get player profile:', profileError);
            }
            
            const rollData = {
                d1: roll.die1,
                d2: roll.die2,
                total: roll.total,
                ts: roll.rolled_at ? Date.parse(roll.rolled_at) : Date.now(),
                playerName: playerName,
                playerId: roll.player_id,
                isMyRoll: roll.player_id === currentUserId
            };

            console.log('🎯 Triggering synchronized animation for all players:', rollData);

            // Trigger dice animation for all players in the room
            if (window.s_oGame && typeof window.s_oGame.onSynchronizedRoll === 'function') {
                window.s_oGame.onSynchronizedRoll(rollData);
                console.log('✅ Synchronized roll animation triggered successfully');
            } else if (window.s_oGame && typeof window.s_oGame.onServerRoll === 'function') {
                // Fallback to existing method
                console.log('⚠️ Using fallback onServerRoll method');
                window.s_oGame.onServerRoll(rollData);
            } else {
                console.error('❌ No valid roll handler found in game object');
                console.log('Available game methods:', Object.keys(window.s_oGame || {}));
            }
            
        } catch (error) {
            console.error('Error processing roll animation:', error);
            
            // Emergency fallback - trigger animation with minimal data
            const fallbackRollData = {
                d1: roll.die1,
                d2: roll.die2,
                total: roll.total,
                ts: Date.now(),
                playerName: 'Jogador',
                playerId: roll.player_id,
                isMyRoll: false
            };
            
            if (window.s_oGame && typeof window.s_oGame.onSynchronizedRoll === 'function') {
                window.s_oGame.onSynchronizedRoll(fallbackRollData);
            } else if (window.s_oGame && typeof window.s_oGame.onServerRoll === 'function') {
                window.s_oGame.onServerRoll(fallbackRollData);
            }
        }
    }

    // Handle dice roll events
    function handleDiceRoll(payload) {
        console.log('Dice roll event:', payload);
        
        const roll = payload.new;
        
        // Get player name if available
        getUserProfile().then(function(profile) {
            const rollData = {
                d1: roll.die1,
                d2: roll.die2,
                total: roll.total,
                ts: Date.parse(roll.rolled_at),
                playerName: profile ? profile.username : 'Jogador',
                playerId: roll.shooter_id
            };

            if (window.s_oGame && window.s_oGame.onServerRoll) {
                window.s_oGame.onServerRoll(rollData);
            }
        }).catch(function(error) {
            console.warn('Could not get player profile:', error);
            // Still trigger animation without player info
            const rollData = {
                d1: roll.die1,
                d2: roll.die2,
                total: roll.total,
                ts: Date.parse(roll.rolled_at),
                playerName: 'Jogador',
                playerId: roll.shooter_id
            };

            if (window.s_oGame && window.s_oGame.onServerRoll) {
                window.s_oGame.onServerRoll(rollData);
            }
        });
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

    // Debug function to check connection and database status
    async function debugConnection() {
        console.log('🔍 Debug: Checking Supabase connection...');
        
        try {
            // Test basic connection
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('👤 Current user:', user ? user.email : 'Not authenticated');
            
            if (authError) {
                console.error('❌ Auth error:', authError);
                return { success: false, error: 'Authentication error' };
            }

            // Test database connection
            const { data: rooms, error: dbError } = await supabase
                .from('game_rooms')
                .select('id, room_name, current_players')
                .limit(1);
                
            if (dbError) {
                console.error('❌ Database error:', dbError);
                return { success: false, error: 'Database connection error' };
            }
            
            console.log('✅ Database connection OK, sample rooms:', rooms);
            
            // Check current state
            console.log('🎮 Current state:', {
                roomId: currentRoomId,
                gameSessionId: currentGameSessionId,
                playerSessionId: playerSessionId,
                hasSubscription: !!realtimeSubscription
            });
            
            return { success: true, user, rooms };
            
        } catch (error) {
            console.error('❌ Debug connection failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        init,
        getUserProfile,
        getAvailableRooms,
        joinRoom,
        leaveRoom,
        placeBet,
        recordDiceRoll,
        recordSynchronizedRoll,
        getCurrentRoomInfo,
        getCurrentGameSession,
        getActiveBets,
        getRecentDiceRolls,
        updatePlayerBalance,
        getRoomStats,
        cleanup,
        debugConnection,
        
        // Getters
        get currentRoomId() { return currentRoomId; },
        get currentGameSessionId() { return currentGameSessionId; },
        get playerSessionId() { return playerSessionId; },
        get isConnected() { return supabase && currentRoomId; }
    };
})();