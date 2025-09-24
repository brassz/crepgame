function CRoomConfig(){
    var _aRooms;
    
    this._init = function(){
        _aRooms = {
            "bronze": {
                name: "Mesa Bronze",
                min_bet: 50,
                max_bet: 1000,
                max_players: 8,
                description: "Mesa para iniciantes - Aposta de R$50 a R$1.000",
                level: "bronze",
                color: "#CD7F32"
            },
            "prata": {
                name: "Mesa Prata", 
                min_bet: 100,
                max_bet: 3000,
                max_players: 6,
                description: "Mesa intermediária - Aposta de R$100 a R$3.000",
                level: "prata", 
                color: "#C0C0C0"
            },
            "ouro": {
                name: "Mesa Ouro",
                min_bet: 200,
                max_bet: 5000,
                max_players: 4,
                description: "Mesa VIP - Aposta de R$200 a R$5.000",
                level: "ouro",
                color: "#FFD700"
            },
            "principal": {
                name: "Mesa Principal",
                min_bet: 50,
                max_bet: null, // Sem limite máximo
                max_players: 8,
                description: "Mesa principal do jogo"
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