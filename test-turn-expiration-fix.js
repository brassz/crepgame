/**
 * Test script for the turn expiration fix
 * This script can be run in the browser console to test the fix
 */

async function testTurnExpirationFix() {
    console.log('🧪 Testing Turn Expiration Fix...');
    
    if (!window.sb) {
        console.error('❌ Supabase client not available');
        return;
    }

    try {
        // Test 1: Check if functions exist
        console.log('📋 Test 1: Checking if functions exist...');
        
        const functionsCheck = await window.sb.rpc('extend_player_turn', {
            p_room_id: 'test_room_nonexistent',
            p_additional_seconds: 30
        });
        
        if (functionsCheck.error && functionsCheck.error.message.includes('not authenticated')) {
            console.log('✅ extend_player_turn function exists (authentication required)');
        } else if (functionsCheck.error && functionsCheck.error.message.includes('Not your turn')) {
            console.log('✅ extend_player_turn function exists and working');
        } else {
            console.log('⚠️  extend_player_turn function response:', functionsCheck);
        }

        // Test 2: Test join room with new 45-second timer
        console.log('📋 Test 2: Testing join_room_simple with extended timer...');
        
        const joinResult = await window.sb.rpc('join_room_simple', {
            p_room_id: 'bronze'
        });
        
        if (joinResult.error) {
            console.error('❌ join_room_simple failed:', joinResult.error);
        } else {
            console.log('✅ join_room_simple successful:', joinResult.data);
            
            // Check if turn_ends_at is approximately 45 seconds from now
            const turnEndsAt = new Date(joinResult.data.turn_ends_at);
            const now = new Date();
            const secondsRemaining = Math.ceil((turnEndsAt - now) / 1000);
            
            console.log(`⏰ Turn ends in ${secondsRemaining} seconds`);
            
            if (secondsRemaining >= 40 && secondsRemaining <= 50) {
                console.log('✅ Turn duration appears to be extended (~45 seconds)');
            } else if (secondsRemaining >= 20 && secondsRemaining <= 30) {
                console.log('⚠️  Turn duration appears to be old (~25 seconds) - fix may not be applied');
            } else {
                console.log(`⚠️  Unexpected turn duration: ${secondsRemaining} seconds`);
            }
        }

        // Test 3: Test dice roll (if it's the player's turn)
        console.log('📋 Test 3: Testing handle_dice_roll_simple...');
        
        const rollResult = await window.sb.rpc('handle_dice_roll_simple', {
            p_room_id: 'bronze',
            p_dice_1: 3,
            p_dice_2: 4
        });
        
        if (rollResult.error) {
            if (rollResult.error.message.includes('Not your turn')) {
                console.log('✅ handle_dice_roll_simple working (not your turn)');
            } else if (rollResult.error.message.includes('Turn has expired')) {
                console.log('⚠️  Turn has expired - this should be handled by grace period now');
            } else {
                console.error('❌ handle_dice_roll_simple error:', rollResult.error);
            }
        } else {
            console.log('✅ handle_dice_roll_simple successful:', rollResult.data);
            
            if (rollResult.data.grace_period_used) {
                console.log('🎯 Grace period was used - fix is working!');
            }
        }

        console.log('🏁 Turn expiration fix test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Auto-run the test if this script is loaded
if (typeof window !== 'undefined' && window.sb) {
    testTurnExpirationFix();
} else {
    console.log('💡 To run the test, execute: testTurnExpirationFix()');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testTurnExpirationFix = testTurnExpirationFix;
}