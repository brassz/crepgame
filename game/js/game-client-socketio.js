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
        onDiceRollStart: null, // NEW: Instant animation start for all players
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
        onUserLeft: null,
        // Pré-rolagem (apostas contra o shooter)
        onPreRollShooterBetting: null,
        onPreRollCoverageStart: null,
        onPreRollPlayerTurn: null,
        onPreRollDone: null,
        onPreRollCancelled: null
    };
    
    /**
     * Initialize Socket.IO connection
     */
    function init(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Inicializando Cliente de Jogo Socket.IO Puro...');
                
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
                    console.log('✅ Socket.IO conectado:', socket.id);
                    isConnected = true;
                    
                    if (callbacks.onConnected) {
                        callbacks.onConnected();
                    }
                    
                    resolve(true);
                });
                
                socket.on('connect_error', (error) => {
                    console.error('❌ Erro de conexão Socket.IO:', error);
                    isConnected = false;
                    
                    if (callbacks.onError) {
                        callbacks.onError({ type: 'connection', message: error.message });
                    }
                    
                    reject(error);
                });
                
            } catch (error) {
                console.error('Falha ao inicializar Socket.IO:', error);
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
            console.log('Socket.IO desconectado:', reason);
            isConnected = false;
            isAuthenticated = false;
            
            if (callbacks.onDisconnected) {
                callbacks.onDisconnected(reason);
            }
        });
        
        // Authentication
        socket.on('authenticated', (response) => {
            if (response.success) {
                console.log('✅ Autenticado com sucesso');
                isAuthenticated = true;
                
                if (callbacks.onAuthenticated) {
                    callbacks.onAuthenticated();
                }
            } else {
                console.error('❌ Falha na autenticação:', response.error);
                
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
        socket.on('dice_roll_start', (data) => {
            console.log('⚡ INÍCIO DO LANÇAMENTO DOS DADOS (INSTANTÂNEO - TODOS OS JOGADORES):', data);
            // This fires IMMEDIATELY when any player clicks roll
            // ALL players see animation start at the same time - ZERO DELAY
            if (callbacks.onDiceRollStart) {
                callbacks.onDiceRollStart(data);
            }
        });
        
        socket.on('dice_rolled', (rollData) => {
            console.log('⚡ Dados lançados (INSTANTÂNEO):', rollData);
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

        // ===== Pré-rolagem: apostas contra o shooter =====
        socket.on('pre_roll_shooter_betting', (data) => {
            console.log('⏱️ Pré-rolagem: shooter apostando (15s):', data);
            if (callbacks.onPreRollShooterBetting) {
                callbacks.onPreRollShooterBetting(data);
            }
        });

        socket.on('pre_roll_coverage_start', (data) => {
            console.log('🚦 Pré-rolagem: início da cobertura dos jogadores:', data);
            if (callbacks.onPreRollCoverageStart) {
                callbacks.onPreRollCoverageStart(data);
            }
        });

        socket.on('pre_roll_player_turn', (data) => {
            console.log('⏱️ Pré-rolagem: vez do jogador para apostar contra o shooter:', data);
            if (callbacks.onPreRollPlayerTurn) {
                callbacks.onPreRollPlayerTurn(data);
            }
        });

        socket.on('pre_roll_done', (data) => {
            console.log('✅ Pré-rolagem: fase concluída, liberar lançamento do shooter:', data);
            if (callbacks.onPreRollDone) {
                callbacks.onPreRollDone(data);
            }
        });

        socket.on('pre_roll_cancelled', (data) => {
            console.log('⚠️ Pré-rolagem: cancelada:', data);
            if (callbacks.onPreRollCancelled) {
                callbacks.onPreRollCancelled(data);
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
            console.error('Não é possível lançar: não conectado ou não autenticado');
            return false;
        }
        
        console.log('🎲 Enviando dados para o servidor:', dice1, dice2);
        socket.emit('roll_dice', { dice1, dice2 });
        return true;
    }
    
    /**
     * Place a bet
     */
    function placeBet(betType, amount) {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Não é possível apostar: não conectado ou não autenticado');
            return false;
        }
        
        console.log(`💰 Fazendo aposta: ${betType} por ${amount}`);
        socket.emit('place_bet', { betType, amount });
        return true;
    }
    
    /**
     * Clear all bets
     */
    function clearBets() {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Não é possível limpar apostas: não conectado ou não autenticado');
            return false;
        }
        
        console.log('🧹 Limpando apostas...');
        socket.emit('clear_bets');
        return true;
    }

    /**
     * Iniciar fase de pré-rolagem (shooter clica APOSTAR)
     */
    function startPreRoll() {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Não é possível iniciar pré-rolagem: não conectado ou não autenticado');
            return false;
        }

        // Usar o valor da aposta local do shooter (CGame/CSeat) para o servidor
        let shooterBetAmount = 0;
        try {
            if (window.s_oGame && window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet) {
                shooterBetAmount = window.s_oGame._oMySeat.getCurBet() || 0;
            }
        } catch (e) {
            console.warn('Não foi possível obter aposta atual do shooter do jogo local:', e);
        }

        console.log('🚦 Iniciando pré-rolagem (APOSTAR do shooter)... Aposta atual:', shooterBetAmount);
        socket.emit('pre_roll_start', { amount: shooterBetAmount });
        return true;
    }
    
    /**
     * Request current game state
     */
    function requestGameState() {
        if (!socket || !isConnected || !isAuthenticated) {
            console.error('Não é possível solicitar estado do jogo: não conectado ou não autenticado');
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
            console.error('Não é possível enviar mensagem: não conectado ou não autenticado');
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
    function onDiceRollStart(callback) { callbacks.onDiceRollStart = callback; }
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
    // Pré-rolagem
    function onPreRollShooterBetting(callback) { callbacks.onPreRollShooterBetting = callback; }
    function onPreRollCoverageStart(callback) { callbacks.onPreRollCoverageStart = callback; }
    function onPreRollPlayerTurn(callback) { callbacks.onPreRollPlayerTurn = callback; }
    function onPreRollDone(callback) { callbacks.onPreRollDone = callback; }
    function onPreRollCancelled(callback) { callbacks.onPreRollCancelled = callback; }
    
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
        startPreRoll,
        
        // Event handlers
        onConnected,
        onDisconnected,
        onAuthenticated,
        onGameState,
        onDiceRollStart,
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
        // Pré-rolagem
        onPreRollShooterBetting,
        onPreRollCoverageStart,
        onPreRollPlayerTurn,
        onPreRollDone,
        onPreRollCancelled,
        
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
