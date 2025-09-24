function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Sala Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Sala para apostas de 50 a 1.000 reais",
                tier: "bronze",
                color: "#CD7F32"
            },
            "prata": {
                name: "Sala Prata", 
                min_bet: 100,
                max_bet: 3000,
                max_players: 6,
                description: "Sala para apostas de 100 a 3.000 reais",
                tier: "silver",
                color: "#C0C0C0"
            },
            "ouro": {
                name: "Sala Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Sala VIP para apostas de 200 a 5.000 reais",
                tier: "gold", 
                color: "#FFD700"
            },
            // Manter compatibilidade com sistema anterior
            "principal": {
                name: "Mesa Principal",
                min_bet: 50,
                max_bet: null,
                max_players: 8,
                description: "Mesa principal do jogo",
                tier: "bronze",
                color: "#CD7F32"
            }
        };
    };
    
    this.getRoomConfig = function(sRoomType){
        return _aRooms[sRoomType] || _aRooms["principal"];
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
    
    this.getRoomTier = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.tier || "bronze";
    };
    
    this.getRoomColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.color || "#CD7F32";
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this.getAvailableRooms = function(){
        var aAvailableRooms = [];
        for(var sRoomKey in _aRooms){
            if(sRoomKey !== "principal"){ // Excluir a sala de compatibilidade
                aAvailableRooms.push({
                    id: sRoomKey,
                    config: _aRooms[sRoomKey]
                });
            }
        }
        return aAvailableRooms;
    };
    
    this.isValidBet = function(sRoomType, iBetAmount){
        var oRoom = this.getRoomConfig(sRoomType);
        if(iBetAmount < oRoom.min_bet){
            return false;
        }
        if(oRoom.max_bet !== null && iBetAmount > oRoom.max_bet){
            return false;
        }
        return true;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();