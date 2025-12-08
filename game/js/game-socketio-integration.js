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
        const originalOnRoll = window.s_oGame.onRoll;
        window.s_oGame.onRoll = function() {
            console.log('🎲 Roll button clicked - checking Socket.IO connection...');
            
            // Check if connected - if not, fall back to original offline behavior
            if (!gameClient.isConnected || !gameClient.isAuthenticated) {
                console.warn('⚠️ Socket.IO not connected - using offline mode');
                // Call original onRoll for offline gameplay
                if (originalOnRoll) {
                    return originalOnRoll.call(window.s_oGame);
                }
                return;
            }
            
            console.log('✅ Socket.IO connected - using multiplayer mode');
            
            // Check if player has bets
            if (window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet() <= 0) {
                console.log('❌ No bets placed');
                alert('Você precisa fazer uma aposta primeiro!');
                return;
            }
            
            // Prevent double-click
            if (window.s_oGame._isRolling) {
                console.warn('⚠️ Already rolling, ignoring click');
                return;
            }
            
            console.log('✅ Setting _isRolling to true at:', new Date().toISOString());
            window.s_oGame._isRolling = true;
            
            // Set game state and UI (from original onRoll logic)
            if (window.s_oGame._oInterface) {
                window.s_oGame._oInterface.showBlock();
            }
            
            // Set state to COME_OUT if waiting for bet (accessing private variables)
            const STATE_GAME_WAITING_FOR_BET = 0;
            const STATE_GAME_COME_OUT = 1;
            if (window.s_oGame._iState === STATE_GAME_WAITING_FOR_BET) {
                if (window.s_oGame._setState) {
                    window.s_oGame._setState(STATE_GAME_COME_OUT);
                }
            }
            
            // Trigger bet_placed event
            if (window.s_oMain && window.s_oGame._oMySeat) {
                $(window.s_oMain).trigger("bet_placed", window.s_oGame._oMySeat.getCurBet());
            }
            
            // Single unified timeout to reset rolling flag
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
            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            
            console.log('⚡ INSTANT: Generated dice locally:', dice1, dice2);
            
            // Validate generated dice
            if (typeof dice1 !== 'number' || typeof dice2 !== 'number' ||
                dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
                console.error('❌ Invalid dice generated:', dice1, dice2);
                clearTimeout(safetyTimeout);
                resetRollingFlag();
                return;
            }
            
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
            
            // Add to visual history panel
            if (window.s_oGame.addRollToHistory) {
                const username = localStorage.getItem('playerName') || 'Você';
                window.s_oGame.addRollToHistory(dice1, dice2, username);
            }
            
            // ===== START ANIMATION INSTANTLY FOR THIS PLAYER =====
            if (window.s_oGame._oDicesAnim) {
                console.log('🎬 INSTANT: Starting animation for shooter:', [dice1, dice2]);
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
            
            // Send dice values to server
            // Server will broadcast dice_roll_start to ALL OTHER players for instant animation
            // Then dice_rolled with the result
            console.log('📤 Sending dice to server - will broadcast to all other players...');
            
            try {
                const success = gameClient.rollDice(dice1, dice2);
                
                if (!success) {
                    console.error('❌ Failed to send roll to server');
                    console.log('ℹ️ Animation will continue locally');
                }
            } catch (error) {
                console.error('❌ Exception while sending roll to server:', error);
                console.log('ℹ️ Animation will continue locally');
            }
        };
        
        // ===== HANDLE DICE ROLL START - INSTANT ANIMATION FOR ALL OBSERVERS =====
        // When any player clicks roll, server broadcasts this IMMEDIATELY to all other players
        // This ensures ZERO DELAY - all players see animation start at the same time
        gameClient.onDiceRollStart((data) => {
            try {
                console.log('⚡⚡⚡ DICE ROLL START - INSTANT ANIMATION FOR OBSERVER at:', new Date().toISOString());
                console.log('⚡ Data:', data);
                
                // This is ONLY for other players, not the shooter
                const isMyRoll = (data.shooter === gameClient.currentUserId);
                
                if (isMyRoll) {
                    console.log('ℹ️ This is my own roll - already animated locally, skipping');
                    return;
                }
                
                console.log('👀 Another player rolling - START ANIMATION INSTANTLY');
                
                // Prevent starting new animation if already rolling
                if (window.s_oGame._isRolling) {
                    console.warn('⚠️ Already rolling, skipping this dice_roll_start event');
                    return;
                }
                
                // Set rolling flag
                window.s_oGame._isRolling = true;
                
                // Safety timeout to reset flag
                const resetRollingFlag = function() {
                    if (window.s_oGame._isRolling) {
                        console.log('🔄 Resetting _isRolling flag for observer');
                        window.s_oGame._isRolling = false;
                        
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                            window.s_oGame._oInterface.hideBlock();
                        }
                        
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.enableBetFiches) {
                            window.s_oGame._oInterface.enableBetFiches();
                        }
                    }
                };
                
                setTimeout(resetRollingFlag, 6000);
                
                // ===== START ANIMATION WITHOUT RESULT (result will come in dice_rolled event) =====
                if (window.s_oGame._oDicesAnim && window.s_oGame._oDicesAnim.startRollingWithoutResult) {
                    console.log('🎬 INSTANT: Starting animation for observer WITHOUT result');
                    try {
                        window.s_oGame._oDicesAnim.startRollingWithoutResult();
                    } catch (error) {
                        console.error('❌ Error starting dice animation:', error);
                        resetRollingFlag();
                        return;
                    }
                } else {
                    console.error('❌ Dice animation object or startRollingWithoutResult not available');
                    resetRollingFlag();
                    return;
                }
                
                // Play sound
                if (typeof playSound === 'function') {
                    playSound('dice_rolling', 1, false);
                }
                
                console.log('✅ Observer animation started - waiting for result...');
                
            } catch (error) {
                console.error('❌ Error handling dice_roll_start event:', error);
                if (window.s_oGame) {
                    window.s_oGame._isRolling = false;
                }
            }
        });
        
        // Handle dice rolled event - FINISH ANIMATION WITH RESULT
        // This completes the animation that was started by dice_roll_start
        gameClient.onDiceRolled((rollData) => {
            try {
                console.log('🎯 Received dice_rolled with RESULT at:', new Date().toISOString());
                console.log('🎯 Roll data:', rollData);
                
                // Validate dice data
                if (typeof rollData.dice1 !== 'number' || typeof rollData.dice2 !== 'number' ||
                    rollData.dice1 < 1 || rollData.dice1 > 6 || rollData.dice2 < 1 || rollData.dice2 > 6) {
                    console.error('❌ Invalid dice data received from server:', rollData);
                    return;
                }
                
                const diceResult = [rollData.dice1, rollData.dice2];
                
                // Check if this is MY roll or observer's roll
                const isMyRoll = (rollData.shooter === gameClient.currentUserId);
                
                if (isMyRoll) {
                    console.log('✅ My own roll result confirmed by server:', diceResult);
                    // For shooter: animation is already running with the result
                    // Just update game state to match server
                } else {
                    console.log('✅ Observer: Finishing animation with result:', diceResult);
                    // For observer: animation is running without result
                    // Now we finish it with the actual result
                    if (window.s_oGame._oDicesAnim && window.s_oGame._oDicesAnim.finishRollingWithResult) {
                        try {
                            window.s_oGame._oDicesAnim.finishRollingWithResult(diceResult);
                        } catch (error) {
                            console.error('❌ Error finishing dice animation:', error);
                        }
                    }
                }
                
                // Update game state for both shooter and observer
                if (window.s_oGame._aDiceResult) {
                    window.s_oGame._aDiceResult = diceResult;
                } else {
                    window.s_oGame._aDiceResult = new Array();
                    window.s_oGame._aDiceResult[0] = diceResult[0];
                    window.s_oGame._aDiceResult[1] = diceResult[1];
                }
                
                // Add to history if not already added
                if (window.s_oGame._aDiceResultHistory) {
                    const lastResult = window.s_oGame._aDiceResultHistory[window.s_oGame._aDiceResultHistory.length - 1];
                    const alreadyInHistory = lastResult && lastResult[0] === diceResult[0] && lastResult[1] === diceResult[1];
                    
                    if (!alreadyInHistory) {
                        window.s_oGame._aDiceResultHistory.push(diceResult);
                        
                        // Add to visual history panel (for observers)
                        if (!isMyRoll && window.s_oGame.addRollToHistory) {
                            const shooterName = rollData.shooterName || rollData.shooter || 'Outro jogador';
                            window.s_oGame.addRollToHistory(diceResult[0], diceResult[1], shooterName);
                        }
                    }
                }
                
                console.log('✅ Dice result processed:', diceResult);
                
            } catch (error) {
                console.error('❌ Error handling dice_rolled event:', error);
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
            
            // Update player count in UI
            if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                const currentRoom = gameClient.currentRoomId || 'table1';
                const roomType = 'bronze'; // Default room type, adjust if you have room selection
                window.s_oInterface.updateRoomInfo(roomType, players.length);
                console.log('✅ Updated player count in UI:', players.length);
            }
        });
        
        // Handle game state (initial state when joining)
        gameClient.onGameState((state) => {
            console.log('📊 Game state received:', state);
            
            // Update player count from initial state
            if (state.players && window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                const playerCount = Array.isArray(state.players) ? state.players.length : 0;
                const roomType = 'bronze'; // Default room type
                window.s_oInterface.updateRoomInfo(roomType, playerCount);
                console.log('✅ Updated player count from game state:', playerCount);
            }
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
