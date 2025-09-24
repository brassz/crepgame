function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "iniciante": {
                name: "Mesa Iniciante",
                min_bet: 50,
                max_bet: 1000,
                max_players: 6,
                description: "Mesa para jogadores iniciantes",
                color: "#4CAF50",
                icon: "🌱"
            },
            "intermediaria": {
                name: "Mesa Intermediária", 
                min_bet: 100,
                max_bet: 2000,
                max_players: 6,
                description: "Mesa para jogadores experientes",
                color: "#FF9800",
                icon: "⚡"
            },
            "vip": {
                name: "Mesa VIP",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Mesa para grandes apostadores",
                color: "#9C27B0",
                icon: "💎"
            }
        };
    };
    
    this.getRoomConfig = function(sRoomType){
        return _aRooms[sRoomType] || _aRooms["iniciante"];
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
    
    this.getRoomIcon = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.icon;
    };
    
    this.getAvailableRooms = function(iPlayerBalance){
        var aAvailableRooms = [];
        for(var key in _aRooms){
            if(_aRooms[key].min_bet <= iPlayerBalance){
                aAvailableRooms.push({
                    id: key,
                    config: _aRooms[key]
                });
            }
        }
        return aAvailableRooms;
    };
    
    this.canPlayerJoinRoom = function(sRoomType, iPlayerBalance){
        var oRoom = this.getRoomConfig(sRoomType);
        return iPlayerBalance >= oRoom.min_bet;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();