window.Realtime = (function(){
    var currentRoom = null;
    var playerId = null;
    var isConnected = false;
    var eventListeners = {};
    var turnTimer = null;
    var currentTurn = null;
    
    // Gerar ID único para este jogador
    function generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Sistema de eventos local
    function emit(event, data) {
        var eventData = {
            event: event,
            data: data,
            playerId: playerId,
            room: currentRoom,
            timestamp: Date.now()
        };
        
        // Salvar no localStorage para sincronizar entre abas
        localStorage.setItem('craps_event', JSON.stringify(eventData));
        
        // Processar evento localmente
        processEvent(eventData);
    }
    
    function processEvent(eventData) {
        switch(eventData.event) {
            case 'join_room':
                handleJoinRoom(eventData);
                break;
            case 'request_roll':
                handleRequestRoll(eventData);
                break;
            case 'leave_room':
                handleLeaveRoom(eventData);
                break;
        }
    }
    
    function handleJoinRoom(eventData) {
        var room = eventData.data;
        var players = getPlayersInRoom(room);
        
        // Verificar se a sala não está cheia
        var roomConfig = s_oRoomConfig.getRoomConfig(room);
        if (players.length >= roomConfig.max_players) {
            if (eventData.playerId === playerId) {
                triggerEvent('room_full', {});
            }
            return;
        }
        
        // Adicionar jogador à sala
        if (!players.includes(eventData.playerId)) {
            players.push(eventData.playerId);
            savePlayersInRoom(room, players);
        }
        
        // Enviar configuração da sala para o jogador que entrou
        if (eventData.playerId === playerId) {
            triggerEvent('room_config', roomConfig);
        }
        
        // Atualizar contagem de jogadores para todos
        triggerEvent('players_update', players.length);
        
        // Iniciar sistema de turnos se necessário
        if (players.length === 1) {
            startTurnSystem(room);
        } else {
            syncCurrentTurn(room);
        }
    }
    
    function handleRequestRoll(eventData) {
        var room = eventData.data || currentRoom;
        var turnData = getTurnData(room);
        
        // Verificar se é a vez do jogador
        if (turnData.currentPlayer !== eventData.playerId) {
            return;
        }
        
        // Gerar resultado dos dados
        var roll = {
            d1: Math.floor(Math.random() * 6) + 1,
            d2: Math.floor(Math.random() * 6) + 1,
            ts: Date.now(),
            player: eventData.playerId
        };
        
        // Salvar último resultado
        localStorage.setItem('craps_last_roll_' + room, JSON.stringify(roll));
        
        // Enviar resultado para todos
        triggerEvent('dice_result', roll);
        
        // Avançar para próximo jogador
        nextTurn(room);
    }
    
    function handleLeaveRoom(eventData) {
        var room = eventData.data || currentRoom;
        var players = getPlayersInRoom(room);
        var index = players.indexOf(eventData.playerId);
        
        if (index > -1) {
            players.splice(index, 1);
            savePlayersInRoom(room, players);
            triggerEvent('players_update', players.length);
            
            // Reorganizar turnos
            if (players.length > 0) {
                reorganizeTurns(room, eventData.playerId);
            } else {
                clearTurnData(room);
            }
        }
    }
    
    function getPlayersInRoom(room) {
        var players = localStorage.getItem('craps_players_' + room);
        return players ? JSON.parse(players) : [];
    }
    
    function savePlayersInRoom(room, players) {
        localStorage.setItem('craps_players_' + room, JSON.stringify(players));
    }
    
    function getTurnData(room) {
        var turnData = localStorage.getItem('craps_turn_' + room);
        return turnData ? JSON.parse(turnData) : { currentPlayer: null, endsAt: null, index: 0 };
    }
    
    function saveTurnData(room, turnData) {
        localStorage.setItem('craps_turn_' + room, JSON.stringify(turnData));
    }
    
    function startTurnSystem(room) {
        var players = getPlayersInRoom(room);
        if (players.length === 0) return;
        
        var turnData = {
            currentPlayer: players[0],
            endsAt: Date.now() + 25000, // 25 segundos
            index: 0
        };
        
        saveTurnData(room, turnData);
        triggerEvent('turn_update', { playerId: turnData.currentPlayer, endsAt: turnData.endsAt });
        
        startTurnTimer(room);
    }
    
    function nextTurn(room) {
        var players = getPlayersInRoom(room);
        if (players.length === 0) return;
        
        var turnData = getTurnData(room);
        turnData.index = (turnData.index + 1) % players.length;
        turnData.currentPlayer = players[turnData.index];
        turnData.endsAt = Date.now() + 25000;
        
        saveTurnData(room, turnData);
        triggerEvent('turn_update', { playerId: turnData.currentPlayer, endsAt: turnData.endsAt });
        
        startTurnTimer(room);
    }
    
    function startTurnTimer(room) {
        if (turnTimer) {
            clearInterval(turnTimer);
        }
        
        turnTimer = setInterval(function() {
            var turnData = getTurnData(room);
            var remaining = Math.max(0, Math.ceil((turnData.endsAt - Date.now()) / 1000));
            
            triggerEvent('turn_tick', { remaining: remaining });
            
            if (remaining <= 0) {
                // Auto-roll se o tempo acabou
                var roll = {
                    d1: Math.floor(Math.random() * 6) + 1,
                    d2: Math.floor(Math.random() * 6) + 1,
                    ts: Date.now(),
                    player: turnData.currentPlayer,
                    auto: true
                };
                
                localStorage.setItem('craps_last_roll_' + room, JSON.stringify(roll));
                triggerEvent('dice_result', roll);
                nextTurn(room);
            }
        }, 1000);
    }
    
    function syncCurrentTurn(room) {
        var turnData = getTurnData(room);
        if (turnData.currentPlayer) {
            triggerEvent('turn_update', { playerId: turnData.currentPlayer, endsAt: turnData.endsAt });
            
            // Sincronizar último resultado se existir
            var lastRoll = localStorage.getItem('craps_last_roll_' + room);
            if (lastRoll) {
                triggerEvent('dice_result', JSON.parse(lastRoll));
            }
        }
    }
    
    function reorganizeTurns(room, leftPlayerId) {
        var players = getPlayersInRoom(room);
        var turnData = getTurnData(room);
        
        if (turnData.currentPlayer === leftPlayerId) {
            // Se era a vez do jogador que saiu, passar para o próximo
            nextTurn(room);
        } else {
            // Apenas reajustar índices
            var currentIndex = players.indexOf(turnData.currentPlayer);
            if (currentIndex !== -1) {
                turnData.index = currentIndex;
                saveTurnData(room, turnData);
            }
        }
    }
    
    function clearTurnData(room) {
        localStorage.removeItem('craps_turn_' + room);
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
    }
    
    function triggerEvent(eventName, data) {
        if (window.s_oGame && window.s_oGame['on' + eventName.charAt(0).toUpperCase() + eventName.slice(1)]) {
            window.s_oGame['on' + eventName.charAt(0).toUpperCase() + eventName.slice(1)](data);
        }
        
        // Eventos específicos
        switch(eventName) {
            case 'room_config':
                if (window.s_oGame && window.s_oGame.onRoomConfig) {
                    window.s_oGame.onRoomConfig(data);
                }
                break;
            case 'players_update':
                if (window.s_oInterface && window.s_oGame && window.s_oGame.getCurrentRoom) {
                    var room = window.s_oGame.getCurrentRoom();
                    window.s_oInterface.updateRoomInfo(room, data);
                }
                break;
            case 'dice_result':
                if (window.s_oGame && window.s_oGame.onServerRoll) {
                    window.s_oGame.onServerRoll(data);
                }
                break;
            case 'room_full':
                alert('Sala cheia. Tente outra sala.');
                break;
            case 'turn_update':
                if (window.s_oGame && window.s_oGame.onTurnUpdate) {
                    window.s_oGame.onTurnUpdate(data);
                }
                break;
            case 'turn_tick':
                if (window.s_oInterface && window.s_oInterface.updateTurnTimer) {
                    window.s_oInterface.updateTurnTimer(data.remaining);
                }
                break;
        }
    }
    
    // Escutar mudanças no localStorage (sincronização entre abas)
    window.addEventListener('storage', function(e) {
        if (e.key === 'craps_event' && e.newValue) {
            var eventData = JSON.parse(e.newValue);
            if (eventData.playerId !== playerId) {
                processEvent(eventData);
            }
        }
    });
    
    // Limpar dados quando a aba é fechada
    window.addEventListener('beforeunload', function() {
        if (currentRoom && playerId) {
            emit('leave_room', currentRoom);
        }
    });

    function connect(){
        if (isConnected) return true;
        
        playerId = generatePlayerId();
        isConnected = true;
        
        console.log('Sistema multiplayer local conectado. ID do jogador:', playerId);
        return true;
    }

    function join(room){
        if (!connect()) return;
        
        // Sair da sala anterior se existir
        if (currentRoom && currentRoom !== room) {
            emit('leave_room', currentRoom);
        }
        
        currentRoom = room;
        emit('join_room', room);
    }

    function requestRoll(){
        if (!isConnected || !currentRoom) return;
        emit('request_roll', currentRoom);
    }

    function getSocket(){ 
        return { connected: isConnected, id: playerId };
    }

    return {
        connect: connect,
        join: join,
        requestRoll: requestRoll,
        getSocket: getSocket
    };
})();

