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
        socket.on('dice_roll_start', function(data){
            if(window.s_oGame && window.s_oGame.onDiceRollStart){
                window.s_oGame.onDiceRollStart(data);
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
                // Get current turn info to determine if it's my turn
                var playerInfo = null;
                if(window.s_oGame && window.s_oGame._currentTurnData){
                    var isMyTurn = false;
                    if(socket && window.s_oGame._currentTurnData.playerId === socket.id){
                        isMyTurn = true;
                    }
                    playerInfo = {
                        isMyTurn: isMyTurn,
                        playerIndex: window.s_oGame._currentTurnData.playerIndex,
                        totalPlayers: window.s_oGame._currentTurnData.totalPlayers
                    };
                }
                window.s_oInterface.updateTurnTimer(data.remaining, playerInfo);
            }
        });
        return socket;
    }

    function join(room){
        currentRoom = room;
        
        if (useSupabase && window.SupabaseMultiplayer) {
            // Use Supabase for room joining
            window.SupabaseMultiplayer.joinRoom(room).then(function(result) {
                if (result && result.success) {
                    // Update game with room config
                    if (window.s_oGame && window.s_oGame.onRoomConfig) {
                        var roomConfig = {
                            name: result.room.room_name,
                            min_bet: result.room.min_bet,
                            max_bet: result.room.max_bet,
                            max_players: result.room.max_players
                        };
                        window.s_oGame.onRoomConfig(roomConfig);
                    }
                    
                    // Update interface with player count
                    if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                        window.s_oInterface.updateRoomInfo(room, result.room.current_players);
                    }
                    
                    console.log('Successfully joined Supabase room:', result.room.room_name);
                }
            }).catch(function(error) {
                console.error('Failed to join Supabase room:', error);
                
                // Provide more specific error messages
                let errorMessage = 'Erro desconhecido';
                if (error.message) {
                    if (error.message.includes('session conflict') || error.message.includes('duplicate')) {
                        errorMessage = 'Conflito de sessão detectado. Tente novamente em alguns segundos.';
                    } else if (error.message.includes('No available rooms')) {
                        errorMessage = 'Não há salas disponíveis deste tipo no momento.';
                    } else if (error.message.includes('not authenticated')) {
                        errorMessage = 'Você precisa fazer login para entrar em uma sala.';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                alert('Erro ao entrar na sala: ' + errorMessage);
            });
        } else {
            // Fallback to Socket.io
            var s = connect();
            if(!s){ return; }
            s.emit('join_room', room);
        }
    }

    function requestRoll(){
        if (useSupabase && window.SupabaseMultiplayer) {
            // For Supabase, dice rolling will be handled differently
            // The actual roll logic will be in the game logic, then recorded
            console.log('Supabase dice roll requested');
            return;
        }
        
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

    function isUsingSupabase() { return useSupabase; }

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

