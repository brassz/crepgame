/**
 * Supabase Realtime Dice Game Manager
 * Handles real-time dice animations and turn management using Supabase
 */
window.SupabaseRealtimeDice = (function() {
    let realtimeChannel = null;
    let currentRoom = null;
    let currentUserId = null;
    let isSubscribed = false;

    // Room configurations matching the original Socket.IO setup
    const ROOM_CONFIGS = {
        bronze: { name: 'BRONZE', min_bet: 50, max_bet: 1000, max_players: 8, banker: true },
        prata: { name: 'PRATA', min_bet: 100, max_bet: 3000, max_players: 8, banker: true },
        ouro: { name: 'OURO', min_bet: 200, max_bet: 5000, max_players: 8, banker: true }
    };

    function init() {
        if (!window.sb) {
            console.error('Supabase client not available');
            return false;
        }

        // Get current user
        return window.sb.auth.getUser().then(function(response) {
            const user = response.data && response.data.user;
            if (!user) {
                throw new Error('User not authenticated');
            }
            currentUserId = user.id;
            console.log('Supabase Realtime Dice initialized for user:', currentUserId);
            return true;
        });
    }

    function joinRoom(roomId) {
        if (!window.sb || !currentUserId) {
            return Promise.reject(new Error('Not initialized or user not authenticated'));
        }

        currentRoom = roomId;

        // Leave previous channel if exists
        if (realtimeChannel) {
            window.sb.removeChannel(realtimeChannel);
        }

        // Create new realtime channel for the room
        realtimeChannel = window.sb.channel(`dice-room-${roomId}`, {
            config: {
                presence: {
                    key: currentUserId
                }
            }
        });

        // Subscribe to game moves (dice rolls)
        realtimeChannel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_moves',
            filter: `room_id=eq.${roomId}`
        }, handleNewDiceMove);

        // Subscribe to game moves updates (animation completion)
        realtimeChannel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_moves',
            filter: `room_id=eq.${roomId}`
        }, handleDiceMoveUpdate);

        // Subscribe to turn changes
        realtimeChannel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'current_turn',
            filter: `room_id=eq.${roomId}`
        }, handleTurnUpdate);

        // Handle presence (player join/leave)
        realtimeChannel.on('presence', { event: 'sync' }, handlePresenceSync);
        realtimeChannel.on('presence', { event: 'join' }, handlePresenceJoin);
        realtimeChannel.on('presence', { event: 'leave' }, handlePresenceLeave);

        // Subscribe to the channel (synchronous in Supabase v2)
        realtimeChannel.subscribe();
        
        // Set subscription status
        isSubscribed = true;
        console.log('Subscribed to realtime channel for room:', roomId);
        
        // Join the room session and turn cycle
        return joinRoomSession(roomId);
    }

    function joinRoomSession(roomId) {
        // First join the room session
        return window.SupabaseMultiplayer.joinRoom(roomId).then(function(result) {
            if (!result || !result.success) {
                throw new Error('Failed to join room session');
            }

            // Then join the turn cycle
            return window.sb.rpc('join_room_simple', { p_room_id: roomId });
        }).then(function(turnResult) {
            if (turnResult.error) {
                throw turnResult.error;
            }

            const turnData = turnResult.data;
            
            // Update game with room config
            if (window.s_oGame && window.s_oGame.onRoomConfig) {
                const roomConfig = ROOM_CONFIGS[roomId] || ROOM_CONFIGS.bronze;
                window.s_oGame.onRoomConfig(roomConfig);
            }

            // Update turn information
            if (turnData && window.s_oGame && window.s_oGame.onTurnUpdate) {
                window.s_oGame.onTurnUpdate({
                    playerId: turnData.current_player_id,
                    endsAt: new Date(turnData.turn_ends_at).getTime(),
                    playerIndex: turnData.player_index,
                    totalPlayers: turnData.total_players,
                    isMyTurn: turnData.is_my_turn
                });
            }

            return { success: true, room: roomId, turnData: turnData };
        });
    }

    function requestRoll() {
        if (!currentRoom || !currentUserId) {
            console.error('Not in a room or not authenticated');
            return Promise.reject(new Error('Not in a room'));
        }

        // Generate dice roll
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        
        // Determine phase and result (simplified for now)
        const phase = 'come_out'; // This should be determined by game logic
        const result = null; // This should be calculated based on game state

        // Call the Supabase function to handle the dice roll
        return window.sb.rpc('handle_dice_roll_simple', {
            p_room_id: currentRoom,
            p_dice_1: dice1,
            p_dice_2: dice2
        }).then(function(response) {
            if (response.error) {
                console.error('Supabase RPC error:', response.error);
                // Provide more specific error information
                var errorMsg = response.error.message || 'Unknown database error';
                if (response.error.code === '42883') {
                    errorMsg = 'Database function not found. Please check database setup.';
                } else if (response.error.code === '42501') {
                    errorMsg = 'Permission denied. Please check authentication.';
                }
                throw new Error(errorMsg);
            }

            const rollData = response.data;
            console.log('Dice roll successful:', rollData);

            // The database trigger will notify other players via realtime
            return rollData;
        }).catch(function(error) {
            console.error('Request roll failed:', error);
            // Re-throw with more context
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        });
    }

    function handleNewDiceMove(payload) {
        const moveData = payload.new;
        console.log('New dice move received:', moveData);

        // Start dice animation
        if (window.s_oGame && window.s_oGame.onDiceRollStart) {
            window.s_oGame.onDiceRollStart({
                shooter: moveData.player_id,
                ts: new Date(moveData.created_at).getTime(),
                moveId: moveData.id
            });
        }

        // Send dice result after shorter animation delay
        setTimeout(function() {
            if (window.s_oGame && window.s_oGame.onServerRoll) {
                window.s_oGame.onServerRoll({
                    d1: moveData.dice_1,
                    d2: moveData.dice_2,
                    total: moveData.total,
                    ts: new Date(moveData.created_at).getTime(),
                    shooter: moveData.player_id,
                    moveId: moveData.id,
                    phase: moveData.phase,
                    result: moveData.result
                });
            }
        }, 800); // Reduced to 0.8 second delay for faster gameplay
    }

    function handleDiceMoveUpdate(payload) {
        const moveData = payload.new;
        console.log('Dice move updated:', moveData);

        // Handle animation completion if needed
        if (moveData.animation_completed && window.s_oGame && window.s_oGame.onAnimationComplete) {
            window.s_oGame.onAnimationComplete(moveData.id);
        }
    }

    function handleTurnUpdate(payload) {
        const turnData = payload.new;
        console.log('Turn updated:', turnData);

        if (window.s_oGame && window.s_oGame.onTurnUpdate) {
            window.s_oGame.onTurnUpdate({
                playerId: turnData.current_player_id,
                endsAt: new Date(turnData.turn_ends_at).getTime(),
                playerIndex: turnData.player_index,
                totalPlayers: turnData.total_players,
                isMyTurn: turnData.current_player_id === currentUserId
            });
        }

        // Start turn timer
        startTurnTimer(turnData);
    }

    function startTurnTimer(turnData) {
        // Clear any existing timer
        if (window.turnTimerInterval) {
            clearInterval(window.turnTimerInterval);
        }

        const turnEndsAt = new Date(turnData.turn_ends_at).getTime();
        
        window.turnTimerInterval = setInterval(function() {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((turnEndsAt - now) / 1000));
            
            // Update timer display
            if (window.s_oInterface && window.s_oInterface.updateTurnTimer) {
                const playerInfo = {
                    isMyTurn: turnData.current_player_id === currentUserId,
                    playerIndex: turnData.player_index,
                    totalPlayers: turnData.total_players
                };
                window.s_oInterface.updateTurnTimer(remaining, playerInfo);
            }

            // Don't auto-roll when time expires - let player decide
            if (remaining <= 0) {
                clearInterval(window.turnTimerInterval);
                // Just update the timer display, don't auto-roll
                if (window.s_oInterface && window.s_oInterface.updateTurnTimer) {
                    const playerInfo = {
                        isMyTurn: turnData.current_player_id === currentUserId,
                        playerIndex: turnData.player_index,
                        totalPlayers: turnData.total_players
                    };
                    window.s_oInterface.updateTurnTimer(0, playerInfo);
                }
            }
        }, 1000);
    }

    function handlePresenceSync() {
        const presenceState = realtimeChannel.presenceState();
        const playerCount = Object.keys(presenceState).length;
        
        console.log('Presence sync - players in room:', playerCount);
        
        if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
            window.s_oInterface.updateRoomInfo(currentRoom, playerCount);
        }
    }

    function handlePresenceJoin(payload) {
        console.log('Player joined:', payload.key);
        handlePresenceSync();
    }

    function handlePresenceLeave(payload) {
        console.log('Player left:', payload.key);
        handlePresenceSync();
    }

    function completeAnimation(moveId) {
        if (!moveId) return Promise.resolve();

        return window.sb.rpc('complete_dice_animation', {
            p_move_id: moveId
        }).then(function(response) {
            if (response.error) {
                console.error('Failed to complete animation:', response.error);
            } else {
                console.log('Animation completed for move:', moveId);
            }
            return response;
        });
    }

    function leaveRoom() {
        // Clear timer
        if (window.turnTimerInterval) {
            clearInterval(window.turnTimerInterval);
            window.turnTimerInterval = null;
        }

        // Leave realtime channel
        if (realtimeChannel) {
            window.sb.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        // Leave room session
        if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.leaveRoom) {
            return window.SupabaseMultiplayer.leaveRoom();
        }

        currentRoom = null;
        isSubscribed = false;
        
        return Promise.resolve();
    }

    function getCurrentRoom() {
        return currentRoom;
    }

    function isConnected() {
        return isSubscribed && realtimeChannel && currentRoom;
    }

    return {
        init: init,
        joinRoom: joinRoom,
        requestRoll: requestRoll,
        completeAnimation: completeAnimation,
        leaveRoom: leaveRoom,
        getCurrentRoom: getCurrentRoom,
        isConnected: isConnected
    };
})();