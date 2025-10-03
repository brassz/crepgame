# Fix: Animation Not Showing for All Players

## Problem Description
The dice roll animation was not appearing for all players in multiplayer games. When one player rolled the dice, other players in the room could not see the rolling animation, only the final result.

## Root Cause
The multiplayer system was missing the proper event flow for starting animations. The Supabase multiplayer implementation only had a `dice_rolled` event but no `dice_roll_start` event, which meant:

1. Player A clicks to roll dice
2. System immediately generates result and sends `dice_rolled` event
3. Other players receive the result but never see the animation start

## Solution Implemented

### 1. Database Changes (`database-setup.sql`)
- Added new `start_dice_roll()` function that creates a `dice_roll_start` event
- This function is called first to trigger animation for all players
- The existing `record_dice_roll()` function continues to handle the result

### 2. Supabase Multiplayer (`game/js/supabase-multiplayer.js`)
- Added `requestDiceRoll()` function that implements two-phase dice rolling:
  1. **Phase 1**: Call `start_dice_roll()` to trigger `dice_roll_start` event
  2. **Phase 2**: After 1 second delay, call `record_dice_roll()` with generated result
- Fixed event handling to use correct method names (`onServerRoll` instead of `onDiceRolled`)
- Added proper data format conversion for dice roll events

### 3. Game Logic (`game/js/CGame.js`)
- Modified `onRoll()` to not start local animation when connected to multiplayer server
- Updated `_prepareForRolling()` with clearer comments about server vs local behavior
- Ensured proper separation between local single-player and multiplayer flows

### 4. Realtime System (`game/js/realtime.js`)
- Fixed `requestRoll()` for Supabase to actually call the new `requestDiceRoll()` function
- Added proper error handling and logging

## How It Works Now

### Multiplayer Flow:
1. Player A clicks "Roll Dice"
2. `requestDiceRoll()` is called
3. `start_dice_roll()` database function creates `dice_roll_start` event
4. All players receive `dice_roll_start` event and start animation (without result)
5. After 1 second delay, `record_dice_roll()` is called with generated dice values
6. All players receive `dice_rolled` event and finish animation with actual result

### Single-Player Flow:
- Remains unchanged - generates result immediately and shows animation locally

## Testing the Fix

### Prerequisites:
1. Supabase database must be updated with the new `start_dice_roll()` function
2. Multiple players must be in the same multiplayer room

### Test Steps:
1. Open game in two different browser windows/tabs
2. Both players join the same room (e.g., "bronze")
3. Player 1 places a bet and clicks "Roll Dice"
4. **Expected Result**: Both players should see the dice rolling animation start simultaneously
5. After ~1 second, both players should see the same final dice result
6. Repeat test with Player 2 rolling to ensure it works both ways

### What to Verify:
- ✅ Animation starts for all players when any player rolls
- ✅ Animation shows rolling motion before showing result
- ✅ All players see the same final dice values
- ✅ Game state updates correctly for all players
- ✅ Single-player mode still works without multiplayer connection

## Files Modified:
- `database-setup.sql` - Added `start_dice_roll()` function
- `game/js/supabase-multiplayer.js` - Implemented two-phase dice rolling
- `game/js/CGame.js` - Fixed local vs multiplayer animation logic
- `game/js/realtime.js` - Fixed Supabase dice roll request

## Commit:
```
aa1d4bb - Fix animation not showing for all players in multiplayer
```