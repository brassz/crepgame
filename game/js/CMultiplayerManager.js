function CMultiplayerManager(){
    var _aRoomPlayers; // Jogadores por sala
    var _sCurrentRoom;
    var _sCurrentPlayerId;
    var _aPlayerProfiles;
    
    this._init = function(){
        _aRoomPlayers = {
            "iniciante": [],
            "intermediaria": [],
            "vip": []
        };
        
        _sCurrentRoom = null;
        _sCurrentPlayerId = null;
        _aPlayerProfiles = {};
        
        this._simulateOnlinePlayers();
    };
    
    // Simula jogadores online para demonstração
    this._simulateOnlinePlayers = function(){
        var aBotNames = [
            "Carlos_BR", "Ana_Silva", "Pedro_123", "Maria_Luck", "João_Dice",
            "Lucia_VIP", "Bruno_Pro", "Sofia_Win", "Miguel_King", "Julia_Star",
            "Rafael_Lucky", "Camila_Gold", "Diego_Fire", "Beatriz_Ice", "Lucas_Fast"
        ];
        
        // Adiciona bots aleatórios nas salas
        for(var i = 0; i < aBotNames.length; i++){
            var sRoom = this._getRandomRoom();
            var sPlayerId = "bot_" + i;
            var oProfile = {
                id: sPlayerId,
                name: aBotNames[i],
                balance: Math.floor(Math.random() * 10000) + 1000,
                isBot: true,
                avatar: Math.floor(Math.random() * 5) + 1
            };
            
            _aPlayerProfiles[sPlayerId] = oProfile;
            this._addPlayerToRoom(sRoom, sPlayerId);
        }
    };
    
    this._getRandomRoom = function(){
        var aRooms = ["iniciante", "intermediaria", "vip"];
        return aRooms[Math.floor(Math.random() * aRooms.length)];
    };
    
    this.joinRoom = function(sRoomType, sPlayerId, oPlayerProfile){
        // Remove jogador de outras salas
        this.leaveAllRooms(sPlayerId);
        
        // Adiciona à nova sala
        this._addPlayerToRoom(sRoomType, sPlayerId);
        _sCurrentRoom = sRoomType;
        _sCurrentPlayerId = sPlayerId;
        
        if(oPlayerProfile){
            _aPlayerProfiles[sPlayerId] = oPlayerProfile;
        }
        
        return this.getRoomPlayers(sRoomType);
    };
    
    this.leaveRoom = function(sRoomType, sPlayerId){
        if(_aRoomPlayers[sRoomType]){
            var iIndex = _aRoomPlayers[sRoomType].indexOf(sPlayerId);
            if(iIndex > -1){
                _aRoomPlayers[sRoomType].splice(iIndex, 1);
            }
        }
        
        if(_sCurrentRoom === sRoomType && _sCurrentPlayerId === sPlayerId){
            _sCurrentRoom = null;
            _sCurrentPlayerId = null;
        }
    };
    
    this.leaveAllRooms = function(sPlayerId){
        for(var room in _aRoomPlayers){
            this.leaveRoom(room, sPlayerId);
        }
    };
    
    this._addPlayerToRoom = function(sRoomType, sPlayerId){
        if(!_aRoomPlayers[sRoomType]){
            _aRoomPlayers[sRoomType] = [];
        }
        
        var oRoom = s_oRoomConfig.getRoomConfig(sRoomType);
        if(_aRoomPlayers[sRoomType].length < oRoom.max_players){
            if(_aRoomPlayers[sRoomType].indexOf(sPlayerId) === -1){
                _aRoomPlayers[sRoomType].push(sPlayerId);
            }
        }
    };
    
    this.getRoomPlayers = function(sRoomType){
        return _aRoomPlayers[sRoomType] || [];
    };
    
    this.getRoomPlayersCount = function(sRoomType){
        return this.getRoomPlayers(sRoomType).length;
    };
    
    this.getPlayerProfile = function(sPlayerId){
        return _aPlayerProfiles[sPlayerId];
    };
    
    this.getCurrentRoom = function(){
        return _sCurrentRoom;
    };
    
    this.getCurrentPlayerId = function(){
        return _sCurrentPlayerId;
    };
    
    this.getRoomPlayersProfiles = function(sRoomType){
        var aPlayers = this.getRoomPlayers(sRoomType);
        var aProfiles = [];
        
        for(var i = 0; i < aPlayers.length; i++){
            var oProfile = this.getPlayerProfile(aPlayers[i]);
            if(oProfile){
                aProfiles.push(oProfile);
            }
        }
        
        return aProfiles;
    };
    
    this.simulatePlayerAction = function(sRoomType, sAction, oData){
        // Simula ações de outros jogadores (para demonstração)
        var aPlayers = this.getRoomPlayers(sRoomType);
        
        if(Math.random() < 0.3 && aPlayers.length > 1){ // 30% chance
            var sRandomPlayer = aPlayers[Math.floor(Math.random() * aPlayers.length)];
            if(sRandomPlayer !== _sCurrentPlayerId){
                var oProfile = this.getPlayerProfile(sRandomPlayer);
                if(oProfile && s_oGame && s_oGame.onMultiplayerAction){
                    setTimeout(function(){
                        s_oGame.onMultiplayerAction(sAction, {
                            playerId: sRandomPlayer,
                            playerName: oProfile.name,
                            data: oData
                        });
                    }, Math.random() * 3000 + 1000);
                }
            }
        }
    };
    
    // Simula atividade dos bots
    this.startBotActivity = function(){
        setInterval(function(){
            if(!_sCurrentRoom) return;
            
            // Simula bots fazendo apostas ou outras ações
            this.simulatePlayerAction(_sCurrentRoom, "bet_placed", {
                amount: Math.floor(Math.random() * 500) + 50
            });
        }.bind(this), 10000); // A cada 10 segundos
    };
    
    this._init();
    
    return this;
}

var s_oMultiplayerManager = new CMultiplayerManager();