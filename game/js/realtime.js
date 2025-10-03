window.Realtime = (function(){
    var currentRoom = null;
    var isInitialized = false;

    // Initialize Supabase Realtime
    function init() {
        if (!window.sb || !window.sb.auth) {
            console.error('Supabase client not available');
            return Promise.reject(new Error('Supabase not available'));
        }

        return window.sb.auth.getUser().then(function(response) {
            var user = response.data && response.data.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Initialize Supabase Multiplayer
            if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.init) {
                return window.SupabaseMultiplayer.init();
            }
            return Promise.resolve();
        }).then(function() {
            // Initialize Supabase Realtime Dice
            if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.init) {
                return window.SupabaseRealtimeDice.init();
            }
            return Promise.resolve();
        }).then(function() {
            isInitialized = true;
            console.log('Supabase Realtime initialized successfully');
            return true;
        }).catch(function(error) {
            console.error('Failed to initialize Supabase Realtime:', error);
            throw error;
        });
    }

    function connect(){
        if (!isInitialized) {
            console.warn('Realtime not initialized. Call init() first.');
            return null;
        }
        
        // Supabase connection is handled automatically
        return true;
    }

    function join(room){
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }

        currentRoom = room;
        
        if (!window.SupabaseRealtimeDice) {
            console.error('SupabaseRealtimeDice not available');
            return Promise.reject(new Error('SupabaseRealtimeDice not available'));
        }

        return window.SupabaseRealtimeDice.joinRoom(room).then(function(result) {
            if (result && result.success) {
                console.log('Successfully joined room:', room);
                return result;
            } else {
                throw new Error('Failed to join room');
            }
        }).catch(function(error) {
            console.error('Failed to join room:', error);
            
            // Provide more specific error messages
            var errorMessage = 'Erro desconhecido';
            if (error.message) {
                if (error.message.includes('session conflict') || error.message.includes('duplicate')) {
                    errorMessage = 'Conflito de sessão detectado. Tente novamente em alguns segundos.';
                } else if (error.message.includes('No available rooms')) {
                    errorMessage = 'Não há salas disponíveis deste tipo no momento.';
                } else if (error.message.includes('not authenticated')) {
                    errorMessage = 'Você precisa fazer login para entrar em uma sala.';
                } else if (error.message.includes('Not your turn')) {
                    errorMessage = 'Não é sua vez de jogar.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            alert('Erro ao entrar na sala: ' + errorMessage);
            throw error;
        });
    }

    function requestRoll(){
        if (!isInitialized || !window.SupabaseRealtimeDice) {
            console.error('Realtime not initialized or SupabaseRealtimeDice not available');
            return Promise.reject(new Error('Not initialized'));
        }
        
        return window.SupabaseRealtimeDice.requestRoll();
    }

    function placeBet(betType, betAmount) {
        if (!isInitialized || !window.SupabaseMultiplayer) {
            console.error('Multiplayer not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        return window.SupabaseMultiplayer.placeBet(betType, betAmount);
    }

    function recordRoll(die1, die2, phase, result) {
        if (!isInitialized || !window.SupabaseMultiplayer) {
            console.error('Multiplayer not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        return window.SupabaseMultiplayer.recordDiceRoll(die1, die2, phase, result);
    }

    function completeAnimation(moveId) {
        if (!isInitialized || !window.SupabaseRealtimeDice) {
            console.error('Realtime dice not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        return window.SupabaseRealtimeDice.completeAnimation(moveId);
    }

    function leave() {
        if (window.SupabaseRealtimeDice) {
            return window.SupabaseRealtimeDice.leaveRoom();
        }
        return Promise.resolve();
    }

    function getCurrentRoom() {
        return currentRoom;
    }

    function isConnected() {
        return isInitialized && window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.isConnected();
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init().catch(function(error) {
                console.error('Failed to initialize on load:', error);
            });
        });
    } else {
        init().catch(function(error) {
            console.error('Failed to initialize:', error);
        });
    }

    return {
        init: init,
        connect: connect,
        join: join,
        requestRoll: requestRoll,
        placeBet: placeBet,
        recordRoll: recordRoll,
        completeAnimation: completeAnimation,
        leave: leave,
        getCurrentRoom: getCurrentRoom,
        isConnected: isConnected
    };
})();

