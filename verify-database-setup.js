#!/usr/bin/env node

/**
 * Database Setup Verification Script
 * This script checks if the required database functions and tables exist
 */

const { createClient } = require('@supabase/supabase-js');

// Load configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://iwjdwpaulonjrlyvudgo.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Need service key for admin operations

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
    console.log('Set it with: export SUPABASE_SERVICE_KEY="your_service_role_key"');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyDatabaseSetup() {
    console.log('🔍 Verifying database setup...\n');

    try {
        // Check if required functions exist
        const { data: functions, error: funcError } = await supabase.rpc('pg_get_functiondef', {
            funcid: 'handle_dice_roll_simple'
        }).single();

        if (funcError) {
            console.log('❌ Function handle_dice_roll_simple not found');
            console.log('   Run the simple-setup.sql script to create it');
        } else {
            console.log('✅ Function handle_dice_roll_simple exists');
        }

        // Check tables
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['game_moves', 'current_turn', 'room_sessions']);

        if (tableError) {
            console.log('❌ Error checking tables:', tableError.message);
        } else {
            const tableNames = tables.map(t => t.table_name);
            ['game_moves', 'current_turn', 'room_sessions'].forEach(tableName => {
                if (tableNames.includes(tableName)) {
                    console.log(`✅ Table ${tableName} exists`);
                } else {
                    console.log(`❌ Table ${tableName} missing`);
                }
            });
        }

        // Test authentication
        const { data: user, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.log('⚠️  Authentication test failed (expected with service key)');
        }

        console.log('\n🔧 To fix missing components, run:');
        console.log('   psql -h db.iwjdwpaulonjrlyvudgo.supabase.co -U postgres -d postgres -f simple-setup.sql');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyDatabaseSetup();