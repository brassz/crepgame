/**
 * Fix for Dice Roll Freezing Issue
 * This script adds safeguards to prevent the _isRolling flag from getting stuck
 */
(function() {
    console.log('🔧 Carregando Correção de Lançamento de Dados...');
    
    // Wait for game to be ready
    function waitForGame() {
        if (typeof window.s_oGame === 'undefined' || !window.s_oGame) {
            console.log('⏳ Aguardando s_oGame...');
            setTimeout(waitForGame, 100);
            return;
        }
        
        console.log('✅ s_oGame encontrado, aplicando correção de lançamento de dados');
        applyFix();
    }
    
    function applyFix() {
        // Add a global reset function for emergency use
        window.resetDiceRoll = function() {
            console.log('🔧 RESET DE EMERGÊNCIA: Redefinindo manualmente flag _isRolling');
            if (window.s_oGame) {
                window.s_oGame._isRolling = false;
                console.log('✅ Flag _isRolling redefinida para false');
                console.log('✅ Você pode lançar novamente');
                
                // Also hide the block overlay if it's visible
                if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                    window.s_oGame._oInterface.hideBlock();
                    console.log('✅ Overlay de bloqueio ocultado');
                }
            }
        };
        
        // Add a function to check current status
        window.checkDiceStatus = function() {
            if (!window.s_oGame) {
                console.log('❌ s_oGame não disponível');
                return;
            }
            
            console.log('📊 ===== STATUS DO LANÇAMENTO DE DADOS =====');
            console.log('🎲 _isRolling:', window.s_oGame._isRolling);
            console.log('🎮 Estado do jogo:', window.s_oGame._iState);
            console.log('💰 Aposta atual:', window.s_oGame._oMySeat ? window.s_oGame._oMySeat.getCurBet() : 'N/A');
            console.log('🔒 Bloqueio visível:', window.s_oGame._oInterface ? window.s_oGame._oInterface.isBlockVisible() : 'N/A');
            
            if (window.s_oGame._isRolling) {
                console.log('⚠️ AVISO: _isRolling está TRUE - isso pode estar causando o congelamento');
                console.log('💡 DICA: Execute window.resetDiceRoll() para corrigir');
            } else {
                console.log('✅ Tudo parece normal');
            }
            console.log('==========================================');
        };
        
        // Add automatic timeout monitoring
        let rollingStartTime = null;
        let autoResetTimeout = null;
        const MAX_ROLLING_TIME = 6000; // 6 seconds max (reduced from 8)
        
        // Monitor _isRolling flag changes
        let isRollingValue = false;
        setInterval(function() {
            if (!window.s_oGame) return;
            
            const currentValue = window.s_oGame._isRolling;
            
            // Detect when _isRolling changes from false to true
            if (currentValue && !isRollingValue) {
                console.log('🎲 MONITOR: _isRolling mudou para TRUE em', new Date().toISOString());
                rollingStartTime = Date.now();
                
                // Set a safety timeout
                if (autoResetTimeout) {
                    clearTimeout(autoResetTimeout);
                }
                
                autoResetTimeout = setTimeout(function() {
                    if (window.s_oGame && window.s_oGame._isRolling) {
                        console.warn('⚠️ AUTO-RESET: _isRolling está TRUE há mais de ' + (MAX_ROLLING_TIME / 1000) + ' segundos!');
                        console.warn('⚠️ Isso indica que a animação está travada - forçando reset...');
                        window.s_oGame._isRolling = false;
                        
                        // Hide block overlay
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                            window.s_oGame._oInterface.hideBlock();
                        }
                        
                        // Enable bet fiches
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.enableBetFiches) {
                            window.s_oGame._oInterface.enableBetFiches();
                        }
                        
                        // Hide animation if visible
                        if (window.s_oGame._oDicesAnim && window.s_oGame._oDicesAnim.isVisible && window.s_oGame._oDicesAnim.isVisible()) {
                            console.warn('⚠️ Ocultando animação de dados travada');
                            window.s_oGame._oDicesAnim.hide();
                        }
                        
                        console.log('✅ Auto-reset completo - você pode lançar novamente');
                    }
                }, MAX_ROLLING_TIME);
            }
            
            // Detect when _isRolling changes from true to false
            if (!currentValue && isRollingValue) {
                const duration = Date.now() - rollingStartTime;
                console.log('🎲 MONITOR: _isRolling mudou para FALSE (duração: ' + duration + 'ms) em', new Date().toISOString());
                
                if (autoResetTimeout) {
                    clearTimeout(autoResetTimeout);
                    autoResetTimeout = null;
                }
            }
            
            isRollingValue = currentValue;
        }, 100); // Check every 100ms
        
        // Wrap onDiceRollStart to add safeguards
        if (window.s_oGame.onDiceRollStart) {
            const originalOnDiceRollStart = window.s_oGame.onDiceRollStart;
            window.s_oGame.onDiceRollStart = function(data) {
                console.log('🎲 CORREÇÃO: onDiceRollStart chamado');
                console.log('🎲 CORREÇÃO: _isRolling antes:', this._isRolling);
                
                try {
                    return originalOnDiceRollStart.call(this, data);
                } catch (error) {
                    console.error('❌ CORREÇÃO: Erro em onDiceRollStart:', error);
                    // Reset flag on error
                    this._isRolling = false;
                    throw error;
                }
            };
        }
        
        // Wrap onServerRoll to add safeguards
        if (window.s_oGame.onServerRoll) {
            const originalOnServerRoll = window.s_oGame.onServerRoll;
            window.s_oGame.onServerRoll = function(roll) {
                console.log('🎲 CORREÇÃO: onServerRoll chamado com:', roll);
                console.log('🎲 CORREÇÃO: _isRolling antes:', this._isRolling);
                
                try {
                    return originalOnServerRoll.call(this, roll);
                } catch (error) {
                    console.error('❌ CORREÇÃO: Erro em onServerRoll:', error);
                    // Reset flag on error
                    this._isRolling = false;
                    if (this._oInterface && this._oInterface.hideBlock) {
                        this._oInterface.hideBlock();
                    }
                    throw error;
                }
            };
        }
        
        // Wrap dicesAnimEnded to add extra logging
        if (window.s_oGame.dicesAnimEnded) {
            const originalDicesAnimEnded = window.s_oGame.dicesAnimEnded;
            window.s_oGame.dicesAnimEnded = function(aRes) {
                console.log('🎲 CORREÇÃO: dicesAnimEnded chamado com:', aRes);
                console.log('🎲 CORREÇÃO: _isRolling antes:', this._isRolling);
                
                try {
                    const result = originalDicesAnimEnded.call(this, aRes);
                    console.log('🎲 CORREÇÃO: _isRolling após dicesAnimEnded:', this._isRolling);
                    return result;
                } catch (error) {
                    console.error('❌ CORREÇÃO: Erro em dicesAnimEnded:', error);
                    // Force reset on error
                    this._isRolling = false;
                    if (this._oInterface) {
                        if (this._oInterface.hideBlock) {
                            this._oInterface.hideBlock();
                        }
                        if (this._oInterface.enableBetFiches) {
                            this._oInterface.enableBetFiches();
                        }
                    }
                    throw error;
                }
            };
        }
        
        console.log('✅ Correção de lançamento de dados aplicada!');
        console.log('💡 Comandos disponíveis:');
        console.log('   - window.checkDiceStatus()  -> Verificar status atual');
        console.log('   - window.resetDiceRoll()    -> Reset de emergência se travado');
    }
    
    // Start waiting for game
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }
})();
