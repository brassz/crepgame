function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Sala Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Sala para iniciantes - Apostas de 50 a 1.000 reais",
                level: "bronze",
                color: "#CD7F32"
            },
            "prata": {
                name: "Sala Prata",
                min_bet: 100,
                max_bet: 3000,
                max_players: 8,
                description: "Sala intermediária - Apostas de 100 a 3.000 reais",
                level: "prata", 
                color: "#C0C0C0"
            },
            "ouro": {
                name: "Sala Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 8,
                description: "Sala VIP - Apostas de 200 a 5.000 reais",
                level: "ouro",
                color: "#FFD700"
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
    
    this.getRoomLevel = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.level;
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this.validateBetForRoom = function(sRoomType, iBetAmount){
        var oRoom = this.getRoomConfig(sRoomType);
        if(iBetAmount < oRoom.min_bet){
            return {valid: false, reason: "Aposta abaixo do mínimo (" + oRoom.min_bet + ")"};
        }
        if(oRoom.max_bet && iBetAmount > oRoom.max_bet){
            return {valid: false, reason: "Aposta acima do máximo (" + oRoom.max_bet + ")"};
        }
        return {valid: true};
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();