// Sistema de Realtime usando autenticação customizada
window.Realtime = (function(){
    var currentRoom = null;
    var isInitialized = false;
    var currentUser = null;

    // Initialize Hybrid Realtime System (Supabase + Socket.IO) with Custom Auth
    function init() {
        if (!window.customAuth) {
            console.error('Custom auth not available');
            return Promise.reject(new Error('Custom auth not available'));
        }

        currentUser = window.customAuth.getCurrentUser();
        
        if (!currentUser) {
            console.error('User not authenticated');
            return Promise.reject(new Error('User not authenticated'));
        }

        // Initialize Hybrid Realtime Manager
        if (window.HybridRealtimeManager && window.HybridRealtimeManager.init) {
            return window.HybridRealtimeManager.init();
        }
        
        // Fallback to individual initialization
        var promises = [];
        
        // Initialize Supabase Multiplayer (if available)
        if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.init) {
            promises.push(window.SupabaseMultiplayer.init());
        }
        
        // Initialize Socket.IO Client (preferred method)
        if (window.SocketIOClient && window.SocketIOClient.init) {
            promises.push(window.SocketIOClient.init());
        }
        
        return Promise.all(promises).then(function() {
            isInitialized = true;
            console.log('✅ Hybrid Realtime System initialized successfully with custom auth');
            return true;
        }).catch(function(error) {
            console.error('❌ Failed to initialize Hybrid Realtime System:', error);
            throw error;
        });
    }

    function connect(){
        if (!isInitialized) {
            console.warn('Realtime not initialized. Call init() first.');
            return null;
        }
        
        return true;
    }

    function join(room){
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }

        currentUser = window.customAuth.getCurrentUser();
        
        if (!currentUser) {
            console.error('User not authenticated');
            return Promise.reject(new Error('User not authenticated'));
        }

        currentRoom = room;

        // Use Hybrid Realtime Manager if available
        if (window.HybridRealtimeManager && window.HybridRealtimeManager.joinRoom) {
            var username = currentUser.username || currentUser.email || 'Player';
            return window.HybridRealtimeManager.joinRoom(room, currentUser.id, username).then(function(result) {
                console.log('✅ Successfully joined room with hybrid system:', room);
                return result;
            }).catch(function(error) {
                console.error('❌ Failed to join room with hybrid system:', error);
                handleJoinError(error);
                throw error;
            });
        }
        
        // Fallback to Socket.IO only (preferred for custom auth)
        if (window.SocketIOClient && window.SocketIOClient.joinLobby) {
            return Promise.resolve(window.SocketIOClient.joinLobby(room));
        }

        return Promise.reject(new Error('No realtime system available'));
    }

    function handleJoinError(error) {
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
    }

    function requestRoll(){
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        
        // Use Socket.IO if available (preferred)
        if (window.SocketIOClient && window.SocketIOClient.requestRoll) {
            return Promise.resolve(window.SocketIOClient.requestRoll());
        }
        
        // Fallback to Supabase Realtime Dice
        if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.requestRoll) {
            var rollPromise = window.SupabaseRealtimeDice.requestRoll();
            var timeoutPromise = new Promise(function(resolve, reject) {
                setTimeout(function() {
                    reject(new Error('Request timeout - network too slow'));
                }, 5000);
            });
            return Promise.race([rollPromise, timeoutPromise]);
        }
        
        return Promise.reject(new Error('No roll system available'));
    }

    function placeBet(betType, betAmount) {
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        
        // Use Socket.IO if available
        if (window.SocketIOClient && window.SocketIOClient.placeBet) {
            return Promise.resolve(window.SocketIOClient.placeBet(betType, betAmount));
        }
        
        // Fallback to Supabase Multiplayer
        if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.placeBet) {
            return window.SupabaseMultiplayer.placeBet(betType, betAmount);
        }
        
        return Promise.reject(new Error('No betting system available'));
    }

    function recordRoll(die1, die2, phase, result) {
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        
        // Use Socket.IO if available
        if (window.SocketIOClient && window.SocketIOClient.recordRoll) {
            return Promise.resolve(window.SocketIOClient.recordRoll(die1, die2, phase, result));
        }
        
        // Fallback to Supabase
        if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.recordDiceRoll) {
            return window.SupabaseMultiplayer.recordDiceRoll(die1, die2, phase, result);
        }
        
        return Promise.resolve();
    }

    function completeAnimation(moveId) {
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }
        
        if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.completeAnimation) {
            return window.SupabaseRealtimeDice.completeAnimation(moveId);
        }
        
        return Promise.resolve();
    }

    function leave() {
        // Use Hybrid Realtime Manager if available
        if (window.HybridRealtimeManager && window.HybridRealtimeManager.leaveRoom) {
            return window.HybridRealtimeManager.leaveRoom();
        }
        
        // Fallback to individual systems
        var promises = [];
        
        if (window.SocketIOClient && window.SocketIOClient.leaveLobby) {
            promises.push(Promise.resolve(window.SocketIOClient.leaveLobby()));
        }
        
        if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.leaveRoom) {
            promises.push(window.SupabaseRealtimeDice.leaveRoom());
        }
        
        return Promise.all(promises).then(function() {
            currentRoom = null;
            return true;
        });
    }

    function getCurrentRoom() {
        return currentRoom;
    }

    function isConnected() {
        return isInitialized;
    }

    // Initialize on load (but don't fail if custom auth not ready yet)
    function tryInit() {
        if (window.customAuth && window.customAuth.getCurrentUser()) {
            init().catch(function(error) {
                console.error('Failed to initialize realtime:', error);
                isInitialized = false;
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        setTimeout(tryInit, 500); // Delay to ensure custom-auth loads first
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
