window.Realtime = (function(){
    var currentRoom = null;
    var isInitialized = false;
    var currentUser = null;

    // Initialize Hybrid Realtime System (Supabase + Socket.IO)
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

            currentUser = user;

            // Initialize Hybrid Realtime Manager
            if (window.HybridRealtimeManager && window.HybridRealtimeManager.init) {
                return window.HybridRealtimeManager.init();
            }
            
            // Fallback to individual initialization
            var promises = [];
            
            // Initialize Supabase Multiplayer
            if (window.SupabaseMultiplayer && window.SupabaseMultiplayer.init) {
                promises.push(window.SupabaseMultiplayer.init());
            }
            
            // Initialize Supabase Realtime Dice
            if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.init) {
                promises.push(window.SupabaseRealtimeDice.init());
            }
            
            // Initialize Socket.IO Client
            if (window.SocketIOClient && window.SocketIOClient.init) {
                promises.push(window.SocketIOClient.init());
            }
            
            return Promise.all(promises);
        }).then(function() {
            isInitialized = true;
            console.log('✅ Hybrid Realtime System initialized successfully');
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
        
        // Supabase connection is handled automatically
        return true;
    }

    function join(room){
        if (!isInitialized) {
            console.error('Realtime not initialized');
            return Promise.reject(new Error('Not initialized'));
        }

        if (!currentUser) {
            console.error('User not authenticated');
            return Promise.reject(new Error('User not authenticated'));
        }

        currentRoom = room;

        // Use Hybrid Realtime Manager if available
        if (window.HybridRealtimeManager && window.HybridRealtimeManager.joinRoom) {
            // Get user profile for username
            return window.SupabaseMultiplayer.getUserProfile().then(function(profile) {
                var username = profile ? profile.username : currentUser.email || 'Player';
                return window.HybridRealtimeManager.joinRoom(room, currentUser.id, username);
            }).then(function(result) {
                console.log('✅ Successfully joined room with hybrid system:', room);
                return result;
            }).catch(function(error) {
                console.error('❌ Failed to join room with hybrid system:', error);
                handleJoinError(error);
                throw error;
            });
        }
        
        // Fallback to Supabase only
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
            handleJoinError(error);
            throw error;
        });
    }

    function handleJoinError(error) {
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
    }

    function requestRoll(){
        if (!isInitialized || !window.SupabaseRealtimeDice) {
            console.error('Realtime not initialized or SupabaseRealtimeDice not available');
            return Promise.reject(new Error('Not initialized'));
        }
        
        // Add timeout to prevent hanging requests
        var rollPromise = window.SupabaseRealtimeDice.requestRoll();
        var timeoutPromise = new Promise(function(resolve, reject) {
            setTimeout(function() {
                reject(new Error('Request timeout - network too slow'));
            }, 5000); // 5 second timeout
        });
        
        return Promise.race([rollPromise, timeoutPromise]);
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
        // Use Hybrid Realtime Manager if available
        if (window.HybridRealtimeManager && window.HybridRealtimeManager.leaveRoom) {
            return window.HybridRealtimeManager.leaveRoom();
        }
        
        // Fallback to individual systems
        var promises = [];
        
        if (window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.leaveRoom) {
            promises.push(window.SupabaseRealtimeDice.leaveRoom());
        }
        
        if (window.SocketIOClient && window.SocketIOClient.leaveLobby) {
            promises.push(Promise.resolve(window.SocketIOClient.leaveLobby()));
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
        return isInitialized && window.SupabaseRealtimeDice && window.SupabaseRealtimeDice.isConnected();
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init().catch(function(error) {
                console.error('Failed to initialize on load:', error);
                // Don't prevent game from starting if realtime fails
                isInitialized = false;
            });
        });
    } else {
        init().catch(function(error) {
            console.error('Failed to initialize:', error);
            // Don't prevent game from starting if realtime fails
            isInitialized = false;
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

