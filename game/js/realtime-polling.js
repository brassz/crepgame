window.Realtime = (function(){
    var currentRoom = null;
    var playerId = null;
    var pollInterval = null;
    var isPolling = false;
    
    // Generate unique player ID
    function generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    function connect(){
        if (!playerId) {
            playerId = generatePlayerId();
        }
        console.log('Connected with player ID:', playerId);
        return { connected: true };
    }

    function join(room){
        if (!playerId) {
            connect();
        }
        
        currentRoom = room;
        
        // Join room via API
        fetch('/api/game-state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'join',
                room: room,
                playerId: playerId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Trigger room config event
                if (window.s_oGame && window.s_oGame.onRoomConfig) {
                    window.s_oGame.onRoomConfig(data.roomConfig);
                }
                
                // Update player count
                if (window.s_oInterface && window.s_oGame && window.s_oGame.getCurrentRoom) {
                    window.s_oInterface.updateRoomInfo(room, data.playerCount);
                }
                
                // Start polling for game state
                startPolling();
            } else if (data.error === 'Room full') {
                alert('Sala cheia. Tente outra sala.');
            }
        })
        .catch(error => {
            console.error('Error joining room:', error);
        });
    }

    function startPolling() {
        if (isPolling || !currentRoom || !playerId) return;
        
        isPolling = true;
        
        pollInterval = setInterval(() => {
            if (!currentRoom) {
                stopPolling();
                return;
            }
            
            fetch('/api/game-state?' + new URLSearchParams({
                action: 'get_state',
                room: currentRoom,
                playerId: playerId
            }))
            .then(response => response.json())
            .then(data => {
                // Update player count
                if (window.s_oInterface && window.s_oGame && window.s_oGame.getCurrentRoom) {
                    window.s_oInterface.updateRoomInfo(currentRoom, data.playerCount);
                }
                
                // Update turn information
                if (window.s_oGame && window.s_oGame.onTurnUpdate) {
                    window.s_oGame.onTurnUpdate({
                        playerId: data.currentPlayer,
                        isMyTurn: data.isMyTurn
                    });
                }
                
                // Update timer
                if (window.s_oInterface && window.s_oInterface.updateTurnTimer) {
                    window.s_oInterface.updateTurnTimer(data.timeRemaining);
                }
                
                // Handle new dice roll
                if (data.lastRoll && (!lastRollTimestamp || data.lastRoll.timestamp > lastRollTimestamp)) {
                    lastRollTimestamp = data.lastRoll.timestamp;
                    if (window.s_oGame && window.s_oGame.onServerRoll) {
                        window.s_oGame.onServerRoll({
                            d1: data.lastRoll.d1,
                            d2: data.lastRoll.d2,
                            ts: data.lastRoll.timestamp
                        });
                    }
                }
            })
            .catch(error => {
                console.error('Polling error:', error);
            });
        }, 1000); // Poll every second
    }
    
    var lastRollTimestamp = null;

    function stopPolling() {
        isPolling = false;
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function requestRoll(){
        if (!currentRoom || !playerId) return;
        
        fetch('/api/game-state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'roll',
                room: currentRoom,
                playerId: playerId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.roll) {
                // The roll will be handled by the polling mechanism
                console.log('Roll successful:', data.roll);
            } else {
                console.log('Roll failed:', data.error);
            }
        })
        .catch(error => {
            console.error('Error requesting roll:', error);
        });
    }

    function getSocket(){ 
        return { 
            connected: true,
            id: playerId
        }; 
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (currentRoom && playerId) {
            navigator.sendBeacon('/api/game-state', JSON.stringify({
                action: 'leave',
                room: currentRoom,
                playerId: playerId
            }));
        }
    });

    return {
        connect: connect,
        join: join,
        requestRoll: requestRoll,
        getSocket: getSocket
    };
})();