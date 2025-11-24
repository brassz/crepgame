/**
 * Test script to verify the dice freeze fix is working
 * Run this in the browser console after loading the game
 */

(function() {
    console.log('🧪 ===== DICE FREEZE FIX TEST =====');
    
    // Test 1: Check if fix script is loaded
    console.log('\n📋 Test 1: Checking if fix script is loaded...');
    if (typeof window.resetDiceRoll === 'function' && typeof window.checkDiceStatus === 'function') {
        console.log('✅ Fix script loaded successfully');
        console.log('   - window.resetDiceRoll() is available');
        console.log('   - window.checkDiceStatus() is available');
    } else {
        console.error('❌ Fix script NOT loaded');
        console.error('   Please ensure dice-roll-fix.js is included in index.html');
        return;
    }
    
    // Test 2: Check if game is initialized
    console.log('\n📋 Test 2: Checking if game is initialized...');
    if (window.s_oGame) {
        console.log('✅ Game (s_oGame) is initialized');
        console.log('   _isRolling:', window.s_oGame._isRolling);
        console.log('   _oInterface:', window.s_oGame._oInterface ? 'Available' : 'Not available');
        console.log('   _oDicesAnim:', window.s_oGame._oDicesAnim ? 'Available' : 'Not available');
    } else {
        console.warn('⚠️ Game not initialized yet');
        console.warn('   Wait for game to load and run test again');
        return;
    }
    
    // Test 3: Check if Socket.IO client is connected
    console.log('\n📋 Test 3: Checking Socket.IO connection...');
    if (window.GameClientSocketIO) {
        console.log('✅ Socket.IO client found');
        console.log('   Connected:', window.GameClientSocketIO.isConnected);
        console.log('   Authenticated:', window.GameClientSocketIO.isAuthenticated);
        console.log('   User ID:', window.GameClientSocketIO.currentUserId);
        console.log('   Room ID:', window.GameClientSocketIO.currentRoomId);
    } else {
        console.warn('⚠️ Socket.IO client not found');
        console.warn('   Using different multiplayer system');
    }
    
    // Test 4: Check function wrapping
    console.log('\n📋 Test 4: Checking if functions are wrapped...');
    const functionsToCheck = ['onDiceRollStart', 'onServerRoll', 'dicesAnimEnded'];
    let wrappedCount = 0;
    
    functionsToCheck.forEach(funcName => {
        if (window.s_oGame[funcName]) {
            // Check if function has been wrapped (it will have different toString)
            const funcStr = window.s_oGame[funcName].toString();
            if (funcStr.includes('FIX:')) {
                console.log('✅', funcName, 'is wrapped with error handling');
                wrappedCount++;
            } else {
                console.log('⚠️', funcName, 'exists but not wrapped');
            }
        } else {
            console.log('❌', funcName, 'not found');
        }
    });
    
    if (wrappedCount === functionsToCheck.length) {
        console.log('✅ All critical functions are wrapped');
    } else {
        console.warn('⚠️ Some functions are not wrapped (fix may not be fully active yet)');
    }
    
    // Test 5: Simulate dice roll flag management
    console.log('\n📋 Test 5: Testing flag management...');
    const originalValue = window.s_oGame._isRolling;
    
    console.log('   Setting _isRolling to true...');
    window.s_oGame._isRolling = true;
    
    setTimeout(() => {
        if (window.s_oGame._isRolling === true) {
            console.log('   ✅ Flag set correctly (still true after 1 second)');
            console.log('   Waiting for auto-reset (should happen in ~7 seconds)...');
            
            // Check after 9 seconds
            setTimeout(() => {
                if (window.s_oGame._isRolling === false) {
                    console.log('   ✅ Auto-reset WORKED! Flag was automatically reset');
                } else {
                    console.log('   ⚠️ Auto-reset did not trigger (flag still true)');
                }
                
                // Restore original value
                window.s_oGame._isRolling = originalValue;
                console.log('   Restored original value:', originalValue);
                
                // Final summary
                console.log('\n📊 ===== TEST SUMMARY =====');
                console.log('✅ Fix script: Loaded');
                console.log('✅ Game: Initialized');
                console.log(window.GameClientSocketIO ? '✅' : '⚠️', 'Socket.IO:', window.GameClientSocketIO ? 'Connected' : 'Not used');
                console.log(wrappedCount === functionsToCheck.length ? '✅' : '⚠️', 'Function wrapping:', wrappedCount + '/' + functionsToCheck.length);
                console.log('\n💡 To test manually:');
                console.log('   1. Place a bet');
                console.log('   2. Click the roll button');
                console.log('   3. Watch the console for logs');
                console.log('   4. If stuck, run: window.resetDiceRoll()');
                console.log('\n🎮 You can now play the game!');
                console.log('===============================');
            }, 9000);
        } else {
            console.log('   ❌ Flag reset too quickly (might be another system)');
            window.s_oGame._isRolling = originalValue;
        }
    }, 1000);
    
})();
