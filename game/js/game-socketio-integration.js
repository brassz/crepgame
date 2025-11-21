/**
 * Integration between GameClientSocketIO and existing CGame.js
 * This bridges the pure Socket.IO system with the game UI
 */
(function() {
    console.log('🔌 Loading Socket.IO Game Integration...');
    
    // Wait for game to be ready
    function waitForGame() {
        if (typeof window.s_oGame === 'undefined' || !window.s_oGame) {
            console.log('⏳ Waiting for s_oGame to be initialized...');
            setTimeout(waitForGame, 100);
            return;
        }
        
        console.log('✅ s_oGame found, setting up integration');
        setupIntegration();
    }
    
    function setupIntegration() {
        const gameClient = window.GameClientSocketIO;
        
        if (!gameClient) {
            console.error('❌ GameClientSocketIO not found!');
            return;
        }
        
        console.log('🎮 Setting up Socket.IO integration with game...');
        
        // Override the roll button handler
        const originalOnRollBut = window.s_oGame._onRollBut;
        window.s_oGame._onRollBut = function() {
            console.log('🎲 Roll button clicked - using Socket.IO with INSTANT animation');
            
            // Check if connected
            if (!gameClient.isConnected || !gameClient.isAuthenticated) {
                console.error('❌ Not connected to Socket.IO server');
                alert('Não conectado ao servidor! Verifique a conexão.');
                return;
            }
            
            // Check if player has bets
            if (window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet() <= 0) {
                console.log('❌ No bets placed');
                alert('Você precisa fazer uma aposta primeiro!');
                return;
            }
            
            // Prevent double-click
            if (window.s_oGame._isRolling) {
                console.log('⚠️ Already rolling, ignoring click');
                return;
            }
            
            window.s_oGame._isRolling = true;
            
            // ⚡ INSTANT ANIMATION: Start rolling animation IMMEDIATELY without waiting for server
            // The dice will animate with random values, server will send actual result
            console.log('⚡ Starting INSTANT dice animation...');
            if (window.s_oGame._oDicesAnim) {
                // Generate random dice values for animation
                const tempDice1 = Math.floor(Math.random() * 6) + 1;
                const tempDice2 = Math.floor(Math.random() * 6) + 1;
                window.s_oGame._oDicesAnim.startRolling([tempDice1, tempDice2]);
            }
            
            // Play sound immediately
            if (typeof playSound === 'function') {
                playSound('dice_rolling', 1, false);
            }
            
            // Send roll request to server (server will send back the real result)
            console.log('📤 Sending roll_dice to server...');
            const success = gameClient.rollDice();
            
            if (!success) {
                console.error('❌ Failed to send roll request');
                window.s_oGame._isRolling = false;
                alert('Erro ao enviar jogada!');
            }
        };
        
        // Handle dice rolled event from OTHER players
        gameClient.onDiceRolled((rollData) => {
            console.log('🎲 Received dice_rolled from OTHER player:', rollData);
            
            // Update game state with dice result
            if (window.s_oGame._aDiceResult) {
                window.s_oGame._aDiceResult = [rollData.dice1, rollData.dice2];
            } else {
                window.s_oGame._aDiceResult = new Array();
                window.s_oGame._aDiceResult[0] = rollData.dice1;
                window.s_oGame._aDiceResult[1] = rollData.dice2;
            }
            
            // Add to history
            if (window.s_oGame._aDiceResultHistory) {
                window.s_oGame._aDiceResultHistory.push([rollData.dice1, rollData.dice2]);
            }
            
            // Show dice animation for OTHER player's roll
            if (window.s_oGame._oDicesAnim) {
                console.log('🎬 Starting dice animation for other player:', [rollData.dice1, rollData.dice2]);
                window.s_oGame._oDicesAnim.startRolling([rollData.dice1, rollData.dice2]);
            }
            
            // Play sound
            if (typeof playSound === 'function') {
                playSound('dice_rolling', 1, false);
            }
        });
        
        // Handle dice confirmed event from server (MY roll)
        gameClient.onDiceConfirmed((rollData) => {
            console.log('✅ Received dice_confirmed (MY roll):', rollData);
            
            // Update game state with REAL dice result from server
            if (window.s_oGame._aDiceResult) {
                window.s_oGame._aDiceResult = [rollData.dice1, rollData.dice2];
            } else {
                window.s_oGame._aDiceResult = new Array();
                window.s_oGame._aDiceResult[0] = rollData.dice1;
                window.s_oGame._aDiceResult[1] = rollData.dice2;
            }
            
            // Add to history
            if (window.s_oGame._aDiceResultHistory) {
                window.s_oGame._aDiceResultHistory.push([rollData.dice1, rollData.dice2]);
            }
            
            // Animation already started instantly, just update with real result
            // The dice animation will show the correct final values
            console.log('🎯 Dice confirmed - real result applied:', [rollData.dice1, rollData.dice2]);
        });
        
        // Handle game result
        gameClient.onGameResult((result) => {
            console.log('🎯 Game result:', result);
            
            // Show message to player
            if (window.CScoreText) {
                new CScoreText(result.message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
            }
            
            // Update game state based on result type
            if (result.type === 'natural_win' || result.type === 'point_made') {
                // Player won
                console.log('✅ Player won!');
            } else if (result.type === 'craps' || result.type === 'seven_out') {
                // Player lost
                console.log('❌ Player lost');
            }
        });
        
        // Handle point established
        gameClient.onPointEstablished((data) => {
            console.log('📍 Point established:', data.point);
            
            // Update puck position
            if (window.s_oGame._oPuck && window.s_oGameSettings) {
                const iNewX = window.s_oGameSettings.getPuckXByNumber(data.point);
                window.s_oGame._oPuck.switchOn(iNewX);
            }
            
            // Update number point
            if (window.s_oGame._iNumberPoint !== undefined) {
                window.s_oGame._iNumberPoint = data.point;
            }
            
            // Show message
            if (window.CScoreText) {
                new CScoreText(data.message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }
        });
        
        // Handle shooter changed
        gameClient.onShooterChanged((data) => {
            console.log('🔄 Shooter changed to:', data.shooterName);
            
            // Show notification
            if (window.CScoreText) {
                const message = data.newShooter === gameClient.currentUserId 
                    ? 'É SUA VEZ DE ROLAR!' 
                    : `${data.shooterName} é o atirador agora`;
                new CScoreText(message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }
        });
        
        // Handle bet confirmed
        gameClient.onBetConfirmed((confirmation) => {
            console.log('✅ Bet confirmed:', confirmation);
            
            // Update credit display
            if (window.s_oGame._oInterface) {
                window.s_oGame._oInterface.setMoney(confirmation.remainingCredit);
            }
            
            // Update seat credit
            if (window.s_oGame._oMySeat) {
                window.s_oGame._oMySeat.setCredit(confirmation.remainingCredit);
            }
            
            // Enable roll button if has bets
            if (confirmation.totalBet > 0 && window.s_oGame._oInterface) {
                window.s_oGame._oInterface.enableRoll(true);
            }
        });
        
        // Handle bets cleared
        gameClient.onBetsCleared((data) => {
            console.log('🧹 Bets cleared:', data);
            
            // Update credit display
            if (window.s_oGame._oInterface) {
                window.s_oGame._oInterface.setMoney(data.remainingCredit);
            }
            
            // Update seat credit
            if (window.s_oGame._oMySeat) {
                window.s_oGame._oMySeat.setCredit(data.remainingCredit);
            }
            
            // Clear visual bets
            if (window.s_oGame._oMySeat && window.s_oGame._oMySeat.clearAllBets) {
                window.s_oGame._oMySeat.clearAllBets();
            }
            
            // Disable roll button
            if (window.s_oGame._oInterface) {
                window.s_oGame._oInterface.enableRoll(false);
            }
        });
        
        // Handle players updated
        gameClient.onPlayersUpdated((players) => {
            console.log('👥 Players in room:', players.length, players);
            
            // Could update player list UI here
        });
        
        // Handle connection status
        gameClient.onConnected(() => {
            console.log('✅ Connected to Socket.IO server');
            
            // Show notification
            if (window.CScoreText) {
                new CScoreText('Conectado ao servidor!', CANVAS_WIDTH/2, 100);
            }
        });
        
        gameClient.onDisconnected((reason) => {
            console.log('❌ Disconnected from server:', reason);
            
            // Show notification
            if (window.CScoreText) {
                new CScoreText('Desconectado do servidor!', CANVAS_WIDTH/2, 100);
            }
        });
        
        // Handle errors
        gameClient.onError((error) => {
            console.error('❌ Socket.IO error:', error);
            
            // Show error message
            if (error.message) {
                alert('Erro: ' + error.message);
            }
            
            // Reset rolling flag
            if (window.s_oGame) {
                window.s_oGame._isRolling = false;
            }
        });
        
        // Auto-connect on game start
        function autoConnect() {
            // Get user info from localStorage or generate
            const userId = localStorage.getItem('playerId') || 'player_' + Math.random().toString(36).substr(2, 9);
            const username = localStorage.getItem('playerName') || 'Jogador ' + Math.floor(Math.random() * 1000);
            const roomId = 'table1'; // Default room
            const credit = 1000; // Starting credit
            
            // Save for next time
            localStorage.setItem('playerId', userId);
            if (!localStorage.getItem('playerName')) {
                localStorage.setItem('playerName', username);
            }
            
            console.log('🔌 Auto-connecting to Socket.IO...');
            console.log('   User ID:', userId);
            console.log('   Username:', username);
            console.log('   Room ID:', roomId);
            
            // Initialize and authenticate
            gameClient.init()
                .then(() => {
                    console.log('✅ Socket.IO initialized');
                    return new Promise((resolve) => {
                        // Wait a bit for connection to establish
                        setTimeout(() => {
                            gameClient.authenticate(userId, username, roomId, credit);
                            resolve();
                        }, 500);
                    });
                })
                .then(() => {
                    console.log('✅ Socket.IO integration complete!');
                })
                .catch((error) => {
                    console.error('❌ Failed to initialize Socket.IO:', error);
                });
        }
        
        // Connect after a short delay to ensure everything is loaded
        setTimeout(autoConnect, 1000);
        
        console.log('✅ Socket.IO integration setup complete!');
    }
    
    // Start waiting for game
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }
})();
