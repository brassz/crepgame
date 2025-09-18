function CMultiplayerRoomManager(){
    var _aActiveRooms;
    var _oCurrentRoom;
    var _sPlayerId;
    var _oWebSocket;
    var _sWebSocketUrl;
    var _bConnected;
    var _iReconnectAttempts;
    var _iMaxReconnectAttempts;
    var _oReconnectTimer;
    
    this._init = function(){
        _aActiveRooms = {};
        _oCurrentRoom = null;
        _sPlayerId = this._generatePlayerId();
        _oWebSocket = null;
        _sWebSocketUrl = "wss://your-websocket-server.com"; // Configure this URL
        _bConnected = false;
        _iReconnectAttempts = 0;
        _iMaxReconnectAttempts = 5;
        _oReconnectTimer = null;
        
        // Initialize with default room structure
        this._initializeDefaultRooms();
        
        // Try to connect to WebSocket server
        this._connectWebSocket();
    };
    
    this._generatePlayerId = function(){
        return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    };
    
    this._initializeDefaultRooms = function(){
        // Initialize room types with their configurations
        var aRoomTypes = ["principal"];
        
        for(var i = 0; i < aRoomTypes.length; i++){
            var sRoomType = aRoomTypes[i];
            var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
            
            _aActiveRooms[sRoomType] = {
                rooms: [],
                config: oRoomConfig
            };
        }
    };
    
    this._connectWebSocket = function(){
        if(!_sWebSocketUrl || _bConnected){
            return;
        }
        
        try {
            _oWebSocket = new WebSocket(_sWebSocketUrl);
            
            _oWebSocket.onopen = function(){
                _bConnected = true;
                _iReconnectAttempts = 0;
                console.log("WebSocket connected");
                
                // Send initial player registration
                this._sendMessage({
                    type: 'player_join',
                    player_id: _sPlayerId,
                    timestamp: Date.now()
                });
                
            }.bind(this);
            
            _oWebSocket.onmessage = function(event){
                try {
                    var oData = JSON.parse(event.data);
                    this._handleWebSocketMessage(oData);
                } catch(error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            }.bind(this);
            
            _oWebSocket.onclose = function(){
                _bConnected = false;
                console.log("WebSocket disconnected");
                this._attemptReconnect();
            }.bind(this);
            
            _oWebSocket.onerror = function(error){
                console.error("WebSocket error:", error);
                _bConnected = false;
            }.bind(this);
            
        } catch(error) {
            console.error("Failed to create WebSocket connection:", error);
            // Fall back to local room management
            this._initializeLocalRooms();
        }
    };
    
    this._attemptReconnect = function(){
        if(_iReconnectAttempts >= _iMaxReconnectAttempts){
            console.log("Max reconnection attempts reached. Using local room management.");
            this._initializeLocalRooms();
            return;
        }
        
        _iReconnectAttempts++;
        var iDelay = Math.min(1000 * Math.pow(2, _iReconnectAttempts), 30000);
        
        console.log("Attempting to reconnect in " + (iDelay/1000) + " seconds...");
        
        _oReconnectTimer = setTimeout(function(){
            this._connectWebSocket();
        }.bind(this), iDelay);
    };
    
    this._initializeLocalRooms = function(){
        console.log("Initializing local room management");
        // Create initial rooms for each room type
        for(var sRoomType in _aActiveRooms){
            this._createLocalRoom(sRoomType);
        }
    };
    
    this._createLocalRoom = function(sRoomType){
        var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
        var sRoomId = sRoomType + "_room_" + (_aActiveRooms[sRoomType].rooms.length + 1);
        
        var oNewRoom = {
            id: sRoomId,
            type: sRoomType,
            players: [],
            max_players: oRoomConfig.max_players,
            created_at: Date.now(),
            game_state: {
                current_player: null,
                dice_result: null,
                bets: {},
                round_active: false
            }
        };
        
        _aActiveRooms[sRoomType].rooms.push(oNewRoom);
        console.log("Created local room:", sRoomId);
        
        return oNewRoom;
    };
    
    this._sendMessage = function(oMessage){
        if(_bConnected && _oWebSocket && _oWebSocket.readyState === WebSocket.OPEN){
            _oWebSocket.send(JSON.stringify(oMessage));
        }
    };
    
    this._handleWebSocketMessage = function(oData){
        switch(oData.type){
            case 'room_assigned':
                this._handleRoomAssignment(oData);
                break;
            case 'room_update':
                this._handleRoomUpdate(oData);
                break;
            case 'player_joined':
                this._handlePlayerJoined(oData);
                break;
            case 'player_left':
                this._handlePlayerLeft(oData);
                break;
            case 'game_state_update':
                this._handleGameStateUpdate(oData);
                break;
            case 'room_list_update':
                this._handleRoomListUpdate(oData);
                break;
        }
    };
    
    this._handleRoomAssignment = function(oData){
        _oCurrentRoom = oData.room;
        console.log("Assigned to room:", _oCurrentRoom.id);
        
        // Update interface with room information
        if(s_oInterface){
            s_oInterface.updateRoomInfo(_oCurrentRoom.type, _oCurrentRoom.players.length);
        }
        
        // Trigger room change event
        if(s_oGame){
            s_oGame.onRoomChanged(_oCurrentRoom);
        }
    };
    
    this._handleRoomUpdate = function(oData){
        if(_oCurrentRoom && _oCurrentRoom.id === oData.room_id){
            _oCurrentRoom.players = oData.players;
            
            // Update interface
            if(s_oInterface){
                s_oInterface.updateRoomInfo(_oCurrentRoom.type, _oCurrentRoom.players.length);
            }
        }
    };
    
    this._handlePlayerJoined = function(oData){
        if(_oCurrentRoom && _oCurrentRoom.id === oData.room_id){
            console.log("Player joined room:", oData.player_id);
            
            // Update local room state
            if(!_oCurrentRoom.players.find(p => p.id === oData.player_id)){
                _oCurrentRoom.players.push({
                    id: oData.player_id,
                    joined_at: Date.now()
                });
            }
            
            // Update interface
            if(s_oInterface){
                s_oInterface.updateRoomInfo(_oCurrentRoom.type, _oCurrentRoom.players.length);
            }
        }
    };
    
    this._handlePlayerLeft = function(oData){
        if(_oCurrentRoom && _oCurrentRoom.id === oData.room_id){
            console.log("Player left room:", oData.player_id);
            
            // Update local room state
            _oCurrentRoom.players = _oCurrentRoom.players.filter(p => p.id !== oData.player_id);
            
            // Update interface
            if(s_oInterface){
                s_oInterface.updateRoomInfo(_oCurrentRoom.type, _oCurrentRoom.players.length);
            }
        }
    };
    
    this._handleGameStateUpdate = function(oData){
        if(_oCurrentRoom && _oCurrentRoom.id === oData.room_id){
            _oCurrentRoom.game_state = oData.game_state;
            
            // Sync game state with local game
            if(s_oGame){
                s_oGame.syncGameState(oData.game_state);
            }
        }
    };
    
    this._handleRoomListUpdate = function(oData){
        _aActiveRooms = oData.rooms;
    };
    
    // PUBLIC METHODS
    
    this.joinRoom = function(sRoomType){
        if(_bConnected){
            // Request room assignment from server
            this._sendMessage({
                type: 'request_room',
                room_type: sRoomType,
                player_id: _sPlayerId,
                timestamp: Date.now()
            });
        } else {
            // Use local room management
            this._joinLocalRoom(sRoomType);
        }
    };
    
    this._joinLocalRoom = function(sRoomType){
        var oRoomGroup = _aActiveRooms[sRoomType];
        if(!oRoomGroup){
            console.error("Room type not found:", sRoomType);
            return null;
        }
        
        // Find available room
        var oAvailableRoom = null;
        for(var i = 0; i < oRoomGroup.rooms.length; i++){
            var oRoom = oRoomGroup.rooms[i];
            if(oRoom.players.length < oRoom.max_players){
                oAvailableRoom = oRoom;
                break;
            }
        }
        
        // Create new room if none available
        if(!oAvailableRoom){
            oAvailableRoom = this._createLocalRoom(sRoomType);
        }
        
        // Add player to room
        if(!oAvailableRoom.players.find(p => p.id === _sPlayerId)){
            oAvailableRoom.players.push({
                id: _sPlayerId,
                joined_at: Date.now()
            });
        }
        
        _oCurrentRoom = oAvailableRoom;
        console.log("Joined local room:", _oCurrentRoom.id, "Players:", _oCurrentRoom.players.length + "/" + _oCurrentRoom.max_players);
        
        // Update interface
        if(s_oInterface){
            s_oInterface.updateRoomInfo(_oCurrentRoom.type, _oCurrentRoom.players.length);
        }
        
        return _oCurrentRoom;
    };
    
    this.leaveRoom = function(){
        if(_oCurrentRoom){
            if(_bConnected){
                this._sendMessage({
                    type: 'leave_room',
                    room_id: _oCurrentRoom.id,
                    player_id: _sPlayerId,
                    timestamp: Date.now()
                });
            } else {
                // Remove from local room
                _oCurrentRoom.players = _oCurrentRoom.players.filter(p => p.id !== _sPlayerId);
            }
            
            _oCurrentRoom = null;
        }
    };
    
    this.getCurrentRoom = function(){
        return _oCurrentRoom;
    };
    
    this.getPlayerId = function(){
        return _sPlayerId;
    };
    
    this.isConnected = function(){
        return _bConnected;
    };
    
    this.getRoomList = function(sRoomType){
        if(_aActiveRooms[sRoomType]){
            return _aActiveRooms[sRoomType].rooms;
        }
        return [];
    };
    
    this.broadcastGameAction = function(oAction){
        if(_oCurrentRoom){
            var oMessage = {
                type: 'game_action',
                room_id: _oCurrentRoom.id,
                player_id: _sPlayerId,
                action: oAction,
                timestamp: Date.now()
            };
            
            if(_bConnected){
                this._sendMessage(oMessage);
            } else {
                // Handle locally
                this._handleLocalGameAction(oAction);
            }
        }
    };
    
    this._handleLocalGameAction = function(oAction){
        if(!_oCurrentRoom) return;
        
        // Update local game state based on action
        switch(oAction.type){
            case 'bet_placed':
                _oCurrentRoom.game_state.bets[_sPlayerId] = oAction.data;
                break;
            case 'dice_rolled':
                _oCurrentRoom.game_state.dice_result = oAction.data;
                _oCurrentRoom.game_state.current_player = _sPlayerId;
                break;
            case 'round_ended':
                _oCurrentRoom.game_state.round_active = false;
                _oCurrentRoom.game_state.bets = {};
                break;
        }
    };
    
    this.getActiveRoomsInfo = function(){
        var aRoomsInfo = [];
        
        for(var sRoomType in _aActiveRooms){
            var oRoomGroup = _aActiveRooms[sRoomType];
            var oRoomConfig = oRoomGroup.config;
            
            for(var i = 0; i < oRoomGroup.rooms.length; i++){
                var oRoom = oRoomGroup.rooms[i];
                aRoomsInfo.push({
                    id: oRoom.id,
                    type: sRoomType,
                    name: oRoomConfig.name,
                    players: oRoom.players.length,
                    max_players: oRoom.max_players,
                    min_bet: oRoomConfig.min_bet,
                    max_bet: oRoomConfig.max_bet,
                    available: oRoom.players.length < oRoom.max_players
                });
            }
        }
        
        return aRoomsInfo;
    };
    
    this.disconnect = function(){
        if(_oReconnectTimer){
            clearTimeout(_oReconnectTimer);
            _oReconnectTimer = null;
        }
        
        if(_oWebSocket){
            this.leaveRoom();
            _oWebSocket.close();
            _oWebSocket = null;
        }
        
        _bConnected = false;
    };
    
    this._init();
    
    return this;
}

var s_oMultiplayerRoomManager = null;