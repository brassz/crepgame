# Dice Animation Flow - After Fix

## Flow Diagram

```
User Clicks Roll Button
         |
         v
CInterface._onRoll() (CInterface.js:388)
         |
         v
s_oGame.onRoll() called
         |
         v
    [Socket.IO Integration Check]
         |
    +----+----+
    |         |
Socket.IO    Socket.IO
Connected    NOT Connected
    |         |
    |         v
    |    [FALLBACK TO ORIGINAL]
    |    Original onRoll() in CGame.js
    |         |
    |         v
    |    _prepareForRolling()
    |         |
    |         v
    |    Generates dice locally
    |    Sets _aDiceResult = [d1, d2]
    |         |
    |         v
    |    _startRollingAnim()
    |         |
    |         v
    |    Validates _aDiceResult ✅
    |         |
    |         v
    |    _oDicesAnim.startRolling(_aDiceResult)
    |
    v
[SOCKET.IO MULTIPLAYER MODE]
Integration's override (game-socketio-integration.js:32)
    |
    v
Set game state & UI
    |
    v
Generate dice locally
dice1 = random(1-6)
dice2 = random(1-6)
    |
    v
Set _aDiceResult = [dice1, dice2] ✅
    |
    v
_oDicesAnim.startRolling([dice1, dice2])
    |
    v
Animation plays instantly
    |
    v
Send dice to server
    |
    v
Server broadcasts to other players
```

## Key Validation Points

### 1. CGame._startRollingAnim() (Line 193-207)
```javascript
if (!_aDiceResult || _aDiceResult.length !== 2 || 
    typeof _aDiceResult[0] !== 'number' || typeof _aDiceResult[1] !== 'number' ||
    _aDiceResult[0] < 1 || _aDiceResult[0] > 6 || 
    _aDiceResult[1] < 1 || _aDiceResult[1] > 6) {
    console.error('❌ Cannot start animation - invalid dice result:', _aDiceResult);
    // Reset and return
}
```
**Status:** ✅ Will always pass now because `_aDiceResult` is set before calling this method

### 2. CDicesAnim.startRolling() (Line 138-150)
```javascript
if (!aDicesResult || aDicesResult.length !== 2 || 
    typeof aDicesResult[0] !== 'number' || typeof aDicesResult[1] !== 'number' ||
    aDicesResult[0] < 1 || aDicesResult[0] > 6 || 
    aDicesResult[1] < 1 || aDicesResult[1] > 6) {
    console.error('❌ Invalid dice result provided to startRolling:', aDicesResult);
    return;
}
```
**Status:** ✅ Additional safety layer

## Multiplayer Flow (Socket.IO)

### For the Shooter (Player who clicks roll):
1. Integration's `onRoll()` override runs
2. Generates dice locally: `[dice1, dice2]`
3. Sets `_aDiceResult` immediately
4. Starts animation instantly with the result
5. Sends result to server
6. Animation completes based on local result

### For Observers (Other players in room):
1. Receive `dice_roll_start` event from server
2. Call `_oDicesAnim.startRollingWithoutResult()`
3. Animation plays with random frames
4. Receive `dice_rolled` event with actual result
5. Call `_oDicesAnim.finishRollingWithResult([dice1, dice2])`
6. Animation shows final result

## Offline Flow

### Single Player:
1. Original `onRoll()` in CGame.js runs
2. Calls `_prepareForRolling()`
3. Generates dice: `_aDiceResult = [dice1, dice2]`
4. Calls `_startRollingAnim()`
5. Validates `_aDiceResult` ✅
6. Starts animation
7. Animation completes
8. Game processes result

## Error Prevention

### Before Fix:
```
Socket.IO Connected
    |
    v
Integration tries to override _onRollBut (doesn't exist) ❌
    |
    v
Original onRoll() runs instead
    |
    v
_prepareForRolling() detects Socket.IO → returns early
    |
    v
_aDiceResult = undefined ❌
    |
    v
_startRollingAnim() validation fails
    |
    v
ERROR: Cannot start animation - invalid dice result: undefined
```

### After Fix:
```
Socket.IO Connected
    |
    v
Integration overrides onRoll (correct method) ✅
    |
    v
Integration's onRoll() runs
    |
    v
Generates dice locally
    |
    v
_aDiceResult = [dice1, dice2] ✅
    |
    v
_oDicesAnim.startRolling([dice1, dice2])
    |
    v
Animation plays successfully ✅
```

## Summary

✅ **All paths now properly initialize `_aDiceResult` before starting animation**

✅ **Fallback to offline mode works when Socket.IO not connected**

✅ **Double validation layers prevent invalid dice from starting animation**

✅ **Both multiplayer and single-player modes work correctly**
