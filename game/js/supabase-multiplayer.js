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
            // First, check if we're already in a room and leave it
            if (currentRoomId) {
                console.log('🔄 Already in a room, leaving first...');
                try {
                    await leaveRoom();
                } catch (leaveError) {
                    console.warn('⚠️  Error leaving previous room (continuing anyway):', leaveError);
                }
            }

            console.log('🚪 Attempting to join room type:', roomType);
            
            const { data, error } = await supabase.rpc('join_room', {
                p_room_type: roomType,
                p_socket_id: socketId
            });

            if (error) {
                console.error('❌ Error joining room:', error);
                
                // Handle specific error cases
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
                    console.log('🔄 Duplicate entry detected, attempting to leave and retry...');
                    try {
                        await leaveRoom();
                        // Retry once after cleanup
                        const retryResult = await supabase.rpc('join_room', {
                            p_room_type: roomType,
                            p_socket_id: socketId
                        });
                        
                        if (retryResult.error) {
                            throw retryResult.error;
                        }
                        
                        return await handleJoinSuccess(retryResult.data);
                    } catch (retryError) {
                        console.error('❌ Retry failed:', retryError);
                        throw new Error('Não foi possível entrar na sala. Tente recarregar a página.');
                    }
                }
                
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to join room');
            }

            return await handleJoinSuccess(data);

        } catch (error) {
            console.error('❌ Join room error:', error);
            
            // Clean up any partial state
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            throw error;
        }
    }

    // Helper function to handle successful room join
    async function handleJoinSuccess(data) {
        // Store room information
        currentRoomId = data.room.id;
        currentGameSessionId = data.game_session_id;
        playerSessionId = data.player_session_id;

        console.log('✅ Successfully joined room:', data.room.room_name);
        console.log('📍 Room ID:', currentRoomId);
        console.log('🎮 Game session ID:', currentGameSessionId);
        console.log('👤 Player session ID:', playerSessionId);

        // Set up real-time subscription
        try {
            await setupRealtimeSubscription();
            console.log('📡 Real-time subscription established');
        } catch (subscriptionError) {
            console.error('⚠️  Failed to set up real-time subscription:', subscriptionError);
            // Don't fail the join for subscription errors, just log them
        }

        return data;
    }

    // Leave current room
    async function leaveRoom() {
        try {
            console.log('🚪 Leaving room...');
            console.log('📍 Current room ID:', currentRoomId);
            console.log('🎮 Current game session ID:', currentGameSessionId);
            
            // Clean up subscription first
            if (realtimeSubscription) {
                console.log('🧹 Cleaning up real-time subscription...');
                try {
                    await supabase.removeChannel(realtimeSubscription);
                    console.log('✅ Real-time subscription cleaned up');
                } catch (subscriptionError) {
                    console.warn('⚠️  Error cleaning up subscription:', subscriptionError);
                }
                realtimeSubscription = null;
            }

            // Only call leave_room if we have a room to leave
            if (currentRoomId || currentGameSessionId || playerSessionId) {
                console.log('📤 Calling leave_room RPC...');
                const { data, error } = await supabase.rpc('leave_room');

                if (error) {
                    console.error('❌ Error leaving room:', error);
                    // Don't throw here - we still want to clean up local state
                    console.log('🔄 Continuing with local cleanup despite RPC error');
                }

                console.log('✅ Leave room RPC completed:', data);
            } else {
                console.log('ℹ️  No active room to leave');
            }

            // Always clear room info regardless of RPC success
            const previousRoomId = currentRoomId;
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;

            console.log('🧹 Local room state cleared');
            console.log('📍 Previous room ID was:', previousRoomId);

            return { success: true };

        } catch (error) {
            console.error('❌ Leave room error:', error);
            
            // Still clean up local state even if there's an error
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            // Clean up subscription if it still exists
            if (realtimeSubscription) {
                try {
                    await supabase.removeChannel(realtimeSubscription);
                } catch (subscriptionError) {
                    console.warn('⚠️  Error cleaning up subscription during error handling:', subscriptionError);
                }
                realtimeSubscription = null;
            }
            
            console.log('🧹 Emergency cleanup completed');
            
            // Don't re-throw the error - we've cleaned up what we can
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
            console.warn('❌ No room ID for real-time subscription');
            return;
        }

        console.log('🔗 Setting up real-time subscriptions for room:', currentRoomId);
        console.log('📡 Current game session ID:', currentGameSessionId);

        // Clean up existing subscription
        if (realtimeSubscription) {
            console.log('🧹 Cleaning up existing real-time subscription');
            await supabase.removeChannel(realtimeSubscription);
        }

        // Create new subscription for room events
        const channelName = `room_${currentRoomId}`;
        console.log('📺 Creating channel:', channelName);
        
        realtimeSubscription = supabase.channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'game_events',
                filter: `room_id=eq.${currentRoomId}`
            }, function(payload) {
                console.log('📬 Game event received:', payload);
                handleGameEvent(payload);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_sessions',
                filter: `room_id=eq.${currentRoomId}`
            }, function(payload) {
                console.log('📬 Game session update received:', payload);
                handleGameSessionUpdate(payload);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'player_sessions',
                filter: `room_id=eq.${currentRoomId}`
            }, function(payload) {
                console.log('📬 Player session change received:', payload);
                handlePlayerSessionChange(payload);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'dice_rolls',
                filter: `game_session_id=eq.${currentGameSessionId}`
            }, function(payload) {
                console.log('📬 Dice roll received:', payload);
                handleDiceRoll(payload);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'game_rolls',
                filter: `room_id=eq.${currentRoomId}`
            }, function(payload) {
                console.log('🎬 SYNCHRONIZED GAME ROLL received:', payload);
                handleGameRoll(payload);
            })
            .subscribe(function(status) {
                console.log('📡 Real-time subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to real-time events');
                    console.log('🎯 Listening for game_rolls on room_id:', currentRoomId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Error subscribing to real-time channel');
                } else if (status === 'TIMED_OUT') {
                    console.error('⏰ Real-time subscription timed out');
                } else {
                    console.log('📡 Subscription status:', status);
                }
            });

        console.log('📡 Real-time subscription configured for room:', currentRoomId);
        console.log('🎲 Watching for synchronized dice rolls on table: game_rolls');
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
        
        const roll = payload.new;
        
        if (!roll || !roll.die1 || !roll.die2 || !roll.player_id) {
            console.error('❌ Invalid roll data received:', roll);
            return;
        }
        
        console.log(`🎲 Processing roll from player ${roll.player_id}: ${roll.die1} + ${roll.die2} = ${roll.total}`);
        
        // Get player name for the roller
        supabase.from('profiles')
            .select('username')
            .eq('id', roll.player_id)
            .single()
            .then(function(response) {
                const profile = response.data;
                console.log('👤 Player profile retrieved:', profile);
                
                // Get current user ID for comparison
                supabase.auth.getUser().then(function(userResponse) {
                    const currentUserId = userResponse.data?.user?.id;
                    const isMyRoll = roll.player_id === currentUserId;
                    
                    const rollData = {
                        d1: roll.die1,
                        d2: roll.die2,
                        total: roll.total,
                        ts: Date.parse(roll.rolled_at),
                        playerName: profile ? profile.username : 'Jogador',
                        playerId: roll.player_id,
                        isMyRoll: isMyRoll
                    };

                    console.log(`🎯 Triggering animation for ${isMyRoll ? 'own' : 'other player'} roll:`, rollData);

                    // Trigger dice animation for all players in the room
                    if (window.s_oGame && window.s_oGame.onSynchronizedRoll) {
                        console.log('✅ Calling s_oGame.onSynchronizedRoll()');
                        window.s_oGame.onSynchronizedRoll(rollData);
                    } else if (window.s_oGame && window.s_oGame.onServerRoll) {
                        console.log('🔄 Fallback to s_oGame.onServerRoll()');
                        window.s_oGame.onServerRoll(rollData);
                    } else {
                        console.error('❌ No animation handler available! s_oGame methods:', 
                            window.s_oGame ? Object.keys(window.s_oGame) : 's_oGame not found');
                    }
                });
            }).catch(function(error) {
                console.warn('⚠️  Could not get player profile for roll:', error);
                console.log('🔄 Using fallback without player profile');
                
                // Still trigger animation without player info
                supabase.auth.getUser().then(function(userResponse) {
                    const currentUserId = userResponse.data?.user?.id;
                    const isMyRoll = roll.player_id === currentUserId;
                    
                    const rollData = {
                        d1: roll.die1,
                        d2: roll.die2,
                        total: roll.total,
                        ts: Date.parse(roll.rolled_at),
                        playerName: 'Jogador',
                        playerId: roll.player_id,
                        isMyRoll: isMyRoll
                    };

                    console.log(`🎯 Triggering fallback animation for ${isMyRoll ? 'own' : 'other player'} roll:`, rollData);

                    if (window.s_oGame && window.s_oGame.onSynchronizedRoll) {
                        console.log('✅ Calling s_oGame.onSynchronizedRoll() (fallback)');
                        window.s_oGame.onSynchronizedRoll(rollData);
                    } else if (window.s_oGame && window.s_oGame.onServerRoll) {
                        console.log('🔄 Calling s_oGame.onServerRoll() (fallback)');
                        window.s_oGame.onServerRoll(rollData);
                    } else {
                        console.error('❌ No animation handler available in fallback! s_oGame methods:', 
                            window.s_oGame ? Object.keys(window.s_oGame) : 's_oGame not found');
                    }
                }).catch(function(authError) {
                    console.error('❌ Failed to get current user for animation:', authError);
                });
            });
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
        console.log('🧹 SupabaseMultiplayer.cleanup() called');
        
        try {
            // Leave room if we're in one
            if (currentRoomId || currentGameSessionId || playerSessionId) {
                console.log('🚪 Leaving room during cleanup...');
                await leaveRoom();
            }
            
            // Clean up subscription
            if (realtimeSubscription) {
                console.log('📡 Removing real-time subscription...');
                await supabase.removeChannel(realtimeSubscription);
                realtimeSubscription = null;
            }

            // Clear all state
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            
            console.log('✅ SupabaseMultiplayer cleanup completed');
        } catch (error) {
            console.error('❌ Error during SupabaseMultiplayer cleanup:', error);
            
            // Force clear state even if cleanup fails
            currentRoomId = null;
            currentGameSessionId = null;
            playerSessionId = null;
            realtimeSubscription = null;
        }
    }

    // Auto-cleanup on page unload
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', function() {
            console.log('🔄 Page unloading, cleaning up multiplayer...');
            // Use sendBeacon for reliable cleanup during page unload
            if (currentRoomId && navigator.sendBeacon) {
                // Send a quick cleanup signal
                try {
                    const cleanupData = JSON.stringify({
                        action: 'leave_room',
                        room_id: currentRoomId,
                        session_id: currentGameSessionId
                    });
                    navigator.sendBeacon('/api/cleanup', cleanupData);
                } catch (e) {
                    console.warn('Could not send cleanup beacon:', e);
                }
            }
            
            // Synchronous cleanup
            cleanup().catch(function(error) {
                console.warn('Cleanup error during page unload:', error);
            });
        });

        window.addEventListener('pagehide', function() {
            console.log('🔄 Page hiding, cleaning up multiplayer...');
            cleanup().catch(function(error) {
                console.warn('Cleanup error during page hide:', error);
            });
        });
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
        recordDiceRoll,
        recordSynchronizedRoll,
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