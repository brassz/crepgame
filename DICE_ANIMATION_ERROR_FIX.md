# Dice Animation Error Fix

## Problem Summary

**Error:** `Cannot start animation - invalid dice result: undefined`

**Location:** `CGame.js:199` in the `_startRollingAnim()` method

## Root Cause Analysis

The error occurred due to a mismatch between the Socket.IO integration and the original game code:

### 1. **Wrong Method Override**
- The Socket.IO integration (`game-socketio-integration.js`) was trying to override `s_oGame._onRollBut`
- However, the actual method in `CGame.js` is `onRoll()`, not `_onRollBut`
- This meant the original `onRoll()` was still being called instead of the Socket.IO version

### 2. **Uninitialized Dice Result**
When the original `onRoll()` was called with Socket.IO connected:
1. `onRoll()` called `_prepareForRolling()` (line 640)
2. `_prepareForRolling()` detected Socket.IO was connected and returned early (line 130)
3. This early return meant `_aDiceResult` was never initialized
4. `onRoll()` then called `_startRollingAnim()` (line 641)
5. `_startRollingAnim()` tried to validate `_aDiceResult` but found it was `undefined`
6. Validation failed and threw the error

### 3. **Missing Fallback Logic**
When Socket.IO was not connected, the integration's override would show an error alert but wouldn't fall back to the original offline game logic.

## The Fix

### Changes Made:

#### 1. **Fixed Method Name in Integration** (`game-socketio-integration.js`)
```javascript
// BEFORE:
const originalOnRollBut = window.s_oGame._onRollBut;
window.s_oGame._onRollBut = function() {

// AFTER:
const originalOnRoll = window.s_oGame.onRoll;
window.s_oGame.onRoll = function() {
```

#### 2. **Added Fallback to Original Logic**
When Socket.IO is not connected, the override now calls the original `onRoll()` method:
```javascript
if (!gameClient.isConnected || !gameClient.isAuthenticated) {
    console.warn('⚠️ Socket.IO not connected - using offline mode');
    if (originalOnRoll) {
        return originalOnRoll.call(window.s_oGame);
    }
    return;
}
```

#### 3. **Added Missing Game State Logic**
The Socket.IO override now includes the important game state changes from the original `onRoll()`:
- Shows the UI block
- Sets game state to `STATE_GAME_COME_OUT` if needed
- Triggers the `bet_placed` event

#### 4. **Updated Comment in CGame.js**
Fixed the comment to reference the correct method name:
```javascript
// That file overrides onRoll to intercept roll requests
```

## How It Works Now

### When Socket.IO IS Connected (Multiplayer Mode):
1. User clicks roll button → `CInterface._onRoll()` → `s_oGame.onRoll()`
2. Integration's override runs instead of original
3. Override generates dice locally and immediately
4. Sets `_aDiceResult` with valid dice values
5. Starts animation instantly for the shooter
6. Sends dice to server for synchronization with other players

### When Socket.IO is NOT Connected (Offline Mode):
1. User clicks roll button → `CInterface._onRoll()` → `s_oGame.onRoll()`
2. Integration's override detects no connection
3. Falls back to original `onRoll()` in `CGame.js`
4. Original logic runs: generates dice, sets `_aDiceResult`, starts animation
5. Game works normally in offline mode

## Testing Checklist

- [x] Fixed method name override
- [x] Added fallback logic for offline mode
- [x] Ensured `_aDiceResult` is always initialized before animation
- [x] Preserved all original game state logic
- [x] Updated documentation comments

## Files Modified

1. `/workspace/game/js/game-socketio-integration.js`
   - Fixed override to target `onRoll` instead of `_onRollBut`
   - Added fallback to original logic when Socket.IO not connected
   - Added missing game state setup (showBlock, setState, trigger bet_placed)

2. `/workspace/game/js/CGame.js`
   - Updated comment to reference correct method name

## Result

✅ The error `Cannot start animation - invalid dice result: undefined` is now fixed.

✅ Both multiplayer (Socket.IO) and offline modes work correctly.

✅ `_aDiceResult` is always properly initialized before animations start.
