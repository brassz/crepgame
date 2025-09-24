function COnlineTableManager(){
    var _iUpdateInterval;
    var _bIsActive = false;
    
    this._init = function(){
        this.startSimulation();
    };
    
    this.startSimulation = function(){
        if(_bIsActive) return;
        
        _bIsActive = true;
        
        // Simulate player activity every 5-10 seconds
        _iUpdateInterval = setInterval(() => {
            this._simulatePlayerActivity();
        }, Math.random() * 5000 + 5000);
        
        // Initialize with some random players
        this._initializeRandomPlayers();
    };
    
    this.stopSimulation = function(){
        if(_iUpdateInterval){
            clearInterval(_iUpdateInterval);
            _iUpdateInterval = null;
        }
        _bIsActive = false;
    };
    
    this._initializeRandomPlayers = function(){
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomTypes = Object.keys(aRooms);
        
        for(var i = 0; i < aRoomTypes.length; i++){
            var sRoomType = aRoomTypes[i];
            var oRoom = aRooms[sRoomType];
            
            // Start with 20-60% capacity
            var iMinPlayers = Math.floor(oRoom.max_players * 0.2);
            var iMaxPlayers = Math.floor(oRoom.max_players * 0.6);
            var iPlayers = Math.floor(Math.random() * (iMaxPlayers - iMinPlayers + 1)) + iMinPlayers;
            
            s_oRoomConfig.setCurrentPlayers(sRoomType, iPlayers);
        }
    };
    
    this._simulatePlayerActivity = function(){
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomTypes = Object.keys(aRooms);
        
        // Randomly select a room to update
        var sRandomRoom = aRoomTypes[Math.floor(Math.random() * aRoomTypes.length)];
        
        // 50% chance to add player, 50% to remove
        if(Math.random() > 0.5){
            if(!s_oRoomConfig.isRoomFull(sRandomRoom)){
                s_oRoomConfig.addPlayer(sRandomRoom);
                console.log("Player joined", s_oRoomConfig.getRoomName(sRandomRoom));
            }
        } else {
            if(s_oRoomConfig.getCurrentPlayers(sRandomRoom) > 0){
                s_oRoomConfig.removePlayer(sRandomRoom);
                console.log("Player left", s_oRoomConfig.getRoomName(sRandomRoom));
            }
        }
        
        // Update table selector if it exists and is visible
        if(window.s_oTableSelector && window.s_oTableSelector.updateTableInfo){
            window.s_oTableSelector.updateTableInfo();
        }
        
        // Update game interface if player is in a room
        if(window.s_oGame && window.s_oGame.getCurrentRoom){
            var sCurrentRoom = window.s_oGame.getCurrentRoom();
            if(sCurrentRoom && window.s_oGame._oInterface && window.s_oGame._oInterface.updateRoomInfo){
                window.s_oGame._oInterface.updateRoomInfo(sCurrentRoom, s_oRoomConfig.getCurrentPlayers(sCurrentRoom));
            }
        }
    };
    
    this.getActivePlayerCount = function(){
        var iTotalPlayers = 0;
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomTypes = Object.keys(aRooms);
        
        for(var i = 0; i < aRoomTypes.length; i++){
            iTotalPlayers += s_oRoomConfig.getCurrentPlayers(aRoomTypes[i]);
        }
        
        return iTotalPlayers;
    };
    
    this.getRoomStats = function(){
        var aStats = [];
        var aRooms = s_oRoomConfig.getAllRooms();
        var aRoomTypes = Object.keys(aRooms);
        
        for(var i = 0; i < aRoomTypes.length; i++){
            var sRoomType = aRoomTypes[i];
            var oRoom = aRooms[sRoomType];
            
            aStats.push({
                room: sRoomType,
                name: oRoom.name,
                current_players: s_oRoomConfig.getCurrentPlayers(sRoomType),
                max_players: oRoom.max_players,
                min_bet: oRoom.min_bet,
                max_bet: oRoom.max_bet,
                is_full: s_oRoomConfig.isRoomFull(sRoomType)
            });
        }
        
        return aStats;
    };
    
    this._init();
    
    return this;
}

var s_oOnlineTableManager;