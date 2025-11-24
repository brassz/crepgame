/**
 * Fix for Dice Roll Freezing Issue
 * This script adds safeguards to prevent the _isRolling flag from getting stuck
 */
(function() {
    console.log('🔧 Loading Dice Roll Fix...');
    
    // Wait for game to be ready
    function waitForGame() {
        if (typeof window.s_oGame === 'undefined' || !window.s_oGame) {
            console.log('⏳ Waiting for s_oGame...');
            setTimeout(waitForGame, 100);
            return;
        }
        
        console.log('✅ s_oGame found, applying dice roll fix');
        applyFix();
    }
    
    function applyFix() {
        // Add a global reset function for emergency use
        window.resetDiceRoll = function() {
            console.log('🔧 EMERGENCY RESET: Manually resetting _isRolling flag');
            if (window.s_oGame) {
                window.s_oGame._isRolling = false;
                console.log('✅ _isRolling flag reset to false');
                console.log('✅ You can now roll again');
                
                // Also hide the block overlay if it's visible
                if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                    window.s_oGame._oInterface.hideBlock();
                    console.log('✅ Block overlay hidden');
                }
            }
        };
        
        // Add a function to check current status
        window.checkDiceStatus = function() {
            if (!window.s_oGame) {
                console.log('❌ s_oGame not available');
                return;
            }
            
            console.log('📊 ===== DICE ROLL STATUS =====');
            console.log('🎲 _isRolling:', window.s_oGame._isRolling);
            console.log('🎮 Game state:', window.s_oGame._iState);
            console.log('💰 Current bet:', window.s_oGame._oMySeat ? window.s_oGame._oMySeat.getCurBet() : 'N/A');
            console.log('🔒 Block visible:', window.s_oGame._oInterface ? window.s_oGame._oInterface.isBlockVisible() : 'N/A');
            
            if (window.s_oGame._isRolling) {
                console.log('⚠️ WARNING: _isRolling is TRUE - this may be causing the freeze');
                console.log('💡 TIP: Run window.resetDiceRoll() to fix');
            } else {
                console.log('✅ Everything looks normal');
            }
            console.log('=============================');
        };
        
        // Add automatic timeout monitoring
        let rollingStartTime = null;
        let autoResetTimeout = null;
        const MAX_ROLLING_TIME = 8000; // 8 seconds max
        
        // Monitor _isRolling flag changes
        let isRollingValue = false;
        setInterval(function() {
            if (!window.s_oGame) return;
            
            const currentValue = window.s_oGame._isRolling;
            
            // Detect when _isRolling changes from false to true
            if (currentValue && !isRollingValue) {
                console.log('🎲 MONITOR: _isRolling changed to TRUE');
                rollingStartTime = Date.now();
                
                // Set a safety timeout
                if (autoResetTimeout) {
                    clearTimeout(autoResetTimeout);
                }
                
                autoResetTimeout = setTimeout(function() {
                    if (window.s_oGame && window.s_oGame._isRolling) {
                        console.warn('⚠️ AUTO-RESET: _isRolling has been TRUE for more than ' + (MAX_ROLLING_TIME / 1000) + ' seconds!');
                        console.warn('⚠️ Automatically resetting to prevent freeze...');
                        window.s_oGame._isRolling = false;
                        
                        // Hide block overlay
                        if (window.s_oGame._oInterface && window.s_oGame._oInterface.hideBlock) {
                            window.s_oGame._oInterface.hideBlock();
                        }
                        
                        console.log('✅ Auto-reset complete - you can roll again');
                    }
                }, MAX_ROLLING_TIME);
            }
            
            // Detect when _isRolling changes from true to false
            if (!currentValue && isRollingValue) {
                const duration = Date.now() - rollingStartTime;
                console.log('🎲 MONITOR: _isRolling changed to FALSE (duration: ' + duration + 'ms)');
                
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
                console.log('🎲 FIX: onDiceRollStart called');
                console.log('🎲 FIX: _isRolling before:', this._isRolling);
                
                try {
                    return originalOnDiceRollStart.call(this, data);
                } catch (error) {
                    console.error('❌ FIX: Error in onDiceRollStart:', error);
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
                console.log('🎲 FIX: onServerRoll called with:', roll);
                console.log('🎲 FIX: _isRolling before:', this._isRolling);
                
                try {
                    return originalOnServerRoll.call(this, roll);
                } catch (error) {
                    console.error('❌ FIX: Error in onServerRoll:', error);
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
                console.log('🎲 FIX: dicesAnimEnded called with:', aRes);
                console.log('🎲 FIX: _isRolling before:', this._isRolling);
                
                try {
                    const result = originalDicesAnimEnded.call(this, aRes);
                    console.log('🎲 FIX: _isRolling after dicesAnimEnded:', this._isRolling);
                    return result;
                } catch (error) {
                    console.error('❌ FIX: Error in dicesAnimEnded:', error);
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
        
        console.log('✅ Dice roll fix applied!');
        console.log('💡 Available commands:');
        console.log('   - window.checkDiceStatus()  -> Check current status');
        console.log('   - window.resetDiceRoll()    -> Emergency reset if stuck');
    }
    
    // Start waiting for game
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGame);
    } else {
        waitForGame();
    }
})();
