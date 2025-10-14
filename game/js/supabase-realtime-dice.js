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
        console.log('🔗 Setting up subscription for game_moves in room:', roomId);
        realtimeChannel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_moves',
            filter: `room_id=eq.${roomId}`
        }, function(payload) {
            console.log('🔔 Received postgres_changes event for game_moves:', payload);
            console.log('🔔 Event details - Type:', payload.eventType, 'Schema:', payload.schema, 'Table:', payload.table);
            console.log('🔔 New data:', payload.new);
            console.log('🔔 Current room:', currentRoom, 'Event room:', payload.new?.room_id);
            
            // Verify this is for our room
            if (payload.new && payload.new.room_id === currentRoom) {
                console.log('✅ Event is for our room, processing...');
                handleNewDiceMove(payload);
            } else {
                console.log('⚠️ Event is not for our room, ignoring');
            }
        });

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
        console.log('🔗 Attempting to subscribe to realtime channel...');
        console.log('🔗 Channel configuration:', {
            channelName: `dice-room-${roomId}`,
            userId: currentUserId,
            roomId: roomId
        });
        
        realtimeChannel.subscribe(function(status, err) {
            console.log('🔗 Subscription status changed to:', status);
            console.log('🔗 Timestamp:', new Date().toISOString());
            
            if (status === 'SUBSCRIBED') {
                isSubscribed = true;
                console.log('✅ Successfully subscribed to realtime channel for room:', roomId);
                console.log('✅ Channel state:', realtimeChannel.state);
                console.log('✅ User should now receive dice roll events from other players');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Channel subscription error for room:', roomId);
                if (err) {
                    console.error('❌ Error details:', err);
                }
                isSubscribed = false;
                // Try to recover by rejoining after a delay
                setTimeout(function() {
                    console.log('🔄 Attempting to recover channel subscription...');
                    if (realtimeChannel && !isSubscribed) {
                        realtimeChannel.unsubscribe();
                        setTimeout(function() {
                            realtimeChannel.subscribe();
                        }, 1000);
                    }
                }, 2000);
            } else if (status === 'TIMED_OUT') {
                console.error('❌ Channel subscription timed out for room:', roomId);
                isSubscribed = false;
                // Try to recover by rejoining after a delay
                setTimeout(function() {
                    console.log('🔄 Attempting to recover from timeout...');
                    if (realtimeChannel && !isSubscribed) {
                        realtimeChannel.unsubscribe();
                        setTimeout(function() {
                            realtimeChannel.subscribe();
                        }, 1000);
                    }
                }, 3000);
            } else if (status === 'CLOSED') {
                console.warn('⚠️ Channel closed for room:', roomId);
                isSubscribed = false;
            } else {
                console.log('🔗 Channel status:', status);
            }
        });
        
        // Set subscription status (fallback)
        isSubscribed = true;
        console.log('🔗 Subscribed to realtime channel for room:', roomId);
        
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
                console.error('Turn cycle join error:', turnResult.error);
                throw new Error(turnResult.error.message || 'Failed to join turn cycle');
            }

            const turnData = turnResult.data;
            
            // Validate turn data
            if (!turnData) {
                throw new Error('No turn data received from server');
            }
            
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
        // Debug logging
        console.log('🎲 ===== REQUESTING DICE ROLL =====');
        console.log('🎲 Current room:', currentRoom);
        console.log('🎲 User ID:', currentUserId);
        console.log('🎲 Subscribed to realtime:', isSubscribed);
        console.log('🎲 Channel state:', realtimeChannel?.state);
        
        if (!currentRoom || !currentUserId) {
            console.error('❌ Not in a room or not authenticated');
            return Promise.reject(new Error('Not in a room'));
        }

        // Generate dice roll
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        
        console.log('🎲 Generated dice values:', dice1, dice2);
        
        // Determine phase and result (simplified for now)
        const phase = 'come_out'; // This should be determined by game logic
        const result = null; // This should be calculated based on game state

        console.log('🎲 Calling handle_dice_roll_simple...');
        
        // Call the Supabase function to handle the dice roll
        return window.sb.rpc('handle_dice_roll_simple', {
            p_room_id: currentRoom,
            p_dice_1: dice1,
            p_dice_2: dice2
        }).then(function(response) {
            console.log('🎲 RPC response received:', response);
            
            if (response.error) {
                console.error('❌ Supabase RPC error:', response.error);
                // Provide more specific error information
                var errorMsg = response.error.message || 'Unknown database error';
                if (response.error.code === '42883') {
                    errorMsg = 'Database function not found. Please check database setup.';
                } else if (response.error.code === '42501') {
                    errorMsg = 'Permission denied. Please check authentication.';
                } else if (response.error.message && response.error.message.includes('Not your turn')) {
                    errorMsg = 'Not your turn or invalid room';
                } else if (response.error.message && response.error.message.includes('not authenticated')) {
                    errorMsg = 'User not authenticated';
                } else if (response.error.message && response.error.message.includes('Turn has expired')) {
                    errorMsg = 'Turn has expired';
                }
                throw new Error(errorMsg);
            }

            const rollData = response.data;
            console.log('✅ Dice roll successful:', rollData);
            console.log('✅ This should trigger a realtime event that ALL players in the room will receive');

            // The database trigger will notify other players via realtime
            return rollData;
        }).catch(function(error) {
            console.error('❌ Request roll failed:', error);
            // Re-throw with more context
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server');
            }
            throw error;
        }).finally(function() {
            console.log('🎲 ===== END DICE ROLL REQUEST =====');
        });
    }

    function handleNewDiceMove(payload) {
        const moveData = payload.new;
        console.log('🎲 ===== PROCESSING DICE MOVE =====');
        console.log('🎲 Move data received:', moveData);
        console.log('🎲 Current user ID:', currentUserId);
        console.log('🎲 Move player ID:', moveData.player_id);
        console.log('🎲 Is my move:', moveData.player_id === currentUserId);
        console.log('🎲 Room ID:', moveData.room_id);
        console.log('🎲 Dice values:', moveData.dice_1, moveData.dice_2);

        // Check if game object exists
        if (!window.s_oGame) {
            console.error('❌ s_oGame not available for dice animation');
            return;
        }

        console.log('✅ s_oGame is available');

        // Start dice animation for ALL players in the room
        if (window.s_oGame.onDiceRollStart) {
            console.log('🎲 Calling onDiceRollStart for ALL players in the room');
            console.log('🎲 Shooter:', moveData.player_id);
            console.log('🎲 Timestamp:', new Date(moveData.created_at).getTime());
            console.log('🎲 Move ID:', moveData.id);
            
            try {
                window.s_oGame.onDiceRollStart({
                    shooter: moveData.player_id,
                    ts: new Date(moveData.created_at).getTime(),
                    moveId: moveData.id
                });
                console.log('✅ onDiceRollStart called successfully');
            } catch (error) {
                console.error('❌ Error calling onDiceRollStart:', error);
            }
        } else {
            console.error('❌ onDiceRollStart method not available on s_oGame');
            console.log('Available methods on s_oGame:', Object.keys(window.s_oGame || {}));
        }

        // Send dice result after shorter animation delay
        setTimeout(function() {
            console.log('🎲 Sending dice result after delay...');
            if (window.s_oGame && window.s_oGame.onServerRoll) {
                const rollData = {
                    d1: moveData.dice_1,
                    d2: moveData.dice_2,
                    total: moveData.dice_1 + moveData.dice_2,
                    ts: new Date(moveData.created_at).getTime(),
                    shooter: moveData.player_id,
                    moveId: moveData.id,
                    phase: moveData.phase,
                    result: moveData.result
                };
                
                console.log('🎲 Calling onServerRoll with data:', rollData);
                
                try {
                    window.s_oGame.onServerRoll(rollData);
                    console.log('✅ onServerRoll called successfully');
                } catch (error) {
                    console.error('❌ Error calling onServerRoll:', error);
                }
            } else {
                console.error('❌ onServerRoll method not available on s_oGame');
                console.log('Available methods on s_oGame:', Object.keys(window.s_oGame || {}));
            }
        }, 800); // Reduced to 0.8 second delay for faster gameplay
        
        console.log('🎲 ===== END PROCESSING DICE MOVE =====');
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

            // Handle turn expiration
            if (remaining <= 0) {
                clearInterval(window.turnTimerInterval);
                
                // Update the timer display
                if (window.s_oInterface && window.s_oInterface.updateTurnTimer) {
                    const playerInfo = {
                        isMyTurn: turnData.current_player_id === currentUserId,
                        playerIndex: turnData.player_index,
                        totalPlayers: turnData.total_players
                    };
                    window.s_oInterface.updateTurnTimer(0, playerInfo);
                }
                
                // Show expiration message if it's the current player's turn
                if (turnData.current_player_id === currentUserId) {
                    if (window.s_oInterface && window.s_oInterface.showMessage) {
                        window.s_oInterface.showMessage("Tempo esgotado! Aguarde o próximo turno...");
                        setTimeout(function() {
                            if (window.s_oInterface && window.s_oInterface.hideMessage) {
                                window.s_oInterface.hideMessage();
                            }
                        }, 3000);
                    }
                    
                    // Disable roll button for expired turn
                    if (window.s_oInterface && window.s_oInterface.enableRoll) {
                        window.s_oInterface.enableRoll(false);
                    }
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

    function getDebugInfo() {
        return {
            currentRoom: currentRoom,
            currentUserId: currentUserId,
            isSubscribed: isSubscribed,
            hasChannel: !!realtimeChannel,
            channelState: realtimeChannel?.state,
            isConnected: isConnected()
        };
    }

    function testRealtimeConnection() {
        console.log('🔧 ===== TESTING REALTIME CONNECTION =====');
        console.log('🔧 Debug info:', getDebugInfo());
        
        if (!window.sb) {
            console.error('❌ Supabase client not available');
            return Promise.reject(new Error('Supabase client not available'));
        }
        
        if (!currentRoom) {
            console.error('❌ Not in a room');
            return Promise.reject(new Error('Not in a room'));
        }
        
        console.log('🔧 Testing database connectivity...');
        
        // Test basic database connectivity
        return window.sb.from('game_moves')
            .select('id, room_id, player_id, dice_1, dice_2, created_at')
            .eq('room_id', currentRoom)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(function(response) {
                if (response.error) {
                    console.error('❌ Database query failed:', response.error);
                    throw response.error;
                }
                
                console.log('✅ Database connectivity OK');
                console.log('🔧 Recent moves in room:', response.data);
                
                // Test realtime subscription
                console.log('🔧 Testing realtime subscription...');
                console.log('🔧 Channel state:', realtimeChannel?.state);
                console.log('🔧 Is subscribed:', isSubscribed);
                
                if (!realtimeChannel) {
                    throw new Error('No realtime channel');
                }
                
                if (!isSubscribed) {
                    throw new Error('Not subscribed to realtime channel');
                }
                
                console.log('✅ Realtime connection appears to be working');
                console.log('🔧 If dice rolls are not appearing for all players, check:');
                console.log('🔧 1. Both players are in the same room');
                console.log('🔧 2. Database RLS policies allow cross-player visibility');
                console.log('🔧 3. Realtime is enabled for game_moves table');
                
                return {
                    success: true,
                    room: currentRoom,
                    recentMoves: response.data,
                    channelState: realtimeChannel.state,
                    isSubscribed: isSubscribed
                };
            })
            .catch(function(error) {
                console.error('❌ Realtime connection test failed:', error);
                throw error;
            })
            .finally(function() {
                console.log('🔧 ===== END REALTIME CONNECTION TEST =====');
            });
    }

    return {
        init: init,
        joinRoom: joinRoom,
        requestRoll: requestRoll,
        completeAnimation: completeAnimation,
        leaveRoom: leaveRoom,
        getCurrentRoom: getCurrentRoom,
        isConnected: isConnected,
        getDebugInfo: getDebugInfo,
        testRealtimeConnection: testRealtimeConnection
    };
})();