/**
 * Pure Socket.IO Game Client
 * Handles all game communication without Supabase dependencies
 */
window.GameClientSocketIO = (function() {
    let socket = null;
    let isConnected = false;
    let isAuthenticated = false;
    let currentUserId = null;
    let currentUsername = null;
    let currentRoomId = null;
    let currentCredit = 1000;
    
    // Game state
    let gameState = {
        state: 'WAITING',
        players: [],
        currentShooter: null,
        point: null,
        lastRoll: null,
        bets: [],
        history: []
    };
    
    // Event callbacks
    const callbacks = {
        onConnected: null,
        onDisconnected: null,
        onAuthenticated: null,
        onGameState: null,
        onDiceRolled: null,
        onBetPlaced: null,
        onBetConfirmed: null,
        onBetsCleared: null,
        onGameResult: null,
        onPointEstablished: null,
        onShooterChanged: null,
        onPlayersUpdated: null,
        onError: null,
        onChatMessage: null,
        onUserJoined: null,
        onUserLeft: null
    };
    
    /**
     * Initialize Socket.IO connection
     */
    function init(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Initializing Pure Socket.IO Game Client...');
                
                // Initialize Socket.IO connection - FORCE WEBSOCKET FOR ZERO DELAY
                socket = io(serverUrl || window.location.origin, {
                    transports: ['websocket'],
                    upgrade: false,
                    rememberUpgrade: false,
                    timeout: 20000,
                    forceNew: false,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000
                });
                
                setupSocketHandlers();
                
                socket.on('connect', () => {
                    console.log('✅ Socket.IO connected:', socket.id);
                    isConnected = true;
                    
                    if (callbacks.onConnected) {
                        callbacks.onConnected();
                    }
                    
                    resolve(true);
                });
                
                socket.on('connect_error', (error) => {
                    console.error('❌ Socket.IO connection error:', error);
                    isConnected = false;
                    
                    if (callbacks.onError) {
                        callbacks.onError({ type: 'connection', message: error.message });
                    }
                    
                    reject(error);
                });
                
            } catch (error) {
                console.error('Failed to initialize Socket.IO:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Setup all socket event handlers
     */
    function setupSocketHandlers() {
        // Connection events
        socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
            isConnected = false;
            isAuthenticated = false;
            
            if (callbacks.onDisconnected) {
                callbacks.onDisconnected(reason);
            }
        });
        
        // Authentication
        socket.on('authenticated', (response) => {
            if (response.success) {
                console.log('✅ Authenticated successfully');
                isAuthenticated = true;
                
                if (callbacks.onAuthenticated) {
                    callbacks.onAuthenticated();
                }
            } else {
                console.error('❌ Authentication failed:', response.error);
                
                if (callbacks.onError) {
                    callbacks.onError({ type: 'authentication', message: response.error });
                }
            }
        });
        
        // Game state events
        socket.on('game_state', (state) => {
            console.log('📊 Game state received:', state);
            updateGameState(state);
            
            if (callbacks.onGameState) {
                callbacks.onGameState(state);
            }
        });
        
        socket.on('game_state_updated', (update) => {
            console.log('🔄 Game state updated:', update);
            
            if (update.gameState) gameState.state = update.gameState;
            if (update.point !== undefined) gameState.point = update.point;
            if (update.currentShooter) gameState.currentShooter = update.currentShooter;
            
            if (callbacks.onGameState) {
                callbacks.onGameState(gameState);
            }
        });
        
        // Dice events - INSTANT BROADCAST TO ALL PLAYERS
        socket.on('dice_rolled', (rollData) => {
            console.log('⚡ Dice rolled (INSTANT):', rollData);
            gameState.lastRoll = rollData;
            
            if (callbacks.onDiceRolled) {
                callbacks.onDiceRolled(rollData);
            }
        });
        
        socket.on('game_result', (result) => {
            console.log('🎯 Game result:', result);
            
            if (callbacks.onGameResult) {
                callbacks.onGameResult(result);
            }
        });
        
        socket.on('point_established', (data) => {
            console.log('📍 Point established:', data);
            gameState.point = data.point;
            
            if (callbacks.onPointEstablished) {
                callbacks.onPointEstablished(data);
            }
        });
        
        socket.on('shooter_changed', (data) => {
            console.log('🔄 Shooter changed:', data);
            gameState.currentShooter = data.newShooter;
            
            if (callbacks.onShooterChanged) {
                callbacks.onShooterChanged(data);
            }
        });
        
        // Betting events
        socket.on('bet_placed', (betData) => {
            console.log('💰 Bet placed:', betData);
            
            if (callbacks.onBetPlaced) {
                callbacks.onBetPlaced(betData);
            }
        });
        
        socket.on('bet_confirmed', (confirmation) => {
            console.log('✅ Bet confirmed:', confirmation);
            currentCredit = confirmation.remainingCredit;
            
            if (callbacks.onBetConfirmed) {
                callbacks.onBetConfirmed(confirmation);
            }
        });
        
        socket.on('bets_cleared', (data) => {
            console.log('🧹 Bets cleared:', data);
            currentCredit = data.remainingCredit;
            
            if (callbacks.onBetsCleared) {
                callbacks.onBetsCleared(data);
            }
        });
        
        socket.on('player_cleared_bets', (data) => {
            console.log('🧹 Player cleared bets:', data);
        });
        
        // Player events
        socket.on('players_updated', (data) => {
            console.log('👥 Players updated:', data);
            gameState.players = data.players;
            
            if (callbacks.onPlayersUpdated) {
                callbacks.onPlayersUpdated(data.players);
            }
        });
        
        socket.on('user_joined', (userData) => {
            console.log('👤 User joined:', userData);
            
            if (callbacks.onUserJoined) {
                callbacks.onUserJoined(userData);
            }
        });
        
        socket.on('user_left', (userData) => {
            console.log('👤 User left:', userData);
            
            if (callbacks.onUserLeft) {
                callbacks.onUserLeft(userData);
            }
        });
        
        // Chat events
        socket.on('chat_message', (message) => {
            if (callbacks.onChatMessage) {
                callbacks.onChatMessage(message);
            }
        });
        
        socket.on('chat_history', (messages) => {
            if (callbacks.onChatMessage) {
                messages.forEach(msg => callbacks.onChatMessage(msg, true));
            }
        });
        
        // Error events
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            
            if (callbacks.onError) {
                callbacks.onError({ type: 'socket', message: error.message || error });
            }
        });
    }
    
    /**
     * Update local game state
     */
    function updateGameState(state) {
        gameState.state = state.gameState || gameState.state;
        gameState.players = state.players || gameState.players;
        gameState.currentShooter = state.currentShooter || gameState.currentShooter;
        gameState.point = state.point !== undefined ? state.point : gameState.point;
        gameState.lastRoll = state.lastRoll || gameState.lastRoll;
        gameState.bets = state.bets || gameState.bets;
        gameState.history = state.history || gameState.history;
    }
    
    /**
     * Authenticate user and join room
     */
    function authenticate(userId, username, roomId, credit) {
        if (!socket || !isConnected) {
            console.error('Socket not connected');
            return false;
        }
        
        currentUserId = userId;
        currentUsername = username;
        currentRoomId = roomId;
        currentCredit = credit || 1000;
        
        console.log(`Authenticating: ${username} in room ${roomId}`);
        
        socket.emit('authenticate', {
            userId,
            username,
            roomId,
            credit: currentCredit
        });
        
        return true;
    }
    
    /**
     * Roll the dice
     * @param {number} dice1 - First dice value (1-6) - generated locally for instant animation
     * @param {number} dice2 - Second dice value (1-6) - generated locally for instant animation
     */
    function rollDice(dice1, dice2) {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Cannot roll: not connected or authenticated');
            return false;
        }
        
        console.log('🎲 Sending dice to server:', dice1, dice2);
        socket.emit('roll_dice', { dice1, dice2 });
        return true;
    }
    
    /**
     * Place a bet
     */
    function placeBet(betType, amount) {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Cannot place bet: not connected or authenticated');
            return false;
        }
        
        console.log(`💰 Placing bet: ${betType} for ${amount}`);
        socket.emit('place_bet', { betType, amount });
        return true;
    }
    
    /**
     * Clear all bets
     */
    function clearBets() {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Cannot clear bets: not connected or authenticated');
            return false;
        }
        
        console.log('🧹 Clearing bets...');
        socket.emit('clear_bets');
        return true;
    }
    
    /**
     * Request current game state
     */
    function requestGameState() {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Cannot request game state: not connected or authenticated');
            return false;
        }
        
        socket.emit('get_game_state');
        return true;
    }
    
    /**
     * Send chat message
     */
    function sendChatMessage(message) {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Cannot send message: not connected or authenticated');
            return false;
        }
        
        socket.emit('chat_message', { message });
        return true;
    }
    
    /**
     * Disconnect from server
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        isConnected = false;
        isAuthenticated = false;
        currentUserId = null;
        currentUsername = null;
        currentRoomId = null;
    }
    
    /**
     * Event callback setters
     */
    function onConnected(callback) { callbacks.onConnected = callback; }
    function onDisconnected(callback) { callbacks.onDisconnected = callback; }
    function onAuthenticated(callback) { callbacks.onAuthenticated = callback; }
    function onGameState(callback) { callbacks.onGameState = callback; }
    function onDiceRolled(callback) { callbacks.onDiceRolled = callback; }
    function onBetPlaced(callback) { callbacks.onBetPlaced = callback; }
    function onBetConfirmed(callback) { callbacks.onBetConfirmed = callback; }
    function onBetsCleared(callback) { callbacks.onBetsCleared = callback; }
    function onGameResult(callback) { callbacks.onGameResult = callback; }
    function onPointEstablished(callback) { callbacks.onPointEstablished = callback; }
    function onShooterChanged(callback) { callbacks.onShooterChanged = callback; }
    function onPlayersUpdated(callback) { callbacks.onPlayersUpdated = callback; }
    function onError(callback) { callbacks.onError = callback; }
    function onChatMessage(callback) { callbacks.onChatMessage = callback; }
    function onUserJoined(callback) { callbacks.onUserJoined = callback; }
    function onUserLeft(callback) { callbacks.onUserLeft = callback; }
    
    // Public API
    return {
        init,
        authenticate,
        rollDice,
        placeBet,
        clearBets,
        requestGameState,
        sendChatMessage,
        disconnect,
        
        // Event handlers
        onConnected,
        onDisconnected,
        onAuthenticated,
        onGameState,
        onDiceRolled,
        onBetPlaced,
        onBetConfirmed,
        onBetsCleared,
        onGameResult,
        onPointEstablished,
        onShooterChanged,
        onPlayersUpdated,
        onError,
        onChatMessage,
        onUserJoined,
        onUserLeft,
        
        // Getters
        get isConnected() { return isConnected; },
        get isAuthenticated() { return isAuthenticated; },
        get currentUserId() { return currentUserId; },
        get currentUsername() { return currentUsername; },
        get currentRoomId() { return currentRoomId; },
        get currentCredit() { return currentCredit; },
        get gameState() { return gameState; },
        get socket() { return socket; }
    };
})();
