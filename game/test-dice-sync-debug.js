// Debug tool for testing dice synchronization
// Add this script to test synchronized dice animations between players

window.DiceSyncDebug = (function() {
    let debugPanel = null;
    let isDebugMode = false;
    
    function createDebugPanel() {
        if (debugPanel) return;
        
        // Create debug panel
        debugPanel = document.createElement('div');
        debugPanel.id = 'dice-sync-debug';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            border: 2px solid #4CAF50;
        `;
        
        debugPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #4CAF50;">
                🎲 Dice Sync Debug Panel
            </div>
            <div style="margin-bottom: 10px;">
                <button onclick="DiceSyncDebug.testLocalRoll()" style="margin: 2px; padding: 5px; background: #2196F3; color: white; border: none; border-radius: 3px;">
                    Test Local Roll
                </button>
                <button onclick="DiceSyncDebug.testSyncRoll()" style="margin: 2px; padding: 5px; background: #FF9800; color: white; border: none; border-radius: 3px;">
                    Test Sync Roll
                </button>
                <button onclick="DiceSyncDebug.simulateOtherPlayer()" style="margin: 2px; padding: 5px; background: #9C27B0; color: white; border: none; border-radius: 3px;">
                    Simulate Other Player
                </button>
                <button onclick="DiceSyncDebug.clearLogs()" style="margin: 2px; padding: 5px; background: #f44336; color: white; border: none; border-radius: 3px;">
                    Clear Logs
                </button>
                <button onclick="DiceSyncDebug.toggle()" style="margin: 2px; padding: 5px; background: #607D8B; color: white; border: none; border-radius: 3px;">
                    Hide
                </button>
            </div>
            <div id="debug-status" style="margin-bottom: 10px; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                Status: Checking connections...
            </div>
            <div id="debug-logs" style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 3px; min-height: 200px; overflow-y: auto;">
                Logs will appear here...
            </div>
        `;
        
        document.body.appendChild(debugPanel);
        updateStatus();
    }
    
    function updateStatus() {
        const statusEl = document.getElementById('debug-status');
        if (!statusEl) return;
        
        let status = [];
        
        // Check game instance
        if (window.s_oGame) {
            status.push('✅ Game Instance');
            if (window.s_oGame.onSynchronizedRoll) {
                status.push('✅ Sync Handler');
            } else {
                status.push('❌ Sync Handler');
            }
        } else {
            status.push('❌ Game Instance');
        }
        
        // Check Supabase
        if (window.SupabaseMultiplayer) {
            if (window.SupabaseMultiplayer.isConnected) {
                status.push('✅ Supabase Connected');
            } else {
                status.push('⚠️ Supabase Not Connected');
            }
        } else {
            status.push('❌ Supabase Multiplayer');
        }
        
        // Check Realtime
        if (window.Realtime) {
            if (window.Realtime.isUsingSupabase()) {
                status.push('✅ Realtime (Supabase)');
            } else {
                status.push('⚠️ Realtime (Socket.IO)');
            }
        } else {
            status.push('❌ Realtime');
        }
        
        statusEl.innerHTML = 'Status: ' + status.join(' | ');
    }
    
    function log(message, type = 'info') {
        const logsEl = document.getElementById('debug-logs');
        if (!logsEl) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: '#4CAF50',
            warn: '#FF9800',
            error: '#f44336',
            success: '#8BC34A'
        };
        
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin: 2px 0;
            padding: 2px 5px;
            border-left: 3px solid ${colors[type] || colors.info};
            background: rgba(255,255,255,0.05);
        `;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        logsEl.appendChild(logEntry);
        logsEl.scrollTop = logsEl.scrollHeight;
        
        // Also log to console
        console.log(`[DiceSyncDebug] ${message}`);
    }
    
    function testLocalRoll() {
        log('🎲 Testing local dice roll...', 'info');
        
        if (!window.s_oGame || !window.s_oGame._generateRandomDices) {
            log('❌ Game instance or dice generation not available', 'error');
            return;
        }
        
        const dice = window.s_oGame._generateRandomDices();
        const die1 = dice[0];
        const die2 = dice[1];
        const total = die1 + die2;
        
        log(`🎯 Generated dice: ${die1} + ${die2} = ${total}`, 'success');
        
        if (window.s_oGame.onSynchronizedRoll) {
            log('✅ Triggering onSynchronizedRoll animation', 'info');
            window.s_oGame.onSynchronizedRoll({
                d1: die1,
                d2: die2,
                total: total,
                ts: Date.now(),
                playerName: 'Debug Test',
                playerId: 'debug',
                isMyRoll: true
            });
        } else if (window.s_oGame.onServerRoll) {
            log('⚠️ Falling back to onServerRoll animation', 'warn');
            window.s_oGame.onServerRoll({
                d1: die1,
                d2: die2,
                total: total,
                ts: Date.now(),
                playerName: 'Debug Test'
            });
        } else {
            log('❌ No animation handlers available', 'error');
        }
    }
    
    function testSyncRoll() {
        log('🌐 Testing synchronized roll via Supabase...', 'info');
        
        if (!window.SupabaseMultiplayer) {
            log('❌ SupabaseMultiplayer not available', 'error');
            return;
        }
        
        if (!window.SupabaseMultiplayer.isConnected) {
            log('❌ Not connected to Supabase room', 'error');
            return;
        }
        
        if (!window.s_oGame || !window.s_oGame._generateRandomDices) {
            log('❌ Game instance or dice generation not available', 'error');
            return;
        }
        
        const dice = window.s_oGame._generateRandomDices();
        const die1 = dice[0];
        const die2 = dice[1];
        
        log(`🎯 Recording synchronized roll: ${die1} + ${die2}`, 'info');
        
        window.SupabaseMultiplayer.recordSynchronizedRoll(die1, die2)
            .then(function(result) {
                log('✅ Synchronized roll recorded successfully!', 'success');
                log(`📊 Result: ${JSON.stringify(result)}`, 'info');
            })
            .catch(function(error) {
                log('❌ Failed to record synchronized roll', 'error');
                log(`🔍 Error: ${error.message}`, 'error');
            });
    }
    
    function simulateOtherPlayer() {
        log('👥 Simulating roll from another player...', 'info');
        
        if (!window.s_oGame || !window.s_oGame._generateRandomDices) {
            log('❌ Game instance not available', 'error');
            return;
        }
        
        const dice = window.s_oGame._generateRandomDices();
        const die1 = dice[0];
        const die2 = dice[1];
        const total = die1 + die2;
        
        log(`🎯 Simulating other player roll: ${die1} + ${die2} = ${total}`, 'info');
        
        if (window.s_oGame.onSynchronizedRoll) {
            log('✅ Triggering animation for other player', 'success');
            window.s_oGame.onSynchronizedRoll({
                d1: die1,
                d2: die2,
                total: total,
                ts: Date.now(),
                playerName: 'Outro Jogador',
                playerId: 'other-player',
                isMyRoll: false
            });
        } else {
            log('❌ onSynchronizedRoll not available', 'error');
        }
    }
    
    function clearLogs() {
        const logsEl = document.getElementById('debug-logs');
        if (logsEl) {
            logsEl.innerHTML = 'Logs cleared...';
        }
    }
    
    function toggle() {
        if (!debugPanel) return;
        
        isDebugMode = !isDebugMode;
        debugPanel.style.display = isDebugMode ? 'block' : 'none';
        
        if (isDebugMode) {
            updateStatus();
        }
    }
    
    function init() {
        // Create debug panel
        createDebugPanel();
        
        // Add keyboard shortcut (Ctrl+Shift+D)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggle();
            }
        });
        
        // Initial status check
        setTimeout(updateStatus, 1000);
        
        log('🚀 Dice Sync Debug Tool initialized', 'success');
        log('📝 Press Ctrl+Shift+D to toggle debug panel', 'info');
        log('🔧 Use buttons above to test dice synchronization', 'info');
        
        // Auto-hide after 3 seconds
        setTimeout(function() {
            if (debugPanel) {
                debugPanel.style.display = 'none';
                isDebugMode = false;
            }
        }, 3000);
    }
    
    // Auto-initialize when game is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }
    
    return {
        init: init,
        toggle: toggle,
        testLocalRoll: testLocalRoll,
        testSyncRoll: testSyncRoll,
        simulateOtherPlayer: simulateOtherPlayer,
        clearLogs: clearLogs,
        log: log
    };
})();