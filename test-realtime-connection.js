// Test script to verify Supabase Realtime connection and game_moves subscription
// Run this in the browser console to debug realtime issues

async function testRealtimeConnection() {
    console.log('🔍 Testing Supabase Realtime Connection...');
    
    // Check if Supabase client exists
    if (!window.sb) {
        console.error('❌ Supabase client (window.sb) not found');
        return;
    }
    
    // Check authentication
    const { data: { user }, error: authError } = await window.sb.auth.getUser();
    if (authError || !user) {
        console.error('❌ User not authenticated:', authError);
        return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test basic database connection
    try {
        const { data, error } = await window.sb
            .from('game_moves')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Database query error:', error);
            return;
        }
        
        console.log('✅ Database connection working, sample data:', data);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return;
    }
    
    // Test realtime subscription
    console.log('🔗 Testing realtime subscription...');
    
    const testChannel = window.sb.channel('test-channel');
    
    testChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_moves'
    }, (payload) => {
        console.log('🔔 Received realtime event:', payload);
    });
    
    testChannel.subscribe((status) => {
        console.log('🔗 Test channel status:', status);
        
        if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime subscription working!');
            
            // Test inserting a move (if in a room)
            setTimeout(async () => {
                try {
                    const { data, error } = await window.sb.rpc('handle_dice_roll_simple', {
                        p_room_id: 'bronze', // test room
                        p_dice_1: Math.floor(Math.random() * 6) + 1,
                        p_dice_2: Math.floor(Math.random() * 6) + 1
                    });
                    
                    if (error) {
                        console.log('⚠️ Test roll failed (expected if not your turn):', error.message);
                    } else {
                        console.log('✅ Test roll successful:', data);
                    }
                } catch (error) {
                    console.log('⚠️ Test roll error:', error.message);
                }
                
                // Clean up test channel
                setTimeout(() => {
                    window.sb.removeChannel(testChannel);
                    console.log('🧹 Test channel cleaned up');
                }, 2000);
            }, 1000);
        }
    });
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    testRealtimeConnection();
}