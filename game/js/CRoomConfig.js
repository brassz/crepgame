function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "principal": {
                name: "Mesa Principal",
                min_bet: 50,
                max_bet: null, // Sem limite máximo
                max_players: 8,
                description: "Mesa principal do jogo com aposta mínima de 50 reais"
            },
            "vip": {
                name: "Mesa VIP",
                min_bet: 500,
                max_bet: null, // Sem limite máximo
                max_players: 6,
                description: "Mesa VIP para jogadores premium com aposta mínima de 500 reais"
            },
            "iniciante": {
                name: "Mesa Iniciante",
                min_bet: 10,
                max_bet: 1000,
                max_players: 10,
                description: "Mesa para iniciantes com aposta mínima baixa"
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
    
    this._init();
    
    return this;
}

var s_oRoomConfig = new CRoomConfig();