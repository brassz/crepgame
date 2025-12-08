/**
 * Test script to verify player count synchronization fix
 * This simulates two players connecting to the same room
 */

const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const ROOM_ID = 'test_room_' + Date.now();

console.log('🧪 Testing Player Count Synchronization Fix');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Track player count updates
const player1Updates = [];
const player2Updates = [];

// Create Player 1
const player1 = io(SERVER_URL, {
    transports: ['websocket'],
    upgrade: false
});

player1.on('connect', () => {
    console.log('✅ Player 1 connected:', player1.id);
    
    // Authenticate Player 1
    player1.emit('authenticate', {
        userId: 'test_player_1',
        username: 'Jogador 1',
        roomId: ROOM_ID,
        credit: 1000
    });
});

player1.on('authenticated', (response) => {
    console.log('✅ Player 1 authenticated:', response);
});

player1.on('game_state', (state) => {
    const playerCount = state.players ? state.players.length : 0;
    console.log('📊 Player 1 received game_state - Players:', playerCount);
    player1Updates.push({ event: 'game_state', count: playerCount, time: Date.now() });
});

player1.on('players_updated', (data) => {
    const playerCount = data.players ? data.players.length : 0;
    console.log('👥 Player 1 received players_updated - Players:', playerCount);
    player1Updates.push({ event: 'players_updated', count: playerCount, time: Date.now() });
});

player1.on('user_joined', (data) => {
    console.log('👤 Player 1 notified: User joined -', data.username);
});

// Wait 2 seconds, then create Player 2
setTimeout(() => {
    console.log('\n⏱️  Creating Player 2...\n');
    
    const player2 = io(SERVER_URL, {
        transports: ['websocket'],
        upgrade: false
    });
    
    player2.on('connect', () => {
        console.log('✅ Player 2 connected:', player2.id);
        
        // Authenticate Player 2
        player2.emit('authenticate', {
            userId: 'test_player_2',
            username: 'Jogador 2',
            roomId: ROOM_ID,
            credit: 1000
        });
    });
    
    player2.on('authenticated', (response) => {
        console.log('✅ Player 2 authenticated:', response);
    });
    
    player2.on('game_state', (state) => {
        const playerCount = state.players ? state.players.length : 0;
        console.log('📊 Player 2 received game_state - Players:', playerCount);
        player2Updates.push({ event: 'game_state', count: playerCount, time: Date.now() });
    });
    
    player2.on('players_updated', (data) => {
        const playerCount = data.players ? data.players.length : 0;
        console.log('👥 Player 2 received players_updated - Players:', playerCount);
        player2Updates.push({ event: 'players_updated', count: playerCount, time: Date.now() });
    });
    
    player2.on('user_joined', (data) => {
        console.log('👤 Player 2 notified: User joined -', data.username);
    });
    
    // After 3 seconds, verify results
    setTimeout(() => {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 TEST RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('Player 1 updates:');
        player1Updates.forEach((update, i) => {
            console.log(`  ${i+1}. ${update.event}: ${update.count} players`);
        });
        
        console.log('\nPlayer 2 updates:');
        player2Updates.forEach((update, i) => {
            console.log(`  ${i+1}. ${update.event}: ${update.count} players`);
        });
        
        // Verify expectations
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ EXPECTED BEHAVIOR:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. Player 1 initially sees 1 player');
        console.log('2. When Player 2 joins, BOTH players receive players_updated');
        console.log('3. Both players should see count update to 2');
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 VERIFICATION:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Check if Player 1 received update to 2 players
        const player1Got2Players = player1Updates.some(u => u.count === 2);
        console.log(player1Got2Players ? '✅' : '❌', 'Player 1 received update showing 2 players:', player1Got2Players);
        
        // Check if Player 2 received update showing 2 players
        const player2Got2Players = player2Updates.some(u => u.count === 2);
        console.log(player2Got2Players ? '✅' : '❌', 'Player 2 received update showing 2 players:', player2Got2Players);
        
        // Final verdict
        const testPassed = player1Got2Players && player2Got2Players;
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        if (testPassed) {
            console.log('✅ TEST PASSED: Player count synchronization is working correctly!');
        } else {
            console.log('❌ TEST FAILED: Player count synchronization issue detected');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Cleanup
        player1.disconnect();
        player2.disconnect();
        
        setTimeout(() => {
            process.exit(testPassed ? 0 : 1);
        }, 500);
        
    }, 3000);
    
}, 2000);

player1.on('connect_error', (error) => {
    console.error('❌ Player 1 connection error:', error.message);
    console.log('\n⚠️  Make sure the server is running: node server.js');
    process.exit(1);
});
