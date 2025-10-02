window.Realtime = (function(){
    var socket = null;
    var currentRoom = null;
    var useSupabase = true; // Flag to switch between Socket.io and Supabase

    // Initialize based on available services
    function init() {
        console.log('🚀 Realtime.init() called');
        console.log('📦 Available services check:');
        console.log('  - SupabaseMultiplayer:', !!window.SupabaseMultiplayer);
        console.log('  - Supabase client (sb):', !!window.sb);
        console.log('  - Supabase auth:', !!(window.sb && window.sb.auth));
        
        // Check if Supabase multiplayer is available and user is authenticated
        if (window.SupabaseMultiplayer && window.sb && window.sb.auth) {
            console.log('🔍 Checking user authentication...');
            window.sb.auth.getUser().then(function(response) {
                var user = response.data && response.data.user;
                if (user) {
                    useSupabase = true;
                    console.log('✅ User authenticated:', user.email || user.id);
                    console.log('🌐 Switching to Supabase multiplayer mode');
                    
                    if (window.SupabaseMultiplayer.init) {
                        console.log('🔧 Initializing SupabaseMultiplayer...');
                        var initResult = window.SupabaseMultiplayer.init();
                        console.log('📡 SupabaseMultiplayer init result:', initResult);
                    } else {
                        console.warn('⚠️  SupabaseMultiplayer.init() method not found');
                    }
                } else {
                    useSupabase = false;
                    console.log('❌ User not authenticated, falling back to Socket.io');
                }
            }).catch(function(error) {
                console.error('❌ Error checking user authentication:', error);
                useSupabase = false;
                console.log('🔄 Falling back to Socket.io due to auth error');
            });
        } else {
            useSupabase = false;
            console.log('❌ Supabase not fully available, using Socket.io');
            
            var missing = [];
            if (!window.SupabaseMultiplayer) missing.push('SupabaseMultiplayer');
            if (!window.sb) missing.push('Supabase client (sb)');
            if (!window.sb?.auth) missing.push('Supabase auth');
            console.log('🔍 Missing components:', missing.join(', '));
        }
    }

    function connect(){
        if (useSupabase) {
            // Supabase connection is handled in SupabaseMultiplayer
            return true;
        }

        if(socket){ return socket; }
        // if socket.io client not present (opened via file://), bail gracefully
        if (typeof io === 'undefined'){
            console.warn('Socket.IO client não encontrado. Inicie o servidor Node e acesse via http://localhost:3000/');
            return null;
        }
        // assume same origin server
        socket = io();

        // forward events into game if globals exist
        socket.on('room_config', function(cfg){
            // update limits
            if(window.s_oGame && window.s_oGame.onRoomConfig){
                window.s_oGame.onRoomConfig(cfg);
            }
        });
        socket.on('players_update', function(count){
            if(window.s_oInterface && window.s_oGame && window.s_oGame.getCurrentRoom){
                var room = window.s_oGame.getCurrentRoom();
                window.s_oInterface.updateRoomInfo(room, count);
            }
        });
        socket.on('dice_result', function(roll){
            if(window.s_oGame && window.s_oGame.onServerRoll){
                window.s_oGame.onServerRoll(roll);
            }
        });
        socket.on('room_full', function(){
            alert('Sala cheia. Tente outra sala.');
        });
        socket.on('turn_update', function(data){
            if(window.s_oGame && window.s_oGame.onTurnUpdate){
                window.s_oGame.onTurnUpdate(data);
            }
        });
        socket.on('turn_tick', function(data){
            if(window.s_oInterface && window.s_oInterface.updateTurnTimer){
                window.s_oInterface.updateTurnTimer(data.remaining);
            }
        });
        
        socket.on('your_turn', function(data){
            if(window.s_oInterface && window.s_oInterface.showYourTurnMessage){
                window.s_oInterface.showYourTurnMessage(data.message);
            }
        });
        
        socket.on('player_rolling', function(data){
            if(window.s_oInterface && window.s_oInterface.showPlayerRolling){
                window.s_oInterface.showPlayerRolling(data);
            }
        });
        
        socket.on('player_rolled', function(data){
            if(window.s_oInterface && window.s_oInterface.showPlayerRolled){
                window.s_oInterface.showPlayerRolled(data);
            }
        });
        
        socket.on('player_joined', function(data){
            if(window.s_oInterface && window.s_oInterface.showPlayerJoined){
                window.s_oInterface.showPlayerJoined(data);
            }
        });
        
        socket.on('player_left', function(data){
            if(window.s_oInterface && window.s_oInterface.showPlayerLeft){
                window.s_oInterface.showPlayerLeft(data);
            }
        });
        
        return socket;
    }

    function join(room){
        currentRoom = room;
        
        if (useSupabase && window.SupabaseMultiplayer) {
            // Use Supabase for room joining
            console.log('🚪 Realtime.join() - Attempting to join Supabase room:', room);
            
            window.SupabaseMultiplayer.joinRoom(room).then(function(result) {
                console.log('✅ Realtime.join() - Join result:', result);
                
                if (result && result.success) {
                    // Update game with room config
                    if (window.s_oGame && window.s_oGame.onRoomConfig) {
                        var roomConfig = {
                            name: result.room.room_name,
                            min_bet: result.room.min_bet,
                            max_bet: result.room.max_bet,
                            max_players: result.room.max_players
                        };
                        console.log('🎮 Updating game with room config:', roomConfig);
                        window.s_oGame.onRoomConfig(roomConfig);
                    }
                    
                    // Update interface with player count
                    if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                        console.log('👥 Updating interface with player count:', result.room.current_players);
                        window.s_oInterface.updateRoomInfo(room, result.room.current_players);
                    }
                    
                    console.log('✅ Successfully joined Supabase room:', result.room.room_name);
                    
                    // Notify game that room join was successful
                    if (window.s_oGame && window.s_oGame.onRoomJoined) {
                        window.s_oGame.onRoomJoined(result);
                    }
                } else {
                    console.error('❌ Room join failed - no success flag in result:', result);
                    throw new Error('Falha ao entrar na sala - resultado inválido');
                }
            }).catch(function(error) {
                console.error('❌ Failed to join Supabase room:', error);
                
                // More user-friendly error messages
                var errorMessage = 'Erro ao entrar na sala';
                if (error.message) {
                    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
                        errorMessage = 'Você já está em uma sala. Recarregue a página para tentar novamente.';
                    } else if (error.message.includes('full')) {
                        errorMessage = 'A sala está cheia. Tente outra sala.';
                    } else if (error.message.includes('not found')) {
                        errorMessage = 'Sala não encontrada. Tente recarregar a página.';
                    } else {
                        errorMessage = 'Erro ao entrar na sala: ' + error.message;
                    }
                }
                
                // Show error to user
                if (window.s_oGame && window.s_oGame.showMsgBox) {
                    window.s_oGame.showMsgBox(errorMessage);
                } else {
                    alert(errorMessage);
                }
                
                // Notify game of join failure
                if (window.s_oGame && window.s_oGame.onRoomJoinFailed) {
                    window.s_oGame.onRoomJoinFailed(error);
                }
            });
        } else {
            // Fallback to Socket.io
            var s = connect();
            if(!s){ return; }
            s.emit('join_room', room);
        }
    }

    function requestRoll(){
        console.log('🎲 requestRoll() called - useSupabase:', useSupabase);
        
        if (useSupabase && window.SupabaseMultiplayer) {
            console.log('Using Supabase for dice roll synchronization');
            
            // Check if properly connected to a room before rolling
            if (!window.SupabaseMultiplayer.isConnected) {
                console.error('❌ Not connected to a Supabase room. Cannot roll dice.');
                console.log('Current room ID:', window.SupabaseMultiplayer.currentRoomId);
                console.log('Current session ID:', window.SupabaseMultiplayer.currentGameSessionId);
                
                // Try to show error to user
                if (window.s_oGame && window.s_oGame.showMsgBox) {
                    window.s_oGame.showMsgBox("Erro: Não conectado a uma sala. Tente recarregar a página.");
                }
                return;
            }
            
            // For Supabase, generate dice roll locally and record it for synchronized animation
            if (window.s_oGame && window.s_oGame._generateRandomDices) {
                var dice = window.s_oGame._generateRandomDices();
                var die1 = dice[0];
                var die2 = dice[1];
                var total = die1 + die2;
                
                console.log('🎯 Rolling dice with synchronized animation for all players:', die1, die2, 'total:', total);
                
                // Record the synchronized roll - this will trigger animation on all players' screens
                window.SupabaseMultiplayer.recordSynchronizedRoll(die1, die2)
                    .then(function(result) {
                        console.log('✅ Synchronized dice roll recorded successfully:', result);
                        
                        // Also record the roll in the game history for game logic
                        return window.SupabaseMultiplayer.recordDiceRoll(die1, die2, 'come_out', total);
                    })
                    .then(function(result) {
                        console.log('✅ Game dice roll recorded successfully:', result);
                    })
                    .catch(function(error) {
                        console.error('❌ Failed to record dice roll:', error);
                        console.error('Error details:', error);
                        
                        // Fallback: trigger local animation if recording fails
                        if (window.s_oGame && window.s_oGame.onSynchronizedRoll) {
                            console.log('🔄 Using fallback local animation (onSynchronizedRoll)');
                            window.s_oGame.onSynchronizedRoll({
                                d1: die1,
                                d2: die2,
                                total: total,
                                ts: Date.now(),
                                playerName: 'Você (Local)',
                                playerId: 'local',
                                isMyRoll: true
                            });
                        } else if (window.s_oGame && window.s_oGame.onServerRoll) {
                            console.log('🔄 Using fallback local animation (onServerRoll)');
                            window.s_oGame.onServerRoll({
                                d1: die1,
                                d2: die2,
                                total: total,
                                ts: Date.now(),
                                playerName: 'Você (Local)'
                            });
                        } else {
                            console.error('❌ No fallback animation method available!');
                        }
                    });
            } else {
                console.error('❌ Game instance or dice generation method not available');
                console.log('Available s_oGame methods:', window.s_oGame ? Object.keys(window.s_oGame) : 's_oGame not found');
            }
            return;
        }
        
        console.log('Using Socket.IO fallback for dice roll');
        if(!socket) return;
        socket.emit('request_roll');
    }

    function placeBet(betType, betAmount) {
        if (useSupabase && window.SupabaseMultiplayer) {
            return window.SupabaseMultiplayer.placeBet(betType, betAmount);
        }
        // For Socket.io version, this would be handled differently
        console.log('Bet placed via fallback method:', betType, betAmount);
    }

    function recordRoll(die1, die2, phase, result) {
        if (useSupabase && window.SupabaseMultiplayer) {
            return window.SupabaseMultiplayer.recordDiceRoll(die1, die2, phase, result);
        }
        // For Socket.io version, this would be handled differently
        console.log('Roll recorded via fallback method:', die1, die2);
    }

    function leave() {
        if (useSupabase && window.SupabaseMultiplayer) {
            return window.SupabaseMultiplayer.leaveRoom();
        }
        
        if (socket) {
            // Socket.io leave logic would go here
            socket.disconnect();
            socket = null;
        }
    }

    function getSocket(){ return socket; }

    function isUsingSupabase() { 
        return useSupabase && window.SupabaseMultiplayer && window.SupabaseMultiplayer.isConnected; 
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        connect: connect,
        join: join,
        requestRoll: requestRoll,
        placeBet: placeBet,
        recordRoll: recordRoll,
        leave: leave,
        getSocket: getSocket,
        isUsingSupabase: isUsingSupabase
    };
})();

