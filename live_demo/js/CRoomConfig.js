function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Mesa Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Mesa para iniciantes - Apostas de R$50 a R$1.000",
                color: "#CD7F32",
                online: true,
                current_players: 0
            },
            "prata": {
                name: "Mesa Prata",
                min_bet: 100,
                max_bet: 3000,
                max_players: 6,
                description: "Mesa intermediária - Apostas de R$100 a R$3.000",
                color: "#C0C0C0",
                online: true,
                current_players: 0
            },
            "ouro": {
                name: "Mesa Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Mesa premium - Apostas de R$200 a R$5.000",
                color: "#FFD700",
                online: true,
                current_players: 0
            }
        };
    };
    
    this.getRoomConfig = function(sRoomType){
        return _aRooms[sRoomType] || _aRooms["bronze"];
    };
    
    this.getAllRooms = function(){
        return _aRooms;
    };
    
    this.getRoomMinBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.min_bet;
    };
    
    this.getRoomMaxBet = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_bet; // Retorna null se não há limite
    };
    
    this.getRoomName = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.name;
    };
    
    this.getRoomMaxPlayers = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.max_players;
    };
    
    this.getRoomColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.color;
    };
    
    this.isRoomOnline = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.online;
    };
    
    this.getCurrentPlayers = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.current_players;
    };
    
    this.setCurrentPlayers = function(sRoomType, iPlayers){
        if(_aRooms[sRoomType]){
            _aRooms[sRoomType].current_players = Math.max(0, Math.min(iPlayers, _aRooms[sRoomType].max_players));
        }
    };
    
    this.addPlayer = function(sRoomType){
        if(_aRooms[sRoomType]){
            _aRooms[sRoomType].current_players = Math.min(_aRooms[sRoomType].current_players + 1, _aRooms[sRoomType].max_players);
        }
    };
    
    this.removePlayer = function(sRoomType){
        if(_aRooms[sRoomType]){
            _aRooms[sRoomType].current_players = Math.max(0, _aRooms[sRoomType].current_players - 1);
        }
    };
    
    this.isRoomFull = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.current_players >= oRoom.max_players;
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();