function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "BRONZE",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                banker: true,
                description: "Sala BRONZE (R$50 - R$1000) com banca cobrindo apostas."
            },
            "prata": {
                name: "PRATA",
                min_bet: 100,
                max_bet: 3000,
                max_players: 8,
                banker: true,
                description: "Sala PRATA (R$100 - R$3000) com banca cobrindo apostas."
            },
            "ouro": {
                name: "OURO",
                min_bet: 200,
                max_bet: 5000,
                max_players: 8,
                banker: true,
                description: "Sala OURO (R$200 - R$5000) com banca cobrindo apostas."
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
    
    this.getRoomHasBanker = function(sRoomType){
        var oRoom = this.getRoomConfig(sRoomType);
        return !!oRoom.banker;
    };
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();