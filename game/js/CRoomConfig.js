function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Sala Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Sala para iniciantes - Apostas de R$ 50 a R$ 1.000",
                level: 1,
                color: "#CD7F32",
                bg_color: "#8B4513"
            },
            "prata": {
                name: "Sala Prata",
                min_bet: 100,
                max_bet: 3000,
                max_players: 6,
                description: "Sala intermediária - Apostas de R$ 100 a R$ 3.000",
                level: 2,
                color: "#C0C0C0",
                bg_color: "#708090"
            },
            "ouro": {
                name: "Sala Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Sala VIP - Apostas de R$ 200 a R$ 5.000",
                level: 3,
                color: "#FFD700",
                bg_color: "#DAA520"
            },
            // Manter compatibilidade com mesa principal para fallback
            "principal": {
                name: "Mesa Principal",
                min_bet: 50,
                max_bet: null,
                max_players: 8,
                description: "Mesa principal do jogo",
                level: 1,
                color: "#FFFFFF",
                bg_color: "#000000"
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
    
    this.getRoomColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.color;
    };
    
    this.getRoomBgColor = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.bg_color;
    };
    
    this.getRoomLevel = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.level;
    };
    
    this.getRoomDescription = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return oRoom.description;
    };
    
    this.getAvailableRooms = function(){
        // Retorna apenas as salas principais (sem a mesa principal de fallback)
        var aAvailableRooms = [];
        for(var sRoomKey in _aRooms){
            if(sRoomKey !== "principal"){
                aAvailableRooms.push({
                    key: sRoomKey,
                    config: _aRooms[sRoomKey]
                });
            }
        }
        return aAvailableRooms;
    };
    
    this.canPlayerEnterRoom = function(sRoomType, iPlayerMoney){
        var oRoom = this.getRoomConfig(sRoomType);
        // Verifica se o jogador tem dinheiro suficiente para pelo menos 5 apostas mínimas
        return iPlayerMoney >= (oRoom.min_bet * 5);
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();