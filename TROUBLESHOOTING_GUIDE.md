# Troubleshooting Guide: Dice Game Errors

## Error Analysis

The errors you're experiencing are related to the real-time multiplayer system not being properly set up. Here's what's happening:

### 1. **"Failed to load resource: the server responded with a status of 400"**
- **Cause**: Network requests to Supabase are failing
- **Location**: Various RPC calls to database functions

### 2. **"Supabase RPC error: Object" (line 155)**
- **Cause**: The `handle_dice_roll_simple` function is returning an error
- **Location**: `supabase-realtime-dice.js:155`

### 3. **"Not your turn or invalid room" (lines 163 & 172)**
- **Cause**: Turn management system isn't working correctly
- **Location**: Both `supabase-realtime-dice.js` and `CGame.js`

## Root Causes

1. **Missing Database Setup**: The required database functions may not be created
2. **Authentication Issues**: User sessions aren't persisting correctly
3. **Room Management**: Room sessions aren't being created properly
4. **Turn Cycle**: The turn management system has gaps

## Solutions Implemented

### 1. **Enhanced Error Handling**
- Added specific error messages for different failure types
- Improved authentication error detection
- Added automatic reconnection attempts

### 2. **Fixed Database Functions**
- Updated `join_room_simple` to create room sessions automatically
- Enhanced `handle_dice_roll_simple` with better error messages
- Added proper validation and error handling

### 3. **Improved Client-Side Logic**
- Added debug logging to track authentication state
- Enhanced fallback mechanisms for network failures
- Better turn validation and user feedback

### 4. **Added Debug Tools**
- Created `getDebugInfo()` function to inspect connection state
- Added comprehensive logging for troubleshooting

## Quick Fixes to Try

### 1. **Check Database Setup**
```bash
# Run this to verify your database is set up correctly
node verify-database-setup.js
```

### 2. **Check Authentication**
Open browser console and run:
```javascript
// Check if Supabase is connected
console.log('Supabase client:', window.sb);
console.log('Auth state:', window.sb?.auth?.getUser());

// Check realtime connection
console.log('Realtime debug:', window.SupabaseRealtimeDice?.getDebugInfo());
```

### 3. **Manual Database Setup**
If functions are missing, run:
```sql
-- Connect to your Supabase database and run:
\i simple-setup.sql
```

### 4. **Test Room Joining**
In browser console:
```javascript
// Test room joining manually
window.Realtime.join('bronze').then(console.log).catch(console.error);
```

## Common Issues & Solutions

### Issue: "User not authenticated"
**Solution**: 
1. Make sure you're logged in
2. Check if `window.sb.auth.getUser()` returns a valid user
3. Refresh the page to reset authentication state

### Issue: "Invalid room - no active game session"
**Solution**:
1. The database functions will now auto-create room sessions
2. Make sure the `simple-setup.sql` script was run with the updated functions

### Issue: "Not your turn"
**Solution**:
1. This is expected behavior in multiplayer
2. Wait for your turn or test with multiple browser tabs
3. The system now provides better feedback about whose turn it is

## Testing the Fixes

1. **Refresh the page** to load the updated JavaScript
2. **Open browser console** to see debug messages
3. **Try to roll dice** - you should see detailed logging
4. **Check for specific error messages** - they should be more helpful now

## If Problems Persist

1. **Check Network Tab**: Look for failed requests to Supabase
2. **Verify Database**: Use the verification script
3. **Check Console**: Look for authentication or connection errors
4. **Test Locally**: Try the game in single-player mode first

## Updated Files

The following files have been modified to fix the issues:

1. `game/js/supabase-realtime-dice.js` - Enhanced error handling and debugging
2. `game/js/CGame.js` - Better error recovery and reconnection logic
3. `simple-setup.sql` - Fixed database functions for proper room management
4. `verify-database-setup.js` - New tool to verify database setup
5. `TROUBLESHOOTING_GUIDE.md` - This comprehensive guide

## Next Steps

1. **Apply the database updates** by running the updated `simple-setup.sql`
2. **Refresh your game page** to load the updated JavaScript
3. **Test the dice rolling** with the improved error handling
4. **Use the debug tools** if issues persist

The system should now provide much clearer error messages and automatically handle many common failure scenarios.