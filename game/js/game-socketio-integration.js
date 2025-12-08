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
            console.log('🎲 Roll button clicked - INSTANT LOCAL ANIMATION');
            
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
                console.warn('⚠️ Already rolling, ignoring click');
                console.warn('⚠️ If stuck, run: window.resetDiceRoll()');
                return;
            }
            
            console.log('✅ Setting _isRolling to true at:', new Date().toISOString());
            window.s_oGame._isRolling = true;
            
            // Single unified timeout to reset rolling flag
            // This ensures _isRolling is ALWAYS reset, even if errors occur
            const resetRollingFlag = function() {
                if (window.s_oGame._isRolling) {
                    console.log('🔄 Resetting _isRolling flag');
                    window.s_oGame._isRolling = false;
                    
                    // Also ensure UI is unlocked
                    if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                        window.s_oGame._oInterface.hideBlock();
                    }
                    
                    if (window.s_oGame._oInterface && window.s_oGame._oInterface.enableBetFiches) {
                        window.s_oGame._oInterface.enableBetFiches();
                    }
                }
            };
            
            // Safety timeout - will ALWAYS fire to reset flag
            const safetyTimeout = setTimeout(resetRollingFlag, 5000);
            
            // ===== GENERATE DICE LOCALLY AND START ANIMATION IMMEDIATELY =====
            // This ensures ZERO LATENCY for the player who clicked
            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            
            console.log('⚡ INSTANT: Generated dice locally:', dice1, dice2);
            
            // Update game state with dice result IMMEDIATELY
            if (window.s_oGame._aDiceResult) {
                window.s_oGame._aDiceResult = [dice1, dice2];
            } else {
                window.s_oGame._aDiceResult = new Array();
                window.s_oGame._aDiceResult[0] = dice1;
                window.s_oGame._aDiceResult[1] = dice2;
            }
            
            // Add to history
            if (window.s_oGame._aDiceResultHistory) {
                window.s_oGame._aDiceResultHistory.push([dice1, dice2]);
            }
            
            // Start dice animation INSTANTLY (NO WAITING FOR SERVER)
            if (window.s_oGame._oDicesAnim) {
                console.log('🎬 INSTANT: Starting dice animation NOW:', [dice1, dice2]);
                try {
                    window.s_oGame._oDicesAnim.startRolling([dice1, dice2]);
                } catch (error) {
                    console.error('❌ Error starting dice animation:', error);
                    clearTimeout(safetyTimeout);
                    resetRollingFlag();
                    return;
                }
            } else {
                console.error('❌ Dice animation object not available');
                clearTimeout(safetyTimeout);
                resetRollingFlag();
                return;
            }
            
            // Play sound
            if (typeof playSound === 'function') {
                playSound('dice_rolling', 1, false);
            }
            
            // Send dice values to server (server will broadcast to OTHER players only)
            console.log('📤 Sending dice to server for other players...');
            
            try {
                const success = gameClient.rollDice(dice1, dice2);
                
                if (!success) {
                    console.error('❌ Failed to send roll to server');
                    // Don't reset immediately, let animation complete
                    console.log('ℹ️ Animation will continue locally');
                }
            } catch (error) {
                console.error('❌ Exception while sending roll to server:', error);
                // Don't reset immediately, let animation complete
                console.log('ℹ️ Animation will continue locally');
            }
        };
        
        // Handle dice rolled event from server (FOR OTHER PLAYERS ONLY)
        // The shooter already started their animation locally, so this is only for observers
        gameClient.onDiceRolled((rollData) => {
            try {
                console.log('⚡ Received dice_rolled from server at:', new Date().toISOString());
                console.log('⚡ Roll data:', rollData);
                
                // Check if this is MY roll (if so, skip since we already animated)
                const isMyRoll = (rollData.shooter === gameClient.currentUserId);
                
                if (isMyRoll) {
                    console.log('ℹ️ This is my own roll - already animated locally, skipping');
                    return; // Skip - we already started animation when we clicked
                }
                
                console.log('👀 This is another player\'s roll - starting animation');
                
                // Prevent starting new animation if already rolling
                if (window.s_oGame._isRolling) {
                    console.warn('⚠️ Already rolling, skipping this dice roll event');
                    return;
                }
                
                // Set rolling flag for observers
                window.s_oGame._isRolling = true;
                
                // Single unified timeout to reset rolling flag
                const resetRollingFlag = function() {
                    if (window.s_oGame._isRolling) {
                        console.log('🔄 Resetting _isRolling flag for observer');
                        window.s_oGame._isRolling = false;
                        
                        // Ensure UI is unlocked
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                            window.s_oGame._oInterface.hideBlock();
                        }
                        
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.enableBetFiches) {
                            window.s_oGame._oInterface.enableBetFiches();
                        }
                    }
                };
                
                // Safety timeout - will ALWAYS fire to reset flag
                setTimeout(resetRollingFlag, 5000);
                
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
                
                // Start dice animation INSTANTLY for observer
                if (window.s_oGame._oDicesAnim) {
                    console.log('🎬 Starting dice animation for observer:', [rollData.dice1, rollData.dice2]);
                    try {
                        window.s_oGame._oDicesAnim.startRolling([rollData.dice1, rollData.dice2]);
                    } catch (error) {
                        console.error('❌ Error starting dice animation:', error);
                        resetRollingFlag();
                        return;
                    }
                } else {
                    console.error('❌ Dice animation object not available');
                    resetRollingFlag();
                    return;
                }
                
                // Play sound
                if (typeof playSound === 'function') {
                    playSound('dice_rolling', 1, false);
                }
                
            } catch (error) {
                console.error('❌ Error handling dice_rolled event:', error);
                // Reset rolling flag on error
                if (window.s_oGame) {
                    window.s_oGame._isRolling = false;
                }
            }
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
