/**
 * Integration between GameClientSocketIO and existing CGame.js
 * This bridges the pure Socket.IO system with the game UI
 */
(function() {
    console.log('🔌 Carregando Integração Socket.IO do Jogo...');
    
    // Wait for game to be ready
    function waitForGame() {
        if (typeof window.s_oGame === 'undefined' || !window.s_oGame) {
            console.log('⏳ Aguardando s_oGame ser inicializado...');
            setTimeout(waitForGame, 100);
            return;
        }
        
        console.log('✅ s_oGame encontrado, configurando integração');
        setupIntegration();
    }
    
    function setupIntegration() {
        const gameClient = window.GameClientSocketIO;
        
        if (!gameClient) {
            console.error('❌ GameClientSocketIO não encontrado!');
            return;
        }
        
        console.log('🎮 Configurando integração Socket.IO com o jogo...');
        
        // Override the roll button handler
        const originalOnRoll = window.s_oGame.onRoll;
        window.s_oGame.onRoll = function() {
            console.log('🎲 Botão de lançar clicado - verificando conexão Socket.IO...');
            
            // Check if connected - if not, fall back to original offline behavior
            if (!gameClient.isConnected || !gameClient.isAuthenticated) {
                console.warn('⚠️ Socket.IO não conectado - usando modo offline');
                // Call original onRoll for offline gameplay
                if (originalOnRoll) {
                    return originalOnRoll.call(window.s_oGame);
                }
                return;
            }
            
            console.log('✅ Socket.IO conectado - usando modo multiplayer');
            
            // APOSTAR: shooter clicou no botão "APOSTAR"
            // Agora a lógica de pré-rolagem é controlada pelo servidor (15s para o shooter + fila de jogadores)
            // IMPORTANTE: depois que as apostas forem cobertas (_bForceRollAfterCoverage),
            // o botão deve funcionar como LANÇAR, nunca mais como APOSTAR nesta rodada.
            if (window.s_oGame.isApostarClick &&
                window.s_oGame.isApostarClick() &&
                !window.s_oGame._bForceRollAfterCoverage) {
                console.log('🚦 APOSTAR clicado - iniciando pré-rolagem via servidor');
                try {
                    const ok = gameClient.startPreRoll && gameClient.startPreRoll();
                    if (!ok) {
                        console.warn('⚠️ Não foi possível iniciar pré-rolagem no servidor, caindo no comportamento local.');
                        if (window.s_oGame._startPreRollBettingPeriod) {
                            window.s_oGame._startPreRollBettingPeriod();
                        }
                    }
                } catch (e) {
                    console.error('Erro ao iniciar pré-rolagem:', e);
                    if (window.s_oGame._startPreRollBettingPeriod) {
                        window.s_oGame._startPreRollBettingPeriod();
                    }
                }

                if (window.s_oGame._oInterface && window.s_oGame._oInterface.enableRoll) {
                    window.s_oGame._oInterface.enableRoll(false);
                }
                return;
            }
            
            // Check if player has bets
            if (window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet() <= 0) {
                console.log('❌ Nenhuma aposta feita');
                alert('Você precisa fazer uma aposta primeiro!');
                return;
            }
            
            // Prevent double-click
            if (window.s_oGame._isRolling) {
                console.warn('⚠️ Já está lançando, ignorando clique');
                return;
            }
            
            console.log('✅ Definindo _isRolling como true em:', new Date().toISOString());
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
            // Polegar: rodadas programadas (dice_rounds[roll_index])
            var dice1, dice2;
            try {
                if (localStorage.getItem('dice_override') === '1') {
                    var roundsJson = localStorage.getItem('dice_rounds');
                    var rounds = roundsJson ? JSON.parse(roundsJson) : [];
                    var idx = parseInt(localStorage.getItem('polegar_roll_index') || '0', 10);
                    if (Array.isArray(rounds) && rounds.length > 0) {
                        var r = rounds[idx];
                        if (r && r.length >= 2) {
                            dice1 = parseInt(r[0], 10);
                            dice2 = parseInt(r[1], 10);
                            if (dice1 >= 1 && dice1 <= 6 && dice2 >= 1 && dice2 <= 6) {
                                localStorage.setItem('polegar_roll_index', String(idx + 1));
                                console.log('⚡ INSTANTÂNEO: Dados Polegar Rodada ' + (idx + 1) + ':', dice1, dice2);
                            } else {
                                dice1 = Math.floor(Math.random() * 6) + 1;
                                dice2 = Math.floor(Math.random() * 6) + 1;
                                localStorage.setItem('polegar_roll_index', String(idx + 1));
                            }
                        } else {
                            // Rodada null ou fora do índice = aleatório
                            dice1 = Math.floor(Math.random() * 6) + 1;
                            dice2 = Math.floor(Math.random() * 6) + 1;
                            localStorage.setItem('polegar_roll_index', String(idx + 1));
                            console.log('⚡ INSTANTÂNEO: Dados Polegar Rodada ' + (idx + 1) + ' (aleatório):', dice1, dice2);
                        }
                    } else {
                        var d1 = parseInt(localStorage.getItem('dice1_val'), 10);
                        var d2 = parseInt(localStorage.getItem('dice2_val'), 10);
                        if (!isNaN(d1) && d1 >= 1 && d1 <= 6 && !isNaN(d2) && d2 >= 1 && d2 <= 6) {
                            dice1 = d1;
                            dice2 = d2;
                            localStorage.setItem('polegar_roll_index', String(idx + 1));
                            console.log('⚡ INSTANTÂNEO: Dados Polegar (fixos):', dice1, dice2);
                        } else {
                            dice1 = Math.floor(Math.random() * 6) + 1;
                            dice2 = Math.floor(Math.random() * 6) + 1;
                            localStorage.setItem('polegar_roll_index', String(idx + 1));
                            console.log('⚡ INSTANTÂNEO: Dados Polegar (aleatório):', dice1, dice2);
                        }
                    }
                } else if (window.DiceControlPanel && window.DiceControlPanel.isOverride && window.DiceControlPanel.isOverride()) {
                    var fixed = window.DiceControlPanel.getDice();
                    if (fixed && fixed.length >= 2) {
                        dice1 = fixed[0];
                        dice2 = fixed[1];
                        console.log('⚡ INSTANTÂNEO: Dados do painel (fixos):', dice1, dice2);
                    } else {
                        dice1 = Math.floor(Math.random() * 6) + 1;
                        dice2 = Math.floor(Math.random() * 6) + 1;
                        console.log('⚡ INSTANTÂNEO: Dados gerados localmente:', dice1, dice2);
                    }
                } else {
                    dice1 = Math.floor(Math.random() * 6) + 1;
                    dice2 = Math.floor(Math.random() * 6) + 1;
                    console.log('⚡ INSTANTÂNEO: Dados gerados localmente:', dice1, dice2);
                }
            } catch (e) {
                dice1 = Math.floor(Math.random() * 6) + 1;
                dice2 = Math.floor(Math.random() * 6) + 1;
            }
            
            // Validate generated dice
            if (typeof dice1 !== 'number' || typeof dice2 !== 'number' ||
                dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
                console.error('❌ Dados inválidos gerados:', dice1, dice2);
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
                // Obter username do cadastro (armazenado em game_user)
                let username = 'Você';
                try {
                    const userDataStr = localStorage.getItem('game_user');
                    if (userDataStr) {
                        const userData = JSON.parse(userDataStr);
                        username = userData.username || userData.email || 'Você';
                    }
                } catch (e) {
                    console.warn('Erro ao obter username do cadastro:', e);
                }
                window.s_oGame.addRollToHistory(dice1, dice2, username);
            }
            
            // ===== START ANIMATION INSTANTLY FOR THIS PLAYER =====
            if (window.s_oGame._oDicesAnim) {
                console.log('🎬 INSTANTÂNEO: Iniciando animação para o lançador:', [dice1, dice2]);
                try {
                    window.s_oGame._oDicesAnim.startRolling([dice1, dice2]);
                } catch (error) {
                    console.error('❌ Erro ao iniciar animação dos dados:', error);
                    clearTimeout(safetyTimeout);
                    resetRollingFlag();
                    return;
                }
            } else {
                console.error('❌ Objeto de animação dos dados não disponível');
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
            console.log('📤 Enviando dados para o servidor - será transmitido para todos os outros jogadores...');
            
            try {
                const success = gameClient.rollDice(dice1, dice2);
                
                if (!success) {
                    console.error('❌ Falha ao enviar lançamento para o servidor');
                    console.log('ℹ️ Animação continuará localmente');
                }
            } catch (error) {
                console.error('❌ Exceção ao enviar lançamento para o servidor:', error);
                console.log('ℹ️ Animação continuará localmente');
            }
        };
        
        // ===== HANDLE DICE ROLL START - INSTANT ANIMATION FOR ALL OBSERVERS =====
        // When any player clicks roll, server broadcasts this IMMEDIATELY to all other players
        // This ensures ZERO DELAY - all players see animation start at the same time
        gameClient.onDiceRollStart((data) => {
            try {
                console.log('⚡⚡⚡ INÍCIO DO LANÇAMENTO DOS DADOS - ANIMAÇÃO INSTANTÂNEA PARA OBSERVADOR em:', new Date().toISOString());
                console.log('⚡ Dados:', data);
                
                // This is ONLY for other players, not the shooter
                const isMyRoll = (data.shooter === gameClient.currentUserId);
                
                if (isMyRoll) {
                    console.log('ℹ️ Este é meu próprio lançamento - já animado localmente, pulando');
                    return;
                }
                
                console.log('👀 Outro jogador lançando - INICIAR ANIMAÇÃO INSTANTANEAMENTE');
                
                // Prevent starting new animation if already rolling
                if (window.s_oGame._isRolling) {
                    console.warn('⚠️ Já está lançando, pulando este evento dice_roll_start');
                    return;
                }
                
                // Set rolling flag
                window.s_oGame._isRolling = true;
                
                // Safety timeout to reset flag
                const resetRollingFlag = function() {
                    if (window.s_oGame._isRolling) {
                        console.log('🔄 Redefinindo flag _isRolling para observador');
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
                    console.log('🎬 INSTANTÂNEO: Iniciando animação para observador SEM resultado');
                    try {
                        window.s_oGame._oDicesAnim.startRollingWithoutResult();
                    } catch (error) {
                        console.error('❌ Erro ao iniciar animação dos dados:', error);
                        resetRollingFlag();
                        return;
                    }
                } else {
                    console.error('❌ Objeto de animação dos dados ou startRollingWithoutResult não disponível');
                    resetRollingFlag();
                    return;
                }
                
                // Play sound
                if (typeof playSound === 'function') {
                    playSound('dice_rolling', 1, false);
                }
                
                console.log('✅ Animação do observador iniciada - aguardando resultado...');
                
            } catch (error) {
                console.error('❌ Erro ao processar evento dice_roll_start:', error);
                if (window.s_oGame) {
                    window.s_oGame._isRolling = false;
                }
            }
        });

        // ===== PRÉ-ROLAGEM: SHOOTER TEM 15s PARA APOSTAR =====
        gameClient.onPreRollShooterBetting((data) => {
            if (!window.s_oGame || !window.s_oGame._oInterface) return;

            const myId = gameClient.currentUserId;
            const isShooter = myId && data.shooterId === myId;

            // Desabilitar botão de lançar para todos enquanto pré-rolagem está ativa
            window.s_oGame._oInterface.enableRoll(false);

            // Shooter: mensagem de 15s para ajustar aposta
            if (isShooter) {
                window.s_oGame._oInterface.showMessage(`VOCÊ É O SHOOTER\nVOCÊ TEM ${data.seconds}s PARA FAZER/ AJUSTAR SUA APOSTA`);
                window.s_oGame._oInterface.enableBetFiches();
            } else {
                // Outros: apenas aguardam o shooter apostar
                window.s_oGame._oInterface.showMessage(`${data.shooterName} (DADOS) ESTÁ APOSTANDO\nAGUARDE ${data.seconds}s`);
                window.s_oGame._oInterface.disableBetFiches();
            }
        });

        // ===== PRÉ-ROLAGEM: INÍCIO DA COBERTURA =====
        gameClient.onPreRollCoverageStart((data) => {
            if (!window.s_oGame || !window.s_oGame._oInterface) return;

            // Atualizar flags internas de pré-rolagem no jogo
            if (window.s_oGame.setPreRollCoverageState) {
                window.s_oGame.setPreRollCoverageState(true, null);
            }

            // Durante a cobertura, NINGUÉM pode lançar ainda
            window.s_oGame._oInterface.enableRoll(false);

            window.s_oGame._oInterface.showMessage(
                `APOSTAS CONTRA O SHOOTER\nAPOSTA DO SHOOTER: ${data.shooterBetAmount}\nRESTANTE A COBRIR: ${data.coverageRemaining}`
            );
            // Só o jogador da vez poderá apostar; por padrão, travar fichas aqui
            window.s_oGame._oInterface.disableBetFiches();
        });

        // ===== PRÉ-ROLAGEM: VEZ DE CADA JOGADOR (10s) =====
        gameClient.onPreRollPlayerTurn((data) => {
            if (!window.s_oGame || !window.s_oGame._oInterface) return;

            const myId = gameClient.currentUserId;
            const isMyTurn = myId && data.playerId === myId;

            // Atualizar qual jogador pode apostar na fase de cobertura
            if (window.s_oGame.setPreRollCoverageState) {
                window.s_oGame.setPreRollCoverageState(true, data.playerId);
            }

            if (isMyTurn) {
                window.s_oGame._oInterface.showMessage(
                    `SUA VEZ DE APOSTAR CONTRA O SHOOTER\nRESTA COBRIR: ${data.coverageRemaining}\nTEMPO: ${data.seconds}s`
                );
                window.s_oGame._oInterface.enableBetFiches();
            } else {
                window.s_oGame._oInterface.showMessage(
                    `VEZ DE ${data.playerName} APOSTAR CONTRA O SHOOTER\nRESTA COBRIR: ${data.coverageRemaining}\nTEMPO: ${data.seconds}s`
                );
                window.s_oGame._oInterface.disableBetFiches();
            }

            // Durante a cobertura, o botão de lançar continua desabilitado para todos
            window.s_oGame._oInterface.enableRoll(false);
        });

        // ===== PRÉ-ROLAGEM: FIM (LIBERAR LANÇAMENTO DO SHOOTER) =====
        gameClient.onPreRollDone((data) => {
            if (!window.s_oGame || !window.s_oGame._oInterface) return;

            const myId = gameClient.currentUserId;
            const isShooter = myId && data.shooterId === myId;

            // Encerrar fase de cobertura
            if (window.s_oGame.setPreRollCoverageState) {
                window.s_oGame.setPreRollCoverageState(false, null);
            }

            // Garantir que nenhum período de pré-rolagem ainda esteja marcado como aberto
            window.s_oGame._bPreRollBettingOpen = false;
            window.s_oGame._bPreRollCoverageOpen = false;

            window.s_oGame._oInterface.disableBetFiches();

            // Mostrar modal informando que as apostas foram cobertas / encerradas
            if (window.s_oGame._oMsgBox) {
                if (isShooter) {
                    window.s_oGame._oMsgBox.show("AS APOSTAS FORAM COBERTAS!\nVOCÊ PODE LANÇAR OS DADOS.");
                } else {
                    window.s_oGame._oMsgBox.show("AS APOSTAS FORAM COBERTAS!\nAGUARDE O SHOOTER LANÇAR OS DADOS.");
                }
            } else {
                if (isShooter) {
                    window.s_oGame._oInterface.showMessage('AS APOSTAS FORAM COBERTAS!\nVOCÊ PODE LANÇAR OS DADOS.');
                } else {
                    window.s_oGame._oInterface.showMessage('AS APOSTAS FORAM COBERTAS!\nAGUARDE O SHOOTER LANÇAR OS DADOS.');
                }
            }

            // FORÇAR estado correto do botão de lançar neste momento:
            // - Shooter: habilitado
            // - Demais jogadores: desabilitado
            if (isShooter) {
                window.s_oGame._bIsMyTurn = true;
                window.s_oGame._bIAmShooter = true;
                window.s_oGame._bForceRollAfterCoverage = true;
                if (window.s_oGame._oInterface.setRollButtonLabel) {
                    window.s_oGame._oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
                }
                window.s_oGame._oInterface.enableRoll(true);
            } else {
                window.s_oGame._oInterface.enableRoll(false);
            }
        });

        // ===== PRÉ-ROLAGEM: CANCELADA =====
        gameClient.onPreRollCancelled((data) => {
            if (!window.s_oGame || !window.s_oGame._oInterface) return;

            // Encerrar fase de cobertura
            if (window.s_oGame.setPreRollCoverageState) {
                window.s_oGame.setPreRollCoverageState(false, null);
            }

            window.s_oGame._oInterface.disableBetFiches();
            // Não forçar habilitar o botão de lançar aqui; deixar onTurnChange/_bIAmShooter decidir
            window.s_oGame._oInterface.enableRoll(false);
            window.s_oGame._oInterface.showMessage('PRÉ-ROLAGEM CANCELADA\nVOCÊ PODE APOSTAR NORMALMENTE');
        });
        
        // Handle dice rolled event - FINISH ANIMATION WITH RESULT
        // This completes the animation that was started by dice_roll_start
        gameClient.onDiceRolled((rollData) => {
            try {
                console.log('🎯 Recebido dice_rolled com RESULTADO em:', new Date().toISOString());
                console.log('🎯 Dados do lançamento:', rollData);
                
                // Validate dice data
                if (typeof rollData.dice1 !== 'number' || typeof rollData.dice2 !== 'number' ||
                    rollData.dice1 < 1 || rollData.dice1 > 6 || rollData.dice2 < 1 || rollData.dice2 > 6) {
                    console.error('❌ Dados inválidos recebidos do servidor:', rollData);
                    return;
                }
                
                const diceResult = [rollData.dice1, rollData.dice2];
                
                // Check if this is MY roll or observer's roll
                const isMyRoll = (rollData.shooter === gameClient.currentUserId);
                
                if (isMyRoll) {
                    console.log('✅ Resultado do meu próprio lançamento confirmado pelo servidor:', diceResult);
                    // For shooter: animation is already running with the result
                    // Just update game state to match server
                } else {
                    console.log('✅ Observador: Finalizando animação com resultado:', diceResult);
                    // For observer: animation is running without result
                    // Now we finish it with the actual result
                    if (window.s_oGame._oDicesAnim && window.s_oGame._oDicesAnim.finishRollingWithResult) {
                        try {
                            window.s_oGame._oDicesAnim.finishRollingWithResult(diceResult);
                        } catch (error) {
                            console.error('❌ Erro ao finalizar animação dos dados:', error);
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
                
                console.log('✅ Resultado dos dados processado:', diceResult);
                
                // CRITICAL: Reset rolling flag after animation completes (after a delay)
                // This ensures the next player can roll when their turn comes
                setTimeout(() => {
                    if (window.s_oGame && window.s_oGame._isRolling) {
                        console.log('🔄 Auto-resetting _isRolling flag after dice animation');
                        window.s_oGame._isRolling = false;
                        
                        // Re-enable UI
                        if (window.s_oGame._oInterface) {
                            if (window.s_oGame._oInterface.hideBlock) {
                                window.s_oGame._oInterface.hideBlock();
                            }
                            if (window.s_oGame._oInterface.enableBetFiches) {
                                window.s_oGame._oInterface.enableBetFiches();
                            }
                        }
                    }
                }, 3500); // Wait for animation to complete (should match time_show_dice_result)
                
            } catch (error) {
                console.error('❌ Erro ao processar evento dice_rolled:', error);
            }
        });
        
        // Handle game result
        gameClient.onGameResult((result) => {
            console.log('🎯 Resultado do jogo:', result);
            
            // Show message to player
            if (window.CScoreText) {
                new CScoreText(result.message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
            }
            
            // Update game state based on result type
            if (result.type === 'natural_win' || result.type === 'point_made') {
                // Player won
                console.log('✅ Jogador ganhou!');
            } else if (result.type === 'craps' || result.type === 'seven_out') {
                // Player lost
                console.log('❌ Jogador perdeu');
            }
            
            // Reset rolling flag after game result is shown
            setTimeout(() => {
                if (window.s_oGame && window.s_oGame._isRolling) {
                    console.log('🔄 Resetting _isRolling flag after game result');
                    window.s_oGame._isRolling = false;
                    
                    // Re-enable UI if needed
                    if (window.s_oGame._oInterface) {
                        if (window.s_oGame._oInterface.hideBlock) {
                            window.s_oGame._oInterface.hideBlock();
                        }
                        if (window.s_oGame._oInterface.enableBetFiches) {
                            window.s_oGame._oInterface.enableBetFiches();
                        }
                    }
                }
            }, 1000);
        });
        
        // Handle point established
        gameClient.onPointEstablished((data) => {
            console.log('📍 Ponto estabelecido:', data.point);
            console.log('📍 Shooter que estabeleceu o ponto:', data.shooter);
            console.log('📍 Meu ID:', gameClient.currentUserId);
            
            // CRITICAL: Verificar se EU sou o shooter
            const iAmShooter = (data.shooter === gameClient.currentUserId);
            console.log('📍 Eu sou o shooter?', iAmShooter);
            
            // Atualizar flag _bIAmShooter
            if (window.s_oGame) {
                // Verificar se o ponto já foi estabelecido localmente (evitar duplicação)
                const pointAlreadySet = (window.s_oGame._iNumberPoint === data.point);
                const shooterAlreadySet = (window.s_oGame._bIAmShooter === iAmShooter);
                
                if (pointAlreadySet && shooterAlreadySet) {
                    console.log('📍 Ponto já foi estabelecido localmente com o mesmo shooter, ignorando evento socket');
                    // Apenas atualizar o puck se necessário (pode ter sido atualizado localmente)
                    if (window.s_oGame._oPuck && window.s_oGameSettings) {
                        const iNewX = window.s_oGameSettings.getPuckXByNumber(data.point);
                        window.s_oGame._oPuck.switchOn(iNewX);
                    }
                    return;
                }
                
                window.s_oGame._bIAmShooter = iAmShooter;
                console.log('📍 Flag _bIAmShooter atualizada para:', iAmShooter);
                
                // Chamar _assignNumber que já tem toda a lógica para mostrar/ocultar botões
                if (window.s_oGame._assignNumber) {
                    console.log('📍 Chamando _assignNumber com ponto:', data.point);
                    window.s_oGame._assignNumber(data.point);
                } else {
                    console.warn('⚠️ _assignNumber não encontrado, fazendo fallback manual');
                    
                    // Fallback: atualizar puck e verificar se deve mostrar botões
                    if (window.s_oGame._oPuck && window.s_oGameSettings) {
                        const iNewX = window.s_oGameSettings.getPuckXByNumber(data.point);
                        window.s_oGame._oPuck.switchOn(iNewX);
                    }
                    
                    if (window.s_oGame._iNumberPoint !== undefined) {
                        window.s_oGame._iNumberPoint = data.point;
                    }
                    
                    // Se não sou o shooter, mostrar botões. Se sou, ocultar.
                    // IMPORTANTE: Não usar force aqui - deixar a lógica normal decidir
                    // porque _assignNumber já vai ser chamado e vai gerenciar corretamente
                    if (window.s_oInterface) {
                        window.s_oInterface.showPointBettingButtons(data.point, iAmShooter);
                        window.s_oInterface.enableBetFiches();
                        window.s_oInterface.enableClearButton();
                    }
                }
            }
            
            // Show message
            if (window.CScoreText) {
                new CScoreText(data.message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }
        });
        
        // Handle shooter changed
        gameClient.onShooterChanged((data) => {
            console.log('🔄 Atirador mudou para:', data.shooterName);
            console.log('🔄 Novo atirador ID:', data.newShooter);
            console.log('🔄 ID do jogador atual:', gameClient.currentUserId);
            
            const isMyTurn = data.newShooter === gameClient.currentUserId;
            
            console.log('🔄 É meu turno?', isMyTurn);
            
            // CRITICAL FIX: Update _bIsMyTurn flag when shooter changes
            if (window.s_oGame) {
                // Call the turn change handler to update internal state
                if (window.s_oGame.onTurnChange) {
                    console.log('✅ Atualizando turno via onTurnChange handler');
                    window.s_oGame.onTurnChange({ 
                        isMyTurn: isMyTurn,
                        playerId: data.newShooter 
                    });
                } else {
                    console.warn('⚠️ onTurnChange handler não encontrado');
                    
                    // Fallback: directly enable/disable roll button
                    if (window.s_oGame._oInterface) {
                        const hasMinBet = window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet() > 0;
                        const coverageOpen = window.s_oGame._bPreRollCoverageOpen === true;
                        const iAmShooter = window.s_oGame._bIAmShooter === true;
                        const canRoll = isMyTurn && iAmShooter && hasMinBet && !coverageOpen;
                        const showApostar = window.s_oGame.shouldShowApostarButton && window.s_oGame.shouldShowApostarButton();
                        
                        console.log(`🎲 Turno mudou - isMyTurn: ${isMyTurn}, hasMinBet: ${hasMinBet}, canRoll: ${canRoll}, showApostar: ${showApostar}`);
                        window.s_oGame._oInterface.enableRoll(canRoll);
                        if(isMyTurn && showApostar && window.s_oGame._oInterface.setRollButtonLabel){
                            window.s_oGame._oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
                        } else if(isMyTurn && hasMinBet && window.s_oGame._oInterface.setRollButtonLabel){
                            window.s_oGame._oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
                        }
                        window.s_oGame._oInterface.enablePassDice(isMyTurn);
                        
                        // CONTROLE DAS FICHAS: Habilitar/desabilitar baseado no turno
                        if (isMyTurn) {
                            window.s_oGame._oInterface.enableBetFiches();
                        } else {
                            window.s_oGame._oInterface.disableBetFiches();
                        }
                    }
                }
                
                // Reset rolling flag to ensure clean state for next turn
                if (window.s_oGame._isRolling) {
                    console.log('🔄 Resetting _isRolling flag on shooter change');
                    window.s_oGame._isRolling = false;
                }
            }
            
            // Show notification
            if (window.CScoreText) {
                const message = isMyTurn
                    ? 'É SUA VEZ DE ROLAR!' 
                    : `${data.shooterName} (DADOS)`;
                new CScoreText(message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }
            
            // If it's my turn, show additional feedback
            if (isMyTurn && window.s_oGame._oInterface) {
                if (window.s_oGame._oMySeat && window.s_oGame._oMySeat.getCurBet() > 0) {
                    window.s_oGame._oInterface.showMessage("SUA VEZ! Clique para lançar os dados");
                } else {
                    window.s_oGame._oInterface.showMessage("Faça uma aposta para lançar os dados!");
                }
                
                setTimeout(function() {
                    if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideMessage) {
                        window.s_oGame._oInterface.hideMessage();
                    }
                }, 2000);
            }
        });
        
        // Handle player passed dice notification
        if (gameClient.socket) {
            gameClient.socket.on('player_passed_dice', (data) => {
                console.log('🎲 Jogador passou o dado:', data);
                
                // Show notification
                if (window.CScoreText) {
                    new CScoreText(data.message, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // Show message in interface
                if (window.s_oGame && window.s_oGame._oInterface) {
                    window.s_oGame._oInterface.showMessage(data.message);
                    setTimeout(function() {
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideMessage) {
                            window.s_oGame._oInterface.hideMessage();
                        }
                    }, 2000);
                }
            });
        }
        
        // Handle bet confirmed
        gameClient.onBetConfirmed((confirmation) => {
            console.log('✅ Aposta confirmada:', confirmation);
            
            // Update credit display
            if (window.s_oGame._oInterface) {
                window.s_oGame._oInterface.setMoney(confirmation.remainingCredit);
            }
            // NÃO tocar no crédito interno do CSeat aqui, nem no botão de lançar.
            // O fluxo de CGame/CSeat já atualiza o saldo localmente, e o botão
            // de lançar é controlado por onTurnChange/_bIAmShooter.
        });
        
        // Handle bets cleared
        gameClient.onBetsCleared((data) => {
            console.log('🧹 Apostas limpas:', data);
            
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
        gameClient.onPlayersUpdated((data) => {
            const players = data.players || data;
            console.log('👥 Jogadores na sala:', Array.isArray(players) ? players.length : 'N/A', players);
            
            // Update player count in UI
            if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                const currentRoom = gameClient.currentRoomId || 'table1';
                const roomType = 'bronze'; // Default room type, adjust if you have room selection
                const playerCount = Array.isArray(players) ? players.length : 0;
                window.s_oInterface.updateRoomInfo(roomType, playerCount);
                console.log('✅ Contagem de jogadores atualizada na UI:', playerCount);
            }
            
            // Update players list with detailed info
            if (window.s_oInterface && window.s_oInterface.updatePlayersList) {
                const currentShooter = data.currentShooter || (window.s_oGame ? window.s_oGame._bIAmShooter ? gameClient.currentUserId : null : null);
                const gameState = {
                    point: data.point || (window.s_oGame ? window.s_oGame._iNumberPoint : null)
                };
                
                if(Array.isArray(players)){
                    window.s_oInterface.updatePlayersList(players, currentShooter, gameState);
                }
            }
        });
        
        // Handle game state (initial state when joining)
        gameClient.onGameState((state) => {
            console.log('📊 Estado do jogo recebido:', state);
            
            // Update player count from initial state
            if (state.players && window.s_oInterface && window.s_oInterface.updateRoomInfo) {
                const playerCount = Array.isArray(state.players) ? state.players.length : 0;
                const roomType = 'bronze'; // Default room type
                window.s_oInterface.updateRoomInfo(roomType, playerCount);
                console.log('✅ Contagem de jogadores atualizada do estado do jogo:', playerCount);
            }
            
            // Update players list from initial state
            if (state.players && window.s_oInterface && window.s_oInterface.updatePlayersList) {
                const players = Array.isArray(state.players) ? state.players : [];
                const currentShooter = state.currentShooter || null;
                const gameState = {
                    point: state.point || null
                };
                
                window.s_oInterface.updatePlayersList(players, currentShooter, gameState);
                console.log('✅ Lista de jogadores atualizada do estado inicial do jogo');
            }
            
            // CRITICAL: Check if I'm the current shooter when joining (ou primeiro na sala)
            if (window.s_oGame) {
                const players = Array.isArray(state.players) ? state.players : [];
                const isFirstInRoom = players.length === 1 && players[0].userId === gameClient.currentUserId;
                const isMyTurn = state.currentShooter === gameClient.currentUserId || (!state.currentShooter && isFirstInRoom);
                console.log('🎯 Estado inicial - É meu turno?', isMyTurn);
                console.log('🎯 Atirador atual:', state.currentShooter);
                console.log('🎯 Meu ID:', gameClient.currentUserId);
                
                // Update turn state
                if (window.s_oGame.onTurnChange) {
                    window.s_oGame.onTurnChange({
                        isMyTurn: isMyTurn,
                        playerId: state.currentShooter || (isFirstInRoom ? gameClient.currentUserId : null)
                    });
                }
                
                // If not my turn, show message and disable betting
                if (!isMyTurn && window.s_oGame._oInterface) {
                    window.s_oGame._oInterface.showMessage("AGUARDE SUA VEZ - Outro jogador está com o dado");
                    window.s_oGame._oInterface.enableRoll(false);
                    window.s_oGame._oInterface.enablePassDice(false);
                    window.s_oGame._oInterface.disableBetFiches();
                    
                    setTimeout(function() {
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideMessage) {
                            window.s_oGame._oInterface.hideMessage();
                        }
                    }, 3000);
                } else if (isMyTurn && window.s_oGame._oInterface) {
                    window.s_oGame._oInterface.enableBetFiches();
                    if (window.s_oGame.shouldShowApostarButton && window.s_oGame.shouldShowApostarButton() && window.s_oGame._oInterface.setRollButtonLabel) {
                        window.s_oGame._oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
                    }
                }
            }
        });
        
        // Handle connection status
        gameClient.onConnected(() => {
            console.log('✅ Conectado ao servidor Socket.IO');
            
            // Show notification
            if (window.CScoreText) {
                new CScoreText('Conectado ao servidor!', CANVAS_WIDTH/2, 100);
            }
        });
        
        gameClient.onDisconnected((reason) => {
            console.log('❌ Desconectado do servidor:', reason);
            
            // Show notification
            if (window.CScoreText) {
                new CScoreText('Desconectado do servidor!', CANVAS_WIDTH/2, 100);
            }
        });
        
        // Handle errors
        gameClient.onError((error) => {
            console.error('❌ Erro Socket.IO:', error);
            
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
            // Obter informações do usuário do cadastro (game_user)
            let userId = null;
            let username = null;
            let credit = 1000;
            
            try {
                const userDataStr = localStorage.getItem('game_user');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    userId = userData.id || userData.userId || localStorage.getItem('playerId') || 'player_' + Math.random().toString(36).substr(2, 9);
                    username = userData.username || userData.email || 'Jogador ' + Math.floor(Math.random() * 1000);
                    credit = userData.balance || 1000;
                }
            } catch (e) {
                console.warn('Erro ao obter dados do usuário do cadastro:', e);
            }
            
            // Fallback se não houver dados do cadastro
            if (!userId) {
                userId = localStorage.getItem('playerId') || 'player_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('playerId', userId);
            }
            
            if (!username) {
                username = localStorage.getItem('playerName') || 'Jogador ' + Math.floor(Math.random() * 1000);
                localStorage.setItem('playerName', username);
            }
            
            const roomId = 'table1'; // Default room
            
            console.log('🔌 Conectando automaticamente ao Socket.IO...');
            console.log('   ID do Usuário:', userId);
            console.log('   Nome de Usuário:', username, '(do cadastro)');
            console.log('   ID da Sala:', roomId);
            console.log('   Crédito:', credit);
            
            // Initialize and authenticate
            gameClient.init()
                .then(() => {
                    console.log('✅ Socket.IO inicializado');
                    return new Promise((resolve) => {
                        // Wait a bit for connection to establish
                        setTimeout(() => {
                            gameClient.authenticate(userId, username, roomId, credit);
                            resolve();
                        }, 500);
                    });
                })
                .then(() => {
                    console.log('✅ Integração Socket.IO completa!');
                })
                .catch((error) => {
                    console.error('❌ Falha ao inicializar Socket.IO:', error);
                });
        }
        
        // Connect after a short delay to ensure everything is loaded
        setTimeout(autoConnect, 1000);
        
        console.log('✅ Configuração da integração Socket.IO completa!');
    }
    
    // Start waiting for game
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }
})();
