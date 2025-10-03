window.Realtime = (function(){
    var socket = null;
    var currentRoom = null;
    var useSupabase = true; // Flag to switch between Socket.io and Supabase

    // Initialize based on available services
    function init() {
        // Check if Supabase multiplayer is available and user is authenticated
        if (window.SupabaseMultiplayer && window.sb && window.sb.auth) {
            window.sb.auth.getUser().then(function(response) {
                var user = response.data && response.data.user;
                if (user) {
                    useSupabase = true;
                    if (window.SupabaseMultiplayer.init) {
                        window.SupabaseMultiplayer.init();
                    }
                    console.log('Using Supabase for multiplayer');
                } else {
                    useSupabase = false;
                    console.log('User not authenticated, falling back to Socket.io');
                }
            });
        } else {
            useSupabase = false;
            console.log('Supabase not available, using Socket.io');
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
            console.log('🎲 Received dice_result from server:', roll);
            if(window.s_oGame && window.s_oGame.onServerRoll){
                window.s_oGame.onServerRoll(roll);
            } else {
                console.warn('⚠️ s_oGame.onServerRoll not available');
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
            console.log('🎯 Player is rolling:', data);
            if(window.s_oInterface && window.s_oInterface.showPlayerRolling){
                window.s_oInterface.showPlayerRolling(data);
            } else {
                console.warn('⚠️ s_oInterface.showPlayerRolling not available');
            }
        });
        
        socket.on('player_rolled', function(data){
            console.log('✅ Player rolled result:', data);
            if(window.s_oInterface && window.s_oInterface.showPlayerRolled){
                window.s_oInterface.showPlayerRolled(data);
            } else {
                console.warn('⚠️ s_oInterface.showPlayerRolled not available');
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
            console.log('🔄 Attempting to join Supabase room:', room);
            
            // Use Supabase for room joining
            window.SupabaseMultiplayer.joinRoom(room).then(function(result) {
                if (result && result.success) {
                    console.log('✅ Successfully joined Supabase room:', result.room.room_name);
                    
                    // Update game with room config
                    if (window.s_oGame && window.s_oGame.onRoomConfig) {
                        var roomConfig = {
                            name: result.room.room_name,
                            min_bet: result.room.min_bet,
                            max_bet: result.room.max_bet,
                            max_players: result.room.max_players
                        };
                        window.s_oGame.onRoomConfig(roomConfig);
                        console.log('🎮 Game room config updated:', roomConfig);
                    }
                    
                    // Update interface with player count
                    if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                        window.s_oInterface.updateRoomInfo(room, result.room.current_players);
                        console.log('🎯 Interface updated with player count:', result.room.current_players);
                    }
                } else {
                    console.error('❌ Room join failed - no success flag in result:', result);
                    throw new Error('Room join failed - invalid response');
                }
            }).catch(function(error) {
                console.error('❌ Failed to join Supabase room:', error);
                
                // More specific error messages
                let errorMessage = 'Erro desconhecido';
                if (error.message) {
                    if (error.message.includes('409') || error.message.includes('conflict')) {
                        errorMessage = 'Você já está em uma sala. Tente sair e entrar novamente.';
                    } else if (error.message.includes('timeout')) {
                        errorMessage = 'Tempo limite excedido. Verifique sua conexão.';
                    } else if (error.message.includes('network')) {
                        errorMessage = 'Erro de conexão. Verifique sua internet.';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                alert('Erro ao entrar na sala: ' + errorMessage);
            });
        } else {
            // Fallback to Socket.io
            console.log('🔄 Using Socket.io fallback for room:', room);
            var s = connect();
            if(!s){ return; }
            s.emit('join_room', room);
        }
    }

    function requestRoll(){
        if (useSupabase && window.SupabaseMultiplayer) {
            // Check if properly connected to a room before rolling
            if (!window.SupabaseMultiplayer.isConnected) {
                console.error('❌ Not connected to a Supabase room. Cannot roll dice.');
                alert('Você não está conectado a uma sala. Tente entrar em uma sala primeiro.');
                return;
            }
            
            console.log('🎲 Requesting dice roll via Supabase...');
            
            // For Supabase, generate dice roll locally and record it for synchronized animation
            if (window.s_oGame && typeof window.s_oGame._generateRandomDices === 'function') {
                var dice = window.s_oGame._generateRandomDices();
                var die1 = dice[0];
                var die2 = dice[1];
                var total = die1 + die2;
                
                console.log('🎯 Rolling dice with synchronized animation for all players:', die1, die2, 'total:', total);
                
                // Show immediate feedback to the rolling player
                if (window.s_oInterface && window.s_oInterface.refreshMsgHelp) {
                    window.s_oInterface.refreshMsgHelp('Rolando dados...', false);
                }
                
                // Record the synchronized roll - this will trigger animation on all players' screens
                window.SupabaseMultiplayer.recordSynchronizedRoll(die1, die2)
                    .then(function(result) {
                        console.log('✅ Synchronized dice roll recorded successfully:', result);
                        console.log('🎬 All players in the room should now see the dice animation');
                        
                        // Also record the roll in the game history for game logic
                        return window.SupabaseMultiplayer.recordDiceRoll(die1, die2, 'come_out', total);
                    })
                    .then(function(result) {
                        console.log('✅ Game dice roll recorded successfully:', result);
                    })
                    .catch(function(error) {
                        console.error('❌ Failed to record dice roll:', error);
                        
                        // More specific error handling
                        if (error.message && error.message.includes('not in a game session')) {
                            alert('Erro: Você não está em uma sessão de jogo ativa.');
                        } else if (error.message && error.message.includes('network')) {
                            alert('Erro de conexão. Verifique sua internet e tente novamente.');
                        } else {
                            alert('Erro ao registrar rolagem dos dados: ' + (error.message || 'Erro desconhecido'));
                        }
                        
                        // Fallback: trigger local animation if recording fails
                        console.log('⚠️ Triggering fallback local animation due to recording error');
                        if (window.s_oGame && typeof window.s_oGame.onSynchronizedRoll === 'function') {
                            window.s_oGame.onSynchronizedRoll({
                                d1: die1,
                                d2: die2,
                                total: total,
                                ts: Date.now(),
                                playerName: 'Você',
                                playerId: 'local',
                                isMyRoll: true
                            });
                        } else if (window.s_oGame && typeof window.s_oGame.onServerRoll === 'function') {
                            window.s_oGame.onServerRoll({
                                d1: die1,
                                d2: die2,
                                total: total,
                                ts: Date.now(),
                                playerName: 'Você',
                                isMyRoll: true
                            });
                        } else {
                            console.error('❌ No fallback animation method available');
                        }
                    });
            } else {
                console.error('❌ Game instance or dice generation method not available');
                alert('Erro: Método de geração de dados não disponível.');
            }
            return;
        }
        
        console.log('🔄 Using Socket.io for dice roll request');
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

